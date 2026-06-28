import type { Metadata } from "next";

import { ComingSoonPage } from "@/src/features/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  description: "Player Research is coming soon to TrueLine.",
  title: "Player Research | TrueLine",
};

export default function Page() {
  return <ComingSoonPage pageKey="players" />;
}
