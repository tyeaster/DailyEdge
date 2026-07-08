import type { Metadata } from "next";

import { PitcherResearchPage } from "@/src/features/pitcher-research/pitcher-research-page";

export const metadata: Metadata = {
  description:
    "Evaluate MLB starting pitchers for strikeout prop research using TrueLine model context, market lines, recent form, matchup inputs, weather, and ballpark data.",
  title: "Strikeout Lab | TrueLine",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pitcher?: string | string[] }>;
}) {
  const params = await searchParams;
  const pitcher =
    typeof params.pitcher === "string" ? params.pitcher : params.pitcher?.[0];

  return <PitcherResearchPage pitcherId={pitcher} />;
}
