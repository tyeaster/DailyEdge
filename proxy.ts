import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/src/auth/session";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (isValidAdminSessionToken(sessionToken)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);

  loginUrl.searchParams.set("from", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
