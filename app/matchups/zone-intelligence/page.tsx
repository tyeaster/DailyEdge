import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Zone Intelligence is coming soon to TrueLine.",
  title: "Zone Intelligence | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="zone-intelligence" />;
}
