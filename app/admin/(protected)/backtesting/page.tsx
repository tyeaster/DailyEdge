import type { Metadata } from "next";

import { BacktestingAdminPage } from "@/src/features/backtesting-admin/backtesting-admin-page";

export const metadata: Metadata = {
  description:
    "Replay historical TrueLine betting strategies with ROI, bankroll, equity curve, drawdown, and market performance.",
  title: "Backtesting Engine | TrueLine",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <BacktestingAdminPage />;
}
