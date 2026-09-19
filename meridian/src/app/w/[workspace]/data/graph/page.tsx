"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface NodeRow {
  id: string;
  kind: string;
  label: string;
  text: string;
}

interface EdgeRow {
  src: string;
  dst: string;
  rel: string;
}

export default function GraphPage() {
  const { workspaceId } = useActiveWorkspace();
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [chunks, setChunks] = useState(0);
  const [crm, setCrm] = useState<{ engine?: { ready: boolean }; counts?: Record<string, number> } | null>(null);
  const [query, setQuery] = useState("FHB bid window media");
  const [hits, setHits] = useState<Array<{ title: string; kind: string; text: string; score: number; neighbors: string[] }>>(
    [],
  );

  useEffect(() => {
    void fetch(`/api/graph?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => {
        setNodes(payload.nodes ?? []);
        setEdges(payload.edges ?? []);
        setChunks(payload.chunkCount ?? 0);
      });
    void fetch(`/api/crm/snapshot?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setCrm(payload));
  }, [workspaceId]);

  async function search() {
    const response = await fetch("/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, prompt: query }),
    });
    const payload = await response.json();
    setHits(payload.hits ?? []);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Data Hub"
        title="CRM graph + RAG"
        subtitle={`${nodes.length} nodes · ${edges.length} edges · ${chunks} retrieval chunks${crm?.engine?.ready ? " · SQLite FTS live" : ""}. Query walks neighbors.`}
      />
      {crm?.counts ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-ink-500">
          {Object.entries(crm.counts).map(([kind, count]) => (
            <span key={kind} className="rounded-full bg-ink-50 px-2 py-1">
              {kind} {count}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mb-4 flex gap-2">
        <Field value={query} onChange={(event) => setQuery(event.target.value)} />
        <button
          type="button"
          onClick={() => void search()}
          className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white"
        >
          Retrieve
        </button>
      </div>
      <div className="mb-6 grid gap-3">
        {hits.map((hit) => (
          <Card key={`${hit.title}-${hit.score}`} className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone="accent">{hit.kind}</Badge>
              <div className="font-medium">{hit.title}</div>
              <div className="text-xs text-ink-400">score {hit.score}</div>
            </div>
            <p className="mt-2 text-sm text-ink-600">{hit.text}</p>
            {hit.neighbors.length > 0 ? (
              <div className="mt-2 text-xs text-ink-500">Neighbors: {hit.neighbors.join(" · ")}</div>
            ) : null}
          </Card>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {nodes.slice(0, 24).map((node) => (
          <Card key={node.id} className="p-4">
            <div className="flex items-center gap-2">
              <Badge>{node.kind}</Badge>
              <div className="font-medium">{node.label}</div>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-ink-600">{node.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
