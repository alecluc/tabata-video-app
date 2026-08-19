"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Routine } from "@/lib/types";
import { formatClock, totalDurationSec } from "@/lib/types";
import { extractYoutubeId, youtubeThumb } from "@/lib/youtube";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "./BrandMark";
import { AuthBar } from "./AuthBar";
import { deleteRoutineSynced, syncRoutinesWithCloud } from "@/lib/routines-sync";
import { loadRoutines } from "@/lib/storage";
import { HomeAdSlot } from "./HomeAdSlot";

export function RoutineList() {
  const { status } = useSession();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const loggedIn = status === "authenticated";

  function refresh() {
    setRoutines(loadRoutines());
  }

  useEffect(() => {
    if (status === "authenticated") {
      void syncRoutinesWithCloud().then(setRoutines);
      return;
    }
    if (status === "unauthenticated") refresh();
  }, [status]);

  async function remove(id: string) {
    if (!window.confirm("¿Borrar esta rutina?")) return;
    await deleteRoutineSynced(id, loggedIn);
    refresh();
  }

  return (
    <div className={routines.length > 0 ? "home has-routines" : "home"}>
      <AuthBar />
      <section className="home-hero">
        <BrandMark />
        <h1>{BRAND.tagline}</h1>
        <p className="lede">{BRAND.shortDescription}</p>
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
                        onClick={() => void remove(routine.id)}
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
      <HomeAdSlot />
    </div>
  );
}
