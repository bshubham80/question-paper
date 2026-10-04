"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/new", label: "New exam", icon: "M12 5v14M5 12h14" },
  { href: "/history", label: "History", icon: "M12 7v5l3 3M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Inline links in the header on tablet/desktop. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden gap-1 text-sm sm:flex">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className="rounded-md px-3 py-1.5 text-muted hover:bg-bg hover:text-ink aria-[current=page]:bg-bg aria-[current=page]:text-ink"
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

/** Thumb-reachable tab bar on phones. Height matches --nav-h in globals.css. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-surface/95 pb-[var(--safe-b)] backdrop-blur sm:hidden"
    >
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className="flex h-15 flex-col items-center justify-center gap-0.5 text-xs text-muted aria-[current=page]:font-medium aria-[current=page]:text-brand"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={n.icon} />
          </svg>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
