"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function AgencyForm({ kind }: { kind: "contact" | "dispute" }) {
  const [summary, setSummary] = useState("");
  const [reference, setReference] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setFailed(false);
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
    if (!response.ok) {
      setFailed(true);
      setNotice(body.error ?? "The form could not be sent.");
      return;
    }
    setFailed(false);
    setNotice(`Received. A response date is on file for ${body.responseDueAt?.slice(0, 10) ?? "counsel review"}. Counsel reviews that date.`);
    setSummary("");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 grid gap-3" aria-describedby={failed ? "agency-form-error" : undefined}>
      <label className="grid gap-1 text-sm" htmlFor="agency-reference">
        Reference number, if you have one
        <input id="agency-reference" className="min-h-11 rounded-xl border border-[#1c2430] bg-white px-3" autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} aria-invalid={failed ? true : undefined} aria-describedby={failed ? "agency-form-error" : undefined} />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="agency-message">
        Message
        <textarea id="agency-message" className="min-h-28 rounded-xl border border-[#1c2430] bg-white p-3" required value={summary} onChange={(event) => setSummary(event.target.value)} aria-invalid={failed ? true : undefined} aria-describedby={failed ? "agency-form-error" : undefined} />
      </label>
      <button className="min-h-11 rounded-full bg-[#1c2430] px-5 text-white" type="submit">Send</button>
      <p className="text-sm">This form is a draft. The response date is operational, and counsel reviews it.</p>
      {notice ? (
        <p id={failed ? "agency-form-error" : undefined} ref={noticeRef} tabIndex={-1} role={failed ? "alert" : "status"} className="text-sm">{notice}</p>
      ) : null}
    </form>
  );
}
