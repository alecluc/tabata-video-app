"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { formatClock } from "@/lib/types";
import { extractYoutubeId } from "@/lib/youtube";
import { playBeep, unlockAudio } from "@/lib/audio";
import { YouTubePlayer } from "./YouTubePlayer";

interface WorkoutPlayerProps {
  routine: Routine;
}

type Phase = "ready" | "running" | "done";

export function WorkoutPlayer({ routine }: WorkoutPlayerProps) {
  const flat = useMemo(() => {
    const list: { round: number; intervalIndex: number }[] = [];
    for (let r = 1; r <= routine.rounds; r++) {
      for (let i = 0; i < routine.intervals.length; i++) {
        list.push({ round: r, intervalIndex: i });
      }
    }
    return list;
  }, [routine]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(routine.intervals[0]?.durationSec ?? 0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const beepedRef = useRef<Set<number>>(new Set());
  const startedAtRef = useRef<number | null>(null);

  const current = flat[step];
  const interval = current ? routine.intervals[current.intervalIndex] : null;
  const videoId = interval?.youtubeUrl ? extractYoutubeId(interval.youtubeUrl) : null;
  const totalSteps = flat.length;
  const progress = interval ? 1 - remaining / Math.max(1, interval.durationSec) : 1;

  useEffect(() => {
    if (phase !== "running" || paused || !interval) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 3 && next > 0 && !beepedRef.current.has(next)) {
          beepedRef.current.add(next);
          playBeep("tick");
        }
        return next;
      });
      setElapsed((e) => e + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, paused, interval, step]);

  useEffect(() => {
    if (phase !== "running" || remaining > 0) return;

    if (step >= totalSteps - 1) {
      playBeep("done");
      setPhase("done");
      return;
    }

    playBeep("switch");
    const nextStep = step + 1;
    const nextMeta = flat[nextStep];
    const nextInterval = routine.intervals[nextMeta.intervalIndex];
    beepedRef.current = new Set();
    setStep(nextStep);
    setRemaining(nextInterval.durationSec);
  }, [remaining, phase, step, totalSteps, flat, routine.intervals]);

  function start() {
    unlockAudio();
    startedAtRef.current = Date.now();
    beepedRef.current = new Set();
    setStep(0);
    setRemaining(routine.intervals[0]?.durationSec ?? 0);
    setElapsed(0);
    setPaused(false);
    setPhase("running");
    playBeep("switch");
  }

  function skip(delta: number) {
    const nextStep = Math.min(totalSteps - 1, Math.max(0, step + delta));
    if (nextStep === step && delta !== 0) return;
    const meta = flat[nextStep];
    const nextInterval = routine.intervals[meta.intervalIndex];
    beepedRef.current = new Set();
    setStep(nextStep);
    setRemaining(nextInterval.durationSec);
    if (phase === "done") setPhase("running");
    playBeep("switch");
  }

  if (phase === "ready") {
    return (
      <div className="ready-screen">
        <p className="eyebrow">Listo para entrenar</p>
        <h1>{routine.name}</h1>
        <p className="lede">
          {routine.intervals.length} intervalos · {routine.rounds}{" "}
          {routine.rounds === 1 ? "ronda" : "rondas"} · {formatClock(
            routine.intervals.reduce((s, i) => s + i.durationSec, 0) * routine.rounds,
          )}{" "}
          total
        </p>
        <button type="button" className="btn-primary" onClick={start}>
          Empezar
        </button>
        <Link href={`/routines/${routine.id}`} className="btn-ghost">
          Editar rutina
        </Link>
      </div>
    );
  }

  if (phase === "done" || !interval || !current) {
    return (
      <div className="summary-screen">
        <p className="eyebrow">Rutina completa</p>
        <h1>Hecho.</h1>
        <p className="lede">
          {routine.rounds} {routine.rounds === 1 ? "ronda" : "rondas"} · {formatClock(elapsed)}{" "}
          de trabajo
        </p>
        <div className="summary-actions">
          <button type="button" className="btn-primary" onClick={start}>
            Repetir
          </button>
          <Link href="/" className="btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const kindLabel = interval.kind === "rest" ? "Descanso" : "Trabajo";

  return (
    <div className="workout">
      <div className="workout-stage">
        <YouTubePlayer
          videoId={interval.kind === "work" ? videoId : null}
          playing={!paused}
          muted={muted}
          className="workout-video"
        />
        <div className="workout-veil" />
        <div className="workout-hud">
          <div className="workout-top">
            <span>
              Intervalo {current.intervalIndex + 1} de {routine.intervals.length} · Ronda{" "}
              {current.round}/{routine.rounds}
            </span>
            <span className={`pill ${interval.kind}`}>{kindLabel}</span>
          </div>

          <div className="countdown-block">
            <p className="interval-name">{interval.name}</p>
            <p className={`countdown ${remaining <= 3 ? "urgent" : ""}`}>
              {formatClock(remaining)}
            </p>
          </div>

          <div className="progress-track" aria-hidden>
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="workout-controls">
            <button
              type="button"
              className="icon-btn"
              aria-label="Anterior"
              onClick={() => skip(-1)}
              disabled={step === 0}
            >
              ⏮
            </button>
            <button
              type="button"
              className="icon-btn primary"
              aria-label={paused ? "Reanudar" : "Pausar"}
              onClick={() => {
                unlockAudio();
                setPaused((p) => !p);
              }}
            >
              {paused ? "▶" : "❚❚"}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Siguiente"
              onClick={() => skip(1)}
              disabled={step >= totalSteps - 1}
            >
              ⏭
            </button>
            <button
              type="button"
              className="icon-btn mute"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          <div className="workout-meta">
            <span>{paused ? "Pausado" : "En loop"}</span>
            <Link href={`/routines/${routine.id}`}>Salir</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
