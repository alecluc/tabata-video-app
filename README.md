# TABATA + VIDEO

Timer de intervalos que reproduce tus videos de YouTube en loop, con cuenta regresiva superpuesta y cambio automático al siguiente ejercicio.

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

Conectado a GitHub + Vercel. Cada push a `main` despliega automáticamente.
