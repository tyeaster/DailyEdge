import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Game Total Lab is coming soon to TrueLine.",
  title: "Game Total Lab | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="game-total" />;
}
