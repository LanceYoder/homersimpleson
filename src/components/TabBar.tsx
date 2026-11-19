"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/meals", label: "Meals" },
  { href: "/groceries", label: "Groceries" },
];

export function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const current = path === t.href;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center text-sm font-medium ${current ? "text-accent" : "text-muted"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
