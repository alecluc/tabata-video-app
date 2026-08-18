import { BRAND } from "@/lib/brand";
import Link from "next/link";

export const metadata = {
  title: "Privacidad",
};

export default function PrivacyPage() {
  return (
    <main className="editor" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <Link href="/" className="back-link">
        ← {BRAND.name}
      </Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", margin: "1rem 0" }}>
        Privacidad
      </h1>
      <div className="lede" style={{ maxWidth: "62ch", display: "grid", gap: "0.9rem" }}>
        <p>
          Tabatia guarda tus rutinas en el teléfono (almacenamiento local del navegador). No
          creamos cuentas ni subimos tus rutinas a un servidor propio.
        </p>
        <p>
          Para reproducir ejercicios usamos YouTube. Eso implica conexión a internet y que
          YouTube pueda procesar datos según su propia política.
        </p>
        <p>
          Al importar una playlist, la app pide a YouTube la lista de videos. No guardamos esa
          petición en una base de datos nuestra.
        </p>
        <p>No vendemos datos. No hay publicidad de terceros en la app.</p>
        <p>Preguntas: el desarrollador de la app en Play Console / GitHub.</p>
      </div>
    </main>
  );
}
