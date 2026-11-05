"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { safeHttpUrl } from "@/lib/debt";
import { compact, fullMoney } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Option {
  id: string;
  name: string;
}

const control = "min-h-11 w-full rounded-xl border bg-transparent px-3 text-sm";

export default function InventoryRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useActiveWorkspace();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [deals, setDeals] = useState<Option[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [dealId, setDealId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/inventory?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load portfolios");
        return (await response.json()) as { items?: InventoryItem[]; companies?: Option[]; deals?: Option[] };
      })
      .then((body) => {
        if (cancelled) return;
        const found = (body.items ?? []).find((row) => row.id === params.id) ?? null;
        setCompanies(body.companies ?? []);
        setDeals(body.deals ?? []);
        setItem(found);
        setMissing(!found);
        setSellerId(found?.sellerCompanyId ?? "");
        setBuyerId(found?.buyerCompanyId ?? "");
        setDealId(found?.dealId ?? "");
        setFileUrl(found?.maskedFileUrl ?? "");
      })
      .catch((error: unknown) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load the portfolio");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, workspaceId]);

  async function save() {
    setNotice(null);
    const response = await fetch(`/api/inventory/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        sellerCompanyId: sellerId,
        buyerCompanyId: buyerId,
        dealId,
        maskedFileUrl: fileUrl.trim(),
      }),
    });
    const payload = (await response.json()) as { item?: InventoryItem; error?: string };
    if (!response.ok || !payload.item) {
      setNotice(payload.error ?? "Save failed");
      return;
    }
    setItem(payload.item);
    setNotice("Saved.");
  }

  if (missing) return <PageHeader title="Portfolio not found" />;
  if (!item) return <PageHeader title="Loading portfolio…" />;
  const file = safeHttpUrl(item.maskedFileUrl);
  const seller = companies.find((company) => company.id === item.sellerCompanyId);
  const buyer = companies.find((company) => company.id === item.buyerCompanyId);

  return (
    <div>
      <PageHeader
        eyebrow={item.kind || "Portfolio"}
        title={item.name}
        subtitle={item.chargeOffDates || item.vintage || "Debt portfolio"}
        actions={<Badge tone="accent">{item.status}</Badge>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4 text-sm"><div className="text-xs text-muted-foreground">Face</div>{fullMoney(item.faceValue)}</Card>
        <Card className="p-4 text-sm"><div className="text-xs text-muted-foreground">Ask</div>{fullMoney(item.askingPrice)}</Card>
        <Card className="p-4 text-sm"><div className="text-xs text-muted-foreground">Accounts</div>{compact(item.accountCount)}</Card>
        <Card className="p-4 text-sm"><div className="text-xs text-muted-foreground">States</div>{item.states.join(", ") || "—"}</Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-5 text-sm">
          <div>Seller: {seller?.name || item.sellerName || "—"}</div>
          <div>Buyer: {buyer?.name || item.buyerName || "—"}</div>
          <div>Deal: {item.dealName || item.dealId || "—"}</div>
          <div>
            Masked file:{" "}
            {file ? (
              <a href={file} target="_blank" rel="noreferrer" className="text-[var(--brand-text)]">
                Open OneDrive link
              </a>
            ) : (
              "—"
            )}
          </div>
          <Link href={`/w/${workspaceId}/files`} className="inline-block text-[var(--brand-text)]">
            Browse OneDrive
          </Link>
        </Card>
        <Card className="space-y-3 p-5">
          <label className="block text-sm">
            Seller
            <select className={control} value={sellerId} onChange={(event) => setSellerId(event.target.value)}>
              <option value="">Unlinked</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Buyer
            <select className={control} value={buyerId} onChange={(event) => setBuyerId(event.target.value)}>
              <option value="">Unlinked</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Deal
            <select className={control} value={dealId} onChange={(event) => setDealId(event.target.value)}>
              <option value="">Unlinked</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>{deal.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            OneDrive file URL
            <input className={control} value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="https://" />
          </label>
          <Button type="button" onClick={() => void save()}>Save links</Button>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </Card>
      </div>
    </div>
  );
}
