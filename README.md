# Tabatia

Timer de intervalos con tus videos de YouTube. Un play. El siguiente ejercicio sale solo.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Persistencia local (`localStorage`) + sync opcional con cuenta
- YouTube IFrame API (loop + mute)
- AdSense (web) · AdMob (Android Capacitor)

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completá DATABASE_URL, AUTH_*, ads opcional
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Publicidad

### Web (AdSense)

1. Creá una cuenta en [Google AdSense](https://adsense.google.com).
2. Agregá el sitio (dominio Vercel) y creá unidades display.
3. Configurá en Vercel o `.env.local`:
   - `NEXT_PUBLIC_ADSENSE_CLIENT_ID` — `ca-pub-…`
   - `NEXT_PUBLIC_ADSENSE_SLOT_REST` — slot para descansos
   - `NEXT_PUBLIC_ADSENSE_SLOT_HOME` — opcional, banner en home
4. Super admin puede override en `/admin/ads`.

Los anuncios aparecen en la franja inferior durante descansos (no tapan el countdown).

### Android (AdMob)

1. Creá la app en [AdMob](https://admob.google.com) con package `app.tabatia.android`.
2. Reemplazá el App ID de prueba en `android/app/src/main/res/values/strings.xml` (`admob_app_id`).
3. Configurá `NEXT_PUBLIC_ADMOB_REST_BANNER_ID` o el panel admin.
4. Sincronizá y compilá:

```bash
npm install
npx cap sync android
npm run android:open
```

**IDs de prueba Google** (dev): App `ca-app-pub-3940256099942544~3347511713`, Banner `ca-app-pub-3940256099942544/6300978111`.

Si usás Firebase, copiá `google-services.json` a `android/app/` (no commitear).

## Flujo MVP

1. Crear / editar rutina (intervalos trabajo/descanso, links de YouTube, rondas, reordenar)
2. Entrenar: video en loop, crono grande, barra de progreso, beep final, prev/pause/next, mute
3. Resumen al terminar

## Deploy

Conectado a GitHub + Vercel. Cada push a `master` despliega automáticamente.
