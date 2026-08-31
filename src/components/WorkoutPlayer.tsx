"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { formatClock, intervalEffectiveDurationSec, prepSecDefault, totalDurationSec } from "@/lib/types";
import {
  bilateralSideLabel,
  findNextWorkInterval,
  flattenRoutine,
  resolveFlatInterval,
  stepDurationSec,
} from "@/lib/routine";
import { beepSecond, progressRatio, remainingSec } from "@/lib/timer";
import { extractYoutubeId } from "@/lib/youtube";
import { playBeep, unlockAudio } from "@/lib/audio";
import { getStoredVolume, setStoredVolume } from "@/lib/preferences";
import { RestAdSlot } from "./RestAdSlot";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";

interface WorkoutPlayerProps {
  routine: Routine;
}

type Phase = "ready" | "prep" | "running" | "done";

export function WorkoutPlayer({ routine }: WorkoutPlayerProps) {
  const flat = useMemo(() => flattenRoutine(routine), [routine]);
  const totalSteps = flat.length;
  const prepSec = prepSecDefault(routine);

  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(() =>
    flat[0] ? stepDurationSec(routine, flat[0]) : 0,
  );
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [elapsed, setElapsed] = useState(0);

  const ytRef = useRef<YouTubePlayerHandle>(null);
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

  useEffect(() => {
    setVolume(getStoredVolume());
  }, []);

  const isPrep = phase === "prep";
  const current = isPrep ? null : flat[step];
  const interval = current ? resolveFlatInterval(routine, current) : null;
  const duration = isPrep ? prepSec : current ? stepDurationSec(routine, current) : 0;
  const nextMeta = isPrep ? flat[0] : flat[step + 1];
  const nextInterval = nextMeta ? resolveFlatInterval(routine, nextMeta) : null;

  const nextWork =
    interval?.kind === "rest" ? findNextWorkInterval(routine, flat, step) : null;
  const workVideoSource = isPrep ? flat[0] && resolveFlatInterval(routine, flat[0]) : interval?.kind === "work" ? interval : nextWork;
  const videoId =
    !isPrep && workVideoSource?.youtubeUrl
      ? extractYoutubeId(workVideoSource.youtubeUrl)
      : null;
  const previewMuted = isPrep || interval?.kind === "rest" ? true : muted;
  const videoPlaying = phase === "running" && !paused && Boolean(videoId);

  const progress = duration > 0 ? progressRatio(remaining, duration) : 1;
  const sideLabel =
    interval && current && phase === "running"
      ? bilateralSideLabel(interval, current)
      : null;

  const changeVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(next)));
    setVolume(clamped);
    setStoredVolume(clamped);
    if (clamped > 0) setMuted(false);
    else setMuted(true);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((wasMuted) => {
      if (wasMuted && volume === 0) {
        const restored = getStoredVolume() || 80;
        setVolume(restored);
        setStoredVolume(restored);
      }
      return !wasMuted;
    });
  }, [volume]);

  const armStep = useCallback(
    (nextStep: number, now = Date.now()) => {
      const meta = flat[nextStep];
      const nextDur = meta ? stepDurationSec(routine, meta) : 0;
      beepedRef.current = new Set();
      advancingRef.current = false;
      completedStepRef.current = null;
      pausedLeftRef.current = nextDur;
      endsAtRef.current = now + nextDur * 1000;
      setStep(nextStep);
      setRemaining(nextDur);
    },
    [flat, routine],
  );

  const armPrep = useCallback(
    (now = Date.now()) => {
      beepedRef.current = new Set();
      advancingRef.current = false;
      completedStepRef.current = null;
      pausedLeftRef.current = prepSec;
      endsAtRef.current = now + prepSec * 1000;
      setRemaining(prepSec);
    },
    [prepSec],
  );

  useEffect(() => {
    if ((phase !== "running" && phase !== "prep") || paused) return;

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
    if (phase !== "prep" || paused || remaining > 0) return;
    playBeep("switch");
    const now = Date.now();
    setPhase("running");
    armStep(0, now);
  }, [remaining, phase, paused, armStep]);

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
    if (phase !== "running" && phase !== "prep") return;
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
    if (phase !== "running" && phase !== "prep") return;
    document.documentElement.classList.add("workout-lock");
    document.body.classList.add("workout-lock");
    return () => {
      document.documentElement.classList.remove("workout-lock");
      document.body.classList.remove("workout-lock");
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" && phase !== "prep") return;
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
      if (phaseRef.current === "prep") {
        if (delta <= 0) return;
        playBeep("switch");
        setPhase("running");
        if (pausedRef.current) {
          const meta = flat[0];
          const dur = meta ? stepDurationSec(routine, meta) : 0;
          pausedLeftRef.current = dur;
          setStep(0);
          setRemaining(dur);
          beepedRef.current = new Set();
        } else {
          armStep(0);
        }
        return;
      }
      const nextStep = Math.min(totalSteps - 1, Math.max(0, stepRef.current + delta));
      if (nextStep === stepRef.current && delta !== 0) return;
      playBeep("switch");
      if (phaseRef.current === "done") setPhase("running");
      if (pausedRef.current) {
        const meta = flat[nextStep];
        const dur = meta ? stepDurationSec(routine, meta) : 0;
        pausedLeftRef.current = dur;
        setStep(nextStep);
        setRemaining(dur);
        beepedRef.current = new Set();
        return;
      }
      armStep(nextStep);
    },
    [armStep, flat, routine, totalSteps],
  );

  const seekVideoFromProgress = useCallback(
    (clientX: number, target: HTMLElement) => {
      if (!videoId) return;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      ytRef.current?.seekToFraction(ratio);
    },
    [videoId],
  );

  useEffect(() => {
    if (phase !== "running" && phase !== "prep") return;
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
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip, toggleMute, togglePause]);

  function start() {
    unlockAudio();
    const now = Date.now();
    elapsedOffsetRef.current = 0;
    elapsedOriginRef.current = now;
    setElapsed(0);
    setPaused(false);
    playBeep("switch");
    if (prepSec > 0) {
      setPhase("prep");
      armPrep(now);
    } else {
      setPhase("running");
      armStep(0, now);
    }
  }

  function requestExit(href: string) {
    if ((phase === "running" || phase === "prep") && !window.confirm("¿Salir del entrenamiento?")) {
      return;
    }
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
          {routine.rounds === 1 ? "ronda" : "rondas"} · {formatClock(totalDurationSec(routine))}{" "}
          total
          {prepSec > 0 ? ` · ${prepSec}s de preparación` : ""}
        </p>
        <ol className="ready-list">
          {preview.map((item, index) => (
            <li key={item.id}>
              <span>{index + 1}</span>
              <strong>{item.name}</strong>
              <em>
                {item.kind === "rest" ? "Descanso" : "Trabajo"} ·{" "}
                {intervalEffectiveDurationSec(item)}s
                {item.laterality === "bilateral"
                  ? item.bilateralMode === "alternate_rounds"
                    ? " · L/R por ronda"
                    : " · Der → Izq"
                  : ""}
              </em>
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

  if (phase === "done") {
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

  const hudKind = isPrep ? "prep" : interval?.kind ?? "work";
  const kindLabel = isPrep ? "Preparate" : interval?.kind === "rest" ? "Descanso" : "Trabajo";
  const emptyLabel = isPrep ? "Preparate" : interval?.kind === "rest" ? "Descanso" : "Sin video";
  const intervalName = isPrep
    ? routine.intervals[0]?.name ?? routine.name
    : interval?.name ?? "";
  const showVolume = !isPrep && interval?.kind !== "rest";

  return (
    <div className={`workout ${paused ? "is-paused" : ""} ${hudKind}`}>
      <div className="workout-stage">
        <YouTubePlayer
          ref={ytRef}
          videoId={videoId}
          playing={videoPlaying}
          muted={previewMuted}
          volume={volume}
          emptyLabel={emptyLabel}
          className="workout-video"
        />
        {!isPrep && interval?.kind === "rest" ? (
          <RestAdSlot active={!paused} />
        ) : null}
        <div className="workout-veil" />
        <div className="workout-hud">
          <div className="workout-top">
            <span>
              {isPrep
                ? "Antes de empezar"
                : current?.betweenRounds
                  ? `Entre rondas · Ronda ${current.round}→${current.round + 1}`
                  : current?.betweenSides
                    ? "Cambio de lado"
                    : `${(current?.intervalIndex ?? 0) + 1}/${routine.intervals.length} · Ronda ${current?.round ?? 1}/${routine.rounds}`}
            </span>
            <span className={`pill ${hudKind}`}>{kindLabel}</span>
          </div>

          <div className="countdown-block">
            <p className="interval-name">{isPrep ? "Preparate" : intervalName}</p>
            {sideLabel ? <p className="side-label">{sideLabel}</p> : null}
            <p
              className={`countdown ${remaining <= 3 ? "urgent" : ""}`}
              aria-live="assertive"
              aria-atomic="true"
            >
              {formatClock(remaining)}
            </p>
            <p className="next-up">
              {isPrep
                ? `Próximo: ${routine.intervals[0]?.name ?? "Trabajo"}`
                : interval?.kind === "rest" && nextWork
                  ? `Prepará: ${nextWork.name}`
                  : nextInterval
                    ? `Próximo: ${nextInterval.name}`
                    : "Último intervalo"}
            </p>
          </div>

          <div
            className={`progress-track ${videoId ? "is-seekable" : ""}`}
            role="slider"
            tabIndex={videoId ? 0 : -1}
            aria-label={
              videoId
                ? "Barra del intervalo — tocá para rebobinar el video"
                : "Progreso del intervalo"
            }
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={duration - remaining}
            onPointerDown={(e) => {
              if (!videoId) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekVideoFromProgress(e.clientX, e.currentTarget);
            }}
            onPointerMove={(e) => {
              if (!videoId || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
              seekVideoFromProgress(e.clientX, e.currentTarget);
            }}
          >
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="workout-controls">
            <button
              type="button"
              className="icon-btn"
              aria-label="Anterior"
              onClick={() => skip(-1)}
              disabled={isPrep || step === 0}
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
              disabled={!isPrep && step >= totalSteps - 1}
            >
              ⏭
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
              onClick={toggleMute}
              disabled={!showVolume}
            >
              {previewMuted ? "🔇" : "🔊"}
            </button>
            {showVolume ? (
              <div className="volume-control">
                <button
                  type="button"
                  className="icon-btn volume-step"
                  aria-label="Bajar volumen"
                  onClick={() => changeVolume(volume - 10)}
                >
                  −
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min={0}
                  max={100}
                  step={5}
                  value={muted ? 0 : volume}
                  aria-label={`Volumen ${muted ? 0 : volume}%`}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="icon-btn volume-step"
                  aria-label="Subir volumen"
                  onClick={() => changeVolume(volume + 10)}
                >
                  +
                </button>
              </div>
            ) : null}
          </div>

          <div className="workout-meta">
            <span>{paused ? "Pausado" : isPrep ? "Preparate" : "Corriendo"}</span>
            <button type="button" className="text-link" onClick={() => requestExit(`/routines/${routine.id}`)}>
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
