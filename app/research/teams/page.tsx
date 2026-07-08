import type { Metadata } from "next";

import { TeamResearchPage } from "@/src/features/team-research/team-research-page";

export const metadata: Metadata = {
  description:
    "Search all 30 MLB teams with current offense, pitching, and bullpen ratings in TrueLine.",
  title: "Team Research | TrueLine",
};

export default function Page() {
  return <TeamResearchPage />;
}
