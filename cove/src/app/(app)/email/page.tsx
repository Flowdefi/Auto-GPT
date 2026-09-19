"use client";

import { Badge, Button, Card, Title } from "@/components/ui";
import { accountName } from "@/lib/format";
import { useCove } from "@/lib/store";

export default function EmailPage() {
  const accounts = useCove((state) => state.accounts);
  const messages = useCove((state) => state.messages.filter((message) => message.channel === "email"));
  const sendMessage = useCove((state) => state.sendMessage);
  const sendValidation = useCove((state) => state.sendValidation);
  return (
    <div>
      <Title
        kicker="SPF · DKIM · DMARC"
        title="Email agent"
        sub="Authenticated outbound. Validation letters go first when missing. No demand copy without the notice."
      />
      <div className="mb-4 grid gap-2 md:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="font-semibold">{accountName(account.firstName, account.lastName)}</div>
            <div className="text-xs text-cove-mute">{account.email}</div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => sendMessage(account.id, "email")}>Send email</Button>
              <Button tone="ghost" onClick={() => sendValidation(account.id)}>
                Validation
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="font-semibold">Outbox</div>
        {messages.map((message) => (
          <div key={message.id} className="mt-3 whitespace-pre-wrap text-sm">
            <Badge tone="sage">{message.authenticated ? "DMARC pass" : "fail"}</Badge>
            <div className="mt-1">{message.body}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
