"use client";

import { createContext, useContext } from "react";

const SelfHostContext = createContext(false);

export function SelfHostProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <SelfHostContext.Provider value={enabled}>{children}</SelfHostContext.Provider>;
}

export function useSelfHosted(): boolean {
  return useContext(SelfHostContext);
}
