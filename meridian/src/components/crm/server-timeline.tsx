"use client";

import { useEffect, useState } from "react";
import { activityLabel } from "@/lib/desk-activity";
import { safeHttpUrl } from "@/lib/debt";
import { when } from "@/lib/format";
import type { DeskActivity } from "@/server/models";
import type { WorkspaceId } from "@/lib/types";

export function ServerTimeline({
  workspaceId,
  contactId,
  companyId,
}: {
  workspaceId: WorkspaceId;
  contactId?: string;
  companyId?: string;
}) {
  const [items, setItems] = useState<DeskActivity[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ workspace: workspaceId });
    if (contactId) params.set("contactId", contactId);
    if (companyId) params.set("companyId", companyId);
    void fetch(`/api/activities?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { activities?: DeskActivity[] };
        setItems(body.activities ?? []);
      })
      .catch(() => setItems([]));
  }, [workspaceId, contactId, companyId]);

  if (items.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const href = safeHttpUrl(item.link);
        return (
          <article key={item.id} className="border-t pt-3 text-sm">
            <div className="font-medium">
              {activityLabel(item.type)} · {item.subject}
            </div>
            {item.body ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.body}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {when(item.at)}
              {href ? (
                <>
                  {" "}
                  ·{" "}
                  <a className="underline" href={href} target="_blank" rel="noreferrer">
                    Open in Outlook
                  </a>
                </>
              ) : null}
            </p>
          </article>
        );
      })}
    </div>
  );
}
