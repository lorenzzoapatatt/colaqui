// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  AUTH_SESSION_COOKIE,
  createSession,
  hashSessionToken,
  sessionCookieOptions,
} from "@/modules/auth/domain/session";

describe("owner session", () => {
  it("creates a unique 32-byte base64url token and persists only its SHA-256 hash", () => {
    const now = new Date("2026-10-29T12:00:00.000Z");

    const first = createSession(now);
    const second = createSession(now);
    const decoded = Buffer.from(first.rawToken, "base64url");

    expect(decoded).toHaveLength(32);
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).toBe(hashSessionToken(first.rawToken));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.rawToken);
    expect(first.expiresAt).toEqual(new Date("2026-11-28T12:00:00.000Z"));
  });

  it("uses a hardened cookie and enables Secure outside development", () => {
    expect(AUTH_SESSION_COOKIE).toBe("colaqui_session");
    expect(sessionCookieOptions("development")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });
    expect(sessionCookieOptions("test").secure).toBe(true);
    expect(sessionCookieOptions("production").secure).toBe(true);
  });
});
