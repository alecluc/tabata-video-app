import { NextResponse } from "next/server";
import { getRestAdConfig } from "@/lib/rest-ad";

export const runtime = "nodejs";

export async function GET() {
  const config = await getRestAdConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
