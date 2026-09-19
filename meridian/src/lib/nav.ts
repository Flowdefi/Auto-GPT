import type { HubId, WorkspaceId } from "./types";

export interface NavItem {
  href: string;
  label: string;
  hub: HubId;
  icon: string;
  group: "Workspace" | "Revenue" | "Marketing" | "Platform";
  mobile?: boolean;
}

export function navFor(workspaceId: WorkspaceId): NavItem[] {
  const base = `/w/${workspaceId}`;
  const inventory = workspaceId === "triton" ? "Portfolios" : "Inventory";
  return [
    { href: `${base}/home`, label: "Home", hub: "home", icon: "Home", group: "Workspace", mobile: true },
    { href: `${base}/crm/contacts`, label: "Contacts", hub: "crm", icon: "Users", group: "Workspace", mobile: true },
    { href: `${base}/crm/companies`, label: "Companies", hub: "crm", icon: "Building2", group: "Workspace" },
    { href: `${base}/conversations`, label: "Inbox", hub: "conversations", icon: "Inbox", group: "Workspace", mobile: true },

    { href: `${base}/leads`, label: "Leads", hub: "sales", icon: "Target", group: "Revenue" },
    { href: `${base}/sales/deals`, label: "Deals", hub: "sales", icon: "Briefcase", group: "Revenue", mobile: true },
    { href: `${base}/sales/forecast`, label: "Forecast", hub: "sales", icon: "TrendingUp", group: "Revenue" },
    { href: `${base}/sales/sequences`, label: "Sequences", hub: "sales", icon: "ListChecks", group: "Revenue" },
    { href: `${base}/marketplace`, label: inventory, hub: "marketplace", icon: "Layers", group: "Revenue" },

    { href: `${base}/marketing/bulk`, label: "Email blast", hub: "marketing", icon: "Send", group: "Marketing" },
    { href: `${base}/marketing/campaigns`, label: "Campaigns", hub: "marketing", icon: "Megaphone", group: "Marketing" },
    { href: `${base}/seo`, label: "SEO", hub: "seo", icon: "Search", group: "Marketing" },
    { href: `${base}/content/pages`, label: "Content", hub: "content", icon: "FileText", group: "Marketing" },

    { href: `${base}/ai`, label: "AI CTO", hub: "ai", icon: "Sparkles", group: "Platform", mobile: true },
    { href: `${base}/automation`, label: "Automation", hub: "automation", icon: "Workflow", group: "Platform" },
    { href: `${base}/data/graph`, label: "Graph / RAG", hub: "automation", icon: "Network", group: "Platform" },
    { href: `${base}/reporting`, label: "Reporting", hub: "reporting", icon: "BarChart3", group: "Platform" },
    { href: `${base}/service/tickets`, label: "Service", hub: "service", icon: "LifeBuoy", group: "Platform" },
    { href: `${base}/compliance`, label: "Compliance", hub: "compliance", icon: "ShieldCheck", group: "Platform" },
    { href: `${base}/settings/integrations`, label: "Integrations", hub: "automation", icon: "Plug", group: "Platform" },
  ];
}

export function hubFromPath(pathname: string): HubId {
  if (pathname.includes("/conversations")) return "conversations";
  if (pathname.includes("/crm")) return "crm";
  if (pathname.includes("/leads")) return "sales";
  if (pathname.includes("/sales")) return "sales";
  if (pathname.includes("/marketplace")) return "marketplace";
  if (pathname.includes("/marketing")) return "marketing";
  if (pathname.includes("/service")) return "service";
  if (pathname.includes("/content")) return "content";
  if (pathname.includes("/seo")) return "seo";
  if (pathname.includes("/automation")) return "automation";
  if (pathname.includes("/settings")) return "automation";
  if (pathname.includes("/data/")) return "automation";
  if (pathname.includes("/reporting")) return "reporting";
  if (pathname.includes("/compliance")) return "compliance";
  if (pathname.includes("/ai")) return "ai";
  return "home";
}
