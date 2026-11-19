/**
 * Database changes, applied in order the first time the app connects.
 * Add new entries at the end; never edit one that has already run.
 *
 * Row-level security is on with no policies, so the tables are closed to
 * Supabase's public API and only this app's server can read or write them.
 */
export const migrations: Array<{ name: string; sql: string }> = [
  {
    name: "0001_init",
    sql: `
      create table recipes (
        id uuid primary key default gen_random_uuid(),
        title text not null check (length(trim(title)) > 0),
        minutes integer not null check (minutes > 0),
        effort text not null check (effort in ('quick', 'standard', 'involved')),
        url text,
        ingredients jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now()
      );

      create table planned_meals (
        date date primary key,
        recipe_id uuid not null references recipes (id) on delete cascade
      );

      create table grocery_items (
        id uuid primary key default gen_random_uuid(),
        name text not null check (length(trim(name)) > 0),
        aisle text not null default 'Other',
        done boolean not null default false,
        created_at timestamptz not null default now()
      );

      alter table recipes enable row level security;
      alter table planned_meals enable row level security;
      alter table grocery_items enable row level security;
    `,
  },
  {
    // Wrong passcodes, kept briefly so guessing can be slowed down.
    name: "0002_sign_in_attempts",
    sql: `
      create table sign_in_attempts (
        at timestamptz not null default now()
      );
      alter table sign_in_attempts enable row level security;
    `,
  },
];
