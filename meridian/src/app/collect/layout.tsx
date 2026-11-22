"use client";

import { Suspense, type ReactNode } from "react";
import { PortalFrame } from "@/components/collect/portal-frame";

export default function CollectLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-6 py-16">Loading… Cargando…</main>}>
      <PortalFrame>{children}</PortalFrame>
    </Suspense>
  );
}
