import { redirect } from "next/navigation";
import { selfHosted } from "@/server/self-hosted";

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  if (selfHosted()) redirect("/login");
  return children;
}
