import type { Dinner } from "@/lib/household/state";

export const time = (d: Date | string) =>
  new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();

export function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} hr ${m % 60} min` : `${h} hr`;
}

export const field =
  "min-h-11 w-full rounded-xl border border-line bg-background px-3 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent";
export const button =
  "min-h-11 rounded-xl bg-accent px-4 font-medium text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";
export const quietButton =
  "min-h-11 rounded-xl border border-line px-4 font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60";

/** The page frame shared by every screen: phone width, clear of the tab bar. */
export function Screen({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
      {children}
    </main>
  );
}

export function Card({ lead, label, children }: { lead?: boolean; label: string; children: React.ReactNode }) {
  return (
    <section
      className={lead ? "rounded-3xl bg-accent p-5 text-on-accent shadow-sm" : "rounded-3xl border border-line bg-card p-5"}
    >
      <h2 className={`text-xs font-medium uppercase tracking-wider ${lead ? "" : "text-muted"}`}>{label}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function dinnerTag(d: Dinner): string | null {
  if (d.kind === "out") return "Out";
  if (d.kind === "hosting") return "Hosting";
  if (d.kind === "cook" && d.squeezedBy) return "Late start";
  if (d.kind === "cook" && d.recipe.effort === "quick") return "Quick";
  return null;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 rounded-full bg-tag px-2 py-0.5 text-xs text-muted">{children}</span>;
}
