import type { Metadata } from "next";

import { BallparkResearchPage } from "@/src/features/ballpark-research/ballpark-research-page";

export const metadata: Metadata = {
  description:
    "Search all 30 MLB ballparks with park factors and hitter/pitcher/power ratings in TrueLine.",
  title: "Ballpark Research | TrueLine",
};

export default function Page() {
  return <BallparkResearchPage />;
}
