import { getPrisma } from "@/infrastructure/db/prisma";
import type { AuthRepository } from "@/modules/auth/application/auth-repository";
import { hashSessionToken } from "@/modules/auth/domain/session";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

export interface LogoutOwnerDependencies {
  repository: AuthRepository;
  now: () => Date;
}

function defaultDependencies(): LogoutOwnerDependencies {
  return {
    repository: new PrismaAuthRepository(getPrisma()),
    now: () => new Date(),
  };
}

export async function logoutOwner(
  rawToken?: string,
  dependencies = defaultDependencies(),
): Promise<void> {
  if (!rawToken) return;
  await dependencies.repository.revokeSession(
    hashSessionToken(rawToken),
    dependencies.now(),
  );
}
