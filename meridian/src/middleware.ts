import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_API_PATHS, SESSION_COOKIE } from "@/lib/commerce";
import { selfHosted } from "@/server/self-hosted";
import { safeNextPath, selfHostClosure } from "@/server/self-host-routes";

const PUBLIC_PAGES = new Set(["/", "/pricing", "/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/pay/sandbox/")) return true;
  if (pathname === "/collect" || pathname.startsWith("/collect/")) return true;
  if (pathname.startsWith("/api/portal")) return true;
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

function hasSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

function accessHandshake(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const session = hasSession(request);
  const jwt = request.headers.get("cf-access-jwt-assertion");
  const loginError = pathname === "/login" && request.nextUrl.searchParams.has("error");
  const document = !pathname.startsWith("/api/") && !pathname.startsWith("/_next/");
  if (!session && jwt && document && !loginError) {
    const url = request.nextUrl.clone();
    const next = pathname === "/" ? "/w/triton/home" : `${pathname}${request.nextUrl.search}`;
    url.pathname = "/api/auth/access";
    url.search = `?next=${encodeURIComponent(safeNextPath(next))}`;
    return NextResponse.redirect(url);
  }
  if (!selfHosted()) return null;
  const closed = selfHostClosure(pathname);
  if (closed === "api") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (closed === "page") {
    const url = request.nextUrl.clone();
    url.pathname = session ? "/w/triton/home" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = session ? "/w/triton/home" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/cdn-cgi/")) return NextResponse.next();
  const handshake = accessHandshake(request);
  if (handshake) return handshake;
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
