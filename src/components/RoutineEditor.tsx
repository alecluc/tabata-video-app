"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Interval, IntervalKind, Routine } from "@/lib/types";
import { createId, emptyInterval, formatClock, totalDurationSec } from "@/lib/types";
import { deleteRoutine, getRoutine, upsertRoutine } from "@/lib/storage";
import { extractYoutubeId, youtubeThumb } from "@/lib/youtube";
import { PlaylistImport } from "./PlaylistImport";

interface RoutineEditorProps {
  routineId?: string;
}

export function RoutineEditor({ routineId }: RoutineEditorProps) {
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (routineId) {
      const existing = getRoutine(routineId);
      if (!existing) {
        router.replace("/");
        return;
      }
      setRoutine(existing);
      return;
    }
    const now = new Date().toISOString();
    setRoutine({
      id: createId(),
      name: "Movilidad de cadera",
      rounds: 1,
      intervals: [
        { ...emptyInterval("work"), name: "Ejercicio 1", durationSec: 20 },
        emptyInterval("rest"),
        { ...emptyInterval("work"), name: "Ejercicio 2", durationSec: 20 },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }, [routineId, router]);

  if (!routine) {
    return <div className="page-loading">Cargando…</div>;
  }

  function updateInterval(id: string, patch: Partial<Interval>) {
    setRoutine((r) =>
      r
        ? {
            ...r,
            intervals: r.intervals.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          }
        : r,
    );
  }

  function addInterval(kind: IntervalKind) {
    setRoutine((r) =>
      r
        ? {
            ...r,
            intervals: [
              ...r.intervals,
              {
                ...emptyInterval(kind),
                name: kind === "rest" ? "Descanso" : `Ejercicio ${r.intervals.filter((i) => i.kind === "work").length + 1}`,
              },
            ],
          }
        : r,
    );
  }

  function removeInterval(id: string) {
    setRoutine((r) =>
      r && r.intervals.length > 1
        ? { ...r, intervals: r.intervals.filter((i) => i.id !== id) }
        : r,
    );
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    setRoutine((r) => {
      if (!r) return r;
      const next = [...r.intervals];
      const [item] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, item);
      return { ...r, intervals: next };
    });
    setDragIndex(null);
  }

  function save(andPlay = false) {
    const current = routine;
    if (!current) return;
    const cleaned: Routine = {
      id: current.id,
      createdAt: current.createdAt,
      name: current.name.trim() || "Sin nombre",
      rounds: Math.max(1, Math.min(20, Number(current.rounds) || 1)),
      intervals: current.intervals.map((i) => ({
        ...i,
        durationSec: Math.max(5, Math.min(600, Number(i.durationSec) || 20)),
        youtubeUrl: i.kind === "rest" ? "" : i.youtubeUrl.trim(),
      })),
      updatedAt: new Date().toISOString(),
    };
    upsertRoutine(cleaned);
    setRoutine(cleaned);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
    if (andPlay) router.push(`/routines/${cleaned.id}/play`);
    else if (!routineId) router.replace(`/routines/${cleaned.id}`);
  }

  function remove() {
    if (!routineId) return;
    if (!window.confirm("¿Borrar esta rutina?")) return;
    deleteRoutine(routineId);
    router.push("/");
  }

  return (
    <div className="editor">
      <header className="editor-header">
        <Link href="/" className="back-link">
          ← Rutinas
        </Link>
        <div className="editor-actions">
          {routineId ? (
            <button type="button" className="btn-ghost danger" onClick={remove}>
              Borrar
            </button>
          ) : null}
          <button type="button" className="btn-ghost" onClick={() => save(false)}>
            {savedFlash ? "Guardado" : "Guardar"}
          </button>
          <button type="button" className="btn-primary" onClick={() => save(true)}>
            Guardar y entrenar
          </button>
        </div>
      </header>

      <div className="editor-hero">
        <label className="field">
          <span>Nombre de la rutina</span>
          <input
            value={routine.name}
            onChange={(e) => setRoutine({ ...routine, name: e.target.value })}
            placeholder="Ej. Movilidad de cadera"
          />
        </label>
        <label className="field rounds">
          <span>Rondas</span>
          <input
            type="number"
            min={1}
            max={20}
            value={routine.rounds}
            onChange={(e) =>
              setRoutine({ ...routine, rounds: Number(e.target.value) || 1 })
            }
          />
        </label>
        <p className="editor-meta">
          {routine.intervals.length} intervalos · {formatClock(totalDurationSec(routine))} total
        </p>
      </div>

      <PlaylistImport
        onImport={({ title, intervals }) => {
          const keepName =
            routine.name.trim() &&
            routine.name !== "Movilidad de cadera" &&
            routine.name !== "Nueva rutina";
          const hasCustomVideos = routine.intervals.some(
            (i) => i.kind === "work" && i.youtubeUrl.trim(),
          );
          if (
            hasCustomVideos &&
            !window.confirm("Esto reemplaza los intervalos actuales por los de la playlist. ¿Seguir?")
          ) {
            return;
          }
          setRoutine({
            ...routine,
            name: keepName ? routine.name : title,
            intervals,
          });
        }}
      />

      <ul className="interval-list">
        {routine.intervals.map((interval, index) => {
          const vid = extractYoutubeId(interval.youtubeUrl);
          return (
            <li
              key={interval.id}
              className={`interval-row ${interval.kind}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
            >
              <button type="button" className="drag-handle" aria-label="Reordenar" title="Arrastrar">
                ⋮⋮
              </button>
              <div className="interval-body">
                <div className="interval-top">
                  <span className="interval-index">{index + 1}</span>
                  <input
                    className="interval-name-input"
                    value={interval.name}
                    onChange={(e) => updateInterval(interval.id, { name: e.target.value })}
                  />
                  <select
                    value={interval.kind}
                    onChange={(e) => {
                      const kind = e.target.value as IntervalKind;
                      updateInterval(interval.id, {
                        kind,
                        name:
                          kind === "rest" && interval.name.startsWith("Ejercicio")
                            ? "Descanso"
                            : interval.name,
                        youtubeUrl: kind === "rest" ? "" : interval.youtubeUrl,
                        durationSec: kind === "rest" ? 10 : interval.durationSec || 20,
                      });
                    }}
                  >
                    <option value="work">Trabajo</option>
                    <option value="rest">Descanso</option>
                  </select>
                  <button
                    type="button"
                    className="icon-text"
                    onClick={() => removeInterval(interval.id)}
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </div>

                <div className="interval-fields">
                  <label className="field compact">
                    <span>Segundos</span>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={interval.durationSec}
                      onChange={(e) =>
                        updateInterval(interval.id, {
                          durationSec: Number(e.target.value) || 20,
                        })
                      }
                    />
                  </label>

                  {interval.kind === "work" ? (
                    <label className="field compact grow">
                      <span>Link de YouTube</span>
                      <input
                        value={interval.youtubeUrl}
                        onChange={(e) =>
                          updateInterval(interval.id, { youtubeUrl: e.target.value })
                        }
                        placeholder="https://youtube.com/watch?v=… o shorts/…"
                      />
                    </label>
                  ) : (
                    <p className="rest-note">Sin video · solo cronómetro</p>
                  )}
                </div>

                {interval.kind === "work" && vid ? (
                  <div className="thumb-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={youtubeThumb(vid)} alt="" />
                    <span>Video listo · se repetirá en loop</span>
                  </div>
                ) : null}
                {interval.kind === "work" && interval.youtubeUrl && !vid ? (
                  <p className="field-error">No pude leer ese link de YouTube</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="add-row">
        <button type="button" className="btn-ghost" onClick={() => addInterval("work")}>
          + Ejercicio
        </button>
        <button type="button" className="btn-ghost" onClick={() => addInterval("rest")}>
          + Descanso
        </button>
      </div>
    </div>
  );
}
