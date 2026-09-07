"use client";

import { Button, Card, Title } from "@/components/ui";
import { useCove } from "@/lib/store";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function VoicePage() {
  const scripts = useCove((state) => state.scripts);
  const improveScript = useCove((state) => state.improveScript);
  const latest = scripts[scripts.length - 1];
  return (
    <div>
      <Title
        kicker="STIR/SHAKEN A-attestation"
        title="Voice agent studio"
        sub="Natural phone calls with a self-improvement loop: outcomes rewrite the next script version. Mini-Miranda stays mandatory."
        actions={<Button onClick={improveScript}>Generate next version</Button>}
      />
      {latest ? (
        <Card className="mb-4 p-5">
          <div className="text-xs text-cove-mute">Live version {latest.version}</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{latest.body}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>RPC {pct(latest.rpcRate)}</div>
            <div>PTP {pct(latest.ptpRate)}</div>
            <div>Complaints {pct(latest.complaintRate)}</div>
            <div>Naturalness {pct(latest.naturalness)}</div>
          </div>
        </Card>
      ) : null}
      <div className="space-y-3">
        {[...scripts].reverse().map((script) => (
          <Card key={script.id} className="p-4">
            <div className="font-semibold">v{script.version}</div>
            <div className="text-sm text-cove-mute">{script.reason}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
