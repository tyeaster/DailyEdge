import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ batter?: string | string[] }>;
}) {
  const params = await searchParams;
  const batter = Array.isArray(params.batter) ? params.batter[0] : params.batter;
  const query = batter ? `?batter=${encodeURIComponent(batter)}` : "";

  redirect(`/hitting/hits${query}`);
}
