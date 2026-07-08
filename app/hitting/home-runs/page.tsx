import type { Metadata } from "next";

import { HomeRunIntelligencePage } from "@/src/features/home-run-intelligence/home-run-intelligence-page";

export const metadata: Metadata = {
  description:
    "Find the best home run environments and hitter matchups using TrueLine Home Run Intelligence.",
  title: "Home Run Lab | TrueLine",
};

export default function Page() {
  return <HomeRunIntelligencePage />;
}
