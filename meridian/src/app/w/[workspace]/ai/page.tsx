"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { askCto } from "@/lib/ask-cto";
import { promptsForPath } from "@/lib/prompt-context";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface AiStatus {
  model: { configured: boolean; model?: string; fast?: string; embed?: string; hint: string };
  embeddings: { mode: string; model: string; dim: number };
  catalog: Array<{ id: string; role: string; label: string; why: string }>;
  tools: Array<{ name: string; kind: string; description: string }>;
  audit: Array<{ id: string; tool: string; ok: boolean; summary: string; at: string }>;
}

export default function AiPage() {
  const { data, workspaceId } = useActiveWorkspace();
  const pushAi = useMeridian((state) => state.pushAi);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const starters = promptsForPath("/ai", workspaceId);

  useEffect(() => {
    void fetch(`/api/ai?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then(setStatus);
  }, [workspaceId]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    pushAi({ role: "user", body: prompt });
    try {
      const history = data.aiMessages.slice(-8).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.body,
      }));
      const turn = await askCto(workspaceId, prompt, history);
      pushAi({ role: "assistant", body: turn.reply });
      setMeta(`${turn.model} · ${turn.toolCalls.length} tool call(s) · ${turn.grounded.length} RAG hits`);
    } catch (error) {
      pushAi({
        role: "assistant",
        body: error instanceof Error ? error.message : "The CTO could not complete that turn.",
      });
    } finally {
      setBusy(false);
      setDraft("");
    }
  }

  async function improve() {
    setBusy(true);
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, action: "improve" }),
    });
    const payload = await response.json();
    const lines = [
      "Auto-improve finished.",
      ...(payload.applied ?? []).map((item: { title: string; detail: string }) => `Applied — ${item.title}: ${item.detail}`),
      ...(payload.proposed ?? []).map((item: { title: string; detail: string }) => `Next — ${item.title}: ${item.detail}`),
    ];
    pushAi({ role: "assistant", body: lines.join("\n") });
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI CTO"
        title="Meridian intelligence"
        subtitle="Root access to CRM, mail, SEO, and automations. Grounded in the graph + hybrid RAG. Suggested prompts follow the page you are on."
        actions={
          <Button tone="soft" disabled={busy} onClick={() => void improve()}>
            Auto-improve
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Reasoner</div>
          <div className="mt-1 font-semibold">{status?.model.model ?? "built-in planner"}</div>
          <p className="mt-1 text-xs text-muted-foreground">{status?.model.hint}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Embeddings</div>
          <div className="mt-1 font-semibold">{status?.embeddings.model}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {status?.embeddings.mode} · {status?.embeddings.dim}-d hybrid RAG
          </p>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Tools</div>
          <div className="mt-1 font-semibold">{status?.tools.length ?? 0} registered</div>
          <p className="mt-1 text-xs text-muted-foreground">Every write is audited.</p>
        </Card>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {starters.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => void send(starter)}
            className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
          >
            {starter}
          </button>
        ))}
      </div>
      <Card className="flex min-h-[28rem] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {data.aiMessages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-10 rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm text-white"
                  : "mr-6 whitespace-pre-wrap rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed"
              }
            >
              {message.body}
            </div>
          ))}
        </div>
        {meta ? <div className="px-4 text-xs text-muted-foreground">{meta}</div> : null}
        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <Field value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask the CTO…" />
          <Button type="submit" disabled={busy}>
            {busy ? "Working…" : "Send"}
          </Button>
        </form>
      </Card>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {(status?.catalog ?? []).slice(0, 6).map((model) => (
          <Card key={model.id} className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone="accent">{model.role}</Badge>
              <div className="font-medium">{model.label}</div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{model.why}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
