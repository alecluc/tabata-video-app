/** Google test IDs — safe for dev builds. Replace via env or admin panel in production. */
export const ADMOB_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
export const ADMOB_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

export const AD_SETTING_KEYS = {
  adsenseClientId: "adsense_client_id",
  adsenseSlotRest: "adsense_slot_rest",
  adsenseSlotHome: "adsense_slot_home",
  admobRestBannerId: "admob_rest_banner_id",
} as const;

export type AdSettings = {
  adsenseClientId: string | null;
  adsenseSlotRest: string | null;
  adsenseSlotHome: string | null;
  admobRestBannerId: string | null;
};

export type AdSettingsSource = "db" | "env";

export type ResolvedAdSettings = AdSettings & {
  source: Partial<Record<keyof AdSettings, AdSettingsSource>>;
};

function envOrNull(key: string): string | null {
  const value = process.env[key]?.trim();
  return value || null;
}

/** Server-side: merge DB values over env fallbacks. */
export function resolveAdSettingsFromEnv(): AdSettings {
  return {
    adsenseClientId: envOrNull("NEXT_PUBLIC_ADSENSE_CLIENT_ID"),
    adsenseSlotRest: envOrNull("NEXT_PUBLIC_ADSENSE_SLOT_REST"),
    adsenseSlotHome: envOrNull("NEXT_PUBLIC_ADSENSE_SLOT_HOME"),
    admobRestBannerId: envOrNull("NEXT_PUBLIC_ADMOB_REST_BANNER_ID"),
  };
}

export function mergeAdSettings(db: Partial<AdSettings>, env: AdSettings): ResolvedAdSettings {
  const pick = (key: keyof AdSettings): { value: string | null; source: AdSettingsSource } => {
    const fromDb = db[key];
    if (fromDb !== undefined && fromDb !== null && fromDb !== "" && fromDb !== "none") {
      return { value: fromDb, source: "db" };
    }
    const fromEnv = env[key];
    if (fromEnv) return { value: fromEnv, source: "env" };
    return { value: null, source: "env" };
  };

  const client = pick("adsenseClientId");
  const rest = pick("adsenseSlotRest");
  const home = pick("adsenseSlotHome");
  const banner = pick("admobRestBannerId");

  return {
    adsenseClientId: client.value,
    adsenseSlotRest: rest.value,
    adsenseSlotHome: home.value,
    admobRestBannerId: banner.value,
    source: {
      adsenseClientId: client.source,
      adsenseSlotRest: rest.source,
      adsenseSlotHome: home.source,
      admobRestBannerId: banner.source,
    },
  };
}

export function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "android");
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function pushAdSenseSlot(): void {
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  } catch {
    /* ad blocker or script not ready */
  }
}
