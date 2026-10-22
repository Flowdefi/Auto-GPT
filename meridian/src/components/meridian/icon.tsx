"use client";

import {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Home,
  Inbox,
  Layers,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Network,
  Plug,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Home,
  Inbox,
  Layers,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Network,
  Plug,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className={className} aria-hidden />;
}
