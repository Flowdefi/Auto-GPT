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
    { href: `${base}/collections`, label: "Collections desk", hub: "compliance", icon: "Phone", group: "Platform" },
    { href: `${base}/client`, label: "Client portal", hub: "compliance", icon: "Briefcase", group: "Platform" },
    { href: `${base}/collections/complaints`, label: "Complaints", hub: "compliance", icon: "LifeBuoy", group: "Platform" },
    { href: `${base}/collections/payments`, label: "Payments", hub: "compliance", icon: "BarChart3", group: "Platform" },
    { href: `${base}/collections/scorecard`, label: "Scorecard", hub: "compliance", icon: "BarChart3", group: "Platform" },
    { href: `${base}/collections/dialer`, label: "Softphone", hub: "compliance", icon: "Phone", group: "Platform" },
    { href: `${base}/collections/campaigns`, label: "Campaign dialer", hub: "compliance", icon: "Megaphone", group: "Platform" },
    { href: `${base}/collections/mail`, label: "Mail house", hub: "compliance", icon: "FileText", group: "Platform" },
    { href: `${base}/collections/training`, label: "Training", hub: "compliance", icon: "ListChecks", group: "Platform" },
    { href: `${base}/collections/ops`, label: "Operations", hub: "compliance", icon: "BarChart3", group: "Platform" },
    { href: `${base}/collections/economics`, label: "Portfolio economics", hub: "compliance", icon: "TrendingUp", group: "Platform" },
    { href: `${base}/collections/settlement-desk`, label: "Settlement desk", hub: "compliance", icon: "ShieldCheck", group: "Platform" },
    { href: `${base}/collections/incident`, label: "Incident response", hub: "compliance", icon: "LifeBuoy", group: "Platform" },
    { href: `${base}/settings/brand`, label: "Agency brand", hub: "compliance", icon: "Sparkles", group: "Platform" },
    { href: `${base}/collections/queue`, label: "Collector queue", hub: "compliance", icon: "ListChecks", group: "Platform" },
    { href: `${base}/collections/workflows`, label: "Sequence builder", hub: "compliance", icon: "Workflow", group: "Platform" },
    { href: `${base}/settings/sol`, label: "Limitations table", hub: "compliance", icon: "FileText", group: "Platform" },
    { href: `${base}/settings/recording`, label: "Recording consent", hub: "compliance", icon: "Phone", group: "Platform" },
    { href: `${base}/collections/access-review`, label: "Access review", hub: "compliance", icon: "ShieldCheck", group: "Platform" },
    { href: `${base}/collections/metro2`, label: "Metro 2 export", hub: "compliance", icon: "FileText", group: "Platform" },
    { href: `${base}/collections/templates`, label: "Collection templates", hub: "compliance", icon: "FileText", group: "Platform" },
    { href: `${base}/collections/settlement`, label: "Settlement authority", hub: "compliance", icon: "ShieldCheck", group: "Platform" },
    { href: `${base}/collections/reports`, label: "Collection reports", hub: "reporting", icon: "BarChart3", group: "Platform" },
    { href: `${base}/settings/eligibility`, label: "State eligibility", hub: "compliance", icon: "ShieldCheck", group: "Platform" },
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
  if (pathname.includes("/compliance") || pathname.includes("/collections") || pathname.includes("/eligibility")) return "compliance";
  if (pathname.includes("/ai")) return "ai";
  return "home";
}
