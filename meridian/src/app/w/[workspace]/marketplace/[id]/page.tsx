"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActiveWorkspace } from "@/lib/use-workspace";

/** Old inventory URLs now open the server portfolio record. */
export default function InventoryRecordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { workspaceId } = useActiveWorkspace();

  useEffect(() => {
    router.replace(`/w/${workspaceId}/portfolios/${params.id}`);
  }, [params.id, router, workspaceId]);

  return <p className="p-6 text-sm text-muted-foreground">Opening the portfolio record…</p>;
}
