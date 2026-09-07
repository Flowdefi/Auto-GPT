"use client";

import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { contactName, relativeDay } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";
import type { TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["new", "waiting", "in_progress", "resolved"];

export default function TicketsPage() {
  const { data } = useActiveWorkspace();
  const setTicketStatus = useMeridian((state) => state.setTicketStatus);

  return (
    <div>
      <PageHeader eyebrow="Service Hub" title="Tickets" subtitle="Buyer ops, compliance, listings, and post-sale media — shared with the inbox." />
      <div className="grid gap-3 md:grid-cols-2">
        {data.tickets.map((ticket) => {
          const requester = data.contacts.find((contact) => contact.id === ticket.requesterId);
          return (
            <Card key={ticket.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{ticket.subject}</div>
                <Badge tone={ticket.priority === "high" || ticket.priority === "urgent" ? "warn" : "neutral"}>
                  {ticket.priority}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-ink-600">{ticket.preview}</p>
              <div className="mt-3 text-xs text-ink-500">
                {ticket.pipeline} · {requester ? contactName(requester.firstName, requester.lastName) : "—"} ·{" "}
                {relativeDay(ticket.createdAt)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <Button
                    key={status}
                    tone={ticket.status === status ? "primary" : "ghost"}
                    className="min-h-9 text-xs"
                    onClick={() => setTicketStatus(ticket.id, status)}
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
