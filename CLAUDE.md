# CivicFix AI

Civic-issue reporting app (college project, solo developer, beginner).
Stack: React + Vite, FastAPI, PostgreSQL 18, SQLAlchemy 2.x, Pydantic, Pytest. Windows + PowerShell.
Design docs: docs/architecture.md, docs/api-contract.md, docs/database-schema.md, docs/ai-contract.md. Read them before implementing features.

## How to work with me
- I'm learning. Explain the approach and reasoning before writing code.
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
- app/database.py: SQLAlchemy engine via psycopg 3, settings from backend/.env. Connection test passes (python -m pytest -v).
- Next: resolve doc inconsistencies (reports vs complaints naming, authorities.supported_categories, draft versioning for approval), then SQLAlchemy models, then Alembic.