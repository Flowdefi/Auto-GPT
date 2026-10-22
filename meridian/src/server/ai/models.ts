/**
 * Model catalog and router.
 *
 * Meridian talks to any OpenAI-compatible endpoint (Ollama, llama.cpp, vLLM,
 * OpenAI, Groq, OpenRouter). Roles are split the way production desks do it:
 *
 * - reasoner — tool-using CTO (Qwen2.5 14B / Llama 3.3 / hosted GPT)
 * - fast     — classification, routing, short status answers
 * - embed    — RAG vectors (nomic-embed-text / bge-m3 / text-embedding-3-small)
 *
 * Nothing here requires a paid key. With no endpoint the built-in planner and
 * hashed embeddings still run.
 */

export type ModelRole = "reason" | "fast" | "embed";

export interface ModelChoice {
  id: string;
  role: ModelRole;
  label: string;
  why: string;
  contextTokens: number;
}

export const MODEL_CATALOG: ModelChoice[] = [
  {
    id: "qwen2.5:14b",
    role: "reason",
    label: "Qwen2.5 14B",
    why: "Best local tool-use and instruction following at a size that fits a single GPU.",
    contextTokens: 32_768,
  },
  {
    id: "llama3.3:70b",
    role: "reason",
    label: "Llama 3.3 70B",
    why: "Strongest widely available local reasoner when VRAM allows.",
    contextTokens: 128_000,
  },
  {
    id: "deepseek-r1:32b",
    role: "reason",
    label: "DeepSeek-R1 32B",
    why: "Chain-of-thought specialist for scoring, audits, and multi-step plans.",
    contextTokens: 64_000,
  },
  {
    id: "gpt-4o-mini",
    role: "reason",
    label: "GPT-4o mini",
    why: "Hosted fallback with native tool calling and low latency.",
    contextTokens: 128_000,
  },
  {
    id: "llama3.2:3b",
    role: "fast",
    label: "Llama 3.2 3B",
    why: "Cheap router for status, classification, and suggested-prompt ranking.",
    contextTokens: 128_000,
  },
  {
    id: "qwen2.5:7b",
    role: "fast",
    label: "Qwen2.5 7B",
    why: "Stronger fast model when a 3B is too thin.",
    contextTokens: 32_768,
  },
  {
    id: "nomic-embed-text",
    role: "embed",
    label: "nomic-embed-text",
    why: "Best open embedding model for retrieval. 768-d, long context, runs in Ollama.",
    contextTokens: 8_192,
  },
  {
    id: "bge-m3",
    role: "embed",
    label: "BGE-M3",
    why: "Multilingual dense + sparse retrieval when the corpus is mixed-language.",
    contextTokens: 8_192,
  },
  {
    id: "text-embedding-3-small",
    role: "embed",
    label: "text-embedding-3-small",
    why: "Hosted OpenAI embedding when a local embed model is not running.",
    contextTokens: 8_191,
  },
];

export type ModelProvider = "openai" | "anthropic" | "none";

export interface ResolvedModels {
  configured: boolean;
  provider: ModelProvider;
  baseUrl?: string;
  apiKey?: string;
  reasoner: string;
  fast: string;
  embed: string;
  hint: string;
}

export function resolveModels(): ResolvedModels {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? process.env.OLLAMA_BASE_URL ?? "").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const preferAnthropic = process.env.MERIDIAN_PROVIDER === "anthropic";
  const reasoner = process.env.MERIDIAN_MODEL ?? process.env.OPENAI_MODEL ?? (anthropicKey ? "claude-sonnet-4-5" : "qwen2.5:14b");
  const fast = process.env.MERIDIAN_FAST_MODEL ?? "llama3.2:3b";
  const embed = process.env.MERIDIAN_EMBED_MODEL ?? "nomic-embed-text";

  if (anthropicKey && (preferAnthropic || !baseUrl)) {
    return {
      configured: true,
      provider: "anthropic",
      apiKey: anthropicKey,
      reasoner,
      fast,
      embed,
      baseUrl: baseUrl || undefined,
      hint: baseUrl
        ? `Reasoning via Anthropic ${reasoner}. Embeddings via ${embed} at ${baseUrl}.`
        : `Reasoning via Anthropic ${reasoner}. Embeddings stay on the local hash until OPENAI_BASE_URL is set.`,
    };
  }

  if (!baseUrl) {
    return {
      configured: false,
      provider: "none",
      reasoner,
      fast,
      embed,
      hint: "No model endpoint set. Using the built-in planner plus hashed RAG embeddings. Point OPENAI_BASE_URL (or OLLAMA_BASE_URL) and MERIDIAN_MODEL at Ollama, llama.cpp, vLLM, or any OpenAI-compatible API. Set ANTHROPIC_API_KEY to use Claude instead.",
    };
  }

  return {
    configured: true,
    provider: "openai",
    baseUrl,
    apiKey,
    reasoner,
    fast,
    embed,
    hint: `Reasoning via ${reasoner}, routing via ${fast}, embeddings via ${embed} at ${baseUrl}.`,
  };
}

export function catalogForUi() {
  return MODEL_CATALOG.map((model) => ({
    id: model.id,
    role: model.role,
    label: model.label,
    why: model.why,
    contextTokens: model.contextTokens,
  }));
}

/**
 * Short, factual questions go to the fast model. Everything that needs tools
 * or long-form writing stays on the reasoner.
 */
export function pickRole(prompt: string): "fast" | "reason" {
  const lower = prompt.toLowerCase().trim();
  if (lower.length < 24 && /^(status|health|hi|hello|thanks|ok)\b/.test(lower)) return "fast";
  if (/^(how many|what is the count|list|show)\b/.test(lower) && lower.length < 80) return "fast";
  return "reason";
}
