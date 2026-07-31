import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get("redirect") ?? "/dashboard";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>CIPACA Admin Login</title></head>
    <body style="font-family:system-ui;max-width:360px;margin:4rem auto;padding:1rem">
    <h1>Admin Login</h1>
    <form method="POST" action="/api/auth/login">
      <input type="hidden" name="redirect" value="${redirect}"/>
      <label>Password<br/><input type="password" name="password" required style="width:100%;padding:0.5rem;margin:0.5rem 0"/></label><br/>
      <label>Role<br/>
        <select name="role" style="width:100%;padding:0.5rem;margin:0.5rem 0">
          <option value="admin">Admin</option>
          <option value="receptionist">Receptionist</option>
          <option value="viewer">Viewer</option>
        </select>
      </label><br/>
      <button type="submit" style="padding:0.5rem 1rem;margin-top:0.5rem">Sign in</button>
    </form></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const redirect = String(form.get("redirect") ?? "/dashboard");
  const role = String(form.get("role") ?? "viewer");
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected || password !== expected) {
    return NextResponse.redirect(new URL(`/api/auth/login?redirect=${encodeURIComponent(redirect)}&error=1`, request.url));
  }

  const res = NextResponse.redirect(new URL(redirect, request.url));
  res.cookies.set("cipaca_admin", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  res.cookies.set("cipaca_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
