"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { CollectionTemplate, PortfolioAccount } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Preview {
  subject: string;
  body: string;
  missing: string[];
  needsCounselReview: boolean;
  ownerApproved: boolean;
}

export default function TemplateEditorPage() {
  const { workspaceId } = useActiveWorkspace();
  const [templates, setTemplates] = useState<CollectionTemplate[]>([]);
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [selected, setSelected] = useState("");
  const [accountId, setAccountId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { templates?: CollectionTemplate[]; accounts?: PortfolioAccount[] };
    setTemplates(body.templates ?? []);
    setAccounts(body.accounts ?? []);
    if (!selected && body.templates?.[0]) setSelected(body.templates[0].id);
    if (!accountId && body.accounts?.[0]) setAccountId(body.accounts[0].id);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const current = templates.find((item) => item.id === selected);

  async function approve(patch: { ownerApproved?: boolean; counselReviewed?: boolean }) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "template_approval", workspaceId, templateId: selected, ...patch }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(body.error ?? "Saved");
    await refresh();
  }

  async function render() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "template_preview", workspaceId, templateId: selected, accountId }),
    });
    const body = (await response.json()) as Preview & { error?: string };
    if (body.error) setNotice(body.error);
    else setPreview(body);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Template editor"
        subtitle="Every script stays disabled for sends until an owner approves it for this workspace. The counsel flag stays on until this workspace marks it reviewed. The other agency does not inherit either choice."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="max-h-[70vh] space-y-1 overflow-auto p-3 text-sm">
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full min-w-0 flex-col rounded-lg px-2 py-2 text-left hover:bg-muted"
              onClick={() => setSelected(item.id)}
            >
              <span className="font-medium">{item.id}</span>
              <span className="truncate text-muted-foreground">{item.name}</span>
            </button>
          ))}
        </Card>
        {current ? (
          <Card className="space-y-3 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold">{current.name}</div>
              <Badge>{current.channel}</Badge>
              {current.needsCounselReview ? <Badge tone="warn">Needs counsel review</Badge> : <Badge tone="good">Counsel reviewed</Badge>}
              {current.ownerApproved ? <Badge tone="good">Approved to send</Badge> : <Badge tone="bad">Sends disabled</Badge>}
            </div>
            <p className="text-muted-foreground">{current.purpose}</p>
            <p>Merge fields: {current.mergeFields.join(", ") || "none"}</p>
            <div className="flex flex-wrap gap-2">
              <Button tone="soft" onClick={() => void approve({ counselReviewed: true })}>Mark counsel reviewed</Button>
              <Button onClick={() => void approve({ ownerApproved: !current.ownerApproved })}>
                {current.ownerApproved ? "Disable sends" : "Approve for sends"}
              </Button>
            </div>
            <label className="grid gap-1">
              Preview account
              <select className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.accountRef} · {account.state}</option>
                ))}
              </select>
            </label>
            <Button tone="soft" onClick={() => void render()}>Render with account data</Button>
            {preview ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">
                {preview.subject ? `Subject: ${preview.subject}\n\n` : ""}
                {preview.body}
                {preview.missing.length ? `\n\nMissing: ${preview.missing.join(", ")}` : ""}
              </pre>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
