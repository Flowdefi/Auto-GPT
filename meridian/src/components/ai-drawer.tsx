"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { AI_STARTERS } from "@/lib/ai";
import { askMeridian } from "@/lib/ask-ai";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";
import { Button, Field } from "./ui";

export function AiDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config, data } = useActiveWorkspace();
  const pushAi = useMeridian((state) => state.pushAi);
  const logAiActivity = useMeridian((state) => state.logAiActivity);
  const [draft, setDraft] = useState("");

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30 p-0 sm:p-3">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-pop sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-text)]" />
            <div>
              <div className="text-sm font-semibold">Meridian AI</div>
              <div className="text-xs text-ink-400">Grounded in {config.name} CRM</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-ink-100 px-4 py-3">
          {AI_STARTERS[config.id].map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700"
            >
              {starter}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {data.aiMessages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm text-white"
                  : "mr-4 whitespace-pre-wrap rounded-2xl bg-ink-50 px-3 py-2 text-sm leading-relaxed text-ink-800"
              }
            >
              {message.body}
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-ink-100 p-3 pb-[calc(0.75rem+var(--safe-b))]"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <Field
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask, draft, score, forecast…"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}
