"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { contactName, when } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface InboxRow {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  matchedBy?: string;
  contactName?: string;
  companyName?: string;
  direction: string;
}

export default function InboxPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const markConversationRead = useMeridian((state) => state.markConversationRead);
  const replyConversation = useMeridian((state) => state.replyConversation);
  const [activeId, setActiveId] = useState(data.conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const [outlook, setOutlook] = useState<{
    status: { configured: boolean; hint: string };
    messages: InboxRow[];
    stats: { total: number; associated: number; unmatched: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const active = data.conversations.find((conversation) => conversation.id === activeId) ?? data.conversations[0];
  const contact = data.contacts.find((item) => item.id === active?.contactId);

  async function refreshOutlook() {
    const response = await fetch(`/api/outlook?workspace=${workspaceId}`);
    setOutlook(await response.json());
  }

  useEffect(() => {
    void refreshOutlook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function sync() {
    setBusy(true);
    await fetch("/api/outlook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    await refreshOutlook();
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Conversations"
        title="Shared inbox"
        subtitle="Seed threads stay here. Office 365 mail syncs underneath and auto-associates to contact and company records."
        actions={
          <Button tone="soft" disabled={busy} onClick={() => void sync()}>
            {busy ? "Syncing…" : "Sync Outlook"}
          </Button>
        }
      />
      {outlook ? (
        <Card className="mb-4 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={outlook.status.configured ? "good" : "warn"}>
              {outlook.status.configured ? "Graph connected" : "Graph not configured"}
            </Badge>
            <span>
              {outlook.stats.total} synced · {outlook.stats.associated} associated · {outlook.stats.unmatched} unmatched
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{outlook.status.hint}</p>
        </Card>
      ) : null}
      {(outlook?.messages.length ?? 0) > 0 ? (
        <div className="mb-4 space-y-2">
          <div className="text-sm font-semibold">Office 365</div>
          {outlook?.messages.slice(0, 12).map((message) => (
            <Card key={message.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{message.subject}</div>
                <Badge tone={message.matchedBy === "email" ? "good" : message.matchedBy === "domain" ? "warn" : "neutral"}>
                  {message.matchedBy ?? "none"}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {message.fromName || message.from} · {message.contactName || message.companyName || "unmatched"} · {when(message.receivedAt)}
              </div>
              <p className="mt-2 text-muted-foreground">{message.preview}</p>
            </Card>
          ))}
        </div>
      ) : null}
      <div className="grid overflow-hidden rounded-2xl border bg-card shadow-card lg:grid-cols-[300px_1fr]">
        <div className="border-b lg:border-b-0 lg:border-r">
          {data.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => {
                setActiveId(conversation.id);
                markConversationRead(conversation.id);
              }}
              className="flex w-full flex-col items-start border-b px-4 py-3 text-left hover:bg-muted"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{conversation.subject}</span>
                {conversation.unread ? <Badge tone="accent">New</Badge> : null}
              </div>
              <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {conversation.messages.at(-1)?.body}
              </span>
            </button>
          ))}
        </div>
        {active ? (
          <div className="flex min-h-[28rem] flex-col">
            <div className="border-b px-4 py-3">
              <div className="font-semibold">{active.subject}</div>
              <div className="text-xs text-muted-foreground">
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
                      : "mr-8 rounded-2xl bg-muted px-3 py-2 text-sm"
                  }
                >
                  <div>{message.body}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{when(message.at)}</div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t p-3"
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
