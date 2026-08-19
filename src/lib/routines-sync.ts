import type { Routine } from "./types";
import { deleteRoutine, loadRoutines, saveRoutines, upsertRoutine } from "./storage";

export async function syncRoutinesWithCloud(): Promise<Routine[]> {
  const local = loadRoutines();
  try {
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routines: local }),
    });
    if (!res.ok) return local;
    const data = (await res.json()) as { routines?: Routine[] };
    if (Array.isArray(data.routines)) {
      saveRoutines(data.routines);
      return data.routines;
    }
  } catch {
    /* offline: keep local */
  }
  return local;
}

export async function upsertRoutineSynced(routine: Routine, loggedIn: boolean): Promise<void> {
  upsertRoutine(routine);
  if (!loggedIn) return;
  try {
    await fetch("/api/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routine),
    });
  } catch {
    /* offline */
  }
}

export async function deleteRoutineSynced(id: string, loggedIn: boolean): Promise<void> {
  deleteRoutine(id);
  if (!loggedIn) return;
  try {
    await fetch(`/api/routines?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    /* offline */
  }
}
