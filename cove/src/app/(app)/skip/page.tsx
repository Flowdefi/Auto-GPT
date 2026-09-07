"use client";

import { Button, Card, Title } from "@/components/ui";
import { accountName } from "@/lib/format";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

export default function SkipPage() {
  const accounts = useCove((state) => state.accounts);
  const skipTrace = useCove((state) => state.skipTrace);
  return (
    <div>
      <Title
        kicker="Locate"
        title="Skip tracing"
        sub="Phones, emails, employers, relatives. Social is match-only — no friend requests, no scraping logins. Gated states stay locked."
      />
      <div className="grid gap-3">
        {accounts.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{accountName(account.firstName, account.lastName)}</div>
                <div className="text-sm text-cove-mute">
                  {account.state} · {canDialState(account.state) ? "run allowed" : "blocked"}
                </div>
              </div>
              <Button disabled={!canDialState(account.state)} onClick={() => skipTrace(account.id)}>
                Run skip
              </Button>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {account.skipHits.map((hit) => (
                <div key={hit.id}>
                  {hit.kind}: {hit.value} · {hit.confidence}% · {hit.source}
                </div>
              ))}
              {account.social.map((profile) => (
                <div key={profile.network} className="text-cove-mute">
                  {profile.network}: {profile.note}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
