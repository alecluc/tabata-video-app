"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { AdminShell, useAdminAccess } from "@/components/AdminShell";
import { ADMOB_TEST_BANNER_ID } from "@/lib/ads";

type AdsForm = {
  adsenseClientId: string;
  adsenseSlotRest: string;
  adsenseSlotHome: string;
  admobRestBannerId: string;
};

type AdsResponse = AdsForm & {
  source: Partial<Record<keyof AdsForm, "db" | "env">>;
};

export default function AdminAdsPage() {
  const router = useRouter();
  const { loading, isAdmin, role, permissions } = useAdminAccess();
  const canManage = hasPermission(role, permissions, PERMISSIONS.ADS_MANAGE);

  const [form, setForm] = useState<AdsForm>({
    adsenseClientId: "",
    adsenseSlotRest: "",
    adsenseSlotHome: "",
    admobRestBannerId: "",
  });
  const [source, setSource] = useState<AdsResponse["source"]>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin || !canManage) {
      router.replace("/");
      return;
    }

    void fetch("/api/admin/settings/ads")
      .then(async (res) => {
        if (!res.ok) throw new Error("No pudimos cargar la config");
        const data = (await res.json()) as AdsResponse;
        setForm({
          adsenseClientId: data.adsenseClientId,
          adsenseSlotRest: data.adsenseSlotRest,
          adsenseSlotHome: data.adsenseSlotHome,
          admobRestBannerId: data.admobRestBannerId,
        });
        setSource(data.source ?? {});
      })
      .catch((err: Error) => setError(err.message));
  }, [loading, isAdmin, canManage, router]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setSource({
        adsenseClientId: "db",
        adsenseSlotRest: "db",
        adsenseSlotHome: "db",
        admobRestBannerId: "db",
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  function field(key: keyof AdsForm, label: string, placeholder: string, hint?: string) {
    const from = source[key];
    return (
      <label className="field">
        <span>
          {label}
          {from === "env" ? " (env)" : from === "db" ? " (guardado)" : null}
        </span>
        <input
          value={form[key]}
          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
        />
        {hint ? <span className="admin-hint">{hint}</span> : null}
      </label>
    );
  }

  if (loading || !isAdmin || !canManage) {
    return <div className="admin-page admin-loading">Cargando…</div>;
  }

  return (
    <AdminShell>
      <section className="admin-panel">
        <div className="section-head">
          <h2>AdSense y AdMob</h2>
        </div>
        <p className="admin-lede">
          Publicidad de Google durante los descansos. En web usamos AdSense; en la app Android,
          AdMob. No bloquea los anuncios de YouTube durante el trabajo.
        </p>

        <form className="admin-form" onSubmit={(e) => void onSave(e)}>
          <h3 className="admin-subhead">AdSense (web / PWA)</h3>
          {field("adsenseClientId", "Publisher ID", "ca-pub-XXXXXXXXXXXXXXXX")}
          {field("adsenseSlotRest", "Slot — descanso", "1234567890", "Unidad display en el HUD de descanso.")}
          {field(
            "adsenseSlotHome",
            "Slot — inicio (opcional)",
            "1234567890",
            "Banner en la home si el slot de descanso no alcanza.",
          )}

          <h3 className="admin-subhead">AdMob (Android)</h3>
          {field(
            "admobRestBannerId",
            "Banner ID — descanso",
            ADMOB_TEST_BANNER_ID,
            "El App ID va en android/…/strings.xml (admob_app_id). Dejá vacío para usar el ID de prueba en dev.",
          )}

          <p className="admin-hint">
            Los valores de Vercel (.env) se usan si no hay override acá. Dejá un campo vacío para
            volver al env o desactivar ese slot.
          </p>
          {error ? <p className="field-error">{error}</p> : null}
          {saved ? <p className="field-ok">Guardado.</p> : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
