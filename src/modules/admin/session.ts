import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/modules/admin/auth";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(verifyAdminSessionToken(token));
}

export async function requireAdminAuthentication() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    redirect("/admin/login");
  }
}

export function isAdminRequestAuthenticated(request: NextRequest | Request) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return false;
  }

  const found = rawCookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  if (!found) {
    return false;
  }

  const token = found.split("=").slice(1).join("=");
  return Boolean(verifyAdminSessionToken(token));
}
