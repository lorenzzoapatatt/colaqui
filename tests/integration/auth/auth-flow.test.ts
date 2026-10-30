// @vitest-environment node

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { changePassword } from "@/modules/auth/application/change-password";
import { getCurrentOwner } from "@/modules/auth/application/get-current-owner";
import { loginOwner } from "@/modules/auth/application/login-owner";
import { logoutOwner } from "@/modules/auth/application/logout-owner";
import { setupOwner } from "@/modules/auth/application/setup-owner";
import { AuthError } from "@/modules/auth/domain/auth-errors";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://colaqui:colaqui_dev@localhost:55432/colaqui";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function clearAuth(): Promise<void> {
  await prisma.$transaction([
    prisma.loginAttempt.deleteMany(),
    prisma.ownerSession.deleteMany(),
    prisma.owner.deleteMany(),
  ]);
}

describe("single-owner authentication", () => {
  beforeEach(clearAuth);
  afterAll(() => prisma.$disconnect());

  it("allows exactly one of two concurrent first-owner setup attempts", async () => {
    const repository = new PrismaAuthRepository(prisma);
    const input = {
      email: "Dono@Example.com",
      password: "uma-senha-segura-123",
    };

    const statuses = await Promise.all(
      [input, input].map(async (candidate) => {
        try {
          await setupOwner(candidate, { repository });
          return 201;
        } catch (error) {
          if (error instanceof AuthError) return error.status;
          throw error;
        }
      }),
    );

    expect(statuses.sort()).toEqual([201, 409]);
    await expect(prisma.owner.count()).resolves.toBe(1);
    await expect(prisma.owner.findFirst()).resolves.toMatchObject({
      singletonKey: "OWNER",
      email: "dono@example.com",
    });
  });

  it("blocks the sixth login for known and unknown emails and releases after fifteen minutes", async () => {
    let now = new Date("2026-10-29T12:00:00.000Z");
    const repository = new PrismaAuthRepository(prisma);
    const dependencies = {
      repository,
      hashSecret: "h".repeat(32),
      now: () => now,
    };
    const email = "dono@example.com";
    const password = "uma-senha-segura-123";

    await setupOwner({ email, password }, { repository });

    for (const identity of [email, "desconhecido@example.com"]) {
      for (let failure = 0; failure < 5; failure += 1) {
        await expect(
          loginOwner(
            { email: identity, password: "senha-incorreta" },
            { ipAddress: identity === email ? "192.0.2.10" : "192.0.2.11" },
            dependencies,
          ),
        ).rejects.toMatchObject({
          status: 401,
          detail: "E-mail ou senha inválidos.",
        });
      }

      await expect(
        loginOwner(
          { email: identity, password },
          { ipAddress: identity === email ? "192.0.2.10" : "192.0.2.11" },
          dependencies,
        ),
      ).rejects.toMatchObject({
        status: 429,
        detail: "Muitas tentativas. Tente novamente mais tarde.",
      });
    }

    now = new Date("2026-10-29T12:15:00.001Z");

    const session = await loginOwner(
      { email, password },
      { ipAddress: "192.0.2.10" },
      dependencies,
    );

    expect(Buffer.from(session.rawToken, "base64url")).toHaveLength(32);
    expect(session.owner.email).toBe(email);
    await expect(prisma.ownerSession.count()).resolves.toBe(1);
    const storedSession = await prisma.ownerSession.findFirstOrThrow();
    expect(storedSession.tokenHash).not.toBe(session.rawToken);
  });

  it("validates stored sessions, rotates them on password change, and revokes on logout", async () => {
    const now = new Date("2026-10-29T12:00:00.000Z");
    const repository = new PrismaAuthRepository(prisma);
    const dependencies = {
      repository,
      hashSecret: "h".repeat(32),
      now: () => now,
    };
    const email = "dono@example.com";
    const oldPassword = "uma-senha-segura-123";
    const newPassword = "outra-senha-segura-456";

    await setupOwner({ email, password: oldPassword }, { repository });
    const firstSession = await loginOwner(
      { email, password: oldPassword },
      { ipAddress: "192.0.2.20" },
      dependencies,
    );

    await expect(
      getCurrentOwner(firstSession.rawToken, { repository, now: () => now }),
    ).resolves.toMatchObject({ email });
    await expect(
      changePassword(
        {
          rawToken: firstSession.rawToken,
          currentPassword: "senha-incorreta",
          newPassword,
        },
        { repository, now: () => now },
      ),
    ).rejects.toMatchObject({ status: 401 });

    await changePassword(
      {
        rawToken: firstSession.rawToken,
        currentPassword: oldPassword,
        newPassword,
      },
      { repository, now: () => now },
    );

    await expect(
      getCurrentOwner(firstSession.rawToken, { repository, now: () => now }),
    ).resolves.toBeNull();
    await expect(
      loginOwner(
        { email, password: oldPassword },
        { ipAddress: "192.0.2.21" },
        dependencies,
      ),
    ).rejects.toMatchObject({ status: 401 });

    const secondSession = await loginOwner(
      { email, password: newPassword },
      { ipAddress: "192.0.2.21" },
      dependencies,
    );
    await logoutOwner(secondSession.rawToken, { repository, now: () => now });

    await expect(
      getCurrentOwner(secondSession.rawToken, { repository, now: () => now }),
    ).resolves.toBeNull();
  });
});
