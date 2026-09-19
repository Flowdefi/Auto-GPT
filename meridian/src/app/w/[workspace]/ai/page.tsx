"use client";

import { useState } from "react";
import { Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { AI_STARTERS } from "@/lib/ai";
import { askMeridian } from "@/lib/ask-ai";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function AiPage() {
  const { config, data } = useActiveWorkspace();
  const pushAi = useMeridian((state) => state.pushAi);
  const logAiActivity = useMeridian((state) => state.logAiActivity);
  const [draft, setDraft] = useState("");

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt) return;
    pushAi({ role: "user", body: prompt });
    const reply = await askMeridian(prompt, data, config);
    pushAi({ role: "assistant", body: reply.body });
    if (reply.subject) {
      logAiActivity(reply.subject, reply.body, reply.dealId, reply.contactId);
    }
    setDraft("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Breeze-class layer"
        title="Meridian AI"
        subtitle="Assistant plus agents: prospecting language, data scoring, customer inbox drafts, and content — all grounded in this workspace."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[
          { name: "Prospecting agent", body: "Drafts seller/buyer or RFQ outreach from live records." },
          { name: "Data agent", body: "Scores books and flags media, license, or Travel Rule gaps." },
          { name: "Customer agent", body: "Suggests inbox replies without breaking compliance." },
        ].map((agent) => (
          <Card key={agent.name} className="p-4">
            <div className="font-semibold">{agent.name}</div>
            <p className="mt-1 text-sm text-ink-600">{agent.body}</p>
          </Card>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {AI_STARTERS[config.id].map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => send(starter)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-ink-100"
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
                  : "mr-6 whitespace-pre-wrap rounded-2xl bg-ink-50 px-3 py-2 text-sm leading-relaxed"
              }
            >
              {message.body}
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-ink-100 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <Field value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Meridian AI…" />
          <Button type="submit">Send</Button>
        </form>
      </Card>
    </div>
  );
}
