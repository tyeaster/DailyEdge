import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Moneyline Lab is coming soon to TrueLine.",
  title: "Moneyline Lab | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="moneyline" />;
}
