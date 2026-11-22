"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { centsOnDollar, compact, money } from "@/lib/format";
import type { DeskInventoryItem } from "@/server/models";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function MarketplacePage() {
  const { workspaceId, config, data } = useActiveWorkspace();
  const [serverItems, setServerItems] = useState<DeskInventoryItem[]>([]);
  const [csv, setCsv] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/inventory?workspace=${workspaceId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { items?: DeskInventoryItem[] };
    setServerItems(body.items ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function importList() {
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "import", workspaceId, csv }),
    });
    const body = (await response.json()) as { error?: string; created?: number; skipped?: number };
    setNotice(body.error ?? `Imported ${body.created ?? 0}. Skipped ${body.skipped ?? 0}.`);
    if (response.ok) await refresh();
  }

  async function readFile(file: File) {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "import", workspaceId, xlsxBase64: btoa(binary) }),
      });
      const body = (await response.json()) as { error?: string; created?: number; skipped?: number };
      setNotice(body.error ?? `Imported ${body.created ?? 0}. Skipped ${body.skipped ?? 0}.`);
      if (response.ok) await refresh();
      return;
    }
    setCsv(await file.text());
  }

  return (
    <div>
      <PageHeader
        eyebrow={config.product}
        title={config.inventoryNounPlural}
        subtitle={
          config.id === "triton"
            ? "Charged-off books on the DebtMarket desk — face, ask, media, vintage, and bid status."
            : "Blocks, listings, and mandates on the Aether desk."
        }
      />
      <Card className="mb-4 space-y-3 p-5 text-sm">
        <div className="font-semibold">Import a sales list</div>
        <p className="text-muted-foreground">
          Headers can vary. Issuer, seller, asset class, face value, accounts, average balance, asking price, charge-off dates, states, and notes are recognized. Files stay in the browser until import.
        </p>
        <input
          className="block max-w-full text-sm"
          type="file"
          accept=".csv,.txt,.xlsx,text/csv"
          aria-label="Inventory file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
        <textarea
          className="min-h-24 w-full rounded-xl border bg-transparent p-3"
          aria-label="Inventory CSV"
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder="Seller,Asset Class,Face Value,# Accts,Avg Balance,Asking Price,States"
        />
        <Button onClick={() => void importList()}>Import CSV</Button>
        {notice ? <p>{notice}</p> : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {serverItems.map((item) => (
          <Link key={item.id} href={`/w/${workspaceId}/marketplace/${item.id}`}>
            <Card className="h-full p-5 transition hover:shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-lg font-semibold">{item.name}</div>
                  <div className="text-sm text-ink-500">{item.kind}</div>
                </div>
                <Badge tone="accent">{item.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-ink-400">Face</div>
                  <div className="font-medium">{money(item.faceValue)}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-400">Ask</div>
                  <div className="font-medium">{money(item.askingPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-400">Accounts</div>
                  <div className="font-medium">{compact(item.accountCount)}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-400">Files</div>
                  <div className="font-medium">{item.fileLinks.length}</div>
                </div>
              </div>
              <div className="mt-3 break-words text-xs text-ink-500">
                {item.sellerName || "Seller not set"} · {item.states.join(", ") || "No states"} · {item.chargeOff || "No charge-off date"}
              </div>
            </Card>
          </Link>
        ))}
        {data.inventory.map((item) => {
          const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
          return (
            <Link key={item.id} href={`/w/${workspaceId}/marketplace/${item.id}`}>
              <Card className="h-full p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{item.name}</div>
                    <div className="text-sm text-ink-500">{item.kind}</div>
                  </div>
                  <Badge tone="accent">{item.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-400">Face / notional</div>
                    <div className="font-medium">{money(item.faceValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Ask</div>
                    <div className="font-medium">
                      {money(item.askingPrice)} · {centsOnDollar(item.faceValue, item.askingPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Accounts / units</div>
                    <div className="font-medium">{compact(item.accountCount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Media</div>
                    <div className="font-medium">{item.mediaQuality}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-ink-500">
                  {seller?.name} · {item.states.join(", ")} · {item.vintage}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
