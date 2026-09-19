import type { WorkspaceId } from "./types";

export function isWorkspaceId(value: string | undefined): value is WorkspaceId {
  return value === "triton" || value === "aether";
}
