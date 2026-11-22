"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { safeHttpUrl } from "@/lib/debt";
import { when } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  modified?: string;
  folder: boolean;
}

interface Option {
  id: string;
  name: string;
}

export default function FilesPage() {
  const { workspaceId } = useActiveWorkspace();
  const localDeals = useMeridian((state) => state.data[workspaceId].deals);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Option[]>([]);
  const [deals, setDeals] = useState<Option[]>([]);
  const [selected, setSelected] = useState<DriveItem | null>(null);
  const [portfolioId, setPortfolioId] = useState("");
  const [dealId, setDealId] = useState("");

  async function load(search = query) {
    setNotice(null);
    const response = await fetch(`/api/graph/drive?q=${encodeURIComponent(search)}`);
    const payload = (await response.json()) as { configured?: boolean; items?: DriveItem[]; error?: string };
    if (!response.ok) {
      setNotice(payload.error ?? "Could not list OneDrive");
      return;
    }
    setConfigured(payload.configured !== false);
    setItems(payload.items ?? []);
    if (payload.error) setNotice(payload.error);
  }

  useEffect(() => {
    void load("");
    void fetch(`/api/inventory?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((body: { items?: Option[]; deals?: Option[] }) => {
        setPortfolios((body.items ?? []).map((item) => ({ id: item.id, name: item.name })));
        const serverDeals = body.deals ?? [];
        const merged = new Map<string, Option>();
        for (const deal of serverDeals) merged.set(deal.id, { id: deal.id, name: deal.name });
        for (const deal of localDeals) merged.set(deal.id, { id: deal.id, name: deal.name });
        setDeals([...merged.values()]);
      })
      .catch(() => undefined);
    // The drive list is loaded once per workspace. Search submits explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function attach(target: "portfolio" | "deal") {
    if (!selected) return;
    const id = target === "portfolio" ? portfolioId : dealId;
    const url = safeHttpUrl(selected.webUrl);
    if (!id || !url) {
      setNotice("Choose a record and a file that has an https link.");
      return;
    }
    const response = await fetch("/api/graph/attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, target, id, url, name: selected.name }),
    });
    const payload = (await response.json()) as { error?: string };
    setNotice(response.ok ? `Attached ${selected.name}.` : payload.error ?? "Attach failed");
  }

  return (
    <div>
      <PageHeader
        eyebrow="OneDrive"
        title="Mailbox files"
        subtitle="Files on the mailbox owner's drive. Search, open the link, or attach it to a portfolio or deal."
      />
      {!configured ? (
        <Card className="mb-4 p-4 text-sm">
          Microsoft Graph is not configured. Set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET. This page stays empty until then.
        </Card>
      ) : null}
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(query);
        }}
      >
        <input
          className="min-h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-3 text-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search file name"
          aria-label="Search OneDrive"
        />
        <Button type="submit">Search</Button>
      </form>
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {selected ? (
        <Card className="mb-4 space-y-3 p-4 text-sm">
          <div className="font-medium">Attach {selected.name}</div>
          <div className="flex flex-wrap gap-2">
            <select className="min-h-11 rounded-xl border bg-transparent px-3" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} aria-label="Portfolio">
              <option value="">Portfolio</option>
              {portfolios.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <Button type="button" onClick={() => void attach("portfolio")}>Attach to portfolio</Button>
            <select className="min-h-11 rounded-xl border bg-transparent px-3" value={dealId} onChange={(event) => setDealId(event.target.value)} aria-label="Deal">
              <option value="">Deal</option>
              {deals.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <Button type="button" onClick={() => void attach("deal")}>Attach to deal</Button>
          </div>
        </Card>
      ) : null}
      <div className="space-y-2">
        {items.map((item) => {
          const href = safeHttpUrl(item.webUrl);
          return (
            <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.folder ? "Folder" : "File"}
                  {item.modified ? ` · ${when(item.modified)}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[var(--brand-text)]">
                    Open
                  </a>
                ) : null}
                <Button type="button" tone="soft" onClick={() => setSelected(item)}>
                  Attach
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
