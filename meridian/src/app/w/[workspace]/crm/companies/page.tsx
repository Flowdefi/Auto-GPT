"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ServerCompany {
  id: string;
  name: string;
  domain: string;
  type: string;
  industry: string;
  score: number;
  lifecycle: string;
  enrichedAt?: string;
}

export default function CompaniesPage() {
  const { workspaceId } = useActiveWorkspace();
  const [companies, setCompanies] = useState<ServerCompany[]>([]);

  useEffect(() => {
    void fetch(`/api/crm/companies?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setCompanies(payload.companies ?? []));
  }, [workspaceId]);

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Companies" subtitle="Live company records, including enrichment from public sources." />
      <Subnav
        current={`/w/${workspaceId}/crm/companies`}
        items={[
          { href: `/w/${workspaceId}/crm/contacts`, label: "Contacts" },
          { href: `/w/${workspaceId}/crm/companies`, label: "Companies" },
        ]}
      />
      <DataTable
        headers={["Company", "Domain", "Type", "Industry", "Score", "Enriched"]}
        rows={companies.map((company) => ({
          key: company.id,
          href: `/w/${workspaceId}/crm/companies/${company.id}`,
          cells: [
            company.name,
            company.domain || "—",
            company.type,
            company.industry || "—",
            String(company.score),
            <Badge key="e" tone={company.enrichedAt ? "good" : "neutral"}>
              {company.enrichedAt ? "yes" : company.lifecycle}
            </Badge>,
          ],
        }))}
      />
    </div>
  );
}
