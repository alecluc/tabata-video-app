import type { Interval, Routine } from "@/lib/types";
import { dbEnabled, prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function asRoutine(row: {
  id: string;
  name: string;
  rounds: number;
  intervals: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): Routine {
  return {
    id: row.id,
    name: row.name,
    rounds: row.rounds,
    intervals: (Array.isArray(row.intervals) ? row.intervals : []) as unknown as Interval[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serialize(routine: Routine) {
  return {
    id: routine.id,
    name: routine.name,
    rounds: routine.rounds,
    intervals: routine.intervals as unknown as Prisma.InputJsonValue,
    createdAt: new Date(routine.createdAt),
    updatedAt: new Date(routine.updatedAt),
  };
}

export async function listCloudRoutines(userId: string): Promise<Routine[]> {
  if (!dbEnabled()) return [];
  const rows = await prisma.routineRecord.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(asRoutine);
}

export async function upsertCloudRoutine(userId: string, routine: Routine): Promise<void> {
  if (!dbEnabled()) return;
  const data = serialize(routine);
  const existing = await prisma.routineRecord.findUnique({ where: { id: routine.id } });
  if (existing && existing.userId !== userId) return;
  await prisma.routineRecord.upsert({
    where: { id: routine.id },
    create: { ...data, userId },
    update: {
      name: data.name,
      rounds: data.rounds,
      intervals: data.intervals,
      updatedAt: data.updatedAt,
    },
  });
}

export async function deleteCloudRoutine(userId: string, id: string): Promise<void> {
  if (!dbEnabled()) return;
  await prisma.routineRecord.deleteMany({ where: { id, userId } });
}

export async function mergeCloudRoutines(userId: string, incoming: Routine[]): Promise<Routine[]> {
  if (!dbEnabled()) return incoming;
  const cloud = await listCloudRoutines(userId);
  const map = new Map<string, Routine>();
  for (const r of cloud) map.set(r.id, r);
  for (const r of incoming) {
    const existing = map.get(r.id);
    if (!existing || Date.parse(r.updatedAt) >= Date.parse(existing.updatedAt)) {
      map.set(r.id, r);
      await upsertCloudRoutine(userId, r);
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
