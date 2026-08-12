"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = YT.Player;

let apiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string | null;
  playing: boolean;
  muted: boolean;
  className?: string;
}

export function YouTubePlayer({ videoId, playing, muted, className }: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const wantedIdRef = useRef(videoId);
  const playingRef = useRef(playing);
  const mutedRef = useRef(muted);

  wantedIdRef.current = videoId;
  playingRef.current = playing;
  mutedRef.current = muted;

  const destroy = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {
      /* noop */
    }
    playerRef.current = null;
    readyRef.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!hostRef.current) return;
      await loadYoutubeApi();
      if (cancelled || !hostRef.current || !window.YT?.Player) return;

      destroy();
      const mountEl = document.createElement("div");
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(mountEl);

      playerRef.current = new window.YT.Player(mountEl, {
        width: "100%",
        height: "100%",
        videoId: videoId || undefined,
        playerVars: {
          autoplay: playing && videoId ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            if (mutedRef.current) e.target.mute();
            else e.target.unMute();
            if (playingRef.current && wantedIdRef.current) e.target.playVideo();
            else e.target.pauseVideo();
          },
          onStateChange: (e) => {
            // Loop current interval video
            if (e.data === window.YT!.PlayerState.ENDED) {
              e.target.seekTo(0, true);
              if (playingRef.current) e.target.playVideo();
            }
          },
          onError: () => {
            // Keep UI usable if embed is blocked
          },
        },
      });
    }

    void mount();
    return () => {
      cancelled = true;
      destroy();
    };
    // Remount only when video identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, destroy]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      if (playing && videoId) player.playVideo();
      else player.pauseVideo();
    } catch {
      /* noop */
    }
  }, [playing, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      if (muted) player.mute();
      else player.unMute();
    } catch {
      /* noop */
    }
  }, [muted]);

  if (!videoId) {
    return (
      <div className={`yt-empty ${className ?? ""}`}>
        <span>Descanso</span>
      </div>
    );
  }

  return <div ref={hostRef} className={`yt-host ${className ?? ""}`} />;
}
