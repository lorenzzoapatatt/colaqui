import { NextResponse } from "next/server";
import { z } from "zod";

import { setupOwner } from "@/modules/auth/application/setup-owner";
import {
  authErrorResponse,
  isFormRequest,
  readAuthRequestBody,
} from "@/modules/auth/presentation/http";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = requestSchema.parse(await readAuthRequestBody(request));
    const owner = await setupOwner(input);
    if (isFormRequest(request)) {
      return NextResponse.redirect(new URL("/login?configured=1", request.url), 303);
    }
    return NextResponse.json(owner, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
