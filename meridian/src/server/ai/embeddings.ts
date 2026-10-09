import { tokenize } from "../tokenize";
import { resolveModels } from "./models";

export const LOCAL_EMBED_DIM = 384;

const cache = new Map<string, Float32Array>();

function hash32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function l2(vector: Float32Array): Float32Array {
  let sum = 0;
  for (let index = 0; index < vector.length; index += 1) {
    const value = vector[index] ?? 0;
    sum += value * value;
  }
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index += 1) {
    out[index] = (vector[index] ?? 0) / norm;
  }
  return out;
}

/**
 * Feature-hashed embedding. Always available, deterministic, and good enough
 * to hybridize with lexical + inverted-index RAG when no embed model is up.
 */
export function embedLocal(text: string): Float32Array {
  const vector = new Float32Array(LOCAL_EMBED_DIM);
  for (const term of tokenize(text)) {
    const first = hash32(term) % LOCAL_EMBED_DIM;
    const second = hash32(`${term}#salt`) % LOCAL_EMBED_DIM;
    vector[first] = (vector[first] ?? 0) + 1;
    vector[second] = (vector[second] ?? 0) - 0.45;
  }
  return l2(vector);
}

export function cosine(left: Float32Array, right: Float32Array): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot;
}

export interface EmbedStatus {
  mode: "local-hash" | "remote";
  model: string;
  dim: number;
}

export function embedStatus(): EmbedStatus {
  const models = resolveModels();
  if (models.configured && models.baseUrl) {
    return { mode: "remote", model: models.embed, dim: models.embed.includes("3-small") ? 1536 : 768 };
  }
  return { mode: "local-hash", model: "feature-hash", dim: LOCAL_EMBED_DIM };
}

async function embedRemote(texts: string[]): Promise<Float32Array[] | null> {
  const models = resolveModels();
  if (!models.configured || !models.baseUrl || texts.length === 0) return null;

  try {
    const response = await fetch(`${models.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(models.apiKey ? { Authorization: `Bearer ${models.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: models.embed, input: texts }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };
    const rows = payload.data ?? [];
    if (rows.length === 0) return null;
    return rows
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((row) => l2(Float32Array.from(row.embedding ?? [])));
  } catch {
    return null;
  }
}

export async function embedTexts(texts: string[]): Promise<{ vectors: Float32Array[]; status: EmbedStatus }> {
  const remote = await embedRemote(texts);
  if (remote && remote.length === texts.length) {
    return { vectors: remote, status: embedStatus() };
  }
  return { vectors: texts.map(embedLocal), status: { mode: "local-hash", model: "feature-hash", dim: LOCAL_EMBED_DIM } };
}

export function cachedEmbed(key: string, text: string): Float32Array {
  const hit = cache.get(key);
  if (hit) return hit;
  const vector = embedLocal(text);
  cache.set(key, vector);
  if (cache.size > 4000) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return vector;
}

export function rememberEmbed(key: string, vector: Float32Array): void {
  cache.set(key, vector);
}

export function cachedOrUndefined(key: string): Float32Array | undefined {
  return cache.get(key);
}
