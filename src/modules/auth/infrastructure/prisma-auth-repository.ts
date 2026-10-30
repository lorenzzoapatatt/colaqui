import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AuthRepository,
  LoginAttemptKey,
  OwnerRecord,
  SessionOwnerRecord,
} from "@/modules/auth/application/auth-repository";
import {
  LOGIN_BLOCK_MS,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  type LoginAttemptState,
} from "@/modules/auth/domain/login-rate-limit";

interface LoginAttemptRow {
  failures: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async hasOwner(): Promise<boolean> {
    const owner = await this.prisma.owner.findUnique({
      where: { singletonKey: "OWNER" },
      select: { id: true },
    });
    return owner !== null;
  }

  createOwner(input: {
    email: string;
    passwordHash: string;
  }): Promise<OwnerRecord> {
    return this.prisma.owner.create({
      data: {
        singletonKey: "OWNER",
        email: input.email,
        passwordHash: input.passwordHash,
      },
    });
  }

  findOwnerByEmail(email: string): Promise<OwnerRecord | null> {
    return this.prisma.owner.findUnique({ where: { email } });
  }

  async createSession(input: {
    ownerId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void> {
    await this.prisma.ownerSession.create({
      data: {
        ownerId: input.ownerId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        lastUsedAt: input.now,
      },
    });
  }

  async findOwnerByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionOwnerRecord | null> {
    const session = await this.prisma.ownerSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: { owner: true },
    });

    if (!session) return null;

    await this.prisma.ownerSession.update({
      where: { id: session.id },
      data: { lastUsedAt: now },
    });

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      owner: session.owner,
    };
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.prisma.ownerSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAllOwnerSessions(ownerId: string, now: Date): Promise<void> {
    await this.prisma.ownerSession.updateMany({
      where: { ownerId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async updatePasswordAndRevokeSessions(input: {
    ownerId: string;
    passwordHash: string;
    now: Date;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.owner.update({
        where: { id: input.ownerId },
        data: { passwordHash: input.passwordHash },
      }),
      this.prisma.ownerSession.updateMany({
        where: { ownerId: input.ownerId, revokedAt: null },
        data: { revokedAt: input.now },
      }),
    ]);
  }

  async getLoginAttempt(key: LoginAttemptKey): Promise<LoginAttemptState | null> {
    const attempt = await this.prisma.loginAttempt.findUnique({
      where: {
        identityHash_ipHash: key,
      },
    });
    return attempt
      ? {
          failures: attempt.failures,
          windowStartedAt: attempt.windowStartedAt,
          blockedUntil: attempt.blockedUntil,
        }
      : null;
  }

  async recordLoginFailure(
    key: LoginAttemptKey,
    now: Date,
  ): Promise<LoginAttemptState> {
    const windowCutoff = new Date(now.getTime() - LOGIN_WINDOW_MS);
    const blockedUntil = new Date(now.getTime() + LOGIN_BLOCK_MS);
    const [saved] = await this.prisma.$queryRaw<LoginAttemptRow[]>`
      INSERT INTO "LoginAttempt" (
        "id",
        "identityHash",
        "ipHash",
        "failures",
        "windowStartedAt",
        "blockedUntil",
        "updatedAt"
      ) VALUES (
        ${randomUUID()}::uuid,
        ${key.identityHash},
        ${key.ipHash},
        1,
        ${now},
        NULL,
        ${now}
      )
      ON CONFLICT ("identityHash", "ipHash") DO UPDATE SET
        "failures" = CASE
          WHEN "LoginAttempt"."windowStartedAt" <= ${windowCutoff}
            OR ("LoginAttempt"."blockedUntil" IS NOT NULL AND "LoginAttempt"."blockedUntil" <= ${now})
            THEN 1
          ELSE "LoginAttempt"."failures" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "LoginAttempt"."windowStartedAt" <= ${windowCutoff}
            OR ("LoginAttempt"."blockedUntil" IS NOT NULL AND "LoginAttempt"."blockedUntil" <= ${now})
            THEN ${now}
          ELSE "LoginAttempt"."windowStartedAt"
        END,
        "blockedUntil" = CASE
          WHEN "LoginAttempt"."windowStartedAt" <= ${windowCutoff}
            OR ("LoginAttempt"."blockedUntil" IS NOT NULL AND "LoginAttempt"."blockedUntil" <= ${now})
            THEN NULL
          WHEN "LoginAttempt"."failures" + 1 >= ${LOGIN_MAX_FAILURES}
            THEN ${blockedUntil}
          ELSE "LoginAttempt"."blockedUntil"
        END,
        "updatedAt" = ${now}
      RETURNING "failures", "windowStartedAt", "blockedUntil"
    `;

    if (!saved) {
      throw new Error("Falha ao registrar tentativa de login.");
    }
    return saved;
  }

  async clearLoginAttempt(key: LoginAttemptKey): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({ where: key });
  }
}
