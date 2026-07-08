import type { Metadata } from "next";

import { PitchIntelligencePage } from "@/src/features/pitch-intelligence/pitch-intelligence-page";

export const metadata: Metadata = {
  description:
    "Scout pitcher arsenals against hitter plate discipline with pitch-type matchup scores and explainability in TrueLine.",
  title: "Pitch Intelligence | TrueLine",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    batter?: string | string[];
    pitcher?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const batter = Array.isArray(params.batter) ? params.batter[0] : params.batter;
  const pitcher = Array.isArray(params.pitcher)
    ? params.pitcher[0]
    : params.pitcher;

  return <PitchIntelligencePage batterId={batter} pitcherId={pitcher} />;
}
