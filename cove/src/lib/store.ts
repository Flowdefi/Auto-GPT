"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { firstPartySafeCopy, miniMiranda, outreachBlock } from "./compliance";
import { id, nowIso } from "./format";
import { seedCove } from "./seed";
import { canDialState } from "./states";
import type {
  Account,
  AgentStatus,
  AppData,
  Channel,
  LiveCall,
} from "./types";

interface Store extends AppData {
  clockIn: (agentId: string) => void;
  clockOut: (agentId: string) => void;
  setStatus: (agentId: string, status: AgentStatus) => void;
  addNote: (accountId: string, body: string, actor: string) => void;
  takePayment: (accountId: string, amount: number, method: "card" | "ach", last4: string) => void;
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
      takePayment: (accountId, amount, method, last4) =>
        set((state) => {
          const account = state.accounts.find((item) => item.id === accountId);
          if (!account || amount <= 0) return state;
          const nextBalance = Math.max(0, account.balance - amount);
          let next = log(
            patchAccount(state, accountId, {
              balance: nextBalance,
              status: nextBalance === 0 ? "paid" : account.status,
            }),
            accountId,
            "payment",
            `${method.toUpperCase()} payment ${amount}`,
            `${method} •${last4} authorized. New balance ${nextBalance}.`,
            "Cove Pay",
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
              },
              ...next.payments,
            ],
          };
          return next;
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
          const next = patchAccount(state, accountId, { skipHits: [hit, ...account.skipHits] });
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
          let next = log(
            state,
            accountId,
            "call",
            "Call ended",
            state.liveCall.transcript.map((line) => `${line.who}: ${line.text}`).join("\n"),
            actorName(state),
            outcome,
          );
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
    }),
    { name: "cove-collections-v1" },
  ),
);
