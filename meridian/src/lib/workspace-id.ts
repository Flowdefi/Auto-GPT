import type { WorkspaceId } from "./types";

export function isWorkspaceId(value: unknown): value is WorkspaceId {
  return value === "triton" || value === "aether";
}
