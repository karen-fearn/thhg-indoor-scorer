# THHG Indoor Scorer — pre-release source

An offline-first, static PWA for THHG indoor softball cricket. No backend, account, or data sharing.

## Layout
- `index.html`: markup and UI controls
- `css/styles.css`: visual styling
- `js/app.js`: current scoring, rendering and persistence logic
- `manifest.webmanifest`: install metadata
- `service-worker.js`: offline cache
- `tests/smoke.test.cjs`: basic offline bundle checks

## Run
Serve this folder over HTTPS or localhost, e.g. `python -m http.server 8000`. Open `http://localhost:8000`. Opening `index.html` directly does not register a service worker.

## Important
This is a **structural cleanup**, not a complete scoring-engine rewrite. `js/app.js` remains coupled to the DOM and uses inline event handlers; further modularisation and automated match simulation are required before a production release. Do not assume the league rules have been fully verified.

Scoring data is kept in browser localStorage on each device. Export CSV before resetting, switching origins, or clearing site data.
