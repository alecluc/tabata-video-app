"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ADMOB_TEST_BANNER_ID, isCapacitorAndroid, pushAdSenseSlot, type ResolvedAdSettings } from "@/lib/ads";

interface RestAdSlotProps {
  active: boolean;
}

let admobReady = false;
let admobBannerVisible = false;

async function ensureAdMobInitialized(): Promise<boolean> {
  if (!isCapacitorAndroid()) return false;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    if (!admobReady) {
      await AdMob.initialize();
      admobReady = true;
    }
    return true;
  } catch {
    return false;
  }
}

async function showAdMobRestBanner(bannerId: string): Promise<void> {
  if (!bannerId || admobBannerVisible) return;
  const ok = await ensureAdMobInitialized();
  if (!ok) return;

  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
    await AdMob.showBanner({
      adId: bannerId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 72,
      isTesting: bannerId === ADMOB_TEST_BANNER_ID,
    });
    admobBannerVisible = true;
  } catch {
    /* no fill / consent blocked */
  }
}

async function hideAdMobRestBanner(): Promise<void> {
  if (!admobBannerVisible || !isCapacitorAndroid()) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
    admobBannerVisible = false;
  } catch {
    /* already hidden */
  }
}

function AdSenseUnit({
  clientId,
  slotId,
  className,
}: {
  clientId: string;
  slotId: string;
  className?: string;
}) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    pushAdSenseSlot();
  }, [clientId, slotId]);

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`.trim()}
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

/** Third-party ads during rest: AdSense on web, AdMob banner on Android. */
export function RestAdSlot({ active }: RestAdSlotProps) {
  const [settings, setSettings] = useState<ResolvedAdSettings | null>(null);
  const native = isCapacitorAndroid();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ads/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ResolvedAdSettings | null) => {
        if (!cancelled && data) setSettings(data);
      })
      .catch(() => {
        /* env-only fallback handled below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const bannerId =
      settings?.admobRestBannerId ??
      process.env.NEXT_PUBLIC_ADMOB_REST_BANNER_ID ??
      (process.env.NODE_ENV === "development" ? ADMOB_TEST_BANNER_ID : null);
    if (active && native && bannerId) {
      void showAdMobRestBanner(bannerId);
    } else {
      void hideAdMobRestBanner();
    }
    return () => {
      void hideAdMobRestBanner();
    };
  }, [active, native, settings?.admobRestBannerId]);

  if (native) return null;

  const clientId =
    settings?.adsenseClientId ?? process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? null;
  const slotId =
    settings?.adsenseSlotRest ?? process.env.NEXT_PUBLIC_ADSENSE_SLOT_REST ?? null;

  if (!active || !clientId || !slotId) return null;

  return (
    <>
      <Script
        id="adsense-rest"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <div className="rest-ad-slot" aria-label="Publicidad">
        <AdSenseUnit clientId={clientId} slotId={slotId} />
      </div>
    </>
  );
}
