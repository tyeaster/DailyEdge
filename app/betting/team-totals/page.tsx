import type { Metadata } from "next";

import { TeamTotalsIntelligencePage } from "@/src/features/team-totals-intelligence/team-totals-intelligence-page";

export const metadata: Metadata = {
  description:
    "Evaluate MLB team totals with TrueLine offense, lineup, matchup, bullpen, weather, park, and market intelligence.",
  title: "Team Totals Lab | TrueLine",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <TeamTotalsIntelligencePage />;
}
