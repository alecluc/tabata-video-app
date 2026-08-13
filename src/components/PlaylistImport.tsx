"use client";

import { useState } from "react";
import type { Interval } from "@/lib/types";
import { emptyInterval } from "@/lib/types";
import { extractPlaylistId } from "@/lib/youtube";

interface PlaylistImportProps {
  onImport: (payload: { title: string; intervals: Interval[] }) => void;
}

export function PlaylistImport({ onImport }: PlaylistImportProps) {
  const [url, setUrl] = useState("");
  const [insertRest, setInsertRest] = useState(true);
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedId = extractPlaylistId(url);

  async function importPlaylist() {
    setError(null);
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

      const work = Math.max(5, Math.min(600, Number(workSec) || 20));
      const rest = Math.max(5, Math.min(600, Number(restSec) || 10));
      const intervals: Interval[] = [];

      data.videos.forEach((video, index) => {
        intervals.push({
          ...emptyInterval("work"),
          name: video.title,
          durationSec: work,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        });
        if (insertRest && index < data.videos!.length - 1) {
          intervals.push({
            ...emptyInterval("rest"),
            durationSec: rest,
          });
        }
      });

      onImport({ title: data.title || "Playlist de YouTube", intervals });
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
          }}
          placeholder="https://www.youtube.com/playlist?list=…"
          inputMode="url"
        />
      </label>

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
