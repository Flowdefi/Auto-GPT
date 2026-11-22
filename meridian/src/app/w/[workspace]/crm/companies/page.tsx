"use client";

import { useState } from "react";
import { CompanyForm } from "@/components/crm/company-form";
import { CrmNav } from "@/components/crm/crm-nav";
import { saveRemoteCompany, useCrmDirectory } from "@/components/crm/use-crm";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { blankCompany } from "@/lib/debt";
import { useMeridian } from "@/lib/store";
import type { Company } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CompaniesPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const directory = useCrmDirectory(workspaceId);
  const addCompany = useMeridian((state) => state.addCompany);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function create(company: Company) {
    setError(null);
    try {
      if (directory.remote) {
        await saveRemoteCompany(workspaceId, { ...company, id: "" });
        await directory.reload();
      } else {
        addCompany(company);
      }
      setOpen(false);
      setFormKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Companies"
        subtitle="Sellers, buyers, brokers, and the accounts they sit on."
        actions={<Button onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Create company"}</Button>}
      />
      <CrmNav workspaceId={workspaceId} current={`/w/${workspaceId}/crm/companies`} />
      {directory.notice ? <Card className="mb-4 p-4 text-sm">{directory.notice}</Card> : null}
      {open ? (
        <Card className="mb-4 p-4">
          <CompanyForm
            key={formKey}
            value={blankCompany({ ownerId: data.users[0]?.id ?? "", lifecycle: "lead" })}
            users={data.users}
            submitLabel="Save company"
            onSubmit={(company) => void create(company)}
            onCancel={() => setOpen(false)}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </Card>
      ) : null}
      <DataTable
        headers={["Company", "Kind", "Debt roles", "Industry", "Target", "Lifecycle"]}
        rows={directory.companies.map((company) => ({
          key: company.id,
          href: `/w/${workspaceId}/crm/companies/${company.id}`,
          cells: [
            company.name,
            company.type,
            (company.debtRoles ?? []).join(", ") || company.companyType || "—",
            company.industry || "—",
            company.targetAccount ? <Badge key="t" tone="accent">Target</Badge> : "—",
            <Badge key="l" tone="accent">{company.lifecycle}</Badge>,
          ],
        }))}
      />
    </div>
  );
}
