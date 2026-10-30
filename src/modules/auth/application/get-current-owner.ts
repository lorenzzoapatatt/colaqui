import { getPrisma } from "@/infrastructure/db/prisma";
import type {
  AuthRepository,
  OwnerView,
} from "@/modules/auth/application/auth-repository";
import { toOwnerView } from "@/modules/auth/application/auth-repository";
import { AuthenticationRequiredError } from "@/modules/auth/domain/auth-errors";
import { hashSessionToken } from "@/modules/auth/domain/session";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

export interface CurrentOwnerDependencies {
  repository: AuthRepository;
  now: () => Date;
}

function defaultDependencies(): CurrentOwnerDependencies {
  return {
    repository: new PrismaAuthRepository(getPrisma()),
    now: () => new Date(),
  };
}

export async function getCurrentOwner(
  rawToken?: string,
  dependencies = defaultDependencies(),
): Promise<OwnerView | null> {
  if (!rawToken) return null;
  const session = await dependencies.repository.findOwnerByTokenHash(
    hashSessionToken(rawToken),
    dependencies.now(),
  );
  return session ? toOwnerView(session.owner) : null;
}

export async function requireOwner(
  rawToken?: string,
  dependencies = defaultDependencies(),
): Promise<OwnerView> {
  const owner = await getCurrentOwner(rawToken, dependencies);
  if (!owner) throw new AuthenticationRequiredError();
  return owner;
}
