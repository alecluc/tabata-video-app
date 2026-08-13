"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { formatClock, totalDurationSec } from "@/lib/types";
import { deleteRoutine, loadRoutines } from "@/lib/storage";
import { extractYoutubeId, youtubeThumb } from "@/lib/youtube";

export function RoutineList() {
  const [routines, setRoutines] = useState<Routine[]>([]);

  function refresh() {
    setRoutines(loadRoutines());
  }

  useEffect(() => {
    refresh();
  }, []);

  function remove(id: string) {
    if (!window.confirm("¿Borrar esta rutina?")) return;
    deleteRoutine(id);
    refresh();
  }

  return (
    <div className={routines.length > 0 ? "home has-routines" : "home"}>
      <section className="home-hero">
        <p className="brand">TABATA + VIDEO</p>
        <h1>Un timer que reproduce tus videos.</h1>
        <p className="lede">
          Cada intervalo con su reel en loop, cuenta regresiva encima, y salto automático al
          siguiente ejercicio.
        </p>
        <div className="hero-actions">
          <Link href="/routines/new" className="btn-primary">
            Crear rutina
          </Link>
          <Link href="/routines/new#playlist" className="btn-ghost">
            Desde playlist
          </Link>
        </div>
      </section>

      <section className="home-list">
        <div className="section-head">
          <h2>Tus rutinas</h2>
          <span>{routines.length}</span>
        </div>

        {routines.length === 0 ? (
          <div className="empty-state">
            <p>Todavía no tenés rutinas guardadas.</p>
            <div className="hero-actions">
              <Link href="/routines/new" className="btn-primary">
                Armar la primera
              </Link>
              <Link href="/routines/new#playlist" className="btn-ghost">
                Pegar playlist
              </Link>
            </div>
          </div>
        ) : (
          <ul className="routine-cards">
            {routines.map((routine) => {
              const firstWork = routine.intervals.find(
                (i) => i.kind === "work" && extractYoutubeId(i.youtubeUrl),
              );
              const thumbId = firstWork ? extractYoutubeId(firstWork.youtubeUrl) : null;
              return (
                <li key={routine.id} className="routine-card">
                  <div className="routine-card-media">
                    {thumbId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={youtubeThumb(thumbId)} alt="" />
                    ) : (
                      <div className="thumb-fallback" />
                    )}
                  </div>
                  <div className="routine-card-body">
                    <h3>{routine.name}</h3>
                    <p>
                      {routine.intervals.length} intervalos · {routine.rounds}{" "}
                      {routine.rounds === 1 ? "ronda" : "rondas"} ·{" "}
                      {formatClock(totalDurationSec(routine))}
                    </p>
                    <div className="routine-card-actions">
                      <Link href={`/routines/${routine.id}/play`} className="btn-primary sm">
                        Entrenar
                      </Link>
                      <Link href={`/routines/${routine.id}`} className="btn-ghost sm">
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="btn-ghost sm danger"
                        onClick={() => remove(routine.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
