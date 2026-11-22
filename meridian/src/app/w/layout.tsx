import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { seatFromNextCookies } from "@/server/auth";
import { selfHosted } from "@/server/self-hosted";

export const dynamic = "force-dynamic";

export default async function WorkspaceRootLayout({ children }: { children: ReactNode }) {
  const seat = await seatFromNextCookies();
  if (!seat) {
    if (selfHosted() && (await headers()).get("cf-access-jwt-assertion")) {
      redirect("/api/auth/access?next=/w/triton/home");
    }
    redirect("/login?next=/w/triton/home");
  }
  if (!seat.licensed) redirect(selfHosted() ? "/login" : "/billing");
  return children;
}
