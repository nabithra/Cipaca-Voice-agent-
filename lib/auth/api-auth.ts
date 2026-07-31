import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "cipaca_admin";

/** Returns true when admin auth is not required or the request is authenticated. */
export function isApiAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  return token === adminPassword;
}
