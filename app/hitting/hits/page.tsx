import type { Metadata } from "next";

import { HitterResearchPage } from "@/src/features/hitter-research/hitter-research-page";

export const metadata: Metadata = {
  description:
    "Evaluate hitter hit props with TrueLine matchup intelligence, recent form, and game context.",
  title: "Hits Lab | TrueLine",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ batter?: string | string[] }>;
}) {
  const params = await searchParams;
  const batter = Array.isArray(params.batter) ? params.batter[0] : params.batter;

  return <HitterResearchPage batterId={batter} />;
}
