// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { resetOwnerPassword } from "../../../../scripts/reset-owner-password";
import type { AuthRepository } from "@/modules/auth/application/auth-repository";
import { verifyPassword } from "@/modules/auth/domain/password";

function makeRepository(): AuthRepository {
  return {
    createOwner: vi.fn(),
    findOwnerByEmail: vi.fn().mockResolvedValue({
      id: "owner-id",
      email: "dono@example.com",
      passwordHash: "old-hash",
      createdAt: new Date("2026-10-29T12:00:00.000Z"),
      updatedAt: new Date("2026-10-29T12:00:00.000Z"),
    }),
    createSession: vi.fn(),
    findOwnerByTokenHash: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllOwnerSessions: vi.fn(),
    updatePasswordAndRevokeSessions: vi.fn(),
    getLoginAttempt: vi.fn(),
    recordLoginFailure: vi.fn(),
    clearLoginAttempt: vi.fn(),
  };
}

describe("local owner password reset", () => {
  it("rejects a mismatched reset secret before accessing the database", async () => {
    const repository = makeRepository();

    await expect(
      resetOwnerPassword(
        {
          ownerEmail: "dono@example.com",
          newPassword: "outra-senha-segura-456",
          resetSecretConfirmation: "segredo-incorreto",
        },
        {
          repository,
          expectedResetSecret: "segredo-correto".repeat(3),
          now: () => new Date("2026-10-29T12:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("não confere");
    expect(repository.findOwnerByEmail).not.toHaveBeenCalled();
  });

  it("normalizes the target email, hashes the new password, and revokes sessions", async () => {
    const repository = makeRepository();
    const now = new Date("2026-10-29T12:00:00.000Z");
    const newPassword = "outra-senha-segura-456";

    await resetOwnerPassword(
      {
        ownerEmail: " Dono@Example.com ",
        newPassword,
        resetSecretConfirmation: "s".repeat(32),
      },
      {
        repository,
        expectedResetSecret: "s".repeat(32),
        now: () => now,
      },
    );

    expect(repository.findOwnerByEmail).toHaveBeenCalledWith("dono@example.com");
    expect(repository.updatePasswordAndRevokeSessions).toHaveBeenCalledWith({
      ownerId: "owner-id",
      passwordHash: expect.any(String),
      now,
    });
    const call = vi.mocked(repository.updatePasswordAndRevokeSessions).mock
      .calls[0]?.[0];
    await expect(verifyPassword(call?.passwordHash ?? "", newPassword)).resolves.toBe(
      true,
    );
  });
});
