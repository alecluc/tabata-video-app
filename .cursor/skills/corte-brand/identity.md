# CORTE — Identidad

## Propósito

Que el entrenamiento no se frene en el celular.

La gente arma la rutina con reels. Al entrenar no puede ser el DJ: pausar, buscar el siguiente, mirar el crono, todo con las manos ocupadas. CORTE junta el video y el tiempo. Un play. El corte al siguiente ejercicio es automático.

## Naming

| | |
|---|---|
| **Marca** | CORTE |
| **Por qué** | El corte de un take al siguiente *es* el producto. Corto, en español, cabe en el ícono de iOS. |
| **No es** | Un protocolo (Tabata), ni un social, ni un editor de video. |
| **SEO** | Descripción: timer de intervalos + YouTube. La marca no tiene que explicar el género sola. |
| **Repo** | El repo puede seguir llamándose `tabata-video-app`. No renombrar GitHub salvo pedido. |

Descartados: TABATA + VIDEO (deck, no marca), REPETÍ (describe el loop, no el salto), DALE PLAY (largo para PWA).

## Look and feel

- **Escenografía:** cuarto oscuro de ensayo, no spa wellness. Negro verde `#0b0f0c`.
- **Trabajo:** lima `#c8f542` — el corte, el play, la urgencia de los últimos 3s.
- **Descanso:** cian `#6ec8ff`.
- **Tipo display:** Bebas Neue (title card, wordmark, crono).
- **Tipo UI:** Outfit.
- **Marca gráfica:** una barra lima vertical (el corte). En el ícono, dos barras con un gap.

## Voz

- "Empezar", "Entrenar", "Próximo", "Hecho."
- No "Let's go", "Crush it", "En loop".
- Una idea por frase.

## Aplicación

Constantes en `src/lib/brand.ts`. Wordmark en home. Metadata + manifest + `icon.tsx` / `apple-icon.tsx`. HUD de entrenamiento sin logo.
