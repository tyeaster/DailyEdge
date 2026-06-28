import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Team Total Lab is coming soon to TrueLine.",
  title: "Team Total Lab | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="team-total" />;
}
