"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Empty, Field, PageHeader } from "@/components/meridian/legacy";
import { money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface PortfolioRow {
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
}

const COLUMNS: Array<{ key: keyof PortfolioRow | "seller"; label: string; kind: "text" | "number" | "date" | "geo" | "list" }> = [
  { key: "name", label: "Name", kind: "text" },
  { key: "seller", label: "Seller", kind: "text" },
  { key: "sellerPrice", label: "Seller price", kind: "number" },
  { key: "faceValue", label: "Face value", kind: "number" },
  { key: "creditor", label: "Creditor", kind: "text" },
  { key: "accountCount", label: "Accounts", kind: "number" },
  { key: "chargeoffYear", label: "Charge-off year", kind: "text" },
  { key: "debtType", label: "Type of debt", kind: "text" },
  { key: "geography", label: "Geography", kind: "geo" },
  { key: "states", label: "States", kind: "list" },
  { key: "segments", label: "Segments", kind: "list" },
  { key: "dateListed", label: "Date listed", kind: "date" },
  { key: "dateLastWorked", label: "Date last worked", kind: "date" },
  { key: "possibleBuyers", label: "Possible buyers", kind: "text" },
  { key: "notes", label: "Notes", kind: "text" },
  { key: "status", label: "Status", kind: "text" },
];

function cellValue(row: PortfolioRow, key: (typeof COLUMNS)[number]["key"]): string {
  if (key === "seller") return row.sellerName;
  const value = row[key];
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  return value;
}

export default function PortfoliosPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", seller: "", faceValue: "", sellerPrice: "", debtType: "" });

  async function refresh() {
    const response = await fetch(`/api/crm/portfolios?workspace=${workspaceId}`);
    const payload = await response.json();
    setRows(payload.portfolios ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function commit(row: PortfolioRow, key: (typeof COLUMNS)[number]["key"], raw: string) {
    const previous = cellValue(row, key);
    if (raw === previous) return;
    const body: Record<string, unknown> = { workspaceId, id: row.id };
    if (key === "seller") body.seller = raw;
    else if (key === "sellerPrice" || key === "faceValue" || key === "accountCount") body[key] = Number(raw.replace(/[$,]/g, ""));
    else body[key] = raw;
    const response = await fetch("/api/crm/portfolios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Could not save that cell");
      return;
    }
    setRows((current) => current.map((item) => (item.id === row.id ? payload.portfolio : item)));
    setNotice("Saved. The record page reads the same portfolio.");
  }

  async function createRow() {
    if (!draft.name.trim()) {
      setNotice("Name the portfolio before saving.");
      return;
    }
    const response = await fetch("/api/crm/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: draft.name,
        seller: draft.seller,
        faceValue: draft.faceValue ? Number(draft.faceValue) : 0,
        sellerPrice: draft.sellerPrice ? Number(draft.sellerPrice) : 0,
        debtType: draft.debtType,
        status: "listed",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Could not create portfolio");
      return;
    }
    setCreating(false);
    setDraft({ name: "", seller: "", faceValue: "", sellerPrice: "", debtType: "" });
    setNotice("Portfolio listed. A coverage task was opened.");
    await refresh();
  }

  const face = rows.reduce((sum, row) => sum + row.faceValue, 0);
  const ask = rows.reduce((sum, row) => sum + row.sellerPrice, 0);

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow={config.product}
        title={config.inventoryNounPlural}
        subtitle="One server record feeds this sheet and the portfolio page. Editing a cell appends history. It does not rewrite the log."
        actions={<Button onClick={() => setCreating((value) => !value)}>Add portfolio</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Books</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Face value</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{money(face)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Seller price</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{money(ask)}</div>
        </Card>
      </div>
      {creating ? (
        <Card className="mb-4 space-y-3 p-4">
          <Field placeholder="Portfolio name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Field placeholder="Seller company" value={draft.seller} onChange={(event) => setDraft({ ...draft, seller: event.target.value })} />
          <Field placeholder="Face value" inputMode="decimal" value={draft.faceValue} onChange={(event) => setDraft({ ...draft, faceValue: event.target.value })} />
          <Field placeholder="Seller price" inputMode="decimal" value={draft.sellerPrice} onChange={(event) => setDraft({ ...draft, sellerPrice: event.target.value })} />
          <Field placeholder="Type of debt" value={draft.debtType} onChange={(event) => setDraft({ ...draft, debtType: event.target.value })} />
          <Button onClick={() => void createRow()}>Save portfolio</Button>
        </Card>
      ) : null}
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      {rows.length === 0 ? (
        <Empty title="No portfolios yet" body="Add a book to put it on the server. The sheet and the record stay in sync." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">Open</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-3 py-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/w/${workspaceId}/portfolios/${row.id}`} className="inline-flex min-h-11 items-center font-medium underline">
                      Record
                    </Link>
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="px-2 py-1 align-middle">
                      {column.kind === "geo" || column.key === "status" ? (
                        <select
                          className="min-h-11 min-w-32 rounded-xl border bg-transparent px-2"
                          value={column.key === "status" ? row.status : row.geography}
                          onChange={(event) => void commit(row, column.key, event.target.value)}
                        >
                          {column.key === "status" ? (
                            ["intake", "listed", "in_market", "awarded", "closed"].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="national">national</option>
                              <option value="state">state</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <input
                          className="min-h-11 min-w-36 rounded-xl border bg-transparent px-2"
                          type={column.kind === "date" ? "date" : column.kind === "number" ? "text" : "text"}
                          inputMode={column.kind === "number" ? "decimal" : undefined}
                          defaultValue={cellValue(row, column.key)}
                          key={`${row.id}-${column.key}-${cellValue(row, column.key)}`}
                          onBlur={(event) => void commit(row, column.key, event.target.value)}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
