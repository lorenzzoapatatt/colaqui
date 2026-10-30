import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "A senha deve ter no mínimo 12 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

export function parsePassword(password: string): string {
  return passwordSchema.parse(password);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(parsePassword(password), {
    algorithm: 2,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
