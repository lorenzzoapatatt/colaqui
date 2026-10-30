import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { OwnerView } from "@/modules/auth/application/auth-repository";
import { getCurrentOwner } from "@/modules/auth/application/get-current-owner";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";

export async function requirePageOwner(): Promise<OwnerView> {
  const cookieStore = await cookies();
  const owner = await getCurrentOwner(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
  if (!owner) redirect("/login");
  return owner;
}
