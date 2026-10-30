import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AuthRepository,
  LoginAttemptKey,
  OwnerRecord,
  SessionOwnerRecord,
} from "@/modules/auth/application/auth-repository";
import {
  nextLoginFailure,
  type LoginAttemptState,
} from "@/modules/auth/domain/login-rate-limit";

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.loginAttempt.findUnique({
        where: { identityHash_ipHash: key },
      });
      const next = nextLoginFailure(current, now);
      const saved = await transaction.loginAttempt.upsert({
        where: { identityHash_ipHash: key },
        create: {
          ...key,
          ...next,
        },
        update: next,
      });
      return {
        failures: saved.failures,
        windowStartedAt: saved.windowStartedAt,
        blockedUntil: saved.blockedUntil,
      };
    });
  }

  async clearLoginAttempt(key: LoginAttemptKey): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({ where: key });
  }
}
