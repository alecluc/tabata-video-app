import { NextResponse } from "next/server";
import { mergeAdSettings, resolveAdSettingsFromEnv } from "@/lib/ads";
import { getAdSettingsFromDb } from "@/lib/app-settings";

export const runtime = "nodejs";

export async function GET() {
  const fromDb = await getAdSettingsFromDb();
  const settings = mergeAdSettings(fromDb, resolveAdSettingsFromEnv());
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
