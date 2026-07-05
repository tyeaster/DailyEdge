import type { Metadata } from "next";

import { CalibrationAdminPage } from "@/src/features/calibration-admin/calibration-admin-page";

export const metadata: Metadata = {
  description:
    "Monitor TrueLine model calibration, ROI, win rate, confidence buckets, and market performance.",
  title: "Calibration Engine | TrueLine",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <CalibrationAdminPage />;
}
