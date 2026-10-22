import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import type { CrmContact, DatabaseFile, Segment } from "./models";

export interface SegmentMatch {
  contact: CrmContact;
  companyName: string;
  reason: string;
}

function valueFor(contact: CrmContact, companyName: string, field: string): string {
  switch (field) {
    case "email":
      return contact.email;
    case "domain":
      return contact.email.split("@")[1] ?? "";
    case "title":
      return contact.title;
    case "company":
      return companyName;
    case "state":
      return contact.state;
    case "city":
      return contact.city;
    case "lifecycle":
      return contact.lifecycle;
    case "score":
      return String(contact.score);
    case "tags":
      return contact.tags.join(" ");
    default:
      return "";
  }
}

export function evaluateSegment(workspaceId: WorkspaceId, segment: Segment): SegmentMatch[] {
  const db = loadDb();
  const contacts = db.contacts.filter((contact) => contact.workspaceId === workspaceId);

  return contacts
    .map((contact) => {
      const companyName = db.companies.find((company) => company.id === contact.companyId)?.name ?? "";
      const results = segment.rules.map((rule) => {
        const actual = valueFor(contact, companyName, rule.field).toLowerCase();
        const expected = rule.value.toLowerCase();
        switch (rule.op) {
          case "eq":
            return actual === expected;
          case "neq":
            return actual !== expected;
          case "contains":
            return actual.includes(expected);
          case "gte":
            return Number(actual) >= Number(expected);
          case "lte":
            return Number(actual) <= Number(expected);
          case "exists":
            return actual.trim().length > 0;
          default:
            return false;
        }
      });

      const matched = segment.match === "all" ? results.every(Boolean) : results.some(Boolean);
      if (!matched) return null;

      return {
        contact,
        companyName,
        reason: segment.rules
          .filter((_, index) => results[index])
          .map((rule) => `${rule.field} ${rule.op} ${rule.value}`)
          .join(" · "),
      };
    })
    .filter((row): row is SegmentMatch => row !== null);
}

function presetsFor(workspaceId: WorkspaceId): Array<Omit<Segment, "id" | "createdAt">> {
  return workspaceId === "triton"
      ? [
          {
            workspaceId,
            name: "Qualified buyers",
            description: "Buy-side contacts with a real score.",
            match: "all",
            rules: [
              { field: "tags", op: "contains", value: "buyer" },
              { field: "score", op: "gte", value: "60" },
            ],
          },
          {
            workspaceId,
            name: "Sell-side decision makers",
            description: "Senior titles at issuers and lenders.",
            match: "any",
            rules: [
              { field: "title", op: "contains", value: "chief" },
              { field: "title", op: "contains", value: "vp" },
              { field: "title", op: "contains", value: "director" },
              { field: "title", op: "contains", value: "recover" },
            ],
          },
          {
            workspaceId,
            name: "Florida and Southeast",
            description: "Regional coverage list.",
            match: "any",
            rules: [
              { field: "state", op: "eq", value: "FL" },
              { field: "state", op: "eq", value: "GA" },
              { field: "state", op: "eq", value: "TN" },
            ],
          },
          {
            workspaceId,
            name: "Engaged inbound",
            description: "Anyone who came in through the website.",
            match: "all",
            rules: [{ field: "tags", op: "contains", value: "inbound" }],
          },
        ]
      : [
          {
            workspaceId,
            name: "Desk counterparties",
            description: "Trading counterparties.",
            match: "any",
            rules: [
              { field: "tags", op: "contains", value: "otc" },
              { field: "tags", op: "contains", value: "buyer" },
            ],
          },
        ];
}

/** Safe to call from migrate — mutates the given file, never re-enters loadDb. */
export function seedSegmentsInto(db: DatabaseFile): void {
  for (const workspaceId of ["triton", "aether"] as WorkspaceId[]) {
    if (db.segments.some((segment) => segment.workspaceId === workspaceId)) continue;
    const now = new Date().toISOString();
    for (const preset of presetsFor(workspaceId)) {
      db.segments.push({ ...preset, id: nextId("sg"), createdAt: now });
    }
  }
}

export function seedSegments(workspaceId: WorkspaceId): Segment[] {
  return mutate((db) => {
    if (!db.segments.some((segment) => segment.workspaceId === workspaceId)) {
      const now = new Date().toISOString();
      for (const preset of presetsFor(workspaceId)) {
        db.segments.push({ ...preset, id: nextId("sg"), createdAt: now });
      }
    }
    return db.segments.filter((segment) => segment.workspaceId === workspaceId);
  });
}
