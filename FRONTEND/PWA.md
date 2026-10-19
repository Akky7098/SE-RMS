# SE-ERP app installation

Build with `npm run build` and serve the build through HTTPS (localhost also works).
The service worker intentionally does not register in `npm start` development mode.
Configure the host to serve existing files before the SPA fallback; dashboard/login
routes should fall back to index.html, but service-worker.js must be served as JavaScript.
Serve service-worker.js, manifest.json and index.html with revalidation (Cache-Control: no-cache).

Chrome/Edge: use the browser’s Install app / Add to Home Screen menu.
iPhone/iPad Safari: Share → Add to Home Screen → Open as Web App.
Standalone launches use the existing app UI, including on a laptop.
There is no in-app install button or intercepted install prompt. Installation is managed by the browser.

Only public offline resources and app icons are cached. Live ERP data and writes,
including attendance, always need the network. There is no background queue or
background GPS tracking. GPS is requested only on attendance check-in and confirmed checkout, never at app launch or resume. Location permissions remain controlled by the browser/OS.
A new service worker activates naturally after old tabs close, avoiding interrupted forms.
Bump CACHE_NAME in public/service-worker.js when changing the offline page or cached icons.

Icons are cropped from the original public/se-logo.png SE mark and padded against
charcoal. Maskable variants have extra safe-area padding. The original logo is unchanged.
The 1024px asset is an upscale of the original raster, not newly invented vector detail.
Regenerate icons with `node scripts/create-app-icons.cjs` (uses the existing sharp dependency).
Run `node scripts/test-service-worker.cjs` for caching/manifest checks.

## Current production URLs

- Frontend: https://nuvanata.io/ (`PUBLIC_URL=/`, root router).
- Authenticated API: https://api.nuvanata.io/api/v1.
- Public candidate API: https://api.nuvanata.io/api/public (same configured API origin).
- Backend `APP_BASE_URL` and `CANDIDATE_PORTAL_BASE_URL`: https://nuvanata.io/.
- Backend CORS `FRONTEND_URL`: https://nuvanata.io (browser origin, without `/my`).

Mount the build at `/`. Existing static files must be served directly; other
application route requests must fall back to `/index.html`. For example, `/login` and
`/candidate/selection/:token` must work when opened directly from an email.
Rebuild the frontend and restart/redeploy the backend after environment changes.
The Google OAuth web client must allow the JavaScript origin https://nuvanata.io.
