"use client";

import Link from "next/link";
import { Badge, Card, Title } from "@/components/ui";
import { accountName, money } from "@/lib/format";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

export default function AccountsPage() {
  const accounts = useCove((state) => state.accounts);
  return (
    <div>
      <Title kicker="Debtor CRM" title="Accounts" sub="Balance, state gate, consent, and last notes — tap in for the centered timeline." />
      <div className="grid gap-3">
        {accounts.map((account) => (
          <Link key={account.id} href={`/accounts/${account.id}`}>
            <Card className="p-4 transition hover:shadow-paper">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{accountName(account.firstName, account.lastName)}</div>
                  <div className="text-sm text-cove-mute">
                    {account.city}, {account.state} · {account.product}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-2xl">{money(account.balance)}</div>
                  <Badge tone={canDialState(account.state) ? "sage" : "coral"}>{account.state}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
