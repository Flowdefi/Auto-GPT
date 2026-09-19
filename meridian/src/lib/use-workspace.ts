"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useMeridian } from "./store";
import type { WorkspaceId } from "./types";
import { isWorkspaceId } from "./workspace-id";
import { workspaceOf } from "./workspaces";

export { isWorkspaceId };

export function useActiveWorkspace() {
  const params = useParams<{ workspace: string }>();
  const setWorkspace = useMeridian((state) => state.setWorkspace);
  const storeId = useMeridian((state) => state.workspaceId);
  const data = useMeridian((state) => state.data[state.workspaceId]);
  const currentUserId = useMeridian((state) => state.currentUserId);

  const workspaceId: WorkspaceId = isWorkspaceId(params.workspace) ? params.workspace : storeId;

  useEffect(() => {
    if (isWorkspaceId(params.workspace) && params.workspace !== storeId) {
      setWorkspace(params.workspace);
    }
  }, [params.workspace, setWorkspace, storeId]);

  const config = workspaceOf(workspaceId);
  const user = data.users.find((item) => item.id === currentUserId) ?? data.users[0];

  return { workspaceId, config, data, user };
}
