"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { ConsumerPayment } from "@/lib/collections/types";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function PaymentsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [payments, setPayments] = useState<ConsumerPayment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { payments?: ConsumerPayment[] };
    setPayments(body.payments ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function reverse(paymentId: string, reversal: "reversed" | "nsf") {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "payment_reverse", workspaceId, paymentId, reversal }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(body.error ?? (reversal === "nsf" ? "NSF restored the balance." : "Reversal restored the balance."));
    await refresh();
  }

  return (
    <div>
      <CollectorChrome shortcuts={[{ key: "r", label: "Reload payments", run: () => void refresh() }]} />
      <PageHeader
        eyebrow="Collections"
        title="Payments"
        subtitle="ACH stays in sandbox unless MERIDIAN_ACH_PROVIDER=stripe and live delivery are set. A preauthorized debit stores the authorization and a proof id. Bank account numbers are not stored. NSF and reversals put the amount back on the balance."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="grid gap-3">
        {payments.length === 0 ? <Card className="p-4 text-sm">No payments posted.</Card> : null}
        {payments.map((payment) => (
          <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">${(payment.amountCents / 100).toFixed(2)} · {payment.method ?? payment.provider}</div>
              <div className="text-muted-foreground">{payment.status}{payment.authorization ? ` · proof ${payment.authorization.proofId}` : ""}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{payment.status}</Badge>
              {payment.status === "succeeded" ? (
                <>
                  <Button tone="soft" onClick={() => void reverse(payment.id, "nsf")}>NSF</Button>
                  <Button tone="soft" onClick={() => void reverse(payment.id, "reversed")}>Reverse</Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
