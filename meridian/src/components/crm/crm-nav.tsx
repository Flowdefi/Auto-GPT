"use client";

import { Subnav } from "@/components/subnav";

export function CrmNav({ workspaceId, current }: { workspaceId: string; current: string }) {
  return (
    <Subnav
      current={current}
      items={[
        { href: `/w/${workspaceId}/crm/contacts`, label: "Contacts" },
        { href: `/w/${workspaceId}/crm/companies`, label: "Companies" },
        { href: `/w/${workspaceId}/crm/import`, label: "Import" },
      ]}
    />
  );
}
