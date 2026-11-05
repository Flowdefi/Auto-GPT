"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface MailJob {
  id: string;
  accountRef: string;
  templateId: string;
  status: string;
  provider: string;
  reason: string | null;
}

export default function MailPage() {
  const { workspaceId } = useActiveWorkspace();
  const [accountId, setAccountId] = useState("");
  const [templateId, setTemplateId] = useState("LTR-001");
  const [jobs, setJobs] = useState<MailJob[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; jobs?: MailJob[]; pdfBase64?: string };
    setNotice(body.error ?? null);
    if (body.jobs) setJobs(body.jobs);
    if (body.pdfBase64) {
      const blob = new Blob([Uint8Array.from(atob(body.pdfBase64), (char) => char.charCodeAt(0))], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    }
  }

  useEffect(() => {
    void post({ op: "letter_list" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <div>
      <PageHeader eyebrow="Collector" title="Mail house" subtitle="Every letter template renders to a one-page PDF and waits in the queue. The job worker files it through the compliance gate. Lob is used only when the letter provider and live delivery are both set. Returned mail pauses later letter steps on that account." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="grid gap-1">Account id
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Account id" />
        </label>
        <label className="grid gap-1">Letter template
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={templateId} onChange={(event) => setTemplateId(event.target.value)} aria-label="Letter template" />
        </label>
        <Button onClick={() => void post({ op: "letter_queue", accountId, templateId })}>Queue letter</Button>
      </Card>
      <div className="grid gap-3">
        {jobs.map((job) => (
          <Card key={job.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{job.accountRef || job.id}</span>
              <Badge>{job.templateId}</Badge>
              <Badge tone={job.status === "returned" || job.status === "paused" ? "warn" : "good"}>{job.status}</Badge>
              <span>{job.provider}</span>
            </div>
            {job.reason ? <p className="mt-2">{job.reason}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="soft" onClick={() => void post({ op: "letter_pdf", mailJobId: job.id })}>Open PDF</Button>
              <Button tone="soft" onClick={() => void post({ op: "letter_returned", mailJobId: job.id }).then(() => post({ op: "letter_list" }))}>Mark returned</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
