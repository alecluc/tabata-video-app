import { NextResponse } from "next/server";
import { mergeAdSettings, resolveAdSettingsFromEnv, type AdSettings } from "@/lib/ads";
import { getAdSettingsFromDb, setAdSettingsInDb } from "@/lib/app-settings";
import { requirePermission } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.ADS_MANAGE);
  if (gate instanceof Response) return gate;

  const fromDb = await getAdSettingsFromDb();
  const merged = mergeAdSettings(fromDb, resolveAdSettingsFromEnv());

  return NextResponse.json({
    adsenseClientId: merged.adsenseClientId ?? "",
    adsenseSlotRest: merged.adsenseSlotRest ?? "",
    adsenseSlotHome: merged.adsenseSlotHome ?? "",
    admobRestBannerId: merged.admobRestBannerId ?? "",
    source: merged.source,
    db: fromDb,
  });
}

export async function PUT(request: Request) {
  const gate = await requirePermission(PERMISSIONS.ADS_MANAGE);
  if (gate instanceof Response) return gate;

  let body: Partial<Record<keyof AdSettings, string>>;
  try {
    body = (await request.json()) as Partial<Record<keyof AdSettings, string>>;
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const payload: Partial<Record<keyof AdSettings, string>> = {};
  for (const key of ["adsenseClientId", "adsenseSlotRest", "adsenseSlotHome", "admobRestBannerId"] as const) {
    if (body[key] !== undefined) {
      payload[key] = String(body[key]).trim();
    }
  }

  if (payload.adsenseClientId && !/^ca-pub-\d+$/.test(payload.adsenseClientId)) {
    return NextResponse.json(
      { error: "El client ID de AdSense tiene que ser ca-pub-…" },
      { status: 400 },
    );
  }

  await setAdSettingsInDb(payload, gate.userId);
  return NextResponse.json({ ok: true });
}
