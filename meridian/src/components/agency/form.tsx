"use client";

import { useState, type FormEvent } from "react";

export function AgencyForm({ kind }: { kind: "contact" | "dispute" }) {
  const [summary, setSummary] = useState("");
  const [reference, setReference] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    const response = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        summary,
        accountRef: reference,
        channel: "web",
        rootCause: kind === "dispute" ? "validation" : "other",
      }),
    });
    const body = (await response.json()) as { error?: string; responseDueAt?: string };
    setNotice(body.error ?? `Received. A response date is on file for ${body.responseDueAt?.slice(0, 10) ?? "counsel review"}.`);
    if (response.ok) setSummary("");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 grid gap-3">
      <label className="grid gap-1 text-sm" htmlFor="agency-reference">
        Reference number, if you have one
        <input id="agency-reference" className="min-h-11 rounded-xl border border-[#1c2430] bg-white px-3" autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="agency-message">
        Message
        <textarea id="agency-message" className="min-h-28 rounded-xl border border-[#1c2430] bg-white p-3" required value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      <button className="min-h-11 rounded-full bg-[#1c2430] px-5 text-white" type="submit">Send</button>
      {notice ? <p role={notice.startsWith("Received") ? "status" : "alert"} className="text-sm">{notice}</p> : null}
    </form>
  );
}
