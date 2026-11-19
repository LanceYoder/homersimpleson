import { migrations } from "./migrations";
import { seed } from "./household/seed";

/**
 * The one shared database. With DATABASE_URL set it is the hosted Postgres
 * (Supabase); without it, a stand-in Postgres stored in .data/ on this
 * computer, filled with sample data, so the app runs before anything is hosted.
 */
export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs several statements with no parameters. */
  exec(text: string): Promise<void>;
};

const QUERY_TIMEOUT_MS = 10_000;

const cache = globalThis as { __homerDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!cache.__homerDb) {
    cache.__homerDb = connect().catch((err) => {
      cache.__homerDb = undefined;
      throw err;
    });
  }
  return cache.__homerDb;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let conn: Db;

  if (url) {
    const { default: postgres } = await import("postgres");
    // prepare: false is required by Supabase's pooled connections. Idle
    // connections are closed quickly so a stale one is never reused. The
    // 10-second guard below stays as a backstop for anything unforeseen.
    const sql = postgres(url, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      max_lifetime: 600,
      connect_timeout: 10,
      onnotice: () => {},
      // One query at a time per connection. By default the driver sends the
      // next query before the last one has answered (pipelining); Supabase's
      // pooler never answers those, so they hung whenever two ran at once.
      max_pipeline: 1,
    });
    // A query that gets no answer means the connection is stuck. Drop the
    // pool so the next call reconnects, rather than hanging every page.
    const guarded = async <T,>(run: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stuck = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          cache.__homerDb = undefined;
          void sql.end({ timeout: 0 }).catch(() => {});
          reject(new Error(`Database did not answer within ${QUERY_TIMEOUT_MS / 1000}s`));
        }, QUERY_TIMEOUT_MS);
      });
      try {
        return await Promise.race([run, stuck]);
      } finally {
        clearTimeout(timer);
      }
    };
    conn = {
      query: (text, params = []) => guarded(sql.unsafe(text, params as never[]).then((rows) => rows as never)),
      exec: (text) => guarded(sql.unsafe(text).then(() => undefined)),
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(".data", { recursive: true });
    const lite = new PGlite(".data/pglite");
    conn = {
      query: async (text, params = []) => (await lite.query(text, params)).rows as never,
      exec: async (text) => {
        await lite.exec(text);
      },
    };
  }

  await migrate(conn);
  if (!url) await seed(conn);
  return conn;
}

async function migrate(conn: Db) {
  await conn.exec("create table if not exists _migrations (name text primary key, run_at timestamptz not null default now())");
  const done = new Set((await conn.query<{ name: string }>("select name from _migrations")).map((r) => r.name));
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    await conn.exec(`begin; ${m.sql}; insert into _migrations (name) values ('${m.name}'); commit;`);
  }
}
