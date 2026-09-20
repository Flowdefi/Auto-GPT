"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { money } from "@/lib/format";
import { haptic } from "@/lib/ios";
import { navFor } from "@/lib/nav";
import { useActiveWorkspace } from "@/lib/use-workspace";
import { NavIcon } from "./icon";

export function CommandPalette({
  open,
  onOpenChange,
  onAskAi,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskAi: () => void;
}) {
  const router = useRouter();
  const { workspaceId, data, config } = useActiveWorkspace();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function go(href: string) {
    haptic("light");
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description={`Search ${config.product}`}
    >
      <CommandInput placeholder={`Search ${config.product}, or jump to a record…`} />
      <CommandList className="momentum-scroll">
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              haptic("medium");
              onOpenChange(false);
              onAskAi();
            }}
          >
            <NavIcon name="Sparkles" className="size-4" />
            Ask the AI CTO
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {navFor(workspaceId).map((item) => (
            <CommandItem key={item.href} value={`${item.label} ${item.group}`} onSelect={() => go(item.href)}>
              <NavIcon name={item.icon} className="size-4" />
              {item.label}
              <span className="ml-auto text-xs text-muted-foreground">{item.group}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Contacts">
          {data.contacts.slice(0, 20).map((contact) => (
            <CommandItem
              key={contact.id}
              value={`${contact.firstName} ${contact.lastName} ${contact.email} ${contact.title}`}
              onSelect={() => go(`/w/${workspaceId}/crm/contacts/${contact.id}`)}
            >
              <NavIcon name="Users" className="size-4" />
              {contact.firstName} {contact.lastName}
              <span className="ml-auto truncate text-xs text-muted-foreground">{contact.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Companies">
          {data.companies.slice(0, 20).map((company) => (
            <CommandItem
              key={company.id}
              value={`${company.name} ${company.industry}`}
              onSelect={() => go(`/w/${workspaceId}/crm/companies/${company.id}`)}
            >
              <NavIcon name="Building2" className="size-4" />
              {company.name}
              <span className="ml-auto truncate text-xs text-muted-foreground">{company.industry}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Deals">
          {data.deals.map((deal) => (
            <CommandItem
              key={deal.id}
              value={`${deal.name} ${deal.stage}`}
              onSelect={() => go(`/w/${workspaceId}/sales/deals/${deal.id}`)}
            >
              <NavIcon name="Briefcase" className="size-4" />
              {deal.name}
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{money(deal.amount)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
