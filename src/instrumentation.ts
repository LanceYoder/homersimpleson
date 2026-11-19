/**
 * Runs once when the server starts: opens the database connection (and applies
 * any pending database changes) before the first page asks for it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { db } = await import("./lib/db");
  await db().catch((err) => console.error("Database not reachable at startup:", err));
}
