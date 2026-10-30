// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  hashPassword,
  parsePassword,
  verifyPassword,
} from "@/modules/auth/domain/password";

describe("owner password", () => {
  it("stores an Argon2id hash without exposing the password", async () => {
    const password = "uma-senha-segura-123";

    const passwordHash = await hashPassword(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "senha-incorreta")).resolves.toBe(
      false,
    );
  });

  it("accepts 12 to 128 characters and rejects values outside that range", () => {
    expect(parsePassword("a".repeat(12))).toBe("a".repeat(12));
    expect(parsePassword("a".repeat(128))).toBe("a".repeat(128));
    expect(() => parsePassword("a".repeat(11))).toThrow();
    expect(() => parsePassword("a".repeat(129))).toThrow();
  });
});
