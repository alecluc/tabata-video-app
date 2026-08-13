"use client";

import { useEffect, useRef } from "react";

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

/**
 * One persistent iframe for the whole workout.
 * Switches clips with loadVideoById and restarts them before they end
 * so the Tabata interval can outlast the video length.
 */
export function YouTubePlayer({ videoId, playing, muted, className }: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const playingRef = useRef(playing);
  const mutedRef = useRef(muted);
  const videoIdRef = useRef(videoId);
  const loopWatchRef = useRef<number | null>(null);

  playingRef.current = playing;
  mutedRef.current = muted;
  videoIdRef.current = videoId;

  function clearLoopWatch() {
    if (loopWatchRef.current !== null) {
      window.clearInterval(loopWatchRef.current);
      loopWatchRef.current = null;
    }
  }

  function startLoopWatch(player: YTPlayer) {
    clearLoopWatch();
    loopWatchRef.current = window.setInterval(() => {
      if (!playingRef.current || !videoIdRef.current) return;
      try {
        const duration = player.getDuration() || 0;
        const current = player.getCurrentTime() || 0;
        // Restart just before the end card so Shorts/reels keep looping
        if (duration > 1 && current >= duration - 0.4) {
          player.seekTo(0, true);
          player.playVideo();
        }
      } catch {
        /* noop */
      }
    }, 200);
  }

  function syncPlayer(player: YTPlayer) {
    const wanted = videoIdRef.current;
    try {
      if (mutedRef.current) player.mute();
      else player.unMute();

      if (!wanted) {
        player.pauseVideo();
        activeIdRef.current = null;
        clearLoopWatch();
        return;
      }

      if (activeIdRef.current !== wanted) {
        activeIdRef.current = wanted;
        player.loadVideoById({ videoId: wanted, startSeconds: 0 });
      }

      if (playingRef.current) {
        player.playVideo();
        startLoopWatch(player);
      } else {
        player.pauseVideo();
      }
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!hostRef.current) return;
      await loadYoutubeApi();
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;

      const mountEl = document.createElement("div");
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(mountEl);

      const initialId = videoIdRef.current || undefined;

      playerRef.current = new window.YT.Player(mountEl, {
        width: "100%",
        height: "100%",
        videoId: initialId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          loop: 1,
          ...(initialId ? { playlist: initialId } : {}),
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            if (videoIdRef.current) activeIdRef.current = videoIdRef.current;
            syncPlayer(e.target);
          },
          onStateChange: (e) => {
            if (
              e.data === window.YT!.PlayerState.ENDED &&
              playingRef.current &&
              videoIdRef.current
            ) {
              try {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } catch {
                /* noop */
              }
            }
            if (e.data === window.YT!.PlayerState.PLAYING) {
              startLoopWatch(e.target);
            }
          },
        },
      });
    }

    void mount();

    return () => {
      cancelled = true;
      clearLoopWatch();
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      readyRef.current = false;
      activeIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!readyRef.current || !player) return;
    syncPlayer(player);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playing, muted]);

  return (
    <div className={`yt-shell ${className ?? ""} ${videoId ? "has-video" : "is-rest"}`}>
      <div ref={hostRef} className="yt-host" aria-hidden={!videoId} />
      {!videoId ? (
        <div className="yt-empty">
          <span>Descanso</span>
        </div>
      ) : null}
    </div>
  );
}
