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
          Podés entrenar sin cuenta: las rutinas quedan en el teléfono (almacenamiento local del
          navegador).
        </p>
        <p>
          Si te registrás (email o Google), guardamos tu cuenta y sincronizamos las rutinas en
          nuestros servidores para que te sigan entre dispositivos. La contraseña se guarda
          hasheada, no en texto plano.
        </p>
        <p>
          Para reproducir ejercicios usamos YouTube. Eso implica conexión a internet y que
          YouTube pueda procesar datos según su propia política.
        </p>
        <p>
          Al importar una playlist, la app pide a YouTube la lista de videos. No usamos esa
          petición para identificarte.
        </p>
        <p>No vendemos datos. No hay publicidad de terceros en la app.</p>
        <p>Preguntas: el desarrollador de la app en Play Console / GitHub.</p>
      </div>
    </main>
  );
}
