import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/modules/admin/auth";

type SessionPayload = NonNullable<ReturnType<typeof verifyAdminSessionToken>>;

export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function requireAdminAuthentication() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function requireAdminRole() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (session.role !== "admin") {
    redirect("/admin");
  }
}

export function getAdminRequestSession(request: NextRequest | Request): SessionPayload | null {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return null;
  }

  const found = rawCookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  if (!found) {
    return null;
  }

  const token = found.split("=").slice(1).join("=");
  return verifyAdminSessionToken(token);
}

export function isAdminRequestAuthenticated(request: NextRequest | Request) {
  return Boolean(getAdminRequestSession(request));
}

export function isAdminRequestWithRole(
  request: NextRequest | Request,
  roles: Array<"admin" | "editor">,
) {
  const session = getAdminRequestSession(request);
  if (!session) {
    return false;
  }
  return roles.includes(session.role);
}
