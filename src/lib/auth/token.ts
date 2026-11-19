import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * The building blocks of sign-in, with no dependence on the web framework:
 * a household passcode kept only as a scrypt hash, and a signed token that
 * proves a browser gave the right passcode until the token expires.
 */

/**
 * Sign-in is off until a passcode is set with `npm run passcode`. While it is
 * off, anyone who can reach the app can read and change everything in it.
 */
export function signInRequired(): boolean {
  return Boolean(process.env.HOUSEHOLD_PASSCODE_HASH);
}

export const SESSION_COOKIE = "homer_session";
export const SESSION_DAYS = 180;

const KEY_BYTES = 32;

function derive(passcode: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(passcode.normalize("NFKC"), salt, KEY_BYTES, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** "scrypt:<salt>:<hash>", safe to keep in an environment variable. */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${(await derive(passcode, salt)).toString("hex")}`;
}

export async function checkPasscode(passcode: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_BYTES) return false;
  return timingSafeEqual(await derive(passcode, Buffer.from(salt, "hex")), expected);
}

function signature(expires: number, secret: string): Buffer {
  return createHmac("sha256", secret).update(`v1.${expires}`).digest();
}

export function createToken(secret: string, now = Date.now()): string {
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `v1.${expires}.${signature(expires, secret).toString("base64url")}`;
}

export function tokenIsValid(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const [version, expiresText, sig] = token.split(".");
  if (version !== "v1" || !expiresText || !sig) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= now) return false;
  const given = Buffer.from(sig, "base64url");
  const expected = signature(expires, secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
