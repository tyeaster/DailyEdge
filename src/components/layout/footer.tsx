import type { NavigationItem } from "@/src/types/navigation";

import { Container } from "./container";

export type FooterProps = {
  description?: string;
  items: NavigationItem[];
};

export function Footer({
  description = "Predictive sports analytics for sharper decisions.",
  items,
}: FooterProps) {
  return (
    <footer className="border-t border-white/10 py-10">
      <Container className="flex flex-col gap-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-white">DailyEdge</p>
          <p className="mt-2">{description}</p>
        </div>
        <div className="flex flex-wrap gap-5">
          {items.map((item) => (
            <a key={item.label} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
