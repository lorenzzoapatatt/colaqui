import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/infrastructure/observability/logger";
import { problem } from "@/lib/http/problem";
import { AuthError } from "@/modules/auth/domain/auth-errors";
import { MediaError } from "@/modules/media/domain/photo";
import { ProductError } from "@/modules/products/domain/product-errors";

export function productEtag(version: number): string {
  return `"${version}"`;
}

export function parseExpectedVersion(request: Request): number {
  const value = request.headers.get("if-match");
  if (!value) throw new ZodError([]);
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(value.trim());
  if (!match) throw new ZodError([]);
  const version = Number(match[1]);
  if (!Number.isInteger(version) || version < 1) throw new ZodError([]);
  return version;
}

export function productErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof AuthError ||
    error instanceof ProductError ||
    error instanceof MediaError
  ) {
    return NextResponse.json(problem(error.status, error.title, error.detail), {
      status: error.status,
    });
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      problem(400, "Dados inválidos", "Revise os campos enviados."),
      { status: 400 },
    );
  }
  logger.error("Product request failed", { error });
  return NextResponse.json(
    problem(500, "Erro interno", "Não foi possível concluir a solicitação."),
    { status: 500 },
  );
}
