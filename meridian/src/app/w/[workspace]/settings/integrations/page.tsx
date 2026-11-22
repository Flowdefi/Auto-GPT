"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface PlatformSnapshot {
  mail: { ready: boolean; provider: string; from: string; envelope?: string; hint: string };
  outlook: { configured: boolean; mailboxes: string[]; hint: string; scopesNeeded: string[] };
  ai: { configured: boolean; model?: string; fast?: string; embed?: string; hint: string };
  embeddings: { mode: string; model: string; dim: number };
  seo: { name: string; configured: boolean };
  auth: { domain: string; score: number; verdict: string; summary: string };
  forms: { submit: string; embed: string; snippet: string };
  counts: { leads: number; inbox: number; submissions: number; workflows: number };
}

function OneDriveCard({ workspaceId }: { workspaceId: string }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id: string; name: string; webUrl?: string; folder: boolean }>>([]);
  const [target, setTarget] = useState("inventory");
  const [targetId, setTargetId] = useState("");

  async function browse(itemId?: string) {
    const response = await fetch("/api/outlook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, action: "drive", itemId }),
    });
    const body = (await response.json()) as { items?: typeof items; hint?: string; error?: string; configured?: boolean };
    setItems(body.items ?? []);
    setNotice(body.error ?? (body.configured === false ? body.hint ?? "Graph is not configured" : null));
  }

  async function attach(item: { id: string; name: string; webUrl?: string }) {
    if (!targetId.trim()) {
      setNotice("Enter the portfolio, deal, or contact id first.");
      return;
    }
    const response = await fetch("/api/outlook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        action: "attach",
        target,
        targetId: targetId.trim(),
        name: item.name,
        webUrl: item.webUrl,
        driveItemId: item.id,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(body.error ?? `Attached ${item.name}`);
  }

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="font-semibold">OneDrive</div>
      <p className="mt-2 text-sm text-muted-foreground">
        Files from the mailbox owner&apos;s drive. Attaching stores the web link and Graph id. Nothing is downloaded onto this server. If Microsoft credentials are empty, this list stays empty.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select className="min-h-11 rounded-xl border bg-transparent px-3 text-sm" value={target} onChange={(event) => setTarget(event.target.value)} aria-label="Attach target">
          <option value="inventory">Portfolio</option>
          <option value="deal">Deal</option>
          <option value="contact">Contact</option>
        </select>
        <input className="min-h-11 flex-1 rounded-xl border bg-transparent px-3 text-sm" placeholder="Record id" value={targetId} onChange={(event) => setTargetId(event.target.value)} aria-label="Record id" />
        <Button tone="soft" onClick={() => void browse()}>Browse drive</Button>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-words">{item.folder ? "Folder · " : ""}{item.name}</span>
            <span className="flex gap-2">
              {item.folder ? <Button tone="soft" onClick={() => void browse(item.id)}>Open</Button> : null}
              <Button tone="soft" onClick={() => void attach(item)}>Attach</Button>
            </span>
          </li>
        ))}
      </ul>
      {notice ? <p className="mt-2 text-xs text-muted-foreground">{notice}</p> : null}
    </Card>
  );
}

export default function IntegrationsPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [data, setData] = useState<PlatformSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/platform?workspace=${workspaceId}`);
    setData(await response.json());
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function syncOutlook() {
    setBusy("outlook");
    setNotice(null);
    const response = await fetch("/api/outlook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    const payload = await response.json();
    setBusy(null);
    setNotice(payload.error ?? JSON.stringify(payload.results ?? payload, null, 2));
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Integrations"
        subtitle="Office 365, website forms, mail authentication, and the model stack that powers the AI CTO. BYOK keys and mk_live_ API tokens live on Billing."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Office 365 inbox</div>
            <Badge tone={data?.outlook.configured ? "good" : "warn"}>
              {data?.outlook.configured ? "connected" : "credentials missing"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{data?.outlook.hint}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Mailboxes: {(data?.outlook.mailboxes ?? [config.email]).join(", ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Synced threads {data?.counts.inbox ?? 0} · website submissions {data?.counts.submissions ?? 0}
          </p>
          <Button className="mt-3" disabled={busy === "outlook"} onClick={() => void syncOutlook()}>
            {busy === "outlook" ? "Syncing…" : "Sync inbox, sent, drafts, contacts"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Nightly: <code>npm run graph:sync -- triton</code> with <code>MERIDIAN_API_KEY</code> and <code>MERIDIAN_PUBLIC_URL</code>.
          </p>
        </Card>
        <OneDriveCard workspaceId={workspaceId} />

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Website forms</div>
            <Badge tone="good">public</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop the embed on www.debtmarket.net. Every submit creates a contact, company, and scored lead.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 text-xs">{data?.forms.snippet}</pre>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Outbound mail</div>
            <Badge tone={data?.mail.ready ? "good" : "warn"}>{data?.mail.provider ?? "none"}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{data?.mail.hint}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            From {data?.mail.from} · envelope {data?.mail.envelope}
          </p>
          <div className="mt-3 text-sm">
            <div className="font-medium">
              {data?.auth.domain} · {data?.auth.verdict} · {data?.auth.score}/100
            </div>
            <p className="text-muted-foreground">{data?.auth.summary}</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">AI models</div>
            <Badge tone={data?.ai.configured ? "good" : "neutral"}>
              {data?.ai.configured ? "endpoint live" : "built-in planner"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{data?.ai.hint}</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Reasoner · {data?.ai.model}</li>
            <li>Fast router · {data?.ai.fast}</li>
            <li>
              Embeddings · {data?.embeddings.model} ({data?.embeddings.mode}, {data?.embeddings.dim}-d)
            </li>
            <li>SEO ranks · {data?.seo.configured ? data.seo.name : "local estimate (no SERP key)"}</li>
            <li>
              Provider keys · store encrypted BYOK values on{" "}
              <Link className="underline" href="/billing">
                Billing
              </Link>
            </li>
          </ul>
        </Card>
      </div>
      {notice ? (
        <Card className="mt-4 overflow-x-auto p-4">
          <pre className="whitespace-pre-wrap text-xs">{notice}</pre>
        </Card>
      ) : null}
    </div>
  );
}
