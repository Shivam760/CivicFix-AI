# CivicFix AI — Frontend

React + Vite app for CivicFix AI. UI design by Saksham3392; connected to the
FastAPI backend in `backend/`. The API it talks to is described in
`docs/api-contract.md`: that document, not this one, is the source of truth.

## Run it (Windows PowerShell)

Start the backend first (from `backend/`, see `backend/README.md`):

```powershell
cd D:\CivicFix-AI\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Then, in a second terminal:

```powershell
cd D:\CivicFix-AI\frontend
npm install          # first time only
npm run dev          # opens on http://localhost:5173
```

The backend allows requests from `http://localhost:5173` by default
(`CORS_ORIGINS` in `backend/.env`). To use a different backend URL, copy
`.env.example` to `.env` and change `VITE_API_BASE_URL`.

Other commands:

```powershell
npm test             # unit tests (Vitest)
npm run lint         # oxlint
npm run build        # production build into dist/
```

## Roles and pages

Roles come from the backend (`GET /api/v1/auth/me`), not from the browser.
Registration always creates a citizen; make an official with
`python -m scripts.set_role <email> official` in `backend/`.

| Path | Who | What |
|---|---|---|
| `/` | everyone | Landing page |
| `/login`, `/signup` | everyone | Sign in / create a citizen account |
| `/citizen/dashboard` | citizen | Own reports, counts, filters |
| `/citizen/report` | citizen | 4-step wizard: describe, location, photos, review |
| `/citizen/reports/:id` | citizen | Edit, photos, AI suggestion, draft versions, approval, submit, history |
| `/citizen/nearby` | citizen | Home location; map + reports neighbours shared within 2 km; "Me too" |
| `/citizen/verifications` | citizen | Home location; vote on claimed repairs (own + within 2 km) |
| `/official/dashboard` | official | All reports, oldest first |
| `/official/reports/:id` | official | Status changes with notes, after-repair photos, history |

## How the code is organised

- `src/services/apiClient.js`: the only place that calls our backend. Adds the
  token, reads the backend's `{"error": {"code", "message"}}` format, logs out
  on an expired token, and downloads protected photos as object URLs.
- `src/services/authService.js`, `reportService.js`, `verificationService.js`,
  `nearbyService.js`: one function per API endpoint.
- Maps provider switch (`src/services/mapConfig.js`): with `VITE_GEOAPIFY_API_KEY`
  in `frontend/.env` the app uses Geoapify (search-as-you-type limited to India,
  address lookup, styled light/dark tiles). Without the key, or with
  `VITE_MAP_PROVIDER=osm`, it uses OpenStreetMap + Nominatim (free, no key;
  search on Enter only, at most 1 request per second). Restart `npm run dev`
  after changing `.env`.
- `src/services/geocodingService.js`: address search and address-at-a-point
  for both providers (the only calls to a service other than our backend).
- Location extras: the address at the pin fills "Where is it?" (never over
  text the user typed); "Use my location" shows the GPS accuracy circle; the
  wizard shows "Already reported nearby?" (own open reports + others' shared
  reports within 200 m, `GET /nearby/around`) with "Me too"; a photo's GPS
  (read in the browser with `exifr`, before the backend strips it) is compared
  with the pin ("Taken at your pin's location" / "Move the pin here").
- Maps: Leaflet + react-leaflet with OpenStreetMap tiles (free, no API key).
  `src/components/reports/LocationPicker.jsx` (pin on a map) is used for the
  report location and the home location; shared setup in `mapSetup.js`
  (our own SVG pins, status colours). `src/styles/map.css` restyles Leaflet's
  controls with the theme tokens and tints the tiles for light/dark mode with
  CSS filters. (CARTO's styled tiles now need an API key, so we don't use them.)
- `src/constants/`: statuses, allowed status changes, categories and roles,
  copied from `backend/app/models/choices.py`. Update them together.
- `src/pages/`: one file per screen. `src/components/reports/`: the panels
  of the report page.

## Rules the screens follow

- No mock data: if the backend is down, the screen says so.
- AI output is always labelled as a suggestion and applied only when the
  citizen clicks. Authority names come from the directory, not from the AI.
- Approval is for one exact draft version; a new version clears it.
- "Send to authority" shows the backend's real answer. With no integration
  configured that is a 503, shown as "Nothing was sent".
- Photos have no public URLs: they are downloaded with the token.

## Tests

`src/**/*.test.js`, run with `npm test`:

- `services/apiClient.test.js`: token header, error format, no invented data
  on network failure, logout on an invalid token but not on a wrong password.
- `services/authService.test.js`: login stores the token and gets the role
  from `/auth/me`; no login when the server is down; register sends name.
- `constants/complaintStatuses.test.js`: the status rules match the backend
  (officials can never set `resolved`; `closed` is final).
