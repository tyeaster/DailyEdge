import type { NavigationItem } from "@/src/types/navigation";

import { Button } from "@/src/components/ui/button";

import { Container } from "./container";

export type NavbarProps = {
  ctaHref?: string;
  ctaLabel?: string;
  items: NavigationItem[];
};

export function Navbar({
  ctaHref = "#pricing",
  ctaLabel = "Join waitlist",
  items,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <Container>
        <nav className="flex items-center justify-between py-4">
          <a href="#" className="flex items-center gap-3" aria-label="TrueLine home">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-200">
              TL
            </span>
            <span className="text-lg font-semibold tracking-tight">TrueLine</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <Button href={ctaHref} size="sm" variant="secondary">
            {ctaLabel}
          </Button>
        </nav>
      </Container>
    </header>
  );
}
