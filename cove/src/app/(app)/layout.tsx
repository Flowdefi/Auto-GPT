"use client";

import { AppShell } from "@/components/app-shell";
import { HydrateGate } from "@/components/hydrate-gate";

export default function FloorLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrateGate>
      <AppShell>{children}</AppShell>
    </HydrateGate>
  );
}
