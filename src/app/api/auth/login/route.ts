import { NextResponse } from "next/server";
import { z } from "zod";

import { loginOwner } from "@/modules/auth/application/login-owner";
import {
  authErrorResponse,
  getRequestIpAddress,
  isFormRequest,
  readAuthRequestBody,
  setSessionCookie,
} from "@/modules/auth/presentation/http";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = requestSchema.parse(await readAuthRequestBody(request));
    const session = await loginOwner(input, {
      ipAddress: getRequestIpAddress(request),
    });
    const response = isFormRequest(request)
      ? NextResponse.redirect(new URL("/", request.url), 303)
      : NextResponse.json({ owner: session.owner });
    setSessionCookie(response, session.rawToken, session.expiresAt);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
