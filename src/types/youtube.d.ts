declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    width?: string | number;
    height?: string | number;
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    };
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent {
    target: Player;
    data: number;
  }

  interface OnErrorEvent {
    target: Player;
    data: number;
  }

  interface VideoByIdArgs {
    videoId: string;
    startSeconds?: number;
    endSeconds?: number;
    suggestedQuality?: string;
  }

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: string | VideoByIdArgs): void;
    cueVideoById(videoId: string | VideoByIdArgs): void;
    getCurrentTime(): number;
    getDuration(): number;
    mute(): void;
    unMute(): void;
    setVolume(volume: number): void;
    destroy(): void;
  }
}

declare const YT: {
  Player: typeof YT.Player;
  PlayerState: typeof YT.PlayerState;
};
