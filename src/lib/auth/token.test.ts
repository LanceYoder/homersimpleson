import { describe, expect, it } from "vitest";
import { checkPasscode, createToken, hashPasscode, SESSION_DAYS, tokenIsValid } from "./token";

const DAY = 24 * 60 * 60 * 1000;

describe("passcode", () => {
  it("accepts the right passcode and rejects others", async () => {
    const stored = await hashPasscode("correct horse");
    expect(await checkPasscode("correct horse", stored)).toBe(true);
    expect(await checkPasscode("correct horsf", stored)).toBe(false);
    expect(await checkPasscode("", stored)).toBe(false);
  });

  it("rejects a malformed stored hash", async () => {
    expect(await checkPasscode("x", "")).toBe(false);
    expect(await checkPasscode("x", "scrypt:00:00")).toBe(false);
    expect(await checkPasscode("x", "plain:abc:def")).toBe(false);
  });
});

describe("session token", () => {
  const now = Date.UTC(2026, 10, 16);

  it("is valid until it expires", () => {
    const token = createToken("secret", now);
    expect(tokenIsValid(token, "secret", now)).toBe(true);
    expect(tokenIsValid(token, "secret", now + (SESSION_DAYS - 1) * DAY)).toBe(true);
    expect(tokenIsValid(token, "secret", now + SESSION_DAYS * DAY)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    expect(tokenIsValid(createToken("other", now), "secret", now)).toBe(false);
  });

  it("rejects a token whose expiry was changed", () => {
    const [v, expires, sig] = createToken("secret", now).split(".");
    expect(tokenIsValid(`${v}.${Number(expires) + DAY}.${sig}`, "secret", now)).toBe(false);
  });

  it("rejects missing or garbled input", () => {
    expect(tokenIsValid(undefined, "secret", now)).toBe(false);
    expect(tokenIsValid("", "secret", now)).toBe(false);
    expect(tokenIsValid("v1.abc.def", "secret", now)).toBe(false);
    expect(tokenIsValid(createToken("secret", now), undefined, now)).toBe(false);
    expect(tokenIsValid(createToken("", now), "", now)).toBe(false);
  });
});
