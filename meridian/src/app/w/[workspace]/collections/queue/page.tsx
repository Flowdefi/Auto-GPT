"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { CollectorTask, DraftReply, PortfolioAccount } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CollectorQueuePage() {
  const { workspaceId } = useActiveWorkspace();
  const [tasks, setTasks] = useState<CollectorTask[]>([]);
  const [drafts, setDrafts] = useState<DraftReply[]>([]);
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [inbound, setInbound] = useState("I dispute this debt.");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) {
      setNotice("Sign in with a seat to open the queue.");
      return;
    }
    const body = (await response.json()) as { tasks?: CollectorTask[]; drafts?: DraftReply[]; accounts?: PortfolioAccount[] };
    setTasks(body.tasks ?? []);
    setDrafts(body.drafts ?? []);
    setAccounts(body.accounts ?? []);
    if (!accountId && body.accounts?.[0]) setAccountId(body.accounts[0].id);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(body.error ?? "Saved");
    await refresh();
  }

  const accountName = (id: string) => accounts.find((item) => item.id === id)?.accountRef ?? id;

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Collector queue"
        subtitle="Open tasks from imports, disputes, hardship, and warm transfers. A model may draft a reply. The rules engine can replace it. Nothing is sent until a person approves and the compliance gate allows it."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5 text-sm">
          <div className="font-semibold">Open tasks</div>
          {tasks.length === 0 ? <p className="text-muted-foreground">No open tasks.</p> : null}
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="min-w-0">
                <div className="font-medium">{task.title}</div>
                <div className="text-muted-foreground">{accountName(task.accountId)} · {task.queue}</div>
              </div>
              <Button tone="soft" onClick={() => void post({ op: "complete_task", taskId: task.id })}>Done</Button>
            </div>
          ))}
        </Card>
        <Card className="space-y-3 p-5 text-sm">
          <div className="font-semibold">Reply triage</div>
          <label className="grid gap-1">
            Account
            <select className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Account">
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>{item.accountRef} · {item.state} · {item.status}</option>
              ))}
            </select>
          </label>
          <textarea className="min-h-24 w-full rounded-xl border bg-transparent p-3" value={inbound} onChange={(event) => setInbound(event.target.value)} aria-label="Inbound message" />
          <Button onClick={() => void post({ op: "draft", accountId, inbound })}>Classify and draft</Button>
          {drafts.map((draft) => (
            <article key={draft.id} className="border-t pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{draft.classification}</Badge>
                <Badge>{draft.draftSource === "model" ? "Model" : "Rules"}</Badge>
                <Badge tone={draft.status === "pending_approval" ? "warn" : draft.status === "approved" ? "good" : "bad"}>{draft.status}</Badge>
                <Badge tone={draft.gateAllowed ? "good" : "bad"}>{draft.gateAllowed ? "Gate allows email" : "Gate would block"}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{draft.draft}</p>
              <p className="mt-1 text-xs text-muted-foreground">{draft.guardNote} {draft.gateReason}</p>
              {draft.status === "pending_approval" ? (
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => void post({ op: "approve", draftId: draft.id, approve: true })}>Approve send</Button>
                  <Button tone="soft" onClick={() => void post({ op: "approve", draftId: draft.id, approve: false })}>Reject</Button>
                </div>
              ) : null}
            </article>
          ))}
        </Card>
      </div>
    </div>
  );
}
