"use client";

import { Badge, Button, Card, Title } from "@/components/ui";
import { accountName } from "@/lib/format";
import { useCove } from "@/lib/store";

export default function SmsPage() {
  const accounts = useCove((state) => state.accounts);
  const messages = useCove((state) => state.messages.filter((message) => message.channel === "sms"));
  const sendMessage = useCove((state) => state.sendMessage);
  return (
    <div>
      <Title
        kicker="10DLC registered"
        title="SMS agent"
        sub="Authenticated A2P traffic. Mini-Miranda + STOP. Consent and state gate checked before send."
      />
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        {accounts
          .filter((account) => account.consent.sms)
          .map((account) => (
            <Card key={account.id} className="p-4">
              <div className="font-semibold">{accountName(account.firstName, account.lastName)}</div>
              <div className="text-xs text-cove-mute">{account.phone}</div>
              <Button className="mt-3 w-full" onClick={() => sendMessage(account.id, "sms")}>
                Send authenticated SMS
              </Button>
            </Card>
          ))}
      </div>
      <Card className="p-5">
        <div className="font-semibold">Outbox</div>
        {messages.map((message) => (
          <div key={message.id} className="mt-3 whitespace-pre-wrap border-t border-parchment-100 pt-3 text-sm">
            <Badge tone="teal">{message.authenticated ? "10DLC pass" : "unauth"}</Badge>
            <div className="mt-1">{message.body}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
