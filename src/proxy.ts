import { NextRequest, NextResponse } from "next/server";

import { problem } from "@/lib/http/problem";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";

const PUBLIC_EXACT_PATHS = new Set([
  "/login",
  "/setup",
  "/api/health",
  "/favicon.ico",
  "/robots.txt",
]);
const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/",
  "/_next/",
  "/images/",
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const hasSessionCookie = Boolean(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );
  if (hasSessionCookie) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      problem(401, "Autenticação necessária", "Entre novamente para continuar."),
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
