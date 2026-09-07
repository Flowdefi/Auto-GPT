"use client";

import { useRouter } from "next/navigation";
import { Badge, Button, Card, Title } from "@/components/ui";
import { accountName } from "@/lib/format";
import { planFloor } from "@/lib/recovery-bot";
import { useCove } from "@/lib/store";

export default function BotPage() {
  const router = useRouter();
  const data = useCove();
  const runBotAction = useCove((state) => state.runBotAction);
  const setAutoBot = useCove((state) => state.setAutoBot);
  const actions = planFloor(data);

  return (
    <div>
      <Title
        kicker="Autonomous recovery"
        title="Timeline bot"
        sub="Reads every account’s activity and proposes the next legal step: validate, skip, plan, SMS, or hold. Never dials a licensed state or a cease file."
        actions={
          <Button tone={data.autoBot ? "coral" : "ghost"} onClick={() => setAutoBot(!data.autoBot)}>
            Auto mode {data.autoBot ? "on" : "off"}
          </Button>
        }
      />
      {data.autoBot ? (
        <p className="mb-4 text-sm text-cove-coral">
          Auto mode will execute allowed actions when you tap “Run allowed now”. It still refuses gated states.
        </p>
      ) : null}
      <div className="mb-4">
        <Button
          onClick={() => {
            actions
              .filter((action) => action.allowed)
              .slice(0, 4)
              .forEach((action) => {
                runBotAction(action.accountId, action.kind);
                if (action.kind === "call") router.push("/call");
              });
          }}
        >
          Run next allowed steps
        </Button>
      </div>
      <div className="grid gap-3">
        {actions.map((action) => {
          const account = data.accounts.find((item) => item.id === action.accountId);
          return (
            <Card key={action.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {account ? accountName(account.firstName, account.lastName) : action.accountId} · {action.title}
                  </div>
                  <div className="text-sm text-cove-mute">{action.reason}</div>
                  {action.blockedReason ? <div className="mt-1 text-sm text-cove-coral">{action.blockedReason}</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={action.allowed ? "sage" : "coral"}>{action.allowed ? "allowed" : "blocked"}</Badge>
                  <Button
                    disabled={!action.allowed}
                    onClick={() => {
                      runBotAction(action.accountId, action.kind);
                      if (action.kind === "call") router.push("/call");
                    }}
                  >
                    Run
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
