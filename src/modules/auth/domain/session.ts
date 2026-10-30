import { createHash, randomBytes } from "node:crypto";

export const AUTH_SESSION_COOKIE = "colaqui_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

export interface NewSession {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  expires?: Date;
  maxAge?: number;
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSession(now = new Date()): NewSession {
  const rawToken = randomBytes(32).toString("base64url");

  return {
    rawToken,
    tokenHash: hashSessionToken(rawToken),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  };
}

export function sessionCookieOptions(
  nodeEnv: "development" | "test" | "production",
  expires?: Date,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: nodeEnv !== "development",
    ...(expires ? { expires } : {}),
  };
}
