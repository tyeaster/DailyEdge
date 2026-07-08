import type { Metadata } from "next";

import { MoneylineIntelligencePage } from "@/src/features/moneyline-intelligence/moneyline-intelligence-page";

export const metadata: Metadata = {
  description:
    "Evaluate MLB moneylines with TrueLine game intelligence, fair odds, edge, confidence, and explainable baseball factors.",
  title: "Moneyline Lab | TrueLine",
};
export const dynamic = "force-dynamic";

export default function Page() {
  return <MoneylineIntelligencePage />;
}
