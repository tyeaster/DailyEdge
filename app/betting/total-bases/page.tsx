import type { Metadata } from "next";

import { TotalBasesIntelligencePage } from "@/src/features/total-bases-intelligence/total-bases-intelligence-page";

export const metadata: Metadata = {
  description:
    "Rank hitter total-base opportunities with TrueLine player, matchup, weather, ballpark, bullpen, and lineup intelligence.",
  title: "Total Bases Lab | TrueLine",
};

export default function Page() {
  return <TotalBasesIntelligencePage />;
}
