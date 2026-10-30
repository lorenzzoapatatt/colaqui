import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/infrastructure/observability/logger";
import { problem } from "@/lib/http/problem";
import { AuthError } from "@/modules/auth/domain/auth-errors";
import {
  AUTH_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/modules/auth/domain/session";

export async function readAuthRequestBody(
  request: Request,
): Promise<Record<string, FormDataEntryValue | unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export function isFormRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

export function getRequestIpAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getRequestCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(pair.slice(separator + 1).trim());
  }
  return undefined;
}

function runtimeNodeEnv(): "development" | "test" | "production" {
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

export function setSessionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date,
): void {
  response.cookies.set(
    AUTH_SESSION_COOKIE,
    rawToken,
    sessionCookieOptions(runtimeNodeEnv(), expiresAt),
  );
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...sessionCookieOptions(runtimeNodeEnv()),
    expires: new Date(0),
    maxAge: 0,
  });
}

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(problem(error.status, error.title, error.detail), {
      status: error.status,
    });
  }

  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      problem(400, "Dados inválidos", "Revise os campos enviados."),
      { status: 400 },
    );
  }

  logger.error("Authentication request failed", { error });
  return NextResponse.json(
    problem(500, "Erro interno", "Não foi possível concluir a solicitação."),
    { status: 500 },
  );
}
