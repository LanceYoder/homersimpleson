import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, SESSION_COOKIE, SESSION_DAYS, signInRequired, tokenIsValid } from "./token";

/** True when this browser holds an unexpired sign-in. */
export async function isSignedIn(): Promise<boolean> {
  if (!signInRequired()) return true;
  return tokenIsValid((await cookies()).get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
}

/**
 * Call at the top of anything that reads or changes household data. The
 * redirect in proxy.ts is only a convenience; this is the real check.
 */
export async function requireSignIn(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}

export async function startSession(): Promise<void> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  (await cookies()).set(SESSION_COOKIE, createToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
