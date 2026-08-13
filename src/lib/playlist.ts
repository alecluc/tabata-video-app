import { extractPlaylistId } from "./youtube";

export interface PlaylistVideo {
  videoId: string;
  title: string;
}

export interface PlaylistResult {
  playlistId: string;
  title: string;
  videos: PlaylistVideo[];
}

const MAX_VIDEOS = 50;
const INNERTUBE_VERSION = "2.20240815.00.00";
const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false";

const YT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

function innertubeBody(extra: Record<string, unknown>) {
  return {
    context: {
      client: {
        hl: "es",
        gl: "AR",
        clientName: "WEB",
        clientVersion: INNERTUBE_VERSION,
      },
    },
    ...extra,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textFrom(node: unknown): string | null {
  const rec = asRecord(node);
  if (!rec) return null;
  if (typeof rec.simpleText === "string") return rec.simpleText;
  if (Array.isArray(rec.runs)) {
    const joined = rec.runs
      .map((run) => {
        const r = asRecord(run);
        return typeof r?.text === "string" ? r.text : "";
      })
      .join("");
    return joined || null;
  }
  return null;
}

function collectFromTree(
  root: unknown,
  playlistId: string,
): { videos: PlaylistVideo[]; continuation?: string; title?: string } {
  const videos: PlaylistVideo[] = [];
  const seen = new Set<string>();
  let continuation: string | undefined;
  let title: string | undefined;

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    const rec = node as Record<string, unknown>;

    const classic = asRecord(rec.playlistVideoRenderer);
    if (classic && typeof classic.videoId === "string") {
      pushVideo(classic.videoId, textFrom(classic.title));
    }

    const lockup = asRecord(rec.lockupViewModel);
    if (lockup) {
      const command = asRecord(
        asRecord(asRecord(asRecord(lockup.rendererContext)?.commandContext)?.onTap)
          ?.innertubeCommand,
      );
      const watch = asRecord(command?.watchEndpoint);
      const videoId =
        (typeof watch?.videoId === "string" && watch.videoId) ||
        (typeof lockup.contentId === "string" ? lockup.contentId : null);
      const listId = typeof watch?.playlistId === "string" ? watch.playlistId : null;
      const metadata = asRecord(asRecord(lockup.metadata)?.lockupMetadataViewModel);
      const lockupTitle = asRecord(metadata?.title);
      const name =
        (typeof lockupTitle?.content === "string" ? lockupTitle.content : null) ??
        textFrom(metadata?.title);
      if (videoId && listId === playlistId) {
        pushVideo(videoId, name);
      }
    }

    const meta = asRecord(rec.playlistMetadataRenderer);
    if (!title && typeof meta?.title === "string") title = meta.title;

    const header = asRecord(rec.playlistHeaderRenderer);
    if (!title && header) title = textFrom(header.title) ?? undefined;

    const sidebar = asRecord(rec.playlistSidebarPrimaryInfoRenderer);
    if (!title && sidebar) title = textFrom(sidebar.title) ?? undefined;

    const cont = asRecord(rec.continuationItemRenderer);
    const endpoint = asRecord(cont?.continuationEndpoint);
    const command = asRecord(endpoint?.continuationCommand);
    if (typeof command?.token === "string") {
      continuation = command.token;
    }

    for (const [key, value] of Object.entries(rec)) {
      if (key === "lockupViewModel" || key === "playlistVideoRenderer") continue;
      visit(value);
    }
  }

  function pushVideo(videoId: string, rawTitle: string | null | undefined) {
    if (!/^[\w-]{11}$/.test(videoId) || seen.has(videoId)) return;
    const videoTitle = rawTitle?.trim() || "Ejercicio";
    if (/^(private video|deleted video|\[private video\]|\[deleted video\])$/i.test(videoTitle)) {
      return;
    }
    seen.add(videoId);
    videos.push({ videoId, title: videoTitle });
  }

  visit(root);
  return { videos, continuation, title };
}

async function browse(extra: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: YT_HEADERS,
    body: JSON.stringify(innertubeBody(extra)),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`YouTube respondió ${res.status}`);
  }
  return res.json();
}

export async function fetchYoutubePlaylist(input: string): Promise<PlaylistResult> {
  const playlistId = extractPlaylistId(input);
  if (!playlistId) {
    throw new Error("Pegá un link de playlist de YouTube (tiene que tener ?list=…)");
  }

  const videos: PlaylistVideo[] = [];
  const seen = new Set<string>();
  let title = "";
  let continuation: string | undefined;

  const first = await browse({ browseId: `VL${playlistId}` });
  const parsed = collectFromTree(first, playlistId);
  title = parsed.title?.trim() || "";
  continuation = parsed.continuation;
  for (const video of parsed.videos) {
    if (seen.has(video.videoId) || videos.length >= MAX_VIDEOS) continue;
    seen.add(video.videoId);
    videos.push(video);
  }

  let pages = 0;
  while (continuation && videos.length < MAX_VIDEOS && pages < 4) {
    pages += 1;
    const next = await browse({ continuation });
    const more = collectFromTree(next, playlistId);
    continuation = more.continuation;
    for (const video of more.videos) {
      if (seen.has(video.videoId) || videos.length >= MAX_VIDEOS) continue;
      seen.add(video.videoId);
      videos.push(video);
    }
  }

  if (videos.length === 0) {
    throw new Error("No pude leer videos. La playlist tiene que ser pública.");
  }

  return {
    playlistId,
    title: title || "Playlist de YouTube",
    videos,
  };
}
