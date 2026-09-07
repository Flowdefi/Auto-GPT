"use client";

import { Card, Title } from "@/components/ui";
import { accountName, money, when } from "@/lib/format";
import { useCove } from "@/lib/store";

export default function PaymentsPage() {
  const payments = useCove((state) => state.payments);
  const plans = useCove((state) => state.plans);
  const accounts = useCove((state) => state.accounts);
  return (
    <div>
      <Title
        kicker="Cove Pay"
        title="Payments"
        sub="Card and ACH with tokenized last-4. Plans sit on the debtor record and write the same timeline."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="font-semibold">Recent captures</div>
          {payments.map((payment) => {
            const account = accounts.find((item) => item.id === payment.accountId);
            return (
              <div key={payment.id} className="mt-3 border-t border-parchment-100 pt-3 text-sm">
                <div className="font-medium">
                  {money(payment.amount)} · {payment.method} •{payment.last4}
                </div>
                <div className="text-cove-mute">
                  {account ? accountName(account.firstName, account.lastName) : payment.accountId} · {when(payment.at)}
                </div>
              </div>
            );
          })}
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Active plans</div>
          {plans.map((plan) => {
            const account = accounts.find((item) => item.id === plan.accountId);
            return (
              <div key={plan.id} className="mt-3 text-sm">
                {account ? accountName(account.firstName, account.lastName) : plan.accountId} · {money(plan.installment)}{" "}
                {plan.cadence} · next {plan.nextDue}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
