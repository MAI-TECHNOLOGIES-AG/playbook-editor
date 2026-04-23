import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { safeAuthCallbackUrl } from "@/lib/auth-callback";
import {
  AUTH_COOKIE_NAME,
  authSessionToken,
  isAuthEnabled,
} from "@/lib/auth-token";

export async function proxy(request: NextRequest) {
  const password = process.env.AUTH_PASSWORD;
  if (!isAuthEnabled() || !password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = await authSessionToken(password);
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authed = cookie === token;

  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/login")) {
    if (pathname.startsWith("/login") && authed) {
      const next = safeAuthCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl"),
      );
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    const loginUrl = new URL("/login", request.url);
    const dest = pathname + request.nextUrl.search;
    if (dest !== "/") {
      loginUrl.searchParams.set("callbackUrl", dest);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
