import { pathToFileURL } from "node:url";

import "dotenv/config";

import { disconnectPrisma, getPrisma } from "@/infrastructure/db/prisma";
import { getServerEnv } from "@/lib/config/env";
import type { AuthRepository } from "@/modules/auth/application/auth-repository";
import { normalizeOwnerEmail } from "@/modules/auth/application/setup-owner";
import { hashPassword } from "@/modules/auth/domain/password";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

export interface ResetOwnerPasswordInput {
  ownerEmail?: string;
  newPassword?: string;
  resetSecretConfirmation?: string;
}

export interface ResetOwnerPasswordDependencies {
  repository: AuthRepository;
  expectedResetSecret: string;
  now: () => Date;
}

export async function resetOwnerPassword(
  input: ResetOwnerPasswordInput,
  dependencies: ResetOwnerPasswordDependencies,
): Promise<void> {
  if (
    !input.ownerEmail ||
    !input.newPassword ||
    !input.resetSecretConfirmation
  ) {
    throw new Error(
      "Defina OWNER_EMAIL, OWNER_NEW_PASSWORD e AUTH_RESET_SECRET_CONFIRM.",
    );
  }
  if (input.resetSecretConfirmation !== dependencies.expectedResetSecret) {
    throw new Error("AUTH_RESET_SECRET_CONFIRM não confere.");
  }

  const owner = await dependencies.repository.findOwnerByEmail(
    normalizeOwnerEmail(input.ownerEmail),
  );
  if (!owner) throw new Error("Proprietário não encontrado.");

  const passwordHash = await hashPassword(input.newPassword);
  await dependencies.repository.updatePasswordAndRevokeSessions({
    ownerId: owner.id,
    passwordHash,
    now: dependencies.now(),
  });
}

async function main(): Promise<void> {
  const env = getServerEnv();
  await resetOwnerPassword(
    {
      ownerEmail: process.env.OWNER_EMAIL,
      newPassword: process.env.OWNER_NEW_PASSWORD,
      resetSecretConfirmation: process.env.AUTH_RESET_SECRET_CONFIRM,
    },
    {
      repository: new PrismaAuthRepository(getPrisma()),
      expectedResetSecret: env.authResetSecret,
      now: () => new Date(),
    },
  );
  console.info("Senha do proprietário redefinida e sessões revogadas.");
}

const entryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;
if (entryPoint === import.meta.url) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Falha inesperada.";
      console.error(`Não foi possível redefinir a senha: ${message}`);
      process.exitCode = 1;
    })
    .finally(disconnectPrisma);
}
