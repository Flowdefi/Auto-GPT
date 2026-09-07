"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { id, nowIso } from "./format";
import { seedAether } from "./seed/aether";
import { seedTriton } from "./seed/triton";
import type {
  Activity,
  ActivityType,
  AiMessage,
  AppState,
  Contact,
  Deal,
  Task,
  Ticket,
  WorkspaceId,
} from "./types";

const initial: AppState = {
  workspaceId: "triton",
  currentUserId: "u_alex",
  data: {
    triton: seedTriton(),
    aether: seedAether(),
  },
};

interface Store extends AppState {
  setWorkspace: (id: WorkspaceId) => void;
  resetWorkspace: (id: WorkspaceId) => void;
  addActivity: (activity: Omit<Activity, "id" | "at" | "userId"> & { at?: string }) => void;
  moveDeal: (dealId: string, stage: string) => void;
  updateDeal: (dealId: string, patch: Partial<Deal>) => void;
  addTask: (task: Omit<Task, "id">) => void;
  completeTask: (taskId: string) => void;
  addTicket: (ticket: Omit<Ticket, "id" | "createdAt">) => void;
  setTicketStatus: (ticketId: string, status: Ticket["status"]) => void;
  addContact: (contact: Omit<Contact, "id" | "lastActivityAt" | "score">) => void;
  markConversationRead: (conversationId: string) => void;
  replyConversation: (conversationId: string, body: string) => void;
  pushAi: (message: Omit<AiMessage, "id" | "at">) => void;
  logAiActivity: (subject: string, body: string, dealId?: string, contactId?: string) => void;
}

function defaultUser(workspaceId: WorkspaceId): string {
  return workspaceId === "triton" ? "u_alex" : "u_ria";
}

export const useMeridian = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,
      setWorkspace: (workspaceId) =>
        set({
          workspaceId,
          currentUserId: defaultUser(workspaceId),
        }),
      resetWorkspace: (workspaceId) =>
        set((state) => ({
          data: {
            ...state.data,
            [workspaceId]: workspaceId === "triton" ? seedTriton() : seedAether(),
          },
        })),
      addActivity: (input) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          const next: Activity = {
            id: id("ac"),
            at: input.at ?? nowIso(),
            userId: state.currentUserId,
            type: input.type,
            subject: input.subject,
            body: input.body,
            contactId: input.contactId,
            companyId: input.companyId,
            dealId: input.dealId,
            ticketId: input.ticketId,
          };
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                activities: [next, ...workspace.activities],
              },
            },
          };
        }),
      moveDeal: (dealId, stage) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                deals: workspace.deals.map((deal) =>
                  deal.id === dealId ? { ...deal, stage } : deal,
                ),
              },
            },
          };
        }),
      updateDeal: (dealId, patch) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                deals: workspace.deals.map((deal) =>
                  deal.id === dealId ? { ...deal, ...patch } : deal,
                ),
              },
            },
          };
        }),
      addTask: (task) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                tasks: [{ ...task, id: id("tk") }, ...workspace.tasks],
              },
            },
          };
        }),
      completeTask: (taskId) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                tasks: workspace.tasks.map((task) =>
                  task.id === taskId ? { ...task, status: "completed" } : task,
                ),
              },
            },
          };
        }),
      addTicket: (ticket) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                tickets: [
                  { ...ticket, id: id("ti"), createdAt: nowIso() },
                  ...workspace.tickets,
                ],
              },
            },
          };
        }),
      setTicketStatus: (ticketId, status) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                tickets: workspace.tickets.map((ticket) =>
                  ticket.id === ticketId ? { ...ticket, status } : ticket,
                ),
              },
            },
          };
        }),
      addContact: (contact) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                contacts: [
                  {
                    ...contact,
                    id: id("ct"),
                    score: 50,
                    lastActivityAt: nowIso(),
                  },
                  ...workspace.contacts,
                ],
              },
            },
          };
        }),
      markConversationRead: (conversationId) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                conversations: workspace.conversations.map((conversation) =>
                  conversation.id === conversationId
                    ? { ...conversation, unread: false }
                    : conversation,
                ),
              },
            },
          };
        }),
      replyConversation: (conversationId, body) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                conversations: workspace.conversations.map((conversation) =>
                  conversation.id === conversationId
                    ? {
                        ...conversation,
                        unread: false,
                        lastAt: nowIso(),
                        messages: [
                          ...conversation.messages,
                          { id: id("m"), from: "us" as const, body, at: nowIso() },
                        ],
                      }
                    : conversation,
                ),
              },
            },
          };
        }),
      pushAi: (message) =>
        set((state) => {
          const workspace = state.data[state.workspaceId];
          return {
            data: {
              ...state.data,
              [state.workspaceId]: {
                ...workspace,
                aiMessages: [
                  ...workspace.aiMessages,
                  { ...message, id: id("ai"), at: nowIso() },
                ],
              },
            },
          };
        }),
      logAiActivity: (subject, body, dealId, contactId) => {
        get().addActivity({
          type: "ai" satisfies ActivityType,
          subject,
          body,
          dealId,
          contactId,
        });
      },
    }),
    {
      name: "meridian-enterprise-v1",
    },
  ),
);

export function useWorkspaceData() {
  const workspaceId = useMeridian((state) => state.workspaceId);
  const data = useMeridian((state) => state.data[state.workspaceId]);
  return { workspaceId, data };
}
