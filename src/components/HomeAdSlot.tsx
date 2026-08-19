"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { pushAdSenseSlot, type ResolvedAdSettings } from "@/lib/ads";

/** Optional home-page AdSense unit (non-workout). */
export function HomeAdSlot() {
  const [settings, setSettings] = useState<ResolvedAdSettings | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ads/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ResolvedAdSettings | null) => {
        if (!cancelled && data) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const clientId =
    settings?.adsenseClientId ?? process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? null;
  const slotId =
    settings?.adsenseSlotHome ?? process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME ?? null;

  useEffect(() => {
    if (!clientId || !slotId || pushedRef.current) return;
    pushedRef.current = true;
    pushAdSenseSlot();
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <aside className="home-ad-slot" aria-label="Publicidad">
      <Script
        id="adsense-home"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
