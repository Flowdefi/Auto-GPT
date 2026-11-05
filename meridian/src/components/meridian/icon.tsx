"use client";

import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  FileText,
  HardDrive,
  Home,
  Inbox,
  KeyRound,
  Layers,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Network,
  Phone,
  Plug,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  FileText,
  HardDrive,
  Home,
  Inbox,
  KeyRound,
  Layers,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Network,
  Phone,
  Plug,
  Search,
  Send,
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
