"use client";

import { useState } from "react";
import { CrmNav } from "@/components/crm/crm-nav";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface SkipRow {
  file: string;
  row: number;
  reason: string;
}

interface ImportReport {
  dryRun: boolean;
  companies: { created: number; updated: number; unchanged: number; skipped: number };
  contacts: { created: number; updated: number; unchanged: number; skipped: number };
  suppressionsAdded: number;
  suppressionsRemoved: number;
  warnings: string[];
  skipped: SkipRow[];
}

async function readFile(file: File | undefined): Promise<string | undefined> {
  if (!file) return undefined;
  return file.text();
}

export default function ImportPage() {
  const { workspaceId } = useActiveWorkspace();
  const [contacts, setContacts] = useState<File | undefined>();
  const [companies, setCompanies] = useState<File | undefined>();
  const [prospects, setProspects] = useState<File | undefined>();
  const [doNotEmail, setDoNotEmail] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function run(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          contactsCsv: await readFile(contacts),
          companiesCsv: await readFile(companies),
          prospectsCsv: await readFile(prospects),
          doNotEmail,
          invalidEmail,
          dryRun,
        }),
      });
      const payload = (await response.json()) as { report?: ImportReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error ?? "Import failed");
      setReport(payload.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Import"
        subtitle="HubSpot-style contact and company files, or an outbound prospects sheet. Re-running the same file updates matches instead of duplicating them."
      />
      <CrmNav workspaceId={workspaceId} current={`/w/${workspaceId}/crm/import`} />
      <Card className="grid gap-4 p-5">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Contacts CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => setContacts(event.target.files?.[0])} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Companies CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => setCompanies(event.target.files?.[0])} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Prospects CSV</span>
          <span className="text-muted-foreground">
            Columns: segment, sub_type, company, website, hq_state, size_signal, why_fit, source_url, contact_name, title, linkedin, email, phone, confidence.
          </span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => setProspects(event.target.files?.[0])} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doNotEmail} onChange={(event) => setDoNotEmail(event.target.checked)} />
          Mark every contact do-not-email and suppress the address
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={invalidEmail} onChange={(event) => setInvalidEmail(event.target.checked)} />
          Mark every email invalid and suppress the address
        </label>
        <div className="flex gap-2">
          <Button tone="soft" disabled={busy} onClick={() => void run(true)}>
            {busy ? "Working…" : "Dry run"}
          </Button>
          <Button disabled={busy} onClick={() => void run(false)}>
            Import
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Large files belong on the server: <code>npm run import:csv -- --workspace {workspaceId} --contacts file.csv --companies file.csv</code>
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>
      {report ? (
        <Card className="mt-4 p-5 text-sm">
          <div className="font-semibold">{report.dryRun ? "Dry run" : "Import"} report</div>
          <p className="mt-2">
            Companies — created {report.companies.created}, updated {report.companies.updated}, unchanged {report.companies.unchanged}, skipped {report.companies.skipped}
          </p>
          <p>
            Contacts — created {report.contacts.created}, updated {report.contacts.updated}, unchanged {report.contacts.unchanged}, skipped {report.contacts.skipped}
          </p>
          <p>
            Suppressions added {report.suppressionsAdded}, removed {report.suppressionsRemoved}
          </p>
          {report.warnings.map((warning) => (
            <p key={warning} className="mt-2">{warning}</p>
          ))}
          {report.skipped.length > 0 ? (
            <ul className="mt-3 max-h-80 space-y-1 overflow-auto">
              {report.skipped.slice(0, 100).map((skip) => (
                <li key={`${skip.file}-${skip.row}-${skip.reason}`}>
                  {skip.file} row {skip.row}: {skip.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">No rows skipped.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
