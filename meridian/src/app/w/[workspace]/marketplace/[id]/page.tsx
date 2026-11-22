"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Metric, PageHeader } from "@/components/meridian/legacy";
import { meridianReply } from "@/lib/ai";
import { safeHttpUrl } from "@/lib/debt";
import { centsOnDollar, compact, money } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import type { DeskInventoryItem } from "@/server/models";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function InventoryRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, config, data } = useActiveWorkspace();
  const pushAi = useMeridian((state) => state.pushAi);
  const addActivity = useMeridian((state) => state.addActivity);
  const [remote, setRemote] = useState<DeskInventoryItem | null>(null);
  const [dealId, setDealId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const local = data.inventory.find((record) => record.id === params.id);

  useEffect(() => {
    void fetch(`/api/inventory?workspace=${workspaceId}&id=${params.id}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { item?: DeskInventoryItem };
        if (body.item) setRemote(body.item);
      })
      .catch(() => undefined);
  }, [workspaceId, params.id]);

  const item = local ?? (remote
    ? {
        id: remote.id,
        name: remote.name,
        kind: remote.kind,
        sellerCompanyId: remote.sellerCompanyId,
        faceValue: remote.faceValue,
        askingPrice: remote.askingPrice,
        accountCount: remote.accountCount,
        avgBalance: remote.avgBalance,
        vintage: remote.vintage || remote.chargeOff,
        states: remote.states,
        mediaQuality: "fair" as const,
        scoreBand: "",
        status: remote.status,
        notes: remote.notes,
      }
    : undefined);
  if (!item) return <PageHeader title="Not found" />;
  const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
  const deal = data.deals.find((record) => record.inventoryId === item.id);

  return (
    <div>
      <PageHeader eyebrow={item.kind} title={item.name} subtitle={item.notes} actions={<Badge tone="accent">{item.status}</Badge>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Face / notional" value={money(item.faceValue)} />
        <Metric label="Asking" value={money(item.askingPrice)} hint={centsOnDollar(item.faceValue, item.askingPrice)} />
        <Metric label="Accounts" value={compact(item.accountCount)} hint={`Avg ${money(item.avgBalance)}`} />
        <Metric label="Media" value={item.mediaQuality} hint={item.scoreBand} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-5 text-sm">
          <div className="font-semibold">Tape / mandate facts</div>
          <div>Seller / issuer: {seller?.name || remote?.sellerName || "—"}</div>
          {remote ? (
            <div className="space-y-2 pt-2">
              <div className="font-semibold">Masked file links</div>
              {remote.fileLinks.length === 0 ? <div>No files attached.</div> : null}
              {remote.fileLinks.map((file) => {
                const href = safeHttpUrl(file.webUrl);
                return (
                  <div key={file.id} className="break-all">
                    {href ? (
                      <a className="underline" href={href}>
                        {file.name}
                      </a>
                    ) : (
                      file.name
                    )}
                    {file.driveItemId ? <span className="text-muted-foreground"> · {file.driveItemId}</span> : null}
                  </div>
                );
              })}
              <div>Deals: {remote.dealIds.join(", ") || "none"}</div>
              <div>Buyers who received a file: {remote.buyerContactIds.join(", ") || "none"}</div>
              <input className="min-h-11 w-full rounded-xl border bg-transparent px-3" placeholder="Deal id" value={dealId} onChange={(event) => setDealId(event.target.value)} />
              <input className="min-h-11 w-full rounded-xl border bg-transparent px-3" placeholder="Buyer contact id" value={buyerId} onChange={(event) => setBuyerId(event.target.value)} />
              <Button
                tone="soft"
                onClick={() =>
                  void fetch("/api/inventory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ op: "link", workspaceId, id: remote.id, dealId, buyerContactId: buyerId }),
                  }).then(async (response) => {
                    const body = (await response.json()) as { item?: DeskInventoryItem; error?: string };
                    if (body.item) setRemote(body.item);
                    setNotice(body.error ?? "Links saved");
                  })
                }
              >
                Link deal and buyer
              </Button>
              <input className="min-h-11 w-full rounded-xl border bg-transparent px-3" placeholder="OneDrive web URL" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
              <Button
                tone="soft"
                onClick={() =>
                  void fetch("/api/inventory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ op: "file", workspaceId, id: remote.id, name: "Portfolio file", webUrl: fileUrl }),
                  }).then(async (response) => {
                    const body = (await response.json()) as { error?: string };
                    setNotice(body.error ?? "File link saved");
                    const again = await fetch(`/api/inventory?workspace=${workspaceId}&id=${remote.id}`);
                    const next = (await again.json()) as { item?: DeskInventoryItem };
                    if (next.item) setRemote(next.item);
                  })
                }
              >
                Attach file link
              </Button>
              {notice ? <p>{notice}</p> : null}
            </div>
          ) : null}
          <div>Vintage: {item.vintage}</div>
          <div>States / venues: {item.states.join(", ")}</div>
          <div>Status: {item.status}</div>
          {deal ? (
            <Link href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="text-[var(--accent-text)]">
              Linked deal · {deal.stage}
            </Link>
          ) : null}
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Meridian AI</div>
          <p className="mt-2 text-sm text-ink-600">
            Score this book with the same engine used in the assistant — grounded in media, vintage, and ask.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)]"
            onClick={() => {
              const prompt = `score ${item.name}`;
              pushAi({ role: "user", body: prompt });
              const reply = meridianReply(prompt, data, config);
              pushAi({ role: "assistant", body: reply.body });
              addActivity({
                type: "ai",
                subject: reply.subject ?? "Inventory score",
                body: reply.body,
                dealId: deal?.id,
                companyId: item.sellerCompanyId,
              });
            }}
          >
            Score with AI
          </button>
        </Card>
      </div>
    </div>
  );
}
