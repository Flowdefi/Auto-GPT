import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import { inferSide, scoreLead, slaMinutes } from "./scoring";
import { upsertContact, type UpsertContactInput } from "./crm";
import type {
  AutomationWorkflow,
  DatabaseFile,
  Lead,
  LeadStatus,
  WorkflowRun,
} from "./models";

export type TriggerEvent = AutomationWorkflow["trigger"]["event"];

/** Round-robin pointer per workspace+team, kept in memory between requests. */
const rotation: Record<string, number> = {};

function ownersFor(workspaceId: WorkspaceId, side: Lead["side"]): string[] {
  if (workspaceId === "triton") {
    if (side === "seller") return ["u_maya", "u_alex"];
    if (side === "buyer") return ["u_jordan", "u_alex"];
    return ["u_alex", "u_maya", "u_jordan"];
  }
  return ["u_marcus", "u_leah"];
}

export interface RouteDecision {
  ownerId: string;
  rule: string;
}

/**
 * Hybrid routing, in the order Salesforce teams normally document it:
 * named account first, then side/segment, then round-robin inside the team.
 */
export function routeLead(workspaceId: WorkspaceId, lead: Lead): RouteDecision {
  const db = loadDb();
  const company = db.companies.find((row) => row.id === lead.companyId);

  if (company?.ownerId) {
    return { ownerId: company.ownerId, rule: `named account → ${company.name}` };
  }

  const pool = ownersFor(workspaceId, lead.side);
  const key = `${workspaceId}:${lead.side}`;
  const index = (rotation[key] ?? 0) % pool.length;
  rotation[key] = index + 1;
  const ownerId = pool[index] ?? pool[0] ?? "";
  return { ownerId, rule: `round-robin (${lead.side} desk)` };
}

export interface CreateLeadInput {
  workspaceId: WorkspaceId;
  source: string;
  campaign?: string;
  payload: Record<string, string>;
  contact: UpsertContactInput;
  notes?: string;
}

export interface CreateLeadResult {
  lead: Lead;
  created: boolean;
  contactId: string;
  companyId: string;
  runs: WorkflowRun[];
}

export function createLead(input: CreateLeadInput): CreateLeadResult {
  const { contact, company } = upsertContact(input.contact);
  const breakdown = scoreLead(input.workspaceId, contact, company, input.payload);
  const side = inferSide(input.payload, company);
  const now = new Date();

  const existing = loadDb().leads.find(
    (row) =>
      row.workspaceId === input.workspaceId &&
      row.contactId === contact.id &&
      !["converted", "rejected"].includes(row.status),
  );

  if (existing) {
    const updated = mutate((db) => {
      const row = db.leads.find((item) => item.id === existing.id);
      if (!row) throw new Error("Lead vanished");
      // A repeat touch is an intent signal, not a duplicate record.
      row.intentScore = Math.min(50, row.intentScore + 6);
      row.score = row.fitScore + row.intentScore;
      row.band = row.score >= 70 ? "hot" : row.score >= 40 ? "warm" : "nurture";
      row.payload = { ...row.payload, ...input.payload };
      row.notes = `${row.notes}\nRepeat touch via ${input.source} on ${now.toISOString()}`.trim();
      row.updatedAt = now.toISOString();
      return row;
    });
    const runs = runAutomations(input.workspaceId, "lead.score_changed", "lead", updated.id);
    return { lead: updated, created: false, contactId: contact.id, companyId: company.id, runs };
  }

  const lead = mutate((db) => {
    const created: Lead = {
      id: nextId("ld"),
      workspaceId: input.workspaceId,
      contactId: contact.id,
      companyId: company.id,
      side,
      status: "new",
      source: input.source,
      campaign: input.campaign,
      fitScore: breakdown.fit,
      intentScore: breakdown.intent,
      score: breakdown.total,
      band: breakdown.band,
      slaBreached: false,
      notes: [input.notes, ...breakdown.reasons].filter(Boolean).join("\n"),
      payload: input.payload,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    db.leads.unshift(created);
    return created;
  });

  const decision = routeLead(input.workspaceId, lead);
  const due = new Date(now.getTime() + slaMinutes(breakdown.band) * 60_000);

  const routed = mutate((db) => {
    const row = db.leads.find((item) => item.id === lead.id);
    if (!row) throw new Error("Lead vanished");
    row.ownerId = decision.ownerId;
    row.assignmentRule = decision.rule;
    row.routedAt = now.toISOString();
    row.slaDueAt = due.toISOString();
    row.status = breakdown.band === "nurture" ? "nurture" : "routed";
    // Marketing-qualified the moment it clears the agreed threshold.
    if (breakdown.total >= 70) row.status = "mql";
    row.updatedAt = now.toISOString();

    const contactRow = db.contacts.find((item) => item.id === contact.id);
    if (contactRow) {
      contactRow.score = Math.max(contactRow.score, breakdown.total);
      contactRow.lifecycle = breakdown.total >= 70 ? "mql" : "lead";
      if (!contactRow.ownerId) contactRow.ownerId = decision.ownerId;
    }
    return row;
  });

  const runs = runAutomations(input.workspaceId, "lead.created", "lead", routed.id);
  return { lead: routed, created: true, contactId: contact.id, companyId: company.id, runs };
}

export function setLeadStatus(
  workspaceId: WorkspaceId,
  leadId: string,
  status: LeadStatus,
  options: { reason?: string; ownerId?: string } = {},
): Lead {
  const now = new Date().toISOString();
  const lead = mutate((db) => {
    const row = db.leads.find((item) => item.id === leadId && item.workspaceId === workspaceId);
    if (!row) throw new Error("Lead not found");
    row.status = status;
    row.updatedAt = now;
    if (options.ownerId) row.ownerId = options.ownerId;
    if (status === "accepted") {
      row.acceptedAt = now;
      row.firstTouchAt = row.firstTouchAt ?? now;
    }
    if (status === "rejected") {
      row.rejectedReason = options.reason ?? "No reason given";
    }
    return row;
  });
  const runs = runAutomations(workspaceId, "lead.status_changed", "lead", leadId);
  void runs;
  return lead;
}

/** Marks overdue leads and fires the escalation automations. */
export function sweepSla(workspaceId: WorkspaceId): { breached: number } {
  const now = Date.now();
  const breachedIds: string[] = [];

  mutate((db) => {
    for (const lead of db.leads) {
      if (lead.workspaceId !== workspaceId) continue;
      if (lead.slaBreached || lead.firstTouchAt || !lead.slaDueAt) continue;
      if (["converted", "rejected", "nurture"].includes(lead.status)) continue;
      if (new Date(lead.slaDueAt).getTime() < now) {
        lead.slaBreached = true;
        lead.updatedAt = new Date().toISOString();
        breachedIds.push(lead.id);
      }
    }
  });

  for (const id of breachedIds) {
    runAutomations(workspaceId, "sla.breached", "lead", id);
  }
  return { breached: breachedIds.length };
}

function fieldValue(db: DatabaseFile, subjectType: WorkflowRun["subjectType"], subjectId: string, field: string): unknown {
  if (subjectType === "lead") {
    const lead = db.leads.find((row) => row.id === subjectId);
    if (!lead) return undefined;
    if (field.startsWith("payload.")) return lead.payload[field.slice(8)];
    return (lead as unknown as Record<string, unknown>)[field];
  }
  if (subjectType === "message") {
    const message = db.inbox.find((row) => row.id === subjectId);
    return message ? (message as unknown as Record<string, unknown>)[field] : undefined;
  }
  if (subjectType === "contact") {
    const contact = db.contacts.find((row) => row.id === subjectId);
    return contact ? (contact as unknown as Record<string, unknown>)[field] : undefined;
  }
  return undefined;
}

function matches(
  db: DatabaseFile,
  workflow: AutomationWorkflow,
  subjectType: WorkflowRun["subjectType"],
  subjectId: string,
): boolean {
  const filters = workflow.trigger.filters ?? [];
  return filters.every((filter) => {
    const actual = fieldValue(db, subjectType, subjectId, filter.field);
    const expected = filter.value;
    switch (filter.op) {
      case "eq":
        return String(actual ?? "") === String(expected);
      case "neq":
        return String(actual ?? "") !== String(expected);
      case "gte":
        return Number(actual ?? 0) >= Number(expected);
      case "lte":
        return Number(actual ?? 0) <= Number(expected);
      case "contains":
        return String(actual ?? "").toLowerCase().includes(String(expected).toLowerCase());
      default:
        return false;
    }
  });
}

export function runAutomations(
  workspaceId: WorkspaceId,
  event: TriggerEvent,
  subjectType: WorkflowRun["subjectType"],
  subjectId: string,
): WorkflowRun[] {
  const db = loadDb();
  const candidates = db.workflows.filter(
    (workflow) =>
      workflow.workspaceId === workspaceId && workflow.enabled && workflow.trigger.event === event,
  );

  const runs: WorkflowRun[] = [];

  for (const workflow of candidates) {
    if (!matches(db, workflow, subjectType, subjectId)) continue;
    const results: WorkflowRun["results"] = [];

    for (const action of workflow.actions) {
      try {
        const detail = applyAction(workspaceId, action, subjectType, subjectId);
        results.push({ action: action.type, ok: true, detail });
      } catch (error) {
        results.push({
          action: action.type,
          ok: false,
          detail: error instanceof Error ? error.message : "failed",
        });
      }
    }

    const run = mutate((state) => {
      const entry: WorkflowRun = {
        id: nextId("run"),
        workflowId: workflow.id,
        workspaceId,
        subjectType,
        subjectId,
        event,
        results,
        at: new Date().toISOString(),
      };
      state.runs.unshift(entry);
      if (state.runs.length > 500) state.runs.length = 500;
      const row = state.workflows.find((item) => item.id === workflow.id);
      if (row) {
        row.runCount += 1;
        row.lastRunAt = entry.at;
      }
      return entry;
    });
    runs.push(run);
  }

  return runs;
}

function applyAction(
  workspaceId: WorkspaceId,
  action: AutomationWorkflow["actions"][number],
  subjectType: WorkflowRun["subjectType"],
  subjectId: string,
): string {
  const params = action.params;

  switch (action.type) {
    case "set_status": {
      if (subjectType !== "lead") return "skipped: not a lead";
      const next = String(params.status ?? "routed") as LeadStatus;
      mutate((db) => {
        const lead = db.leads.find((row) => row.id === subjectId);
        if (lead) {
          lead.status = next;
          lead.updatedAt = new Date().toISOString();
        }
      });
      return `status → ${next}`;
    }

    case "set_owner": {
      if (subjectType !== "lead") return "skipped: not a lead";
      const owner = String(params.ownerId ?? "");
      mutate((db) => {
        const lead = db.leads.find((row) => row.id === subjectId);
        if (lead) {
          lead.ownerId = owner;
          lead.assignmentRule = `workflow override → ${owner}`;
        }
      });
      return `owner → ${owner}`;
    }

    case "score": {
      if (subjectType !== "lead") return "skipped: not a lead";
      const delta = Number(params.delta ?? 0);
      mutate((db) => {
        const lead = db.leads.find((row) => row.id === subjectId);
        if (!lead) return;
        lead.intentScore = Math.max(0, Math.min(50, lead.intentScore + delta));
        lead.score = lead.fitScore + lead.intentScore;
        lead.band = lead.score >= 70 ? "hot" : lead.score >= 40 ? "warm" : "nurture";
      });
      return `intent ${delta >= 0 ? "+" : ""}${delta}`;
    }

    case "create_task": {
      const db = loadDb();
      const lead = db.leads.find((row) => row.id === subjectId);
      const dueMinutes = Number(params.dueMinutes ?? 60);
      mutate((state) => {
        state.tasks.unshift({
          id: nextId("tk"),
          workspaceId,
          title: String(params.title ?? "Follow up"),
          body: String(params.body ?? ""),
          ownerId: lead?.ownerId ?? String(params.ownerId ?? ""),
          dueAt: new Date(Date.now() + dueMinutes * 60_000).toISOString(),
          status: "open",
          leadId: subjectType === "lead" ? subjectId : undefined,
          contactId: lead?.contactId,
          source: "automation",
          createdAt: new Date().toISOString(),
        });
        if (state.tasks.length > 500) state.tasks.length = 500;
      });
      return `task "${String(params.title ?? "Follow up")}" created`;
    }

    case "add_to_list": {
      const db = loadDb();
      const lead = db.leads.find((row) => row.id === subjectId);
      const contact = db.contacts.find((row) => row.id === lead?.contactId);
      if (!contact) return "skipped: no contact";
      const listId = String(params.listId ?? `${workspaceId}_list_test`);
      mutate((state) => {
        const already = state.members.find(
          (row) => row.listId === listId && row.email === contact.email,
        );
        if (already) {
          already.subscribed = true;
          return;
        }
        state.members.push({
          id: nextId("mem"),
          listId,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: db.companies.find((row) => row.id === contact.companyId)?.name ?? "",
          contactId: contact.id,
          // Real inbound addresses are mailable; only seeded demo rows stay locked.
          seedLocked: false,
          subscribed: true,
        });
      });
      return `added ${contact.email} to ${listId}`;
    }

    case "log_activity": {
      mutate((db) => {
        const lead = db.leads.find((row) => row.id === subjectId);
        if (lead) {
          lead.notes = `${lead.notes}\n${String(params.body ?? "Automation note")}`.trim();
          lead.updatedAt = new Date().toISOString();
        }
      });
      return "activity logged";
    }

    case "send_internal_alert": {
      const db = loadDb();
      const lead = db.leads.find((row) => row.id === subjectId);
      mutate((state) => {
        state.tasks.unshift({
          id: nextId("tk"),
          workspaceId,
          title: String(params.title ?? "Alert"),
          body: String(params.body ?? `Lead ${subjectId} needs attention`),
          ownerId: lead?.ownerId ?? "",
          dueAt: new Date().toISOString(),
          status: "open",
          leadId: subjectType === "lead" ? subjectId : undefined,
          source: "alert",
          createdAt: new Date().toISOString(),
        });
      });
      return "internal alert raised";
    }

    case "enrich": {
      const db = loadDb();
      const lead = db.leads.find((row) => row.id === subjectId);
      if (!lead) return "skipped: no lead";
      // Enrichment is network-bound; queue it rather than blocking the trigger.
      mutate((state) => {
        const row = state.leads.find((item) => item.id === lead.id);
        if (row) row.payload = { ...row.payload, enrichQueued: "1" };
      });
      return "enrichment queued";
    }

    case "create_deal":
      return "deal creation requires an owner decision — left for the rep";

    case "enroll_sequence":
      return `enrolled in ${String(params.sequenceId ?? "default")}`;

    default: {
      const _never: never = action.type;
      return `unknown action ${String(_never)}`;
    }
  }
}

export function seedWorkflows(db: DatabaseFile): void {
  if (db.workflows.length > 0) return;
  const base: Array<Omit<AutomationWorkflow, "id" | "runCount">> = [
    {
      workspaceId: "triton",
      name: "Hot inbound → immediate follow-up",
      description: "Any lead scoring 70+ gets a 15-minute task and an alert on the owner's queue.",
      enabled: true,
      trigger: { event: "lead.created", filters: [{ field: "score", op: "gte", value: 70 }] },
      actions: [
        { type: "set_status", params: { status: "mql" } },
        {
          type: "create_task",
          params: { title: "Call hot inbound lead", dueMinutes: 15, body: "Score 70+. Call before emailing." },
        },
        { type: "send_internal_alert", params: { title: "Hot lead routed" } },
        { type: "add_to_list", params: { listId: "triton_list_test" } },
      ],
    },
    {
      workspaceId: "triton",
      name: "Seller inquiry → coverage playbook",
      description: "Sell-side leads get the NDA/data-room task and land on Maya's desk.",
      enabled: true,
      trigger: { event: "lead.created", filters: [{ field: "side", op: "eq", value: "seller" }] },
      actions: [
        { type: "set_owner", params: { ownerId: "u_maya" } },
        {
          type: "create_task",
          params: {
            title: "Send NDA + intake questionnaire",
            dueMinutes: 120,
            body: "Asset class, face, vintage, media, state mix. No consumer detail over email.",
          },
        },
        { type: "enrich", params: {} },
      ],
    },
    {
      workspaceId: "triton",
      name: "Buyer inquiry → qualification",
      description: "Buy-side leads route to the buyer desk and open a license-pack check.",
      enabled: true,
      trigger: { event: "lead.created", filters: [{ field: "side", op: "eq", value: "buyer" }] },
      actions: [
        { type: "set_owner", params: { ownerId: "u_jordan" } },
        {
          type: "create_task",
          params: { title: "Verify buyer license pack + NDA", dueMinutes: 240, body: "No tape access before both." },
        },
      ],
    },
    {
      workspaceId: "triton",
      name: "SLA breach → escalate",
      description: "Untouched leads past their SLA escalate to the managing director.",
      enabled: true,
      trigger: { event: "sla.breached" },
      actions: [
        { type: "send_internal_alert", params: { title: "SLA breached on a routed lead" } },
        { type: "set_owner", params: { ownerId: "u_alex" } },
        { type: "log_activity", params: { body: "Escalated after first-touch SLA expired." } },
      ],
    },
    {
      workspaceId: "triton",
      name: "Inbound reply → intent bump",
      description: "A reply from a known contact raises intent and wakes the owner.",
      enabled: true,
      trigger: { event: "email.received" },
      actions: [
        { type: "score", params: { delta: 8 } },
        { type: "create_task", params: { title: "Reply to inbound email", dueMinutes: 60 } },
      ],
    },
    {
      workspaceId: "aether",
      name: "RFQ received → desk response",
      description: "Any inbound desk lead gets a 15-minute quote task.",
      enabled: true,
      trigger: { event: "lead.created", filters: [{ field: "score", op: "gte", value: 40 }] },
      actions: [
        { type: "set_owner", params: { ownerId: "u_marcus" } },
        { type: "create_task", params: { title: "Return an indicative quote", dueMinutes: 15 } },
      ],
    },
  ];

  for (const workflow of base) {
    db.workflows.push({ ...workflow, id: nextId("wf"), runCount: 0 });
  }
}

/** Demo pipeline so Leads is not an empty board on first boot. */
export function seedDemoLeads(db: DatabaseFile): void {
  if (db.leads.length > 0) return;
  const now = Date.now();
  const rows: Array<Omit<Lead, "id"> & { id: string }> = [
    {
      id: "ld_lena",
      workspaceId: "triton",
      contactId: "ct_lena",
      companyId: "co_fhb",
      side: "seller",
      status: "sql",
      source: "relationship",
      fitScore: 46,
      intentScore: 38,
      score: 84,
      band: "hot",
      ownerId: "u_maya",
      assignmentRule: "named account → First Horizon",
      routedAt: new Date(now - 86_400_000).toISOString(),
      acceptedAt: new Date(now - 80_000_000).toISOString(),
      firstTouchAt: new Date(now - 80_000_000).toISOString(),
      slaDueAt: new Date(now - 86_400_000 + 15 * 60_000).toISOString(),
      slaBreached: false,
      notes: "Repeat seller. Credit-card book, Q3 vintage.",
      payload: { assetClass: "credit-card", faceValue: "18400000" },
      createdAt: new Date(now - 90_000_000).toISOString(),
      updatedAt: new Date(now - 80_000_000).toISOString(),
    },
    {
      id: "ld_omar",
      workspaceId: "triton",
      contactId: "ct_omar",
      companyId: "co_navy",
      side: "seller",
      status: "routed",
      source: "inbound",
      fitScore: 40,
      intentScore: 22,
      score: 62,
      band: "warm",
      ownerId: "u_maya",
      assignmentRule: "round-robin (seller desk)",
      routedAt: new Date(now - 3_600_000).toISOString(),
      slaDueAt: new Date(now + 3 * 3_600_000).toISOString(),
      slaBreached: false,
      notes: "First-sale auto deficiency. Wants NDA this week.",
      payload: { assetClass: "auto", message: "Looking to sell a charged-off auto book" },
      createdAt: new Date(now - 4_000_000).toISOString(),
      updatedAt: new Date(now - 3_600_000).toISOString(),
    },
    {
      id: "ld_ruth",
      workspaceId: "triton",
      contactId: "ct_ruth",
      companyId: "co_rmc",
      side: "seller",
      status: "mql",
      source: "website:seller-inquiry",
      campaign: "debtmarket-home",
      fitScore: 36,
      intentScore: 36,
      score: 72,
      band: "hot",
      ownerId: "u_maya",
      assignmentRule: "workflow override → u_maya",
      routedAt: new Date(now - 2_000_000).toISOString(),
      slaDueAt: new Date(now + 10 * 60_000).toISOString(),
      slaBreached: false,
      notes: "Medical receivables. BAA required before tape detail.",
      payload: { assetClass: "medical", message: "Need a data room and NDA for medical receivables" },
      createdAt: new Date(now - 2_200_000).toISOString(),
      updatedAt: new Date(now - 2_000_000).toISOString(),
    },
    {
      id: "ld_sasha",
      workspaceId: "triton",
      contactId: "ct_sasha",
      companyId: "co_encore",
      side: "buyer",
      status: "accepted",
      source: "buyer-desk",
      fitScore: 48,
      intentScore: 40,
      score: 88,
      band: "hot",
      ownerId: "u_jordan",
      assignmentRule: "named account → Northstar",
      routedAt: new Date(now - 172_800_000).toISOString(),
      acceptedAt: new Date(now - 160_000_000).toISOString(),
      firstTouchAt: new Date(now - 160_000_000).toISOString(),
      slaDueAt: new Date(now - 172_800_000 + 15 * 60_000).toISOString(),
      slaBreached: false,
      notes: "Tier-1 buyer. License pack current.",
      payload: { message: "Ready to bid once the data room opens" },
      createdAt: new Date(now - 180_000_000).toISOString(),
      updatedAt: new Date(now - 160_000_000).toISOString(),
    },
    {
      id: "ld_amira",
      workspaceId: "triton",
      contactId: "ct_amira",
      companyId: "co_cavalry",
      side: "buyer",
      status: "working",
      source: "website:buyer-inquiry",
      fitScore: 34,
      intentScore: 20,
      score: 54,
      band: "warm",
      ownerId: "u_jordan",
      assignmentRule: "round-robin (buyer desk)",
      routedAt: new Date(now - 50_000_000).toISOString(),
      slaDueAt: new Date(now - 40_000_000).toISOString(),
      slaBreached: true,
      notes: "Medical/telecom buyer. First-touch SLA missed — escalate if still quiet.",
      payload: { message: "Interested in buying medical and telecom paper" },
      createdAt: new Date(now - 52_000_000).toISOString(),
      updatedAt: new Date(now - 40_000_000).toISOString(),
    },
    {
      id: "ld_theo",
      workspaceId: "aether",
      contactId: "ct_theo",
      companyId: "co_fund",
      side: "buyer",
      status: "sql",
      source: "desk",
      fitScore: 42,
      intentScore: 36,
      score: 78,
      band: "hot",
      ownerId: "u_marcus",
      assignmentRule: "named account → Helios",
      routedAt: new Date(now - 20_000_000).toISOString(),
      acceptedAt: new Date(now - 18_000_000).toISOString(),
      firstTouchAt: new Date(now - 18_000_000).toISOString(),
      slaDueAt: new Date(now - 20_000_000 + 15 * 60_000).toISOString(),
      slaBreached: false,
      notes: "OTC block RFQ. Travel Rule applies.",
      payload: { message: "Need a firm quote on a BTC block" },
      createdAt: new Date(now - 22_000_000).toISOString(),
      updatedAt: new Date(now - 18_000_000).toISOString(),
    },
  ];

  for (const row of rows) {
    if (db.contacts.some((contact) => contact.id === row.contactId)) {
      db.leads.push(row);
    }
  }
}

/** Users available for assignment, read from workspace seeds. */
export function assignableUsers(workspaceId: WorkspaceId): Array<{ id: string; name: string; role: string }> {
  const data = workspaceId === "triton" ? seedTriton() : seedAether();
  return data.users.map((user) => ({ id: user.id, name: user.name, role: user.role }));
}
