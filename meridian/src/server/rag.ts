import type { WorkspaceId } from "@/lib/types";
import { cachedEmbed, cachedOrUndefined, cosine, embedTexts, rememberEmbed } from "./ai/embeddings";
import { loadDb } from "./db";
import type { GraphNode } from "./models";
import { loadVector, searchFts, sqliteReady, upsertVectors } from "./sqlite";
import { scoreOverlap, tokenize } from "./tokenize";

export interface RagHit {
  chunkId?: string;
  title: string;
  kind: string;
  text: string;
  score: number;
  neighbors: string[];
}

export function queryRag(workspaceId: WorkspaceId, prompt: string, limit = 6): RagHit[] {
  const db = loadDb();
  const terms = tokenize(prompt);
  const lexical = db.chunks
    .filter((chunk) => chunk.workspaceId === workspaceId)
    .map((chunk) => ({ chunk, score: scoreOverlap(terms, chunk.terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const ftsHits = sqliteReady() ? searchFts(workspaceId, prompt, limit) : [];
  const byId = new Map(db.chunks.map((chunk) => [chunk.id, chunk]));
  const merged = new Map<string, { chunk: (typeof db.chunks)[number]; score: number }>();
  for (const row of lexical) {
    merged.set(row.chunk.id, row);
  }
  for (const hit of ftsHits) {
    const chunk = byId.get(hit.chunkId);
    if (!chunk) continue;
    const lexicalScore = merged.get(chunk.id)?.score ?? 0;
    merged.set(chunk.id, { chunk, score: Math.max(lexicalScore, 1 / (1 + Math.abs(hit.score))) });
  }
  const queryVector = vectorFor(`q:${prompt}`, prompt);
  const hybrid = [...merged.values()].map((row) => {
    const vector = vectorFor(row.chunk.id, `${row.chunk.title} ${row.chunk.text}`);
    const semantic = Math.max(0, cosine(queryVector, vector));
    const lexicalNorm = row.score / (1 + row.score);
    return { ...row, score: 0.55 * lexicalNorm + 0.45 * semantic };
  });

  const ranked = hybrid.sort((a, b) => b.score - a.score).slice(0, limit);

  return ranked.map(({ chunk, score }) => {
    const node = db.nodes.find((row) => row.id === chunk.nodeId);
    return {
      chunkId: chunk.id,
      title: chunk.title,
      kind: node?.kind ?? "chunk",
      text: clip(chunk.text, 420),
      score: Number(score.toFixed(3)),
      neighbors: neighborLabels(workspaceId, node),
    };
  });
}

function vectorFor(key: string, text: string): Float32Array {
  const cached = cachedOrUndefined(key);
  if (cached) return cached;
  const stored = key.startsWith("q:") ? null : loadVector(key);
  if (stored) {
    rememberEmbed(key, stored);
    return stored;
  }
  return cachedEmbed(key, text);
}

/** Pull remote embeddings for the best lexical hits, then blend them with FTS. */
export async function queryRagAsync(workspaceId: WorkspaceId, prompt: string, limit = 6): Promise<RagHit[]> {
  const preview = queryRag(workspaceId, prompt, Math.max(limit, 8));
  const db = loadDb();
  const chunks = preview
    .map((hit) => (hit.chunkId ? db.chunks.find((chunk) => chunk.id === hit.chunkId) : undefined))
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk));
  if (chunks.length > 0) {
    const embedded = await embedTexts(chunks.map((chunk) => `${chunk.title} ${chunk.text}`));
    if (embedded.status.mode === "remote") {
      const rows: Array<{ id: string; vector: Float32Array }> = [];
      chunks.forEach((chunk, index) => {
        const vector = embedded.vectors[index];
        if (!vector) return;
        rememberEmbed(chunk.id, vector);
        rows.push({ id: chunk.id, vector });
      });
      upsertVectors(rows);
    }
  }
  return queryRag(workspaceId, prompt, limit);
}

function neighborLabels(workspaceId: WorkspaceId, node?: GraphNode): string[] {
  const db = loadDb();
  if (!node) return [];
    const rels = db.edges.filter(
    (edge) => edge.workspaceId === workspaceId && (edge.src === node.id || edge.dst === node.id),
  );
  const ids = rels.map((edge) => (edge.src === node.id ? edge.dst : edge.src));
  return ids
    .map((id) => db.nodes.find((row) => row.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .slice(0, 6);
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function graphSnapshot(workspaceId: WorkspaceId) {
  const db = loadDb();
  return {
    nodes: db.nodes.filter((node) => node.workspaceId === workspaceId),
    edges: db.edges.filter((edge) => edge.workspaceId === workspaceId),
    chunkCount: db.chunks.filter((chunk) => chunk.workspaceId === workspaceId).length,
  };
}
