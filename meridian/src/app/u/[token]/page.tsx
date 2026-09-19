"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-50 px-4">
      <Card className="max-w-md p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
          DebtMarket · Triton Financial Solutions
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Unsubscribe</h1>
        <p className="mt-2 text-sm text-ink-600">
          One-click unsubscribe from Meridian marketing mail sent by portfolios@debtmarket.net.
          Transactional deal mail is not affected.
        </p>
        {state === "done" ? (
          <p className="mt-4 text-sm font-medium text-emerald-700">You are unsubscribed. Sorry to see you go.</p>
        ) : (
          <Button
            className="mt-6"
            onClick={async () => {
              const response = await fetch("/api/email/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: params.token }),
              });
              setState(response.ok ? "done" : "error");
            }}
          >
            Unsubscribe
          </Button>
        )}
        {state === "error" ? <p className="mt-3 text-sm text-red-700">That link is invalid or already used.</p> : null}
      </Card>
    </div>
  );
}
