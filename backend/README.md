# CivicFix AI — Backend

The FastAPI backend for CivicFix AI: citizens report civic issues, an AI suggests a
category and drafts a complaint for the citizen to approve, officials track the
repair, and the owner and nearby residents confirm whether the repair was really done.

The design documents are the source of truth; this file only explains how to run things.

| Document | What it describes |
|---|---|
| [docs/api-contract.md](../docs/api-contract.md) | Every endpoint, request, response and error code (the frontend's reference) |
| [docs/database-schema.md](../docs/database-schema.md) | Tables, rules and status workflow |
| [docs/ai-contract.md](../docs/ai-contract.md) | What the AI receives and must return |
| [docs/architecture.md](../docs/architecture.md) | How the parts fit together |

## What works

- Registration, login (JWT bearer tokens), roles `citizen` and `official`
- Reports: create, list, view, edit; owners see their own, officials see all
- AI analysis (fake analyzer, or Google Gemini) producing a suggested category and a complaint draft
- Versioned complaint drafts; approval is tied to one exact version and cleared by any edit
- Evidence photos (checked, re-encoded, location data removed), stored privately on disk or in Supabase Storage
- Status workflow for officials, with a full event history for every report
- Repair verification: an official claims a repair with an after-photo; the owner and residents
  living within 2 km vote "fixed" or "still broken", and the votes decide the outcome

Not built: sending complaints to a real authority. There is no authorized integration, so
`POST /reports/{id}/submit` always answers `503`. AI output is always a suggestion, never a verified fact.

## Requirements

- Windows with PowerShell (the commands below are for PowerShell)
- Python 3.14 (the version the project is developed and tested with)
- PostgreSQL 18, running locally
- Optional: a Google Gemini API key (for real AI analysis) and a Supabase project (for cloud photo storage)

## Setup

All commands run in PowerShell from the `backend` folder, unless stated otherwise.

**1. Create a virtual environment and install the packages**

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes everything in `requirements.txt` plus the test tools.
Run `.\.venv\Scripts\Activate.ps1` again in every new PowerShell window.

**2. Create the two databases**

One for development, one that the tests use (the tests never touch your development data).
In pgAdmin, open your server, right-click **Databases → Create → Database...**, and create
`civicfix_db`, then `civicfix_test_db`.

Or, if `psql` is on your PATH:

```powershell
psql -U postgres -c "CREATE DATABASE civicfix_db;"
psql -U postgres -c "CREATE DATABASE civicfix_test_db;"
```

**3. Create your settings file**

```powershell
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Open `.env` and set at least `DB_PASSWORD` (your PostgreSQL password) and `SECRET_KEY`
(paste the random value printed above). `.env` holds secrets: it is ignored by Git, never commit it.

**4. Create the tables and load the authority directory**

```powershell
python -m alembic upgrade head
python -m scripts.seed_authorities
```

The authorities in `seed/authorities.json` are sample data marked "unverified", so the AI
will not suggest them. Replace them with real, checked records before relying on them.

**5. Start the server**

```powershell
python -m uvicorn app.main:app --reload
```

- http://127.0.0.1:8000/health should answer `{"status":"ok"}`
- http://127.0.0.1:8000/docs is the interactive API documentation (Swagger)

## Demo data

```powershell
python -m scripts.seed_demo
```

It asks for one password (type it; nothing is shown) and uses it for four accounts:

| Account | Role | Use it to |
|---|---|---|
| demo-citizen@example.com | citizen | see six reports, one in each status |
| demo-official@example.com | official | move reports along, upload a repair photo, claim a repair |
| demo-neighbour-near@example.com | citizen, home ~1 km away | vote on the claimed repair |
| demo-neighbour-far@example.com | citizen, home ~3 km away | see that residents too far away cannot vote |

Things to try: log in as demo-official and claim the pothole repair
(`POST /reports/{id}/status` with `awaiting_verification`); log in as demo-neighbour-near,
open `GET /verifications` and vote on the footpath repair.

`python -m scripts.seed_demo --reset` deletes the demo accounts' reports and photos and creates
them again (and sets a new password). It never touches other accounts' data.

## Other scripts

| Command | What it does |
|---|---|
| `python -m scripts.set_role <email> official` | Make an account an official (or `citizen` again). There is deliberately no API for this. |
| `python -m scripts.set_password <email>` | Set a new password for an account (asked at a hidden prompt) |
| `python -m scripts.seed_authorities [file]` | Load or update the authority directory from JSON |
| `python -m scripts.check_gemini_models` | Find a Gemini model your API key can use right now |

## Settings (`.env`)

| Setting | Meaning |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | The development database |
| `TEST_DB_NAME` | The test database (must differ from `DB_NAME`) |
| `SECRET_KEY` | Signs login tokens; a long random value |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long a login lasts (default 60) |
| `AI_PROVIDER` | `fake` (default: predictable, no key needed) or `gemini` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Needed only with `AI_PROVIDER=gemini` |
| `CORS_ORIGINS` | Websites allowed to call the API from a browser, comma-separated. Empty = the Vite dev server (`http://localhost:5173`) |
| `STORAGE_PROVIDER` | `local` (default: files in `backend/uploads/`) or `supabase` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET` | Needed only with `STORAGE_PROVIDER=supabase`. The bucket must be private. |

Photos are not copied when you switch storage: photos saved under one provider return `503` under the other.

## Tests

```powershell
python -m pytest -q
```

The tests use `TEST_DB_NAME`, bring it up to date with the migrations automatically, and run each
test inside a transaction that is rolled back, so nothing is left behind. They never call Gemini or
Supabase: the AI is always the fake analyzer and storage is an in-memory fake.

## For the frontend

- Base URL: `http://127.0.0.1:8000/api/v1`
- Log in with `POST /auth/login`, then send `Authorization: Bearer <access_token>` on every request.
- Every error has the same shape: `{"error": {"code", "message", "details"}}`. Use `code` in the code, show `message` to people.
- Photos are private: an `<img src>` pointing at the API won't work, because it can't send the token.
  Fetch `.../file` with the header, then show it with `URL.createObjectURL(blob)`.
- The Vite dev server on port 5173 is allowed by default; for another address, set `CORS_ORIGINS`.

## Folder layout

```text
backend/
├── app/
│   ├── main.py        the FastAPI app and its routers
│   ├── models/        one file per table; fixed value lists in choices.py
│   ├── schemas/       request and response shapes (Pydantic)
│   ├── routers/       the endpoints
│   ├── services/      the rules (status changes, photos, verification, ...)
│   ├── ai/            analyzers (fake and Gemini) and the AI contract checks
│   └── storage.py     local or Supabase file storage
├── migrations/        Alembic database migrations
├── scripts/           command-line tools (see above)
├── seed/              authority directory data
└── tests/
```
