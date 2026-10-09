"use client";

import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { firstPartySafeCopy, miniMiranda, outreachBlock } from "./compliance";
import { id, nowIso } from "./format";
import { seedCove } from "./seed";
import { canDialState } from "./states";
import { AGENCY_NAME, payUrlFor, renderTemplate, templateBlocked } from "./templates";
import { reviewCall } from "./tts-review";
import type {
  Account,
  AgentStatus,
  AppData,
  Channel,
  Disposition,
  DocumentKind,
  LiveCall,
  PaymentChannel,
  Portfolio,
} from "./types";

interface Store extends AppData {
  clockIn: (agentId: string) => void;
  clockOut: (agentId: string) => void;
  setStatus: (agentId: string, status: AgentStatus) => void;
  addNote: (accountId: string, body: string, actor: string) => void;
  takePayment: (
    accountId: string,
    amount: number,
    method: "card" | "ach",
    last4: string,
    channel?: PaymentChannel,
  ) => void;
  startPlan: (accountId: string, installment: number, cadence: "weekly" | "biweekly" | "monthly") => void;
  skipTrace: (accountId: string) => void;
  queueDialer: () => void;
  startCall: (accountId: string, agentId: string, mode: "ai" | "human") => string | null;
  appendTranscript: (who: "agent" | "consumer", text: string) => void;
  hangup: (outcome: string) => void;
  transferToLive: (agentId: string) => void;
  sendMessage: (accountId: string, channel: "sms" | "email") => string | null;
  sendValidation: (accountId: string) => string | null;
  improveScript: () => void;
  setAutoBot: (value: boolean) => void;
  runBotAction: (accountId: string, kind: "validate" | "call" | "sms" | "email" | "skip" | "plan" | "hold" | "callback") => void;
  importPortfolio: (portfolio: Portfolio, accounts: Account[]) => void;
  setDisposition: (accountId: string, disposition: Disposition) => void;
  addDocument: (accountId: string, kind: DocumentKind, name: string, source: string) => void;
  sendTemplate: (accountId: string, templateId: string) => string | null;
  sendPayLink: (accountId: string) => string | null;
  grantAccess: (agentId: string, accountIds: string[], hours: number, reason: string) => string | null;
  revokeGrant: (grantId: string) => void;
  extendGrant: (grantId: string, hours: number) => void;
  acknowledgeReview: (reviewId: string) => void;
  reviewTranscriptNow: (accountId: string, agentId: string, transcript: string) => void;
  portalPay: (
    portalCode: string,
    amount: number,
    method: "card" | "ach",
    last4: string,
  ) => { ok: boolean; message: string };
  portalPlan: (portalCode: string, installment: number, cadence: "weekly" | "biweekly" | "monthly") => boolean;
  reset: () => void;
}

function log(
  state: AppData,
  accountId: string,
  channel: Channel,
  title: string,
  body: string,
  actor: string,
  outcome?: string,
): AppData {
  return {
    ...state,
    timeline: [
      {
        id: id("tl"),
        accountId,
        channel,
        title,
        body,
        at: nowIso(),
        actor,
        outcome,
      },
      ...state.timeline,
    ],
  };
}

function actorName(state: AppData): string {
  return state.agents.find((agent) => agent.id === state.currentAgentId)?.name ?? "Cove";
}

function pickData(state: Store): AppData {
  return {
    agents: state.agents,
    accounts: state.accounts,
    portfolios: state.portfolios,
    plans: state.plans,
    payments: state.payments,
    timeline: state.timeline,
    scripts: state.scripts,
    queue: state.queue,
    messages: state.messages,
    templates: state.templates,
    grants: state.grants,
    reviews: state.reviews,
    liveCall: state.liveCall,
    currentAgentId: state.currentAgentId,
    autoBot: state.autoBot,
  };
}

const remoteStorage: PersistStorage<AppData> = {
  getItem: async (name) => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.ok) {
        const body = (await response.json()) as { payload?: AppData };
        if (body.payload?.accounts?.length) {
          return { state: body.payload };
        }
      }
    } catch {
      // Fall back to the last local copy when the floor API is unreachable.
    }
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name) ?? window.localStorage.getItem("cove-collections-v2");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StorageValue<AppData>;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(name, JSON.stringify(value));
    }
    try {
      await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value.state),
      });
    } catch {
      // Local copy is still saved; the next successful hydrate will merge.
    }
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

function patchAccount(state: AppData, accountId: string, patch: Partial<Account>): AppData {
  return {
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === accountId ? { ...account, ...patch } : account,
    ),
  };
}

export const useCove = create<Store>()(
  persist(
    (set, get) => ({
      ...seedCove(),
      reset: () => set(seedCove()),
      clockIn: (agentId) =>
        set((state) => ({
          currentAgentId: agentId,
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? { ...agent, status: "available", clockedInAt: nowIso() }
              : agent,
          ),
        })),
      clockOut: (agentId) =>
        set((state) => ({
          currentAgentId: state.currentAgentId === agentId ? null : state.currentAgentId,
          liveCall: state.liveCall?.agentId === agentId ? null : state.liveCall,
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? { ...agent, status: "offline", clockedInAt: undefined }
              : agent,
          ),
        })),
      setStatus: (agentId, status) =>
        set((state) => ({
          agents: state.agents.map((agent) => (agent.id === agentId ? { ...agent, status } : agent)),
        })),
      addNote: (accountId, body, actor) =>
        set((state) => log(state, accountId, "note", "Note", body, actor)),
      takePayment: (accountId, amount, method, last4, channel = "agent") =>
        set((state) => {
          const account = state.accounts.find((item) => item.id === accountId);
          if (!account || amount <= 0) return state;
          const nextBalance = Math.max(0, account.balance - amount);
          let next = log(
            patchAccount(state, accountId, {
              balance: nextBalance,
              collected: account.collected + amount,
              status: nextBalance === 0 ? "paid" : account.status,
              disposition: nextBalance === 0 ? "paid" : account.disposition,
            }),
            accountId,
            "payment",
            `${method.toUpperCase()} payment ${amount}`,
            `${method} •${last4} authorized via ${channel}. Descriptor ${AGENCY_NAME}. New balance ${nextBalance}.`,
            channel === "portal" || channel === "sms" ? "TF Recovery portal" : "Cove Pay",
            "approved",
          );
          next = {
            ...next,
            payments: [
              {
                id: id("py"),
                accountId,
                amount,
                method,
                at: nowIso(),
                last4,
                status: "approved",
                channel,
                descriptor: AGENCY_NAME.toUpperCase(),
                processorRef: id("rp"),
              },
              ...next.payments,
            ],
          };
          return {
            ...next,
            accounts: next.accounts.map((item) =>
              item.id === accountId
                ? {
                    ...item,
                    documents: [
                      {
                        id: id("doc"),
                        accountId,
                        kind: "payment_receipt" as const,
                        name: `Receipt ${method.toUpperCase()} $${amount} •${last4}`,
                        addedAt: nowIso(),
                        source: `${AGENCY_NAME} payments`,
                        verified: true,
                        sizeKb: 22,
                      },
                      ...item.documents,
                    ],
                  }
                : item,
            ),
          };
        }),
      startPlan: (accountId, installment, cadence) =>
        set((state) => {
          let next = patchAccount(state, accountId, { status: "plan" });
          next = {
            ...next,
            plans: [
              {
                id: id("pl"),
                accountId,
                installment,
                remaining: Math.max(1, Math.ceil((state.accounts.find((item) => item.id === accountId)?.balance ?? 0) / installment)),
                cadence,
                nextDue: "2026-09-19",
                method: "ach",
                status: "active",
              },
              ...next.plans,
            ],
          };
          return log(next, accountId, "payment", "Payment plan opened", `${cadence} ${installment}`, actorName(state), "plan");
        }),
      skipTrace: (accountId) =>
        set((state) => {
          const account = state.accounts.find((item) => item.id === accountId);
          if (!account) return state;
          if (!canDialState(account.state)) {
            return log(state, accountId, "skip", "Skip blocked", "Licensed-state hold. No skip run.", "Skip", "blocked");
          }
          const hit = {
            id: id("sk"),
            kind: "phone" as const,
            value: account.phone.replace(/\d{3}\)$/, "0199)"),
            confidence: 64,
            source: "header + utilities",
          };
          const next = patchAccount(state, accountId, {
            skipHits: [hit, ...account.skipHits],
            phones: [
              ...account.phones,
              {
                id: id("ph"),
                number: hit.value,
                label: "skip" as const,
                status: "unverified" as const,
                attempts: 0,
              },
            ],
          });
          return log(next, accountId, "skip", "Skip trace complete", `New phone ${hit.value} · ${hit.confidence}%`, "Skip", "hit");
        }),
      queueDialer: () =>
        set((state) => ({
          queue: state.accounts
            .filter((account) => !outreachBlock(account, "call") && account.status !== "paid")
            .map((account) => ({
              id: id("dq"),
              accountId: account.id,
              status: "queued" as const,
            })),
        })),
      startCall: (accountId, agentId, mode) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) return "Account missing.";
        const block = outreachBlock(account, "call");
        if (block) {
          set((current) =>
            log(current, accountId, "call", "Dial blocked", block, "Dialer", "blocked"),
          );
          return block;
        }
        const live: LiveCall = {
          accountId,
          agentId,
          mode,
          startedAt: nowIso(),
          attested: "A",
          transcript: [
            {
              who: "agent",
              text:
                mode === "ai"
                  ? `Hi ${account.firstName}? I’m Cove’s voice agent on a recorded, STIR/SHAKEN A-attested line. ${miniMiranda()} I have the ${account.product} from ${account.originalCreditor} ending ${account.last4}.`
                  : `Hi ${account.firstName}, this is ${state.agents.find((agent) => agent.id === agentId)?.name ?? "Cove"} with Cove Recovery on a recorded line. ${miniMiranda()}`,
            },
          ],
        };
        set((current) => ({
          ...log(current, accountId, "call", mode === "ai" ? "AI connected" : "Live agent connected", "Softphone up. Debtor CRM popped.", actorName({ ...current, currentAgentId: agentId }), "connected"),
          liveCall: live,
          currentAgentId: agentId,
          agents: current.agents.map((agent) =>
            agent.id === agentId ? { ...agent, status: "on_call" } : agent,
          ),
        }));
        return null;
      },
      appendTranscript: (who, text) =>
        set((state) => {
          if (!state.liveCall) return state;
          return {
            liveCall: {
              ...state.liveCall,
              transcript: [...state.liveCall.transcript, { who, text }],
            },
          };
        }),
      hangup: (outcome) =>
        set((state) => {
          if (!state.liveCall) return state;
          const accountId = state.liveCall.accountId;
          const agentId = state.liveCall.agentId;
          const started = new Date(state.liveCall.startedAt).getTime();
          const transcript = state.liveCall.transcript
            .map((line) => `${line.who}: ${line.text}`)
            .join("\n");
          let next = log(state, accountId, "call", "Call ended", transcript, actorName(state), outcome);
          next = {
            ...next,
            liveCall: null,
            agents: next.agents.map((agent) =>
              agent.id === agentId
                ? { ...agent, status: "wrap", callsToday: agent.callsToday + 1 }
                : agent,
            ),
          };
          if (outcome === "no_contact") {
            next = patchAccount(next, accountId, { nextCallAfter: new Date(Date.now() + 36e5).toISOString() });
          }

          // Every call goes straight to the TTS review bot — no sampling.
          const account = next.accounts.find((item) => item.id === accountId);
          const agent = next.agents.find((item) => item.id === agentId);
          if (account && agent) {
            const review = reviewCall(
              accountId,
              agentId,
              agent.name,
              transcript,
              account,
              Math.max(1, Math.round((Date.now() - started) / 1000)),
            );
            next = {
              ...next,
              reviews: [review, ...next.reviews],
              agents: next.agents.map((item) =>
                item.id === agentId
                  ? { ...item, qaScore: Math.round(item.qaScore * 0.7 + review.score * 0.3) }
                  : item,
              ),
            };
            next = log(
              next,
              accountId,
              "qa",
              `TTS review · ${review.verdict} (${review.score}/100)`,
              review.findings.length
                ? review.findings.map((finding) => `${finding.severity.toUpperCase()}: ${finding.rule}`).join("\n")
                : "No findings. Disclosures complete.",
              "Review bot",
              review.verdict,
            );
          }
          return next;
        }),
      transferToLive: (agentId) =>
        set((state) => {
          if (!state.liveCall) return state;
          const available = state.agents.find((agent) => agent.id === agentId && agent.status === "available");
          if (!available) return state;
          const account = state.accounts.find((item) => item.id === state.liveCall?.accountId);
          let next: AppData = {
            ...state,
            liveCall: {
              ...state.liveCall,
              agentId,
              mode: "human",
              transcript: [
                ...state.liveCall.transcript,
                {
                  who: "agent",
                  text: `${available.name} joining. Balance ${account?.balance ?? "—"}, ${account?.state}, plan notes: ${account?.notes ?? "—"}.`,
                },
              ],
            },
            agents: state.agents.map((agent) => {
              if (agent.id === state.liveCall?.agentId) return { ...agent, status: "wrap" };
              if (agent.id === agentId) return { ...agent, status: "on_call" };
              return agent;
            }),
            currentAgentId: agentId,
          };
          return log(next, state.liveCall.accountId, "call", "Warm transfer", `${available.name} received full CRM pop.`, "Dialer", "transferred");
        }),
      sendMessage: (accountId, channel) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) return "Missing account.";
        const block = outreachBlock(account, channel);
        if (block) {
          set((current) => log(current, accountId, channel, `${channel} blocked`, block, channel === "sms" ? "SMS agent" : "Email agent", "blocked"));
          return block;
        }
        const body = firstPartySafeCopy(
          channel === "sms"
            ? `Cove Recovery: balance is listed at $${account.balance}. Reply STOP to opt out. Pay or set a plan in the portal.`
            : `About your ${account.product} with ${account.originalCreditor} ending ${account.last4}. Current balance $${account.balance}. You may request validation. This is from a debt collector.`,
        );
        set((current) => {
          const logged = log(
            current,
            accountId,
            channel,
            channel === "sms" ? "Authenticated SMS (10DLC)" : "Authenticated email (DMARC pass)",
            body,
            channel === "sms" ? "SMS agent" : "Email agent",
            "sent",
          );
          return {
            ...logged,
            messages: [
              {
                id: id("om"),
                accountId,
                channel,
                status: "sent",
                body,
                authenticated: true,
                at: nowIso(),
              },
              ...logged.messages,
            ],
          };
        });
        return null;
      },
      sendValidation: (accountId) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) return "Missing account.";
        if (!canDialState(account.state)) return `Cannot mail validation while ${account.state} is gated.`;
        set((current) =>
          log(
            patchAccount(current, accountId, { validationSent: true, status: "validation_sent" }),
            accountId,
            "email",
            "Validation / itemization sent",
            "Written validation with creditor, amount, and dispute rights.",
            "Email agent",
            "validation",
          ),
        );
        return null;
      },
      improveScript: () =>
        set((state) => {
          const latest = state.scripts[state.scripts.length - 1];
          if (!latest) return state;
          const version = latest.version + 1;
          return {
            scripts: [
              ...state.scripts,
              {
                id: id("sc"),
                version,
                body: `${latest.body}\n\n[v${version} self-improve] Pause after the mini-Miranda. Ask “is now an okay time?” before the balance. If they mention payday, offer that day before any other plan.`,
                createdAt: nowIso().slice(0, 10),
                reason: "Generated from last 50 calls: early balance dump dropped naturalness.",
                rpcRate: Math.min(0.4, latest.rpcRate + 0.03),
                ptpRate: Math.min(0.25, latest.ptpRate + 0.02),
                complaintRate: Math.max(0.004, latest.complaintRate - 0.001),
                naturalness: Math.min(0.95, latest.naturalness + 0.04),
              },
            ],
          };
        }),
      setAutoBot: (value) => set({ autoBot: value }),
      runBotAction: (accountId, kind) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        const agentId = state.currentAgentId ?? state.agents.find((agent) => agent.status === "available")?.id ?? "ag_jordan";
        if (!account) return;
        if (kind === "validate") get().sendValidation(accountId);
        if (kind === "sms") get().sendMessage(accountId, "sms");
        if (kind === "email") get().sendMessage(accountId, "email");
        if (kind === "skip") get().skipTrace(accountId);
        if (kind === "plan") get().startPlan(accountId, 75, "biweekly");
        if (kind === "call") get().startCall(accountId, agentId, "ai");
        if (kind === "callback") get().sendMessage(accountId, account.consent.sms ? "sms" : "email");
        if (kind === "hold") {
          set((current) =>
            log(patchAccount(current, accountId, { status: "hold" }), accountId, "bot", "Bot hold", "No outreach.", "Recovery bot", "hold"),
          );
        } else {
          set((current) => log(current, accountId, "bot", `Bot ran ${kind}`, "Autonomous recovery step from timeline.", "Recovery bot", kind));
        }
      },
      importPortfolio: (portfolio, accounts) =>
        set((state) => {
          const next: AppData = {
            ...state,
            portfolios: [portfolio, ...state.portfolios.filter((item) => item.id !== portfolio.id)],
            accounts: [...accounts, ...state.accounts],
          };
          return log(
            next,
            accounts[0]?.id ?? "",
            "system",
            `Portfolio imported · ${portfolio.name}`,
            `${accounts.length} accounts, ${portfolio.faceValue} face, ${portfolio.purchasePrice} cost.`,
            "Import",
            "imported",
          );
        }),
      setDisposition: (accountId, disposition) =>
        set((state) => {
          const closing = disposition === "bankrupt" || disposition === "deceased" || disposition === "refusal";
          return log(
            patchAccount(state, accountId, {
              disposition,
              ...(closing ? { cease: true, dnc: true, status: "hold" as const } : {}),
            }),
            accountId,
            "system",
            `Disposition → ${disposition.replace(/_/g, " ")}`,
            closing ? "Outreach locked on this disposition." : "Liquidation tracker updated.",
            actorName(state),
            disposition,
          );
        }),
      addDocument: (accountId, kind, name, source) =>
        set((state) => {
          const next: AppData = {
            ...state,
            accounts: state.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    documents: [
                      {
                        id: id("doc"),
                        accountId,
                        kind,
                        name,
                        addedAt: nowIso(),
                        source,
                        verified: false,
                        sizeKb: 40,
                      },
                      ...account.documents,
                    ],
                  }
                : account,
            ),
          };
          return log(next, accountId, "document", `Document added · ${name}`, source, actorName(state), kind);
        }),
      sendTemplate: (accountId, templateId) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        const template = state.templates.find((item) => item.id === templateId);
        if (!account || !template) return "Template or account missing.";
        const gate = templateBlocked(template, account);
        if (gate) return gate;
        if (template.channel === "sms" || template.channel === "email") {
          const channel = template.channel;
          const block = outreachBlock(account, channel);
          if (block) {
            set((current) =>
              log(current, accountId, channel, `${template.name} blocked`, block, "Template", "blocked"),
            );
            return block;
          }
        }
        const rendered = renderTemplate(template, account, typeof window === "undefined" ? "" : window.location.origin);
        set((current) => {
          const logged = log(
            current,
            accountId,
            template.channel === "letter" ? "document" : template.channel,
            `${template.name} sent`,
            rendered.subject ? `${rendered.subject}\n\n${rendered.body}` : rendered.body,
            template.channel === "sms" ? "SMS agent" : template.channel === "email" ? "Email agent" : "Mail vendor",
            "sent",
          );
          if (template.channel === "letter") return logged;
          return {
            ...logged,
            messages: [
              {
                id: id("om"),
                accountId,
                channel: template.channel,
                status: "sent" as const,
                body: rendered.body,
                authenticated: true,
                at: nowIso(),
              },
              ...logged.messages,
            ],
          };
        });
        return null;
      },
      sendPayLink: (accountId) => {
        const state = get();
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) return "Missing account.";
        const block = outreachBlock(account, "sms");
        if (block) {
          set((current) => log(current, accountId, "sms", "Pay link blocked", block, "SMS agent", "blocked"));
          return block;
        }
        const url = payUrlFor(account, typeof window === "undefined" ? "" : window.location.origin);
        const body = `${AGENCY_NAME}: this is a debt collector attempting to collect a debt. Pay or set a plan on the account ending ${account.last4}: ${url} (code ${account.portalCode}). Reply STOP to opt out.`;
        set((current) => {
          const logged = log(current, accountId, "sms", "Pay link sent (10DLC)", body, "SMS agent", "sent");
          return {
            ...logged,
            messages: [
              {
                id: id("om"),
                accountId,
                channel: "sms" as const,
                status: "sent" as const,
                body,
                authenticated: true,
                at: nowIso(),
              },
              ...logged.messages,
            ],
          };
        });
        return null;
      },
      grantAccess: (agentId, accountIds, hours, reason) => {
        const state = get();
        const agent = state.agents.find((item) => item.id === agentId);
        if (!agent) return "Collector not found.";
        if (accountIds.length === 0) return "Select at least one account.";
        if (accountIds.length > agent.maxAccounts) {
          return `${agent.name} is capped at ${agent.maxAccounts} leased accounts.`;
        }
        const now = Date.now();
        set((current) => ({
          grants: [
            {
              id: id("gr"),
              agentId,
              accountIds,
              startsAt: new Date(now).toISOString(),
              expiresAt: new Date(now + hours * 36e5).toISOString(),
              reason,
              grantedBy: actorName(current),
            },
            ...current.grants,
          ],
        }));
        return null;
      },
      revokeGrant: (grantId) =>
        set((state) => ({
          grants: state.grants.map((grant) =>
            grant.id === grantId ? { ...grant, revokedAt: nowIso() } : grant,
          ),
        })),
      extendGrant: (grantId, hours) =>
        set((state) => ({
          grants: state.grants.map((grant) =>
            grant.id === grantId
              ? {
                  ...grant,
                  revokedAt: undefined,
                  expiresAt: new Date(
                    Math.max(Date.now(), new Date(grant.expiresAt).getTime()) + hours * 36e5,
                  ).toISOString(),
                }
              : grant,
          ),
        })),
      acknowledgeReview: (reviewId) =>
        set((state) => ({
          reviews: state.reviews.map((review) =>
            review.id === reviewId ? { ...review, acknowledged: true } : review,
          ),
        })),
      reviewTranscriptNow: (accountId, agentId, transcript) =>
        set((state) => {
          const account = state.accounts.find((item) => item.id === accountId);
          const agent = state.agents.find((item) => item.id === agentId);
          if (!account || !agent) return state;
          const review = reviewCall(accountId, agentId, agent.name, transcript, account, 120);
          return log(
            { ...state, reviews: [review, ...state.reviews] },
            accountId,
            "qa",
            `TTS review · ${review.verdict} (${review.score}/100)`,
            review.coaching,
            "Review bot",
            review.verdict,
          );
        }),
      portalPay: (portalCode, amount, method, last4) => {
        const state = get();
        const account = state.accounts.find(
          (item) => item.portalCode.toUpperCase() === portalCode.trim().toUpperCase(),
        );
        if (!account) return { ok: false, message: "We could not find an account for that code." };
        if (amount <= 0) return { ok: false, message: "Enter an amount greater than zero." };
        if (amount > account.balance) {
          return { ok: false, message: `That is more than the balance of $${account.balance}.` };
        }
        get().takePayment(account.id, amount, method, last4, "portal");
        return {
          ok: true,
          message: `Thank you. $${amount} was authorized. It appears on your statement as ${AGENCY_NAME.toUpperCase()}.`,
        };
      },
      portalPlan: (portalCode, installment, cadence) => {
        const state = get();
        const account = state.accounts.find(
          (item) => item.portalCode.toUpperCase() === portalCode.trim().toUpperCase(),
        );
        if (!account || installment <= 0) return false;
        get().startPlan(account.id, installment, cadence);
        return true;
      },
    }),
    {
      name: "cove-collections-v3",
      storage: remoteStorage,
      partialize: pickData,
    },
  ),
);
