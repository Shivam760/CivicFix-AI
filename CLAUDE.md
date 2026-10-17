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
- Models in app/models/ (one file per table; value lists in choices.py), 9 Alembic migrations (head 3f82a9b162d0). Routers in app/routers/, rules in app/services/.
- Migrations: autogenerate, then review the file before upgrade. Autogenerate misses CHECK constraints on existing tables; add them by hand. Verify with python -m alembic check.
- Tests run in civicfix_test_db (TEST_DB_NAME in .env), migrated automatically, each test inside a rolled-back transaction (tests/conftest.py). Fixtures: client, user, auth_headers, other_headers, official_headers, report, storage (in-memory fake; client always uses it, .fail=True simulates outages). 437 tests pass.
- Done (all tested): auth (JWT); reports CRUD with ownership (404 for others); versioned drafts, approval, events; AI analysis (fake + Gemini, AI_PROVIDER); POST /submit (no real integration, so 503; fake submitters only in tests; crash = unknown); CORS (CORS_ORIGINS, default Vite :5173); roles citizen/official (python -m scripts.set_role <email> official, no API for it); POST /reports/{id}/status (officials move along allowed path, owner may close only from reported/under_review). Officials can read all reports + events but not edit/drafts/submit.
- Evidence photos (done, tested, manually checked with local storage): evidence table (kind report_photo | repair_photo, uploaded_by_user_id); POST/GET /reports/{id}/evidence and GET .../evidence/{eid}/file (authenticated, no public URLs). Owner-only upload, 409 when locked, max 5 photos, 5 MB (413), Pillow decodes the real type (415), EXIF/GPS stripped after rotating upright (app/services/images.py). File saved first, row + evidence_added event committed after; file deleted if commit fails. Photo descriptions feed the AI's evidence_descriptions. Adding a photo does not invalidate approval.
- Repair photos (done, tested, manually checked with local storage): POST /reports/{id}/repair-photos, officials only (owner 403 REPAIR_PHOTO_FORBIDDEN), only while in_progress (409 REPORT_NOT_IN_PROGRESS), lock doesn't apply, max 5 per repair round. in_progress -> awaiting_verification (the official's repair claim) needs >=1 repair photo this round (409 REPAIR_PHOTO_REQUIRED). Round = events after the latest report_status_changed to in_progress, compared by sequence (repair_photos_this_round in app/services/reports.py; no migration). Shared upload code: _store_photo in app/services/evidence.py. Repair photos are not sent to the AI.
- Neighbour verification (designed in docs: database-schema.md section 12, api-contract.md section 11; built in 4 steps). Done: (1) private home location on users (PUT/DELETE /auth/me/home-location); (2) status awaiting_verification: officials can't set resolved or close while awaiting; they may withdraw the claim (-> in_progress). Left: (3) repair_verifications table + POST /verifications/{id}/votes + outcome (owner still_broken or 2 still_broken -> in_progress; 2 fixed -> resolved; owner counts as one; 2 km radius; status event with no actor); (4) GET /verifications list/detail/photo for neighbours (limited view, no owner identity or counts).
- Storage: app/storage.py, STORAGE_PROVIDER=local (default, backend/uploads/, gitignored) or supabase (SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_BUCKET=evidence; private bucket, plain httpx calls). Files don't move between providers.
- Seed scripts: python -m scripts.seed_authorities. Demo accounts in dev DB: citizen@example.com, official@example.com (passwords forgotten); for manual checks use tester@example.com (citizen) and official2@example.com (official). Manual API checks: curl.exe from PowerShell is more reliable than Swagger's body editor.
- Branch commits are not pushed yet (git push when ready; merge to main via PR).
- Next: (1) finish neighbour verification steps 3-4. (2) switch to Supabase: user creates project + private bucket "evidence", fills .env, sets STORAGE_PROVIDER=supabase, manual upload/download check. (3) AI image checks (risk signals, not proof). (4) notifications. Maybe: demo seed script, scripts/set_password.py, evidence delete before lock.