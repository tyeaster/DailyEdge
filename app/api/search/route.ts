import { NextResponse } from "next/server";

import { search } from "@/src/features/global-search/service";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const results = await search(query);

  return NextResponse.json({ results });
}
