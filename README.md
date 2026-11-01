# THHG Indoor Scorer — pre-release source

An offline-first, static PWA for THHG indoor softball cricket. No backend, account, or data sharing.

## Layout
- `index.html`: markup and UI controls
- `css/styles.css`: visual styling
- `js/app.js`: scoring UI, rendering and persistence
- `js/scoring.js`: pure scoring and striker-rotation rules
- `js/players.js`: six-player roster and lineup configuration
- `manifest.webmanifest`: install metadata
- `service-worker.js`: offline cache
- `tests/smoke.test.cjs`: basic offline bundle checks

## Run
Serve this folder over HTTPS or localhost, e.g. `python -m http.server 8000`. Open `http://localhost:8000`. Opening `index.html` directly does not register a service worker.

## Important
This is a **structural cleanup**, not a complete scoring-engine rewrite. `js/app.js` remains coupled to the DOM and uses inline event handlers; further modularisation and automated match simulation are required before a production release. Do not assume the league rules have been fully verified.

Scoring data is kept in browser localStorage on each device. Export CSV before resetting, switching origins, or clearing site data.

## Players
Open **Players** to enter six distinct player names. Select each player once across
three batting pairs and once in the six-bowler rotation (repeated for overs 7–12),
then save the order. Names and orders stay on this device. Existing saved lineups
remain usable and populate the player form where possible. Changing a lineup
leaves previously recorded deliveries unchanged. Opposition names remain editable
on the scoring screen.

## Tests
The dependency-free rule and asset tests require Node 18 or later:

```sh
node --test tests/*.test.cjs
```

Browser regressions require Python 3, Playwright, and Chromium. They start their own
local server and use disposable browser storage:

```sh
python3 -m pip install -r tests/requirements.txt
python3 -m unittest discover -s tests -p '*_test.py' -v
```

Set `CHROMIUM_PATH` to your Chromium executable if it is not `/usr/bin/chromium`.
Coverage includes runs, all extras, wicket deductions, final-over counting,
striker rotation, innings-specific undo, player validation and persistence,
mobile over-circle spacing, and automatic offline loading. No build is needed.
