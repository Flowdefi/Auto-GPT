import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_API_PATHS, SESSION_COOKIE } from "@/lib/commerce";
import { hostDecision, hostSplit, requestHostname } from "@/lib/hosts";

const PUBLIC_PAGES = new Set(["/", "/pricing", "/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/pay/sandbox/")) return true;
  if (pathname === "/collect" || pathname.startsWith("/collect/")) return true;
  if (pathname === "/agency" || pathname.startsWith("/agency/")) return true;
  if (pathname.startsWith("/api/agency")) return true;
  if (pathname === "/api/brand") return true;
  if (pathname.startsWith("/api/portal")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/manifest.json" || pathname === "/robots.txt") return true;
  if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|map|css|js)$/i.test(pathname)) {
    return true;
  }
  return false;
}

function hasCredential(request: NextRequest): boolean {
  if (request.cookies.get(SESSION_COOKIE)?.value) return true;
  const auth = request.headers.get("authorization") ?? request.headers.get("x-api-key");
  return Boolean(auth && auth.trim());
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const decision = hostDecision(requestHostname(request.headers), pathname, search, hostSplit());
  if (decision.kind === "wrong-host") {
    return NextResponse.json({ error: "This host does not serve that API" }, { status: 421 });
  }
  if (decision.kind === "redirect") {
    return NextResponse.redirect(decision.url, 302);
  }
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!hasCredential(request)) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!hasCredential(request)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
