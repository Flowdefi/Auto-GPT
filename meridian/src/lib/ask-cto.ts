import type { WorkspaceId } from "./types";

export interface CtoClientTurn {
  reply: string;
  toolCalls: Array<{ name: string; ok: boolean; error?: string }>;
  grounded: string[];
  model: string;
}

export async function askCto(
  workspaceId: WorkspaceId,
  prompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  page: { pathname?: string; recordId?: string } = {},
): Promise<CtoClientTurn> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, prompt, history, pathname: page.pathname, recordId: page.recordId }),
  });
  const payload = (await response.json()) as CtoClientTurn & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "AI CTO request failed");
  }
  return payload;
}
