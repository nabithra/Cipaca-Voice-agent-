export type UserRole = "admin" | "receptionist" | "viewer";

export const ADMIN_ROUTES = ["/dashboard", "/knowledge", "/gre", "/training", "/pilot"];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["/dashboard", "/knowledge", "/gre", "/training", "/pilot", "/voice"],
  receptionist: ["/voice", "/dashboard"],
  viewer: ["/dashboard"],
};

export function roleCanAccess(role: UserRole, pathname: string): boolean {
  return ROLE_PERMISSIONS[role].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function roleFromCookie(value: string | undefined): UserRole {
  if (value === "admin" || value === "receptionist" || value === "viewer") return value;
  return "viewer";
}
