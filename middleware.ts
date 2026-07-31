import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_ROUTES, roleCanAccess, roleFromCookie } from "@/lib/auth/roles";

const ADMIN_COOKIE = "cipaca_admin";
const ROLE_COOKIE = "cipaca_role";

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const role = roleFromCookie(request.cookies.get(ROLE_COOKIE)?.value);

  if (token !== adminPassword) {
    const loginUrl = new URL("/api/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!roleCanAccess(role, pathname)) {
    return NextResponse.redirect(new URL("/voice", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/knowledge/:path*", "/gre/:path*", "/training/:path*", "/pilot/:path*"],
};
