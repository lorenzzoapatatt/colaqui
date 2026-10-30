// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { AuthRepository } from "@/modules/auth/application/auth-repository";
import {
  setupOwner,
  type SetupOwnerDependencies,
} from "@/modules/auth/application/setup-owner";
import { OwnerAlreadyConfiguredError } from "@/modules/auth/domain/auth-errors";

function makeRepository(): AuthRepository & { hasOwner: ReturnType<typeof vi.fn> } {
  return {
    hasOwner: vi.fn().mockResolvedValue(true),
    createOwner: vi.fn().mockResolvedValue({
      id: "owner-id",
      email: "dono@example.com",
      passwordHash: "hash",
      createdAt: new Date("2026-10-29T12:00:00.000Z"),
      updatedAt: new Date("2026-10-29T12:00:00.000Z"),
    }),
    findOwnerByEmail: vi.fn(),
    createSession: vi.fn(),
    findOwnerByTokenHash: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllOwnerSessions: vi.fn(),
    updatePasswordAndRevokeSessions: vi.fn(),
    getLoginAttempt: vi.fn(),
    recordLoginFailure: vi.fn(),
    clearLoginAttempt: vi.fn(),
  } as AuthRepository & { hasOwner: ReturnType<typeof vi.fn> };
}

describe("setupOwner", () => {
  it("rejects an already configured instance before hashing the password", async () => {
    const repository = makeRepository();
    const hashPassword = vi.fn().mockResolvedValue("new-hash");

    await expect(
      setupOwner(
        {
          email: "dono@example.com",
          password: "uma-senha-segura-123",
        },
        { repository, hashPassword } as SetupOwnerDependencies,
      ),
    ).rejects.toBeInstanceOf(OwnerAlreadyConfiguredError);

    expect(repository.hasOwner).toHaveBeenCalledOnce();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(repository.createOwner).not.toHaveBeenCalled();
  });
});
