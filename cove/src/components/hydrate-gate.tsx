"use client";

import { useEffect, useState } from "react";
import { useCove } from "@/lib/store";

export function HydrateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => useCove.persist.hasHydrated());

  useEffect(() => {
    const unsub = useCove.persist.onFinishHydration(() => setReady(true));
    if (useCove.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);

  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-cove-mute">Opening Cove…</div>;
  }
  return children;
}
