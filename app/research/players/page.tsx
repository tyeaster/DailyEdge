import type { Metadata } from "next";

import { PlayerResearchPage } from "@/src/features/player-research/player-research-page";

export const metadata: Metadata = {
  description:
    "Search every pitcher and hitter on today's MLB slate with direct links into TrueLine's research labs.",
  title: "Player Research | TrueLine",
};

export default function Page() {
  return <PlayerResearchPage />;
}
