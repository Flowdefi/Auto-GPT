"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Timeline } from "@/components/tables";
import { Badge, Button, Card, Empty, Field, PageHeader } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import { money, when } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface HistoryEntry {
  id: string;
  at: string;
  field: string;
  from: string;
  to: string;
  actor: string;
}

interface PortfolioRecord {
  id: string;
  name: string;
  sellerName: string;
  sellerPrice: number;
  faceValue: number;
  creditor: string;
  accountCount: number;
  chargeoffYear: string;
  notes: string;
  segments: string[];
  dateListed: string;
  dateLastWorked: string;
  debtType: string;
  geography: "national" | "state";
  states: string[];
  possibleBuyers: string;
  status: string;
  history: HistoryEntry[];
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function PortfolioRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useActiveWorkspace();
  const [row, setRow] = useState<PortfolioRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioRecord | null>(null);

  async function refresh() {
    const response = await fetch(`/api/crm/portfolios?workspace=${workspaceId}&id=${params.id}`);
    const payload = await response.json();
    const portfolio = payload.portfolios?.[0] as PortfolioRecord | undefined;
    if (!portfolio) {
      setMissing(true);
      setRow(null);
      return;
    }
    setMissing(false);
    setRow(portfolio);
    setForm(portfolio);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, params.id]);

  async function save() {
    if (!form) return;
    const response = await fetch("/api/crm/portfolios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        id: form.id,
        name: form.name,
        seller: form.sellerName,
        sellerPrice: form.sellerPrice,
        faceValue: form.faceValue,
        creditor: form.creditor,
        accountCount: form.accountCount,
        chargeoffYear: form.chargeoffYear,
        notes: form.notes,
        segments: form.segments.join(", "),
        dateListed: form.dateListed,
        dateLastWorked: form.dateLastWorked,
        debtType: form.debtType,
        geography: form.geography,
        states: form.states.join(", "),
        possibleBuyers: form.possibleBuyers,
        status: form.status,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Could not save portfolio");
      return;
    }
    setNotice("Saved. The spreadsheet will show these values on the next load.");
    setRow(payload.portfolio);
    setForm(payload.portfolio);
  }

  if (missing) {
    return (
      <Empty
        title="Portfolio not found"
        body="This id is not on the server."
        action={
          <Link href={`/w/${workspaceId}/portfolios`} className="underline">
            Back to the sheet
          </Link>
        }
      />
    );
  }
  if (!form || !row) return <PageHeader title="Loading portfolio" />;

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Portfolio"
        title={row.name}
        subtitle={`${row.debtType || "Commercial book"} · ${row.sellerName || "Seller unset"}`}
        actions={<Badge tone="accent">{row.status}</Badge>}
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Card className="px-4 py-3">Face {money(row.faceValue)}</Card>
        <Card className="px-4 py-3">Seller price {money(row.sellerPrice)}</Card>
        <Link href={`/w/${workspaceId}/portfolios`} className="inline-flex min-h-11 items-center underline">
          Open spreadsheet
        </Link>
      </div>
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-3 p-5">
          <Labeled label="Name">
            <Field value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Labeled>
          <Labeled label="Seller">
            <Field value={form.sellerName} onChange={(event) => setForm({ ...form, sellerName: event.target.value })} />
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Seller price">
              <Field
                inputMode="decimal"
                value={String(form.sellerPrice)}
                onChange={(event) => setForm({ ...form, sellerPrice: Number(event.target.value) || 0 })}
              />
            </Labeled>
            <Labeled label="Face value">
              <Field
                inputMode="decimal"
                value={String(form.faceValue)}
                onChange={(event) => setForm({ ...form, faceValue: Number(event.target.value) || 0 })}
              />
            </Labeled>
            <Labeled label="Creditor">
              <Field value={form.creditor} onChange={(event) => setForm({ ...form, creditor: event.target.value })} />
            </Labeled>
            <Labeled label="Accounts">
              <Field
                inputMode="numeric"
                value={String(form.accountCount)}
                onChange={(event) => setForm({ ...form, accountCount: Number(event.target.value) || 0 })}
              />
            </Labeled>
            <Labeled label="Charge-off year">
              <Field value={form.chargeoffYear} onChange={(event) => setForm({ ...form, chargeoffYear: event.target.value })} />
            </Labeled>
            <Labeled label="Type of debt">
              <Field value={form.debtType} onChange={(event) => setForm({ ...form, debtType: event.target.value })} />
            </Labeled>
            <Labeled label="Date listed">
              <Field type="date" value={form.dateListed.slice(0, 10)} onChange={(event) => setForm({ ...form, dateListed: event.target.value })} />
            </Labeled>
            <Labeled label="Date last worked">
              <Field
                type="date"
                value={form.dateLastWorked.slice(0, 10)}
                onChange={(event) => setForm({ ...form, dateLastWorked: event.target.value })}
              />
            </Labeled>
          </div>
          <Labeled label="Geography">
            <select
              className="min-h-11 w-full rounded-xl border bg-transparent px-3"
              value={form.geography}
              onChange={(event) => setForm({ ...form, geography: event.target.value === "state" ? "state" : "national" })}
            >
              <option value="national">national</option>
              <option value="state">state</option>
            </select>
          </Labeled>
          <Labeled label="States">
            <Field value={form.states.join(", ")} onChange={(event) => setForm({ ...form, states: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          </Labeled>
          <Labeled label="Segments">
            <Field
              value={form.segments.join(", ")}
              onChange={(event) => setForm({ ...form, segments: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
            />
          </Labeled>
          <Labeled label="Status">
            <select
              className="min-h-11 w-full rounded-xl border bg-transparent px-3"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {["intake", "listed", "in_market", "awarded", "closed"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Possible buyers">
            <Textarea className="min-h-24 rounded-xl" value={form.possibleBuyers} onChange={(event) => setForm({ ...form, possibleBuyers: event.target.value })} />
          </Labeled>
          <Labeled label="Notes">
            <Textarea className="min-h-28 rounded-xl" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Labeled>
          <Button onClick={() => void save()}>Save portfolio</Button>
        </Card>
        <Card className="p-5">
          <div className="mb-3 font-semibold">History</div>
          {row.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field changes yet.</p>
          ) : (
            <Timeline
              items={row.history.map((entry) => ({
                id: entry.id,
                title: entry.field,
                body: entry.from ? `${entry.from} → ${entry.to}` : entry.to,
                meta: `${entry.actor} · ${when(entry.at)}`,
              }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
