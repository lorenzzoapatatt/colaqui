import { getPrisma } from "@/infrastructure/db/prisma";
import { getServerEnv } from "@/lib/config/env";
import type {
  AuthRepository,
  OwnerView,
} from "@/modules/auth/application/auth-repository";
import { toOwnerView } from "@/modules/auth/application/auth-repository";
import {
  InvalidCredentialsError,
  LoginRateLimitedError,
} from "@/modules/auth/domain/auth-errors";
import {
  isLoginBlocked,
  loginDimensionHash,
} from "@/modules/auth/domain/login-rate-limit";
import { hashPassword, verifyPassword } from "@/modules/auth/domain/password";
import { createSession } from "@/modules/auth/domain/session";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

let dummyPasswordHash: Promise<string> | undefined;

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginContext {
  ipAddress: string;
}

export interface SessionToken {
  rawToken: string;
  expiresAt: Date;
  owner: OwnerView;
}

export interface LoginOwnerDependencies {
  repository: AuthRepository;
  hashSecret: string;
  now: () => Date;
}

function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultDependencies(): LoginOwnerDependencies {
  return {
    repository: new PrismaAuthRepository(getPrisma()),
    hashSecret: getServerEnv().authResetSecret,
    now: () => new Date(),
  };
}

async function passwordMatches(
  passwordHash: string | undefined,
  password: string,
): Promise<boolean> {
  dummyPasswordHash ??= hashPassword("colaqui-senha-ficticia");
  return verifyPassword(passwordHash ?? (await dummyPasswordHash), password);
}

export async function loginOwner(
  input: LoginInput,
  context: LoginContext,
  dependencies = defaultDependencies(),
): Promise<SessionToken> {
  const now = dependencies.now();
  const email = normalizeLoginEmail(input.email);
  const key = {
    identityHash: loginDimensionHash(dependencies.hashSecret, email),
    ipHash: loginDimensionHash(dependencies.hashSecret, context.ipAddress),
  };
  const attempt = await dependencies.repository.getLoginAttempt(key);

  if (isLoginBlocked(attempt, now)) {
    throw new LoginRateLimitedError();
  }

  const owner = await dependencies.repository.findOwnerByEmail(email);
  const matches = await passwordMatches(owner?.passwordHash, input.password);

  if (!owner || !matches) {
    await dependencies.repository.recordLoginFailure(key, now);
    throw new InvalidCredentialsError();
  }

  await dependencies.repository.clearLoginAttempt(key);
  const session = createSession(now);
  await dependencies.repository.createSession({
    ownerId: owner.id,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt,
    now,
  });

  return {
    rawToken: session.rawToken,
    expiresAt: session.expiresAt,
    owner: toOwnerView(owner),
  };
}
