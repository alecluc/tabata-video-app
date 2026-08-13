"use client";

import { useState } from "react";
import type { Interval } from "@/lib/types";
import { buildPlaylistIntervals } from "@/lib/routine";
import { extractPlaylistId } from "@/lib/youtube";

interface PlaylistImportProps {
  onImport: (payload: { title: string; intervals: Interval[]; videoCount: number }) => void;
}

const PRESETS = [
  { label: "20/10", work: 20, rest: 10 },
  { label: "30/10", work: 30, rest: 10 },
  { label: "45/15", work: 45, rest: 15 },
] as const;

export function PlaylistImport({ onImport }: PlaylistImportProps) {
  const [url, setUrl] = useState("");
  const [insertRest, setInsertRest] = useState(true);
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsedId = extractPlaylistId(url);

  function applyPreset(work: number, rest: number) {
    setWorkSec(work);
    setRestSec(rest);
    setInsertRest(true);
  }

  async function importPlaylist() {
    setError(null);
    setSuccess(null);
    if (!parsedId) {
      setError("Pegá un link de playlist de YouTube");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/playlist?url=${encodeURIComponent(url.trim())}`);
      const data = (await res.json()) as {
        title?: string;
        videos?: { videoId: string; title: string }[];
        error?: string;
      };
      if (!res.ok || !data.videos?.length) {
        throw new Error(data.error || "No pude leer esa playlist");
      }

      const intervals = buildPlaylistIntervals(data.videos, {
        workSec,
        restSec,
        insertRest,
      });

      onImport({
        title: data.title || "Playlist de YouTube",
        intervals,
        videoCount: data.videos.length,
      });
      setSuccess(
        `Listo: ${data.videos.length} video${data.videos.length === 1 ? "" : "s"}${
          insertRest ? " con descanso entre medio" : ""
        }.`,
      );
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude importar la playlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="playlist" className="playlist-card">
      <div className="playlist-card-head">
        <h2>Desde una playlist</h2>
        <p>Pegá el link y armo un intervalo por cada video, en el mismo orden. Hasta 50 videos.</p>
      </div>

      <label className="field">
        <span>Link de playlist de YouTube</span>
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="https://www.youtube.com/playlist?list=…"
          inputMode="url"
          enterKeyHint="go"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void importPlaylist();
            }
          }}
        />
      </label>

      <div className="preset-row" role="group" aria-label="Tiempos típicos">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={`chip ${workSec === preset.work && restSec === preset.rest && insertRest ? "is-on" : ""}`}
            onClick={() => applyPreset(preset.work, preset.rest)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="playlist-options">
        <label className="field compact">
          <span>Segundos de trabajo</span>
          <input
            type="number"
            min={5}
            max={600}
            value={workSec}
            onChange={(e) => setWorkSec(Number(e.target.value) || 20)}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={insertRest}
            onChange={(e) => setInsertRest(e.target.checked)}
          />
          <span>Meter un descanso entre cada video</span>
        </label>
        {insertRest ? (
          <label className="field compact">
            <span>Segundos de descanso</span>
            <input
              type="number"
              min={5}
              max={600}
              value={restSec}
              onChange={(e) => setRestSec(Number(e.target.value) || 10)}
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="field-error">{error}</p> : null}
      {success ? <p className="field-ok">{success}</p> : null}
      {url && !parsedId && !error ? (
        <p className="field-error">Ese link no parece una playlist</p>
      ) : null}

      <button
        type="button"
        className="btn-primary"
        onClick={() => void importPlaylist()}
        disabled={loading}
      >
        {loading ? "Leyendo playlist…" : "Armar rutina"}
      </button>
    </section>
  );
}
