import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pitcher?: string | string[] }>;
}) {
  const params = await searchParams;
  const pitcher =
    typeof params.pitcher === "string" ? params.pitcher : params.pitcher?.[0];
  const query = pitcher ? `?pitcher=${encodeURIComponent(pitcher)}` : "";

  redirect(`/pitching/strikeouts${query}`);
}
