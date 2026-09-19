"use client";

import { AppShell } from "@/components/app-shell";
import { HydrateGate } from "@/components/hydrate-gate";
import { isWorkspaceId } from "@/lib/workspace-id";
import { useParams } from "next/navigation";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspace: string }>();
  if (!isWorkspaceId(params.workspace)) {
    return (
      <div className="p-8">
        Unknown workspace. Use <code>triton</code> or <code>aether</code>.
      </div>
    );
  }
  return (
    <HydrateGate>
      <AppShell>{children}</AppShell>
    </HydrateGate>
  );
}
