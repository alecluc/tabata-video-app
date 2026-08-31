"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BilateralMode, Interval, IntervalKind, Laterality, Routine } from "@/lib/types";
import {
  betweenRoundsRestDefault,
  createId,
  emptyInterval,
  formatClock,
  prepSecDefault,
  totalDurationSec,
} from "@/lib/types";
import { getRoutine } from "@/lib/storage";
import { deleteRoutineSynced, upsertRoutineSynced } from "@/lib/routines-sync";
import { useSession } from "next-auth/react";
import { extractPlaylistId, extractYoutubeId, youtubeThumb } from "@/lib/youtube";
import { NumberField } from "./NumberField";
import { PlaylistImport } from "./PlaylistImport";

interface RoutineEditorProps {
  routineId?: string;
}

export function RoutineEditor({ routineId }: RoutineEditorProps) {
  const router = useRouter();
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(!routineId);

  useEffect(() => {
    if (routineId) {
      const existing = getRoutine(routineId);
      if (!existing) {
        router.replace("/");
        return;
      }
      setRoutine({
        ...existing,
        betweenRoundsRestSec: betweenRoundsRestDefault(existing),
        prepSec: prepSecDefault(existing),
      });
      setPlaylistOpen(false);
      return;
    }
    const now = new Date().toISOString();
    setRoutine({
      id: createId(),
      name: "Nueva rutina",
      rounds: 1,
      betweenRoundsRestSec: 10,
      prepSec: 10,
      intervals: [emptyInterval("work"), emptyInterval("rest")],
      createdAt: now,
      updatedAt: now,
    });
    setPlaylistOpen(true);
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
                name:
                  kind === "rest"
                    ? "Descanso"
                    : `Ejercicio ${r.intervals.filter((i) => i.kind === "work").length + 1}`,
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

  function moveInterval(index: number, direction: -1 | 1) {
    setRoutine((r) => {
      if (!r) return r;
      const target = index + direction;
      if (target < 0 || target >= r.intervals.length) return r;
      const next = [...r.intervals];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...r, intervals: next };
    });
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
      betweenRoundsRestSec: betweenRoundsRestDefault(current),
      prepSec: prepSecDefault(current),
      intervals: current.intervals.map((i) => {
        const laterality: Laterality | undefined =
          i.kind === "work" ? i.laterality ?? "single" : undefined;
        const bilateralMode: BilateralMode | undefined =
          laterality === "bilateral" ? i.bilateralMode ?? "double_time" : undefined;
        return {
          id: i.id,
          name: i.name.trim() || (i.kind === "rest" ? "Descanso" : "Ejercicio"),
          kind: i.kind,
          durationSec: Math.max(5, Math.min(600, Number(i.durationSec) || 20)),
          youtubeUrl: i.kind === "rest" ? "" : i.youtubeUrl.trim(),
          laterality,
          bilateralMode,
        };
      }),
      updatedAt: new Date().toISOString(),
    };
    void upsertRoutineSynced(cleaned, loggedIn);
    setRoutine(cleaned);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
    if (andPlay) router.push(`/routines/${cleaned.id}/play`);
    else if (!routineId) router.replace(`/routines/${cleaned.id}`);
  }

  function remove() {
    if (!routineId) return;
    if (!window.confirm("¿Borrar esta rutina?")) return;
    void deleteRoutineSynced(routineId, loggedIn);
    router.push("/");
  }

  const hasWorkVideos = routine.intervals.some(
    (i) => i.kind === "work" && i.youtubeUrl.trim(),
  );

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
          <NumberField
            value={routine.rounds}
            min={1}
            max={20}
            fallback={1}
            onCommit={(rounds) => setRoutine({ ...routine, rounds })}
          />
        </label>
        <label className="field rounds">
          <span>Descanso entre rondas (s)</span>
          <NumberField
            value={betweenRoundsRestDefault(routine)}
            min={0}
            max={600}
            fallback={10}
            onCommit={(betweenRoundsRestSec) =>
              setRoutine({ ...routine, betweenRoundsRestSec })
            }
          />
        </label>
        <label className="field rounds">
          <span>Preparate antes de empezar (s)</span>
          <NumberField
            value={prepSecDefault(routine)}
            min={0}
            max={120}
            fallback={10}
            onCommit={(prepSec) => setRoutine({ ...routine, prepSec })}
          />
        </label>
        <p className="editor-meta">
          {routine.intervals.length} intervalos · {formatClock(totalDurationSec(routine))} total
          {routine.rounds > 1 ? (
            <>
              {" "}
              · Si el bloque no termina en descanso, metemos{" "}
              {betweenRoundsRestDefault(routine)}s entre rondas
            </>
          ) : null}
        </p>
      </div>

      <div className="playlist-optional">
        <button
          type="button"
          className="playlist-toggle"
          aria-expanded={playlistOpen}
          onClick={() => setPlaylistOpen((o) => !o)}
        >
          <span>{playlistOpen ? "▾" : "▸"} Desde una playlist</span>
          <em>{hasWorkVideos || routineId ? "Opcional — no borra lo que ya editaste" : "Atajo rápido"}</em>
        </button>
        {playlistOpen ? (
          <PlaylistImport
            optional
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
                !window.confirm(
                  "Esto reemplaza los intervalos actuales por los de la playlist. Los nombres de los videos se pueden editar después. ¿Seguir?",
                )
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
        ) : (
          <p className="playlist-collapsed-hint">
            Tus ejercicios ya están abajo. Solo abrí esto si querés importar otra playlist.
          </p>
        )}
      </div>

      <ul className="interval-list">
        {routine.intervals.map((interval, index) => {
          const vid = extractYoutubeId(interval.youtubeUrl);
          const laterality = interval.laterality ?? "single";
          const bilateralMode = interval.bilateralMode ?? "double_time";
          return (
            <li
              key={interval.id}
              className={`interval-row ${interval.kind}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
            >
              <div className="reorder">
                <button
                  type="button"
                  className="icon-text"
                  aria-label="Subir"
                  disabled={index === 0}
                  onClick={() => moveInterval(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-text"
                  aria-label="Bajar"
                  disabled={index === routine.intervals.length - 1}
                  onClick={() => moveInterval(index, 1)}
                >
                  ↓
                </button>
              </div>
              <div className="interval-body">
                <div className="interval-top">
                  <span className="interval-index">{index + 1}</span>
                  <label className="interval-name-field">
                    <span className="sr-only">Nombre del ejercicio</span>
                    <input
                      className="interval-name-input"
                      value={interval.name}
                      onChange={(e) => updateInterval(interval.id, { name: e.target.value })}
                      placeholder={
                        interval.kind === "rest" ? "Descanso" : "Nombre del ejercicio"
                      }
                    />
                  </label>
                  <select
                    value={interval.kind}
                    onChange={(e) => {
                      const kind = e.target.value as IntervalKind;
                      updateInterval(interval.id, {
                        kind,
                        name:
                          kind === "rest" &&
                          (interval.name.startsWith("Ejercicio") || !interval.name.trim())
                            ? "Descanso"
                            : interval.name,
                        youtubeUrl: kind === "rest" ? "" : interval.youtubeUrl,
                        durationSec: kind === "rest" ? 10 : interval.durationSec || 20,
                        laterality: kind === "work" ? interval.laterality ?? "single" : undefined,
                        bilateralMode:
                          kind === "work" && interval.laterality === "bilateral"
                            ? interval.bilateralMode ?? "double_time"
                            : undefined,
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
                    <NumberField
                      value={interval.durationSec}
                      min={5}
                      max={600}
                      fallback={interval.kind === "rest" ? 10 : 20}
                      onCommit={(durationSec) => updateInterval(interval.id, { durationSec })}
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

                {interval.kind === "work" ? (
                  <div className="laterality-row">
                    <label className="field compact">
                      <span>¿Único o izquierda/derecha?</span>
                      <select
                        value={laterality}
                        onChange={(e) => {
                          const next = e.target.value as Laterality;
                          updateInterval(interval.id, {
                            laterality: next,
                            bilateralMode:
                              next === "bilateral"
                                ? interval.bilateralMode ?? "double_time"
                                : undefined,
                          });
                        }}
                      >
                        <option value="single">Único</option>
                        <option value="bilateral">Izquierda + derecha</option>
                      </select>
                    </label>
                    {laterality === "bilateral" ? (
                      <label className="field compact grow">
                        <span>Cómo lo hacemos</span>
                        <select
                          value={bilateralMode}
                          onChange={(e) =>
                            updateInterval(interval.id, {
                              bilateralMode: e.target.value as BilateralMode,
                            })
                          }
                        >
                          <option value="double_time">
                            Derecha e izquierda (mitad + 5s entre lados)
                          </option>
                          <option value="alternate_rounds">
                            Ronda impar derecha, ronda par izquierda
                          </option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {interval.kind === "work" && vid ? (
                  <div className="thumb-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={youtubeThumb(vid)} alt="" />
                    <span>Video listo · se repetirá en loop · el nombre lo editás vos</span>
                  </div>
                ) : null}
                {interval.kind === "work" && interval.youtubeUrl && !vid ? (
                  extractPlaylistId(interval.youtubeUrl) ? (
                    <p className="field-error">
                      Eso es una playlist. Abrí &quot;Desde una playlist&quot; arriba (opcional).
                    </p>
                  ) : (
                    <p className="field-error">No pude leer ese link de YouTube</p>
                  )
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
