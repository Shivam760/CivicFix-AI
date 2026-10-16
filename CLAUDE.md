# CivicFix AI

Civic-issue reporting app (college project, beginner). I build the backend; a teammate builds the React frontend separately (not aware of these docs) and will push it or share the folder later; we'll then connect it to the API together.
Stack: React + Vite, FastAPI, PostgreSQL 18, SQLAlchemy 2.x, Pydantic, Pytest. Windows + PowerShell.
Design docs: docs/architecture.md, docs/api-contract.md, docs/database-schema.md, docs/ai-contract.md. Read them before implementing features.

## How to work with me
- I'm learning. For routine steps, write the code and then explain it; for new design decisions, explain the options first.
- Work in small steps; explain each file and important line.
- Give exact PowerShell commands and the directory to run them in.
- After each step, let me run and verify it before continuing. Don't claim something works without seeing output.
- Include tests and explain what they verify.

## Project rules
- Never commit to main. Current branch: feature/backend-reports-api.
- Never read or print backend/.env. Secrets live there; backend/.env.example holds placeholders.
- AI output is a suggestion, never a verified fact. Never invent authorities, complaint references, or submission confirmations.
- Citizen approval is tied to the exact draft version; editing a draft invalidates approval.

## Current state
- Backend runs from backend/ with venv backend\.venv: python -m uvicorn app.main:app --reload
- Docs aligned: "reports" naming, versioned complaint_drafts for approval, edit lock after submission. Update all three contracts together.
- Models in app/models/ (one file per table; value lists in choices.py), 7 Alembic migrations (head a974f2e5897e). Routers in app/routers/, rules in app/services/.
- Migrations: autogenerate, then review the file before upgrade. Autogenerate misses CHECK constraints on existing tables; add them by hand. Verify with python -m alembic check.
- Tests run in civicfix_test_db (TEST_DB_NAME in .env), migrated automatically, each test inside a rolled-back transaction (tests/conftest.py). Fixtures: client, user, auth_headers, other_headers, official_headers, report, storage (in-memory fake; client always uses it, .fail=True simulates outages). 384 tests pass.
- Done (all tested): auth (JWT); reports CRUD with ownership (404 for others); versioned drafts, approval, events; AI analysis (fake + Gemini, AI_PROVIDER); POST /submit (no real integration, so 503; fake submitters only in tests; crash = unknown); CORS (CORS_ORIGINS, default Vite :5173); roles citizen/official (python -m scripts.set_role <email> official, no API for it); POST /reports/{id}/status (officials move along allowed path, owner may close only from reported/under_review). Officials can read all reports + events but not edit/drafts/submit.
- Evidence photos (done, tested, manually checked with local storage): evidence table (kind report_photo | repair_photo, uploaded_by_user_id); POST/GET /reports/{id}/evidence and GET .../evidence/{eid}/file (authenticated, no public URLs). Owner-only upload, 409 when locked, max 5 photos, 5 MB (413), Pillow decodes the real type (415), EXIF/GPS stripped after rotating upright (app/services/images.py). File saved first, row + evidence_added event committed after; file deleted if commit fails. Photo descriptions feed the AI's evidence_descriptions. Adding a photo does not invalidate approval.
- Storage: app/storage.py, STORAGE_PROVIDER=local (default, backend/uploads/, gitignored) or supabase (SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_BUCKET=evidence; private bucket, plain httpx calls). Files don't move between providers.
- Seed scripts: python -m scripts.seed_authorities. Demo accounts in dev DB: citizen@example.com, official@example.com (passwords forgotten; tester@example.com used for manual checks).
- Branch commits are not pushed yet (git push when ready; merge to main via PR).
- Next: (1) switch to Supabase: user creates project + private bucket "evidence", fills .env, sets STORAGE_PROVIDER=supabase, manual upload/download check. (2) official repair claim with after-repair photo (repair_photo kind; needs design + docs first). (3) citizen "fixed / still broken" verification. (4) AI image checks (risk signals, not proof). (5) notifications. Maybe: demo seed script, scripts/set_password.py, evidence delete before lock.