import type { Metadata } from "next";

import { OddsIntelligenceAdminPage } from "@/src/features/odds-intelligence-admin/odds-intelligence-admin-page";

export const metadata: Metadata = {
  description:
    "Monitor TrueLine closing line value, odds movement, steam alerts, and sportsbook market agreement.",
  title: "Odds Intelligence | TrueLine",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <OddsIntelligenceAdminPage />;
}
