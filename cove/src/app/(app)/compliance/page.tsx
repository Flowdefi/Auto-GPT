"use client";

import { Badge, Card, Title } from "@/components/ui";
import { STATE_RULES } from "@/lib/states";

export default function CompliancePage() {
  const open = STATE_RULES.filter((rule) => rule.posture === "none");
  const mid = STATE_RULES.filter((rule) => rule.posture === "bond_or_registration");
  const licensed = STATE_RULES.filter((rule) => rule.posture === "license");

  return (
    <div>
      <Title
        kicker="Not legal advice · review quarterly"
        title="State gate"
        sub="Cove only originates calls, SMS, and email into states with no collection-agency license on the current map. FDCPA, TCPA, FCRA, and local city licenses still apply everywhere."
      />
      <Card className="mb-4 p-5 text-sm leading-relaxed text-cove-mute">
        Allowlist today: {open.map((rule) => rule.code).join(", ")}. Texas (bond) and Florida (registration) are not
        treated as license-free. California, New York, Illinois, and other license states are hard-blocked on the
        dialer. Chicago / NYC / Buffalo / Yonkers can still require local licenses even when the state does not.
      </Card>
      <h2 className="mb-2 font-semibold">No state collection license</h2>
      <div className="mb-6 grid gap-2 md:grid-cols-2">
        {open.map((rule) => (
          <Card key={rule.code} className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone="sage">{rule.code}</Badge>
              <span className="font-semibold">{rule.name}</span>
            </div>
            <p className="mt-1 text-sm text-cove-mute">{rule.note}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-2 font-semibold">Bond or registration — not in the dialer</h2>
      <div className="mb-6 grid gap-2 md:grid-cols-2">
        {mid.map((rule) => (
          <Card key={rule.code} className="p-4">
            <Badge tone="sand">{rule.code}</Badge> {rule.name}
            <p className="mt-1 text-sm text-cove-mute">{rule.note}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-2 font-semibold">License required — blocked</h2>
      <div className="flex flex-wrap gap-2">
        {licensed.map((rule) => (
          <Badge key={rule.code} tone="coral">
            {rule.code}
          </Badge>
        ))}
      </div>
    </div>
  );
}
