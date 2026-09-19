"use client";

import { useState } from "react";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { contactName, when } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function InboxPage() {
  const { data } = useActiveWorkspace();
  const markConversationRead = useMeridian((state) => state.markConversationRead);
  const replyConversation = useMeridian((state) => state.replyConversation);
  const [activeId, setActiveId] = useState(data.conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const active = data.conversations.find((conversation) => conversation.id === activeId) ?? data.conversations[0];
  const contact = data.contacts.find((item) => item.id === active?.contactId);

  return (
    <div>
      <PageHeader eyebrow="Conversations" title="Shared inbox" subtitle="Email, chat, SMS, and portal — mobile-ready like HubSpot’s inbox." />
      <div className="grid overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card lg:grid-cols-[300px_1fr]">
        <div className="border-b border-ink-100 lg:border-b-0 lg:border-r">
          {data.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => {
                setActiveId(conversation.id);
                markConversationRead(conversation.id);
              }}
              className="flex w-full flex-col items-start border-b border-ink-50 px-4 py-3 text-left hover:bg-ink-50"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{conversation.subject}</span>
                {conversation.unread ? <Badge tone="accent">New</Badge> : null}
              </div>
              <span className="mt-1 line-clamp-2 text-xs text-ink-500">
                {conversation.messages.at(-1)?.body}
              </span>
            </button>
          ))}
        </div>
        {active ? (
          <div className="flex min-h-[28rem] flex-col">
            <div className="border-b border-ink-100 px-4 py-3">
              <div className="font-semibold">{active.subject}</div>
              <div className="text-xs text-ink-500">
                {active.channel} · {contact ? contactName(contact.firstName, contact.lastName) : ""}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.from === "us"
                      ? "ml-8 rounded-2xl bg-[var(--accent-soft)] px-3 py-2 text-sm"
                      : "mr-8 rounded-2xl bg-ink-50 px-3 py-2 text-sm"
                  }
                >
                  <div>{message.body}</div>
                  <div className="mt-1 text-[11px] text-ink-400">{when(message.at)}</div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-ink-100 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                replyConversation(active.id, draft);
                setDraft("");
              }}
            >
              <Field value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply from the shared inbox…" />
              <Button type="submit">Send</Button>
            </form>
          </div>
        ) : (
          <Card className="p-8">No threads</Card>
        )}
      </div>
    </div>
  );
}
