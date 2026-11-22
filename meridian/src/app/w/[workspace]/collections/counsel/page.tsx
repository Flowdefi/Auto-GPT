"use client";

import { useEffect, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Packet {
  notice: string;
  templatesNeedingCounsel: number;
  templatesUnapproved: number;
  items: Array<{ area: string; flag: string; note: string }>;
}

export default function CounselPacketPage() {
  const { workspaceId } = useActiveWorkspace();
  const [packet, setPacket] = useState<Packet | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "counsel_packet", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: Packet) => setPacket(body))
      .catch(() => undefined);
  }, [workspaceId]);

  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Counsel packet" subtitle={packet?.notice ?? "Draft for counsel review. Not legal advice."} />
      {packet ? (
        <Card className="mb-4 p-4 text-sm">
          <p>{packet.templatesNeedingCounsel} templates still carry a counsel-review flag. {packet.templatesUnapproved} are not owner-approved, so they cannot send.</p>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {(packet?.items ?? []).map((item) => (
          <Card key={item.area} className="p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="font-semibold">{item.area}</span>
              <Badge tone="warn">{item.flag}</Badge>
            </div>
            <p className="mt-2">{item.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
