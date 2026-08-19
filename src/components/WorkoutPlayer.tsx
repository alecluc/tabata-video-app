"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { formatClock } from "@/lib/types";
import { flattenRoutine } from "@/lib/routine";
import { beepSecond, progressRatio, remainingSec } from "@/lib/timer";
import { extractYoutubeId } from "@/lib/youtube";
import { playBeep, unlockAudio } from "@/lib/audio";
import { RestAdSlot } from "./RestAdSlot";
import { YouTubePlayer } from "./YouTubePlayer";

interface WorkoutPlayerProps {
  routine: Routine;
}

type Phase = "ready" | "running" | "done";

export function WorkoutPlayer({ routine }: WorkoutPlayerProps) {
  const flat = useMemo(() => flattenRoutine(routine), [routine]);
  const totalSteps = flat.length;

  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(routine.intervals[0]?.durationSec ?? 0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const beepedRef = useRef<Set<number>>(new Set());
  const endsAtRef = useRef(0);
  const pausedLeftRef = useRef(0);
  const elapsedOffsetRef = useRef(0);
  const elapsedOriginRef = useRef(0);
  const advancingRef = useRef(false);
  const completedStepRef = useRef<number | null>(null);
  const phaseRef = useRef(phase);
  const stepRef = useRef(step);
  const pausedRef = useRef(paused);

  phaseRef.current = phase;
  stepRef.current = step;
  pausedRef.current = paused;

  const current = flat[step];
  const interval = current ? routine.intervals[current.intervalIndex] : null;
  const videoId = interval?.youtubeUrl ? extractYoutubeId(interval.youtubeUrl) : null;
  const nextMeta = flat[step + 1];
  const nextInterval = nextMeta ? routine.intervals[nextMeta.intervalIndex] : null;
  const progress = interval ? progressRatio(remaining, interval.durationSec) : 1;

  const armStep = useCallback(
    (nextStep: number, now = Date.now()) => {
      const meta = flat[nextStep];
      const next = meta ? routine.intervals[meta.intervalIndex] : null;
      const duration = next?.durationSec ?? 0;
      beepedRef.current = new Set();
      advancingRef.current = false;
      completedStepRef.current = null;
      pausedLeftRef.current = duration;
      endsAtRef.current = now + duration * 1000;
      setStep(nextStep);
      setRemaining(duration);
    },
    [flat, routine.intervals],
  );

  useEffect(() => {
    if (phase !== "running" || paused) return;

    const tick = () => {
      const now = Date.now();
      const left = remainingSec(endsAtRef.current, now);
      const beepAt = beepSecond(left, beepedRef.current);
      if (beepAt !== null) {
        beepedRef.current.add(beepAt);
        playBeep("tick");
      }
      setRemaining(left);
      setElapsed(elapsedOffsetRef.current + Math.floor((now - elapsedOriginRef.current) / 1000));
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, paused, step]);

  useEffect(() => {
    if (phase !== "running" || paused || remaining > 0) return;
    if (completedStepRef.current === step || advancingRef.current) return;
    advancingRef.current = true;
    completedStepRef.current = step;

    if (step >= totalSteps - 1) {
      playBeep("done");
      setPhase("done");
      return;
    }

    playBeep("switch");
    armStep(step + 1);
  }, [remaining, phase, paused, step, totalSteps, armStep]);

  useEffect(() => {
    if (phase !== "running" || paused) return;
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* unsupported / battery saver */
      }
    };

    void request();
    const onVis = () => {
      if (!cancelled && document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== "running") return;
    document.documentElement.classList.add("workout-lock");
    document.body.classList.add("workout-lock");
    return () => {
      document.documentElement.classList.remove("workout-lock");
      document.body.classList.remove("workout-lock");
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [phase]);

  const togglePause = useCallback(() => {
    unlockAudio();
    setPaused((wasPaused) => {
      const now = Date.now();
      if (wasPaused) {
        endsAtRef.current = now + pausedLeftRef.current * 1000;
        elapsedOriginRef.current = now;
        return false;
      }
      pausedLeftRef.current = remainingSec(endsAtRef.current, now);
      elapsedOffsetRef.current += Math.floor((now - elapsedOriginRef.current) / 1000);
      return true;
    });
  }, []);

  const skip = useCallback(
    (delta: number) => {
      if (phaseRef.current === "ready") return;
      const nextStep = Math.min(totalSteps - 1, Math.max(0, stepRef.current + delta));
      if (nextStep === stepRef.current && delta !== 0) return;
      playBeep("switch");
      if (phaseRef.current === "done") setPhase("running");
      if (pausedRef.current) {
        const meta = flat[nextStep];
        const dur = routine.intervals[meta.intervalIndex]?.durationSec ?? 0;
        pausedLeftRef.current = dur;
        setStep(nextStep);
        setRemaining(dur);
        beepedRef.current = new Set();
        return;
      }
      armStep(nextStep);
    },
    [armStep, flat, routine.intervals, totalSteps],
  );

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        skip(1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        skip(-1);
      } else if (event.code === "KeyM") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip, togglePause]);

  function start() {
    unlockAudio();
    const now = Date.now();
    elapsedOffsetRef.current = 0;
    elapsedOriginRef.current = now;
    setElapsed(0);
    setPaused(false);
    setPhase("running");
    playBeep("switch");
    armStep(0, now);
  }

  function requestExit(href: string) {
    if (phase === "running" && !window.confirm("¿Salir del entrenamiento?")) return;
    window.location.href = href;
  }

  if (totalSteps === 0) {
    return (
      <div className="page-loading">
        <p>Esta rutina no tiene intervalos.</p>
        <Link href={`/routines/${routine.id}`} className="btn-primary">
          Editar rutina
        </Link>
      </div>
    );
  }

  if (phase === "ready") {
    const preview = routine.intervals.slice(0, 6);
    return (
      <div className="ready-screen">
        <p className="eyebrow">Listo para entrenar</p>
        <h1>{routine.name}</h1>
        <p className="lede">
          {routine.intervals.length} intervalos · {routine.rounds}{" "}
          {routine.rounds === 1 ? "ronda" : "rondas"} ·{" "}
          {formatClock(routine.intervals.reduce((s, i) => s + i.durationSec, 0) * routine.rounds)}{" "}
          total
        </p>
        <ol className="ready-list">
          {preview.map((item, index) => (
            <li key={item.id}>
              <span>{index + 1}</span>
              <strong>{item.name}</strong>
              <em>{item.kind === "rest" ? "Descanso" : "Trabajo"} · {item.durationSec}s</em>
            </li>
          ))}
        </ol>
        {routine.intervals.length > preview.length ? (
          <p className="lede">+{routine.intervals.length - preview.length} más</p>
        ) : null}
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
          en total
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
  const emptyLabel = interval.kind === "rest" ? "Descanso" : "Sin video";

  return (
    <div className={`workout ${paused ? "is-paused" : ""} ${interval.kind}`}>
      <div className="workout-stage">
        <YouTubePlayer
          videoId={interval.kind === "work" ? videoId : null}
          playing={!paused}
          muted={muted}
          emptyLabel={emptyLabel}
          className="workout-video"
        />
        {interval.kind === "rest" ? <RestAdSlot active={!paused} /> : null}
        <div className="workout-veil" />
        <div className="workout-hud">
          <div className="workout-top">
            <span>
              {current.intervalIndex + 1}/{routine.intervals.length} · Ronda {current.round}/
              {routine.rounds}
            </span>
            <span className={`pill ${interval.kind}`}>{kindLabel}</span>
          </div>

          <div className="countdown-block">
            <p className="interval-name">{interval.name}</p>
            <p
              className={`countdown ${remaining <= 3 ? "urgent" : ""}`}
              aria-live="assertive"
              aria-atomic="true"
            >
              {formatClock(remaining)}
            </p>
            <p className="next-up">
              {nextInterval ? `Próximo: ${nextInterval.name}` : "Último intervalo"}
            </p>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={interval.durationSec}
            aria-valuenow={interval.durationSec - remaining}
          >
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
              onClick={togglePause}
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
              className="icon-btn"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          <div className="workout-meta">
            <span>{paused ? "Pausado" : "Corriendo"}</span>
            <button type="button" className="text-link" onClick={() => requestExit(`/routines/${routine.id}`)}>
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
