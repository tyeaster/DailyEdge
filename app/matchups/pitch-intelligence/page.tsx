import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Pitch Intelligence is coming soon to TrueLine.",
  title: "Pitch Intelligence | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="pitch-intelligence" />;
}
