import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Home Run Lab is coming soon to TrueLine.",
  title: "Home Run Lab | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="home-runs" />;
}
