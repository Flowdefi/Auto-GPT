"use client";

import { useEffect, useState } from "react";

export function HydrateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50 text-sm text-ink-500">
        Loading Meridian…
      </div>
    );
  }
  return children;
}
