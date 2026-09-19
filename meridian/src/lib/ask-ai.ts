import { meridianReply, type AiReply, type RagContextHit } from "./ai";
import type { WorkspaceConfig, WorkspaceData, WorkspaceId } from "./types";

export async function askMeridian(
  prompt: string,
  data: WorkspaceData,
  workspace: WorkspaceConfig,
): Promise<AiReply> {
  let rag: RagContextHit[] = [];
  try {
    const response = await fetch("/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id as WorkspaceId, prompt }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { hits?: RagContextHit[] };
      rag = payload.hits ?? [];
    }
  } catch {
    rag = [];
  }
  return meridianReply(prompt, data, workspace, rag);
}
