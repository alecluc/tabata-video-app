export type RestAdKind = "video" | "image";

export interface RestAdConfig {
  url: string | null;
  kind: RestAdKind | null;
}

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|$)/i;

export function parseRestAdUrl(raw: string | null | undefined): RestAdConfig {
  if (!raw || raw === "none" || raw === "") {
    return { url: null, kind: null };
  }

  const kind: RestAdKind = VIDEO_EXT.test(raw) ? "video" : "image";
  return { url: raw, kind };
}

/**
 * Rest-interval ad asset. DB setting wins; then NEXT_PUBLIC_REST_AD_URL;
 * defaults to /rest-ad.svg when unset.
 */
export async function getRestAdConfig(): Promise<RestAdConfig> {
  const { getRestAdUrlFromDb } = await import("@/lib/app-settings");
  const fromDb = await getRestAdUrlFromDb();
  if (fromDb !== null) return parseRestAdUrl(fromDb);

  const raw = process.env.NEXT_PUBLIC_REST_AD_URL;
  if (raw === "none" || raw === "") {
    return { url: null, kind: null };
  }

  return parseRestAdUrl(raw ?? "/rest-ad.svg");
}

/** Client-side fallback when API is unavailable */
export function getRestAdConfigFromEnv(): RestAdConfig {
  const raw = process.env.NEXT_PUBLIC_REST_AD_URL;
  if (raw === "none" || raw === "") {
    return { url: null, kind: null };
  }
  return parseRestAdUrl(raw ?? "/rest-ad.svg");
}
