"use client";

import { useEffect, useRef, useState } from "react";
import { getRestAdConfigFromEnv, type RestAdConfig } from "@/lib/rest-ad";

interface RestAdOverlayProps {
  playing: boolean;
}

/** Silent sponsor slot during rest intervals — Tabatia-owned content, not YouTube ads. */
export function RestAdOverlay({ playing }: RestAdOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [config, setConfig] = useState<RestAdConfig>(() => getRestAdConfigFromEnv());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/rest-ad")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RestAdConfig | null) => {
        if (!cancelled && data) setConfig(data);
      })
      .catch(() => {
        /* keep env fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { url, kind } = config;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || kind !== "video") return;
    if (playing) {
      void el.play().catch(() => {
        /* autoplay blocked until user gesture — workout start already unlocked audio */
      });
    } else {
      el.pause();
    }
  }, [playing, kind]);

  if (!url || !kind) return null;

  return (
    <div className="rest-ad-overlay" aria-hidden="true">
      {kind === "video" ? (
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          loop
          autoPlay={playing}
          preload="auto"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      )}
    </div>
  );
}
