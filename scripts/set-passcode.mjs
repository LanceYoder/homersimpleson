// Sets the household passcode: `npm run passcode`.
// Stores only a scrypt hash of it in .env.local, plus the secret that signs
// sessions (created once; replacing it signs every device out).
// Keep the hash format in step with src/lib/auth/token.ts.
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const FILE = ".env.local";
const MIN_LENGTH = 8;

function ask(question) {
  // Piped input (for scripts): read one line, nothing echoed anyway.
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      const rl = createInterface({ input: process.stdin });
      rl.once("line", (line) => (resolve(line), rl.close()));
      rl.once("close", () => resolve(""));
    });
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      // Show the question and line breaks, hide what is typed.
      if (text.includes(question) || text === "\r\n" || text === "\n") process.stdout.write(text);
    };
    rl.question(question, (answer) => (rl.close(), resolve(answer)));
  });
}

const passcode = (await ask(`New household passcode (at least ${MIN_LENGTH} characters): `)).trim();
if (passcode.length < MIN_LENGTH) {
  console.error(`\nNot changed: the passcode needs at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}
if (process.stdin.isTTY) {
  const again = (await ask("Type it again: ")).trim();
  if (again !== passcode) {
    console.error("\nNot changed: the two entries differ.");
    process.exit(1);
  }
}

const salt = randomBytes(16);
const hash = `scrypt:${salt.toString("hex")}:${scryptSync(passcode.normalize("NFKC"), salt, 32).toString("hex")}`;

let lines = existsSync(FILE) ? readFileSync(FILE, "utf8").split("\n") : [];
const set = (name, value) => {
  const at = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (at >= 0) lines[at] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
};
while (lines.length && lines[lines.length - 1] === "") lines.pop();
set("HOUSEHOLD_PASSCODE_HASH", hash);
if (!lines.some((l) => l.startsWith("SESSION_SECRET="))) set("SESSION_SECRET", randomBytes(32).toString("base64url"));
writeFileSync(FILE, lines.join("\n") + "\n");

console.log(`\nPasscode saved to ${FILE}. Restart the app for it to take effect.`);
