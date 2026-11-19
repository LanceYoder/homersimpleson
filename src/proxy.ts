import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, signInRequired, tokenIsValid } from "@/lib/auth/token";

/**
 * Sends browsers that are not signed in to the sign-in screen before any page
 * renders. A convenience only: pages and actions check again themselves
 * (requireSignIn), so nothing depends on this file's matcher being right.
 */
export function proxy(request: NextRequest) {
  if (!signInRequired()) {
    return request.nextUrl.pathname === "/login" ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  const signedIn = tokenIsValid(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && onLogin && request.method === "GET") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except build output and the icons and manifest a phone fetches
  // when the app is added to the home screen.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
