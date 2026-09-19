import type { HubId, WorkspaceId } from "./types";

export interface NavItem {
  href: string;
  label: string;
  hub: HubId;
  mobile?: boolean;
}

export function navFor(workspaceId: WorkspaceId): NavItem[] {
  const base = `/w/${workspaceId}`;
  const inventory = workspaceId === "triton" ? "Portfolios" : "Inventory";
  return [
    { href: `${base}/home`, label: "Home", hub: "home", mobile: true },
    { href: `${base}/crm/contacts`, label: "CRM", hub: "crm", mobile: true },
    { href: `${base}/conversations`, label: "Inbox", hub: "conversations", mobile: true },
    { href: `${base}/sales/deals`, label: "Sales", hub: "sales", mobile: true },
    { href: `${base}/marketplace`, label: inventory, hub: "marketplace" },
    { href: `${base}/marketing/bulk`, label: "Marketing", hub: "marketing" },
    { href: `${base}/service/tickets`, label: "Service", hub: "service" },
    { href: `${base}/content/pages`, label: "CMS", hub: "content" },
    { href: `${base}/seo`, label: "SEO", hub: "seo" },
    { href: `${base}/automation`, label: "Automation", hub: "automation" },
    { href: `${base}/reporting`, label: "Reporting", hub: "reporting" },
    { href: `${base}/data/graph`, label: "Graph / RAG", hub: "automation" },
    { href: `${base}/compliance`, label: "Compliance", hub: "compliance" },
    { href: `${base}/ai`, label: "AI", hub: "ai", mobile: true },
  ];
}

export function hubFromPath(pathname: string): HubId {
  if (pathname.includes("/conversations")) return "conversations";
  if (pathname.includes("/crm")) return "crm";
  if (pathname.includes("/sales")) return "sales";
  if (pathname.includes("/marketplace")) return "marketplace";
  if (pathname.includes("/marketing")) return "marketing";
  if (pathname.includes("/service")) return "service";
  if (pathname.includes("/content")) return "content";
  if (pathname.includes("/seo")) return "seo";
  if (pathname.includes("/automation")) return "automation";
  if (pathname.includes("/reporting")) return "reporting";
  if (pathname.includes("/compliance")) return "compliance";
  if (pathname.includes("/ai")) return "ai";
  if (pathname.includes("/data/")) return "automation";
  return "home";
}
