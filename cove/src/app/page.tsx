"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HydrateGate } from "@/components/hydrate-gate";
import { Button, Card } from "@/components/ui";
import { useCove } from "@/lib/store";

export default function ClockPage() {
  const router = useRouter();
  const agents = useCove((state) => state.agents);
  const clockIn = useCove((state) => state.clockIn);
  const reset = useCove((state) => state.reset);

  return (
    <HydrateGate>
      <div className="mx-auto min-h-dvh max-w-3xl px-5 py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cove-sand">Triton · Cove</div>
        <h1 className="mt-2 font-serif text-5xl tracking-tight">Clock in to the floor.</h1>
        <p className="mt-4 max-w-xl text-cove-mute">
          Consumer collections for states that do not require a collection-agency license. Federal FDCPA / TCPA still
          apply. Warm parchment UI for long days. iOS and Android as a PWA.
        </p>
        <div className="mt-8 grid gap-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-semibold">{agent.name}</div>
                <div className="text-sm text-cove-mute">
                  {agent.role} · {agent.status.replace("_", " ")}
                </div>
              </div>
              <Button
                onClick={() => {
                  clockIn(agent.id);
                  router.push("/floor");
                }}
              >
                Clock in
              </Button>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/compliance" className="text-cove-teal">
            Open-state map
          </Link>
          <button type="button" className="text-cove-mute" onClick={() => reset()}>
            Reset demo
          </button>
          <a href="http://localhost:3000" className="text-cove-mute">
            Meridian brokerage CRM
          </a>
        </div>
      </div>
    </HydrateGate>
  );
}
