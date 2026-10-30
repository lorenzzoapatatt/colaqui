import { z } from "zod";

import { getPrisma } from "@/infrastructure/db/prisma";
import type {
  AuthRepository,
  OwnerView,
} from "@/modules/auth/application/auth-repository";
import { toOwnerView } from "@/modules/auth/application/auth-repository";
import { OwnerAlreadyConfiguredError } from "@/modules/auth/domain/auth-errors";
import { hashPassword } from "@/modules/auth/domain/password";
import { PrismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";

const setupOwnerSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string(),
});

export interface SetupOwnerInput {
  email: string;
  password: string;
}

export interface SetupOwnerDependencies {
  repository: AuthRepository;
}

export function normalizeOwnerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultDependencies(): SetupOwnerDependencies {
  return { repository: new PrismaAuthRepository(getPrisma()) };
}

export async function setupOwner(
  input: SetupOwnerInput,
  dependencies = defaultDependencies(),
): Promise<OwnerView> {
  const parsed = setupOwnerSchema.parse({
    ...input,
    email: normalizeOwnerEmail(input.email),
  });
  const passwordHash = await hashPassword(parsed.password);

  try {
    const owner = await dependencies.repository.createOwner({
      email: parsed.email,
      passwordHash,
    });
    return toOwnerView(owner);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new OwnerAlreadyConfiguredError();
    }
    throw error;
  }
}
