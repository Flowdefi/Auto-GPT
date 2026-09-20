"use client";

import { useSyncExternalStore } from "react";
import { useCove } from "@/lib/store";

function subscribe(onStoreChange: () => void) {
  return useCove.persist.onFinishHydration(onStoreChange);
}

function clientHydrated() {
  return useCove.persist.hasHydrated();
}

function serverHydrated() {
  return false;
}

export function HydrateGate({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(subscribe, clientHydrated, serverHydrated);

  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-cove-mute">Opening Cove…</div>;
  }
  return children;
}
