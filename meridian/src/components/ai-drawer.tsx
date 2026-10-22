"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { askMeridian } from "@/lib/ask-ai";
import { askCto } from "@/lib/ask-cto";
import { haptic } from "@/lib/ios";
import { promptsForPath } from "@/lib/prompt-context";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";
import { cn } from "@/lib/utils";

function Conversation({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  const { config, data, workspaceId } = useActiveWorkspace();
  const pathname = usePathname();
  const pushAi = useMeridian((state) => state.pushAi);
  const logAiActivity = useMeridian((state) => state.logAiActivity);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const suggestions = promptsForPath(pathname, workspaceId);
  const recordId = pathname.split("/").filter(Boolean).at(-1);
  const pageRecord = recordId && !["home", "contacts", "companies", "leads", "bulk", "seo", "ai", "automation", "integrations", "campaigns", "lists", "emails", "deals", "forecast", "sequences", "social", "portfolios", "reporting", "marketplace", "graph", "tickets", "pages", "compliance", "settings"].includes(recordId)
    ? recordId
    : undefined;
  const [modelLabel, setModelLabel] = useState("built-in planner");

  useEffect(() => {
    void fetch(`/api/ai?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setModelLabel(payload.model?.configured ? payload.model.model : "built-in planner"))
      .catch(() => undefined);
  }, [workspaceId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.aiMessages.length]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    haptic("medium");
    setBusy(true);
    setDraft("");
    pushAi({ role: "user", body: prompt });
    try {
      const history = data.aiMessages.slice(-8).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.body,
      }));
      try {
        const turn = await askCto(workspaceId, prompt, history, { pathname, recordId: pageRecord });
        pushAi({
          role: "assistant",
          body: turn.reply,
          model: turn.model,
          tools: turn.toolCalls.map((call) => call.name),
          grounded: turn.grounded,
        });
        logAiActivity("AI CTO", turn.reply.slice(0, 180));
      } catch {
        const reply = await askMeridian(prompt, data, config);
        pushAi({ role: "assistant", body: reply.body });
        if (reply.subject) {
          logAiActivity(reply.subject, reply.body, reply.dealId, reply.contactId);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Badge variant="outline">{modelLabel}</Badge>
        {suggestions.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => void send(starter)}
            className="rounded-full bg-muted px-3 py-2 text-left text-xs font-medium leading-snug transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-text)]"
          >
            {starter}
          </button>
        ))}
      </div>

      <ScrollArea className="momentum-scroll min-h-0 flex-1">
        <div className="space-y-3 px-4 py-4">
          {data.aiMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask about pipeline, a portfolio, compliance language, SEO, or tell me to draft something.
              I read this workspace&apos;s records before answering.
            </p>
          ) : null}
          {data.aiMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                message.role === "user"
                  ? "ml-auto bg-[var(--brand)] text-[oklch(0.16_0.03_247)]"
                  : "mr-auto bg-muted text-foreground",
              )}
            >
              {message.body}
              {message.role === "assistant" && (message.model || message.tools?.length || message.grounded?.length) ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.model ? <Badge variant="secondary">{message.model}</Badge> : null}
                  {message.tools?.map((tool) => (
                    <Badge key={tool} variant="outline">{tool}</Badge>
                  ))}
                  {message.grounded?.slice(0, 3).map((hit) => (
                    <Badge key={hit} variant="secondary">{hit}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {busy ? (
            <div className="mr-auto flex gap-1 rounded-2xl bg-muted px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${dot * 120}ms` }}
                />
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form
        className="flex gap-2 border-t p-3 pb-[calc(0.75rem+var(--safe-b))]"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask, draft, score, forecast…"
          className="min-h-11 rounded-xl"
          enterKeyHint="send"
        />
        <Button type="submit" variant="brand" size="tap" className="rounded-xl" disabled={busy}>
          Send
        </Button>
        <Button type="button" variant="ghost" size="tap" className="rounded-xl lg:hidden" onClick={onClose}>
          Close
        </Button>
      </form>
    </div>
  );
}

export function AiDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config } = useActiveWorkspace();
  const isDesktop = useIsDesktop();

  const title = (
    <span className="flex items-center gap-2">
      <Sparkles className="size-4 text-[var(--brand-text)]" />
      Meridian AI
      <Badge variant="secondary" className="ml-1 text-[10px]">
        CTO
      </Badge>
    </span>
  );
  const description = `Grounded in ${config.name} records, graph, and RAG`;

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
        <SheetContent side="right" className="flex w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <Conversation onClose={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <Conversation onClose={onClose} />
      </DrawerContent>
    </Drawer>
  );
}
