"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/src/lib/cn";

const navigationGroups = [
  {
    items: [{ href: "/", label: "Daily Slate" }],
    label: "Slate",
  },
  {
    items: [{ href: "/pitching/strikeouts", label: "Strikeouts" }],
    label: "Pitching",
  },
  {
    items: [
      { href: "/hitting/hits", label: "Hits" },
      { href: "/hitting/total-bases", label: "Total Bases" },
      { href: "/hitting/home-runs", label: "Home Runs" },
    ],
    label: "Hitting",
  },
  {
    items: [
      { href: "/matchups/zone-intelligence", label: "Zone Intelligence" },
      { href: "/matchups/pitch-intelligence", label: "Pitch Intelligence" },
    ],
    label: "Matchups",
  },
  {
    items: [
      { href: "/betting/moneyline", label: "Moneyline" },
      { href: "/betting/team-totals", label: "Team Totals" },
      { href: "/team/game-total", label: "Game Total" },
    ],
    label: "Team Betting",
  },
  {
    items: [
      { href: "/research/players", label: "Players" },
      { href: "/research/teams", label: "Teams" },
      { href: "/research/ballparks", label: "Ballparks" },
    ],
    label: "Research",
  },
];

const primaryLinks = [
  { href: "/", label: "Daily Slate" },
  { href: "/pitching/strikeouts", label: "Pitching" },
  { href: "/hitting/hits", label: "Hitting" },
  { href: "/matchups/zone-intelligence", label: "Matchups" },
  { href: "/betting/moneyline", label: "Team Betting" },
  { href: "/research/players", label: "Research" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#030812] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-slate-800 bg-[#050915]/95 px-3 py-4 backdrop-blur md:flex xl:w-72">
        <div className="flex w-full flex-col">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-sm font-black text-blue-100">
              TL
            </span>
            <span className="hidden text-lg font-semibold tracking-tight text-white xl:inline">
              TrueLine
            </span>
          </Link>

          <nav className="mt-8 space-y-6" aria-label="Primary navigation">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 xl:block">
                  {group.label}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-white",
                          active &&
                            "border border-blue-300/20 bg-blue-400/10 text-blue-100 shadow-lg shadow-blue-950/20",
                        )}
                        href={item.href}
                        key={item.href}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-xs font-semibold transition group-hover:bg-white/[0.08]">
                          {item.label.slice(0, 1)}
                        </span>
                        <span className="hidden min-w-0 flex-1 xl:inline">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-h-screen md:pl-20 xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#07101c]/90 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-sm font-black text-blue-100 md:hidden">
                TL
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/80">
                  TrueLine
                </p>
                <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
                  {getCurrentSection(pathname)}
                </h1>
              </div>
            </Link>

            <nav
              aria-label="Workflow navigation"
              className="hidden flex-1 justify-center lg:flex"
            >
              <div className="flex max-w-4xl gap-1 rounded-2xl border border-slate-800 bg-white/[0.025] p-1">
                {primaryLinks.map((link) => {
                  const active = isPrimaryActive(pathname, link.href);

                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-white",
                        active && "bg-blue-400/10 text-blue-100",
                      )}
                      href={link.href}
                      key={link.href}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-700 bg-gradient-to-br from-blue-300/25 to-slate-800 text-sm font-semibold text-white">
              TL
            </div>
          </div>

          <div className="border-t border-slate-800 px-4 py-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {primaryLinks.map((link) => {
                const active = isPrimaryActive(pathname, link.href);

                return (
                  <Link
                    className={cn(
                      "shrink-0 rounded-full border border-slate-800 bg-white/[0.03] px-3 py-2 text-sm text-slate-300",
                      active && "border-blue-300/20 bg-blue-400/10 text-blue-100",
                    )}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function getCurrentSection(pathname: string) {
  if (pathname.startsWith("/pitching")) return "Pitching";
  if (pathname.startsWith("/hitting")) return "Hitting";
  if (pathname.startsWith("/matchups")) return "Matchups";
  if (pathname.startsWith("/betting") || pathname.startsWith("/team")) return "Team Betting";
  if (pathname.startsWith("/research")) return "Research";
  return "Daily Slate";
}

function isPrimaryActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname.startsWith(`/${href.split("/")[1]}`);
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname === href || pathname.startsWith(`${href}/`);
}
