"use client";

import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CompaniesPage() {
  const { workspaceId, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader eyebrow="CRM" title="Companies" subtitle="Sellers, buyers, issuers, venues, and partners." />
      <Subnav
        current={`/w/${workspaceId}/crm/companies`}
        items={[
          { href: `/w/${workspaceId}/crm/contacts`, label: "Contacts" },
          { href: `/w/${workspaceId}/crm/companies`, label: "Companies" },
        ]}
      />
      <DataTable
        headers={["Company", "Type", "Industry", "Owner", "Score", "Lifecycle"]}
        rows={data.companies.map((company) => {
          const owner = data.users.find((user) => user.id === company.ownerId);
          return {
            key: company.id,
            href: `/w/${workspaceId}/crm/companies/${company.id}`,
            cells: [
              company.name,
              company.type,
              company.industry,
              owner?.name ?? "—",
              String(company.score),
              <Badge key="l" tone="accent">{company.lifecycle}</Badge>,
            ],
          };
        })}
      />
    </div>
  );
}
