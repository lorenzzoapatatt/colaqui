import { getPrisma } from "@/infrastructure/db/prisma";
import type { AuthRepository } from "@/modules/auth/application/auth-repository";
import {
  AuthenticationRequiredError,
  InvalidCredentialsError,
} from "@/modules/auth/domain/auth-errors";
import { hashPassword, verifyPassword } from "@/modules/auth/domain/password";
import { hashSessionToken } from "@/modules/auth/domain/session";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

export interface ChangePasswordInput {
  rawToken?: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordDependencies {
  repository: AuthRepository;
  now: () => Date;
}

function defaultDependencies(): ChangePasswordDependencies {
  return {
    repository: new PrismaAuthRepository(getPrisma()),
    now: () => new Date(),
  };
}

export async function changePassword(
  input: ChangePasswordInput,
  dependencies = defaultDependencies(),
): Promise<void> {
  if (!input.rawToken) throw new AuthenticationRequiredError();

  const now = dependencies.now();
  const session = await dependencies.repository.findOwnerByTokenHash(
    hashSessionToken(input.rawToken),
    now,
  );
  if (!session) throw new AuthenticationRequiredError();

  const validCurrentPassword = await verifyPassword(
    session.owner.passwordHash,
    input.currentPassword,
  );
  if (!validCurrentPassword) throw new InvalidCredentialsError();

  const passwordHash = await hashPassword(input.newPassword);
  await dependencies.repository.updatePasswordAndRevokeSessions({
    ownerId: session.owner.id,
    passwordHash,
    now,
  });
}
