import type { WorkspaceId } from "@/lib/types";
import { loadDb } from "./db";
import type { GraphNode } from "./models";
import { scoreOverlap, tokenize } from "./tokenize";

export interface RagHit {
  title: string;
  kind: string;
  text: string;
  score: number;
  neighbors: string[];
}

export function queryRag(workspaceId: WorkspaceId, prompt: string, limit = 6): RagHit[] {
  const db = loadDb();
  const terms = tokenize(prompt);
  const ranked = db.chunks
    .filter((chunk) => chunk.workspaceId === workspaceId)
    .map((chunk) => ({ chunk, score: scoreOverlap(terms, chunk.terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ chunk, score }) => {
    const node = db.nodes.find((row) => row.id === chunk.nodeId);
    return {
      title: chunk.title,
      kind: node?.kind ?? "chunk",
      text: clip(chunk.text, 420),
      score: Number(score.toFixed(3)),
      neighbors: neighborLabels(workspaceId, node),
    };
  });
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
