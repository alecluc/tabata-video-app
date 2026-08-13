# Tabatia — Identidad

## Propósito

Que el entrenamiento no se frene en el celular.

La gente arma la rutina con reels. Al entrenar no puede ser el DJ: pausar, buscar el siguiente, mirar el crono, todo con las manos ocupadas. Tabatia junta el video y el tiempo. Un play. El siguiente ejercicio sale solo.

## Naming

| | |
|---|---|
| **Marca** | Tabatia |
| **Por qué** | Suena a Tabata (el protocolo) pero es propia, memorable y cabe en el ícono de iOS. |
| **No es** | Un social, ni un editor de video, ni solo un cronómetro sin imagen. |
| **SEO** | Descripción: timer de intervalos + YouTube. |
| **Repo** | El repo puede seguir llamándose `tabata-video-app`. No renombrar GitHub salvo pedido. |

Descartados: CORTE (nombre previo), TABATA + VIDEO (deck, no marca).

## Look and feel

- **Escenografía:** cuarto oscuro de ensayo, no spa wellness. Negro verde `#0b0f0c`.
- **Trabajo:** lima `#c8f542` — play, urgencia de los últimos 3s.
- **Descanso:** cian `#6ec8ff`.
- **Tipo display:** Barlow Condensed (wordmark, títulos, crono — números tabulares).
- **Tipo UI:** Sora (botones, labels, editor).
- **Marca gráfica:** barra lima vertical junto al wordmark. Ícono: **T** lima.

## Voz

- "Empezar", "Entrenar", "Próximo", "Hecho."
- No "Let's go", "Crush it", "En loop".
- Una idea por frase.

## Aplicación

Constantes en `src/lib/brand.ts`. Wordmark en home. Metadata + manifest + `icon.tsx` / `apple-icon.tsx`. HUD de entrenamiento sin logo.
