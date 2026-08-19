import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { getRestAdUrlFromDb, REST_AD_SETTING_KEY, setRestAdUrlInDb } from "@/lib/app-settings";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.ADS_MANAGE);
  if (gate instanceof Response) return gate;

  const url = await getRestAdUrlFromDb();
  return NextResponse.json({
    key: REST_AD_SETTING_KEY,
    url: url ?? "",
    source: url !== null ? "db" : "default",
  });
}

export async function PUT(request: Request) {
  const gate = await requirePermission(PERMISSIONS.ADS_MANAGE);
  if (gate instanceof Response) return gate;

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  if (url && !/^(\/|https?:\/\/)/.test(url)) {
    return NextResponse.json(
      { error: "La URL tiene que empezar con /, http:// o https://" },
      { status: 400 },
    );
  }

  await setRestAdUrlInDb(url || "none", gate.userId);
  return NextResponse.json({ ok: true, url: url || "none" });
}
