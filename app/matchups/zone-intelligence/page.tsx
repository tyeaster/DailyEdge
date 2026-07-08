import type { Metadata } from "next";

import { ZoneIntelligencePage } from "@/src/features/zone-intelligence/zone-intelligence-page";

export const metadata: Metadata = {
  description:
    "Analyze pitcher-vs-batter zone overlap, pitch arsenals, damage profiles, and matchup explainability in TrueLine.",
  title: "Zone Intelligence | TrueLine",
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

  return <ZoneIntelligencePage batterId={batter} pitcherId={pitcher} />;
}
