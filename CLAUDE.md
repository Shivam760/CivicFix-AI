# CivicFix AI

Civic-issue reporting app (college project, solo developer, beginner).
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
- Database layer done: models in app/models/ (one file per table; value lists in choices.py), 4 Alembic migrations, 81 model tests.
- Migrations: autogenerate, then review the file before upgrade. Autogenerate misses CHECK constraints on existing tables; add them by hand. Verify with python -m alembic check.
- Tests run in civicfix_db inside a rolled-back transaction (tests/conftest.py). Set up a separate test database before API tests.
- Next: authority seed script, then app foundation (/api/v1 routers, DB session dependency, JSON error format, test DB), then auth.