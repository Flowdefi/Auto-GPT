"use client";

import { useEffect, useMemo, useState } from "react";
import { Subnav } from "@/components/subnav";
import { Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ListRow {
  id: string;
  name: string;
  description: string;
  count: number;
  sendable: number;
  locked: number;
}

interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  subject: string;
  delivered: number;
  skipped: number;
  failed: number;
  fromEmail: string;
}

export default function BulkEmailPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [mail, setMail] = useState<{
    ready: boolean;
    provider: string;
    from: string;
    envelope?: string;
    hint: string;
  } | null>(null);
  const [listId, setListId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [testTo, setTestTo] = useState(workspaceId === "triton" ? "ayflow@pm.me" : "");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedList = lists.find((list) => list.id === listId);

  async function refresh() {
    const [catalog, status] = await Promise.all([
      fetch(`/api/email/lists?workspace=${workspaceId}`).then((response) => response.json()),
      fetch("/api/email/status").then((response) => response.json()),
    ]);
    setLists(catalog.lists ?? []);
    setTemplates(catalog.templates ?? []);
    setCampaigns(catalog.campaigns ?? []);
    setMail(status);
    if (!listId && catalog.lists?.[0]) setListId(catalog.lists[0].id);
    if (!templateId && catalog.templates?.[0]) {
      applyTemplate(catalog.templates[0]);
      setTemplateId(catalog.templates[0].id);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  function applyTemplate(template: TemplateRow) {
    setSubject(template.subject);
    setPreviewText(template.previewText);
    setHtml(template.html);
    setText(template.text);
  }

  const preview = useMemo(() => {
    return html
      .replaceAll("{{firstName}}", "Alex")
      .replaceAll("{{company}}", config.legalName)
      .replaceAll("{{unsubscribeUrl}}", "#")
      .replaceAll("{{previewText}}", previewText);
  }, [html, previewText, config.legalName]);

  async function addMember() {
    setBusy("member");
    setNotice(null);
    const response = await fetch("/api/email/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        listId: listId || `${workspaceId}_list_test`,
        email: memberEmail,
        firstName: memberName.split(" ")[0],
        lastName: memberName.split(" ").slice(1).join(" "),
        company: config.legalName,
      }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      setNotice(payload.error ?? "Could not add recipient");
      return;
    }
    setMemberEmail("");
    setNotice(`Added ${payload.member.email} as a sendable recipient.`);
    await refresh();
  }

  async function createAndSend(kind: "test" | "campaign") {
    setBusy(kind);
    setNotice(null);
    try {
      if (kind === "test") {
        const response = await fetch("/api/email/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, to: testTo, subject, html, text, previewText }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setNotice(`Test delivered via ${payload.result.provider} (${payload.result.id}).`);
      } else {
        const created = await fetch("/api/email/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            name: subject,
            listId,
            templateId,
            subject,
            previewText,
            html,
            text,
          }),
        }).then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error);
          return payload.campaign;
        });
        const sent = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: created.id }),
        }).then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error);
          return payload.campaign;
        });
        setNotice(
          `Sent ${sent.delivered} · skipped seed ${sent.skipped} · failed ${sent.failed}. From ${sent.fromEmail}.`,
        );
        await refresh();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Marketing Hub"
        title="Bulk email"
        subtitle={`HubSpot-style outbound from ${config.email}. Seed CRM addresses stay locked. Add a real inbox to prove delivery.`}
      />
      <Subnav
        current={`/w/${workspaceId}/marketing/bulk`}
        items={[
          { href: `/w/${workspaceId}/marketing/campaigns`, label: "Campaigns" },
          { href: `/w/${workspaceId}/marketing/emails`, label: "Emails" },
          { href: `/w/${workspaceId}/marketing/bulk`, label: "Bulk send" },
          { href: `/w/${workspaceId}/marketing/lists`, label: "Lists & forms" },
        ]}
      />
      <Card className="mb-4 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={mail?.ready ? "good" : "warn"}>{mail?.ready ? mail.provider : "provider missing"}</Badge>
          <span className="font-medium">From {mail?.from ?? config.email}</span>
        </div>
        <p className="mt-2 text-ink-600">{mail?.hint}</p>
        {mail?.envelope ? (
          <p className="mt-1 text-xs text-ink-500">
            Envelope {mail.envelope} · Reply-To {mail.from}
          </p>
        ) : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Audience</div>
            <select
              className="min-h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
              value={listId}
              onChange={(event) => setListId(event.target.value)}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} · {list.sendable} sendable / {list.locked} locked
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-500">{selectedList?.description}</p>
          </Card>
          <Card className="space-y-2 p-4">
            <div className="text-sm font-semibold">Add sendable recipient</div>
            <Field placeholder="Name" value={memberName} onChange={(event) => setMemberName(event.target.value)} />
            <Field placeholder="real@inbox.com" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} />
            <Button disabled={busy === "member"} onClick={() => void addMember()}>
              Add to selected list
            </Button>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Template</div>
            <select
              className="min-h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value);
                const template = templates.find((row) => row.id === event.target.value);
                if (template) applyTemplate(template);
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </Card>
        </div>
        <div className="space-y-3">
          <Field value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
          <Field value={previewText} onChange={(event) => setPreviewText(event.target.value)} placeholder="Preview text" />
          <textarea
            className="min-h-48 w-full rounded-xl border border-ink-200 p-3 text-sm"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
          />
          <textarea
            className="min-h-28 w-full rounded-xl border border-ink-200 p-3 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Plain-text part"
          />
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="border-b border-ink-50 px-3 py-2 text-xs uppercase text-ink-400">Preview</div>
            <iframe title="Email preview" className="h-[28rem] w-full" srcDoc={preview} />
          </div>
        </div>
        <div className="space-y-4">
          <Card className="space-y-2 p-4 text-sm">
            <div className="font-semibold">Best practices</div>
            <ul className="list-disc space-y-1 pl-4 text-ink-600">
              <li>From / Reply-To {config.email}</li>
              <li>Physical address + unsubscribe in every footer</li>
              <li>List-Unsubscribe one-click header</li>
              <li>HTML + plain text</li>
              <li>Open / click tracking</li>
              <li>Seed/demo addresses never sent</li>
              <li>Suppression on unsubscribe, bounce, complaint</li>
              <li>Institutional-only copy · 400ms pacing</li>
            </ul>
          </Card>
          <Card className="space-y-2 p-4">
            <div className="text-sm font-semibold">Send test</div>
            <Field placeholder="you@firm.com" value={testTo} onChange={(event) => setTestTo(event.target.value)} />
            <Button disabled={busy !== null || !testTo} onClick={() => void createAndSend("test")}>
              {busy === "test" ? "Sending…" : "Send test"}
            </Button>
            <Button
              tone="soft"
              disabled={busy !== null || !listId}
              onClick={() => void createAndSend("campaign")}
            >
              {busy === "campaign" ? "Sending…" : "Send to sendable list"}
            </Button>
          </Card>
          {notice ? <Card className="p-4 text-sm text-ink-700">{notice}</Card> : null}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Recent campaigns</div>
            <div className="space-y-2 text-sm">
              {campaigns.length === 0 ? <div className="text-ink-500">None yet.</div> : null}
              {campaigns.map((campaign) => (
                <div key={campaign.id}>
                  <div className="font-medium">{campaign.name}</div>
                  <div className="text-xs text-ink-500">
                    {campaign.status} · delivered {campaign.delivered} · skipped {campaign.skipped}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
