import { NextResponse } from "next/server";

import { logoutOwner } from "@/modules/auth/application/logout-owner";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";
import {
  authErrorResponse,
  clearSessionCookie,
  getRequestCookie,
  isFormRequest,
} from "@/modules/auth/presentation/http";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await logoutOwner(getRequestCookie(request, AUTH_SESSION_COOKIE));
    const response = isFormRequest(request)
      ? NextResponse.redirect(new URL("/login", request.url), 303)
      : new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
