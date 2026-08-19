import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbEnabled } from "@/lib/prisma";
import {
  deleteCloudRoutine,
  listCloudRoutines,
  mergeCloudRoutines,
  upsertCloudRoutine,
} from "@/lib/routines-cloud";
import type { Routine } from "@/lib/types";

export const runtime = "nodejs";

async function requireUser() {
  if (!dbEnabled()) {
    return { error: NextResponse.json({ error: "Falta DATABASE_URL" }, { status: 503 }) };
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: NextResponse.json({ error: "Tenés que entrar" }, { status: 401 }) };
  }
  return { userId };
}

export async function GET() {
  const gate = await requireUser();
  if ("error" in gate) return gate.error;
  const routines = await listCloudRoutines(gate.userId);
  return NextResponse.json({ routines });
}

export async function PUT(request: Request) {
  const gate = await requireUser();
  if ("error" in gate) return gate.error;
  const routine = (await request.json()) as Routine;
  if (!routine?.id) {
    return NextResponse.json({ error: "Rutina inválida" }, { status: 400 });
  }
  await upsertCloudRoutine(gate.userId, routine);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const gate = await requireUser();
  if ("error" in gate) return gate.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  await deleteCloudRoutine(gate.userId, id);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const gate = await requireUser();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as { routines?: Routine[] };
  const merged = await mergeCloudRoutines(gate.userId, body.routines ?? []);
  return NextResponse.json({ routines: merged });
}
