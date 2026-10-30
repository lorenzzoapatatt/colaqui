import { NextResponse } from "next/server";
import { z } from "zod";

import { changePassword } from "@/modules/auth/application/change-password";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";
import {
  authErrorResponse,
  clearSessionCookie,
  getRequestCookie,
  readAuthRequestBody,
} from "@/modules/auth/presentation/http";

export const runtime = "nodejs";

const requestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = requestSchema.parse(await readAuthRequestBody(request));
    await changePassword({
      ...input,
      rawToken: getRequestCookie(request, AUTH_SESSION_COOKIE),
    });
    const response = new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
