export type DashboardNavItem = {
  active?: boolean;
  badge?: string;
  href: string;
  icon: string;
  label: string;
};

export type SlateMeta = {
  averageConfidence: string;
  currentDate: string;
  dataSource?: "live" | "mock";
  dataSourceMessage?: string;
  firstPitchCountdown: string;
  gamesToday: number;
  lastUpdated: string;
};

export type KpiMetric = {
  label: string;
  meta: string;
  tone?: "blue" | "emerald" | "amber";
  value: string;
};
