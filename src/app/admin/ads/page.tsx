"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { AdminShell, useAdminAccess } from "@/components/AdminShell";

export default function AdminAdsPage() {
  const router = useRouter();
  const { loading, isAdmin, role, permissions } = useAdminAccess();
  const canManage = hasPermission(role, permissions, PERMISSIONS.ADS_MANAGE);

  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"db" | "default">("default");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin || !canManage) {
      router.replace("/");
      return;
    }

    void fetch("/api/admin/settings/rest-ad")
      .then(async (res) => {
        if (!res.ok) throw new Error("No pudimos cargar la config");
        const data = (await res.json()) as { url: string; source: "db" | "default" };
        setUrl(data.url === "none" ? "" : data.url);
        setSource(data.source);
      })
      .catch((err: Error) => setError(err.message));
  }, [loading, isAdmin, canManage, router]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/rest-ad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() || "none" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setSource("db");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isAdmin || !canManage) {
    return <div className="admin-page admin-loading">Cargando…</div>;
  }

  return (
    <AdminShell>
      <section className="admin-panel">
        <div className="section-head">
          <h2>Publicidad en descanso</h2>
        </div>
        <p className="admin-lede">
          Mostramos tu contenido silencioso durante los intervalos de descanso. No bloquea los anuncios
          de YouTube durante el trabajo.
        </p>

        <form className="admin-form" onSubmit={(e) => void onSave(e)}>
          <label className="field">
            <span>URL del asset</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/rest-ad.mp4 o https://…"
            />
          </label>
          <p className="admin-hint">
            Dejá vacío o escribí <code>none</code> para desactivar. Imagen (.jpg, .png, .svg) o video
            (.mp4, .webm).
          </p>
          {source === "default" ? (
            <p className="admin-hint">Todavía no hay config en la base — se usa el default del deploy.</p>
          ) : null}
          {error ? <p className="field-error">{error}</p> : null}
          {saved ? <p className="field-ok">Guardado. Los entrenamientos nuevos lo van a usar al toque.</p> : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
