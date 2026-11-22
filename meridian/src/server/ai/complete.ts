import { resolveModels } from "./models";

type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export interface Completion {
  text: string;
  model: string;
}

/**
 * Fast-role completion through the existing OpenAI-compatible router
 * (local Qwen/Llama via Ollama, or a remote base URL). No endpoint means no call.
 */
export async function completeFast(
  messages: Array<{ role: "system" | "user"; content: string }>,
  fetchImpl: FetchLike = fetch,
): Promise<Completion | null> {
  const models = resolveModels();
  if (!models.configured || !models.baseUrl) return null;
  const response = await fetchImpl(`${models.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(models.apiKey ? { Authorization: `Bearer ${models.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: models.fast, messages, temperature: 0, stream: false }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return null;
  return { text, model: models.fast };
}
