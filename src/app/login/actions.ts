"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth/session";
import { checkPasscode } from "@/lib/auth/token";
import { db } from "@/lib/db";

// Wrong guesses allowed, by anyone, before sign-in pauses. Browsers already
// signed in are unaffected by the pause.
const MAX_WRONG = 8;
const WINDOW_MINUTES = 15;

/** Returns a message to show when sign-in fails; on success it redirects home. */
export async function signIn(_previous: string | null, formData: FormData): Promise<string | null> {
  const stored = process.env.HOUSEHOLD_PASSCODE_HASH;
  if (!stored) redirect("/"); // sign-in is turned off
  if (!process.env.SESSION_SECRET) return "SESSION_SECRET is not set on the server.";
  const passcode = String(formData.get("passcode") ?? "").slice(0, 200);
  if (!passcode) return "Enter the passcode.";

  const sql = await db();
  const [{ wrong }] = await sql.query<{ wrong: number }>(
    `select count(*)::int as wrong from sign_in_attempts where at > now() - interval '${WINDOW_MINUTES} minutes'`,
  );
  if (wrong >= MAX_WRONG) return `Too many wrong passcodes. Try again in ${WINDOW_MINUTES} minutes.`;

  if (!(await checkPasscode(passcode, stored))) {
    await sql.exec("insert into sign_in_attempts default values; delete from sign_in_attempts where at < now() - interval '1 day'");
    return "That passcode isn't right.";
  }

  await startSession();
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
