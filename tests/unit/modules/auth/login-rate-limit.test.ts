// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  isLoginBlocked,
  loginDimensionHash,
  nextLoginFailure,
} from "@/modules/auth/domain/login-rate-limit";

describe("login rate limit", () => {
  it("uses keyed hashes instead of storing email or IP address", () => {
    const secret = "s".repeat(32);

    const emailHash = loginDimensionHash(secret, "dono@example.com");
    const ipHash = loginDimensionHash(secret, "192.0.2.10");

    expect(emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailHash).not.toContain("dono@example.com");
    expect(emailHash).not.toBe(ipHash);
  });

  it("blocks the next attempt after five failures in fifteen minutes", () => {
    const startedAt = new Date("2026-10-29T12:00:00.000Z");
    let state = nextLoginFailure(null, startedAt);

    for (let attempt = 1; attempt < 5; attempt += 1) {
      state = nextLoginFailure(state, new Date(startedAt.getTime() + attempt));
    }

    expect(state.failures).toBe(5);
    expect(state.blockedUntil).toEqual(
      new Date("2026-10-29T12:15:00.004Z"),
    );
    expect(isLoginBlocked(state, new Date("2026-10-29T12:14:59.999Z"))).toBe(
      true,
    );
    expect(isLoginBlocked(state, new Date("2026-10-29T12:15:00.004Z"))).toBe(
      false,
    );
  });

  it("starts a new window when the previous one has elapsed", () => {
    const first = nextLoginFailure(null, new Date("2026-10-29T12:00:00.000Z"));
    const next = nextLoginFailure(
      first,
      new Date("2026-10-29T12:15:00.001Z"),
    );

    expect(next.failures).toBe(1);
    expect(next.windowStartedAt).toEqual(
      new Date("2026-10-29T12:15:00.001Z"),
    );
    expect(next.blockedUntil).toBeNull();
  });
});
