"use client";

import type { Routine } from "./types";

const STORAGE_KEY = "tabata-video.routines.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadRoutines(): Routine[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Routine[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRoutines(routines: Routine[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
}

export function getRoutine(id: string): Routine | undefined {
  return loadRoutines().find((r) => r.id === id);
}

export function upsertRoutine(routine: Routine): void {
  const all = loadRoutines();
  const idx = all.findIndex((r) => r.id === routine.id);
  const next = { ...routine, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  saveRoutines(all);
}

export function deleteRoutine(id: string): void {
  saveRoutines(loadRoutines().filter((r) => r.id !== id));
}
