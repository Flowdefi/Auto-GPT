import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { seatFromNextCookies } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function WorkspaceRootLayout({ children }: { children: ReactNode }) {
  const seat = await seatFromNextCookies();
  if (!seat) redirect("/login?next=/w/triton/home");
  if (!seat.licensed) redirect("/billing");
  return children;
}
