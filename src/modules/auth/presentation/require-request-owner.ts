import type { OwnerView } from "@/modules/auth/application/auth-repository";
import { requireOwner } from "@/modules/auth/application/get-current-owner";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";
import { getRequestCookie } from "@/modules/auth/presentation/http";

export function requireRequestOwner(request: Request): Promise<OwnerView> {
  return requireOwner(getRequestCookie(request, AUTH_SESSION_COOKIE));
}
