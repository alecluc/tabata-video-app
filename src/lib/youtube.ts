/** Extract a YouTube video id from common URL shapes or a bare id. */
export function extractYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith("youtube.com") || host === "m.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[\w-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[\w-]{11}$/.test(parts[shortsIdx + 1])) {
        return parts[shortsIdx + 1];
      }
      const liveIdx = parts.indexOf("live");
      if (liveIdx >= 0 && parts[liveIdx + 1] && /^[\w-]{11}$/.test(parts[liveIdx + 1])) {
        return parts[liveIdx + 1];
      }
    }
  } catch {
    // not a URL
  }

  const match = raw.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
