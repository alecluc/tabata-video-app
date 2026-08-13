# CORTE

Timer de intervalos con tus videos de YouTube. Un play. El corte al siguiente ejercicio es automático.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Persistencia local (`localStorage`) para el MVP
- YouTube IFrame API (loop + mute)

## Desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Flujo MVP

1. Crear / editar rutina (intervalos trabajo/descanso, links de YouTube, rondas, reordenar)
2. Entrenar: video en loop, crono grande, barra de progreso, beep final, prev/pause/next, mute
3. Resumen al terminar

## Deploy

Conectado a GitHub + Vercel. Cada push a `master` despliega automáticamente.
