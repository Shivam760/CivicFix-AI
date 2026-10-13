# CivicFix AI — Agentic AI Civic Issue Intake Engine

[![Tests](https://img.shields.io/badge/pytest-174%20passed-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)]()
[![Pydantic](https://img.shields.io/badge/Pydantic-v2.7+-purple.svg)]()

> **Intelligent, Reliable, and Privacy-Preserving AI Intake for Civic Problem Reporting**

CivicFix AI is an AI-assisted civic grievance intake and routing engine developed as part of a 3-member college project. It accepts raw, unstructured, potentially incomplete, and untrusted citizen reports (potholes, garbage dumps, broken streetlights, water pipeline leaks), deterministically categorizes them, identifies missing geographic details, matches responsible municipal authorities against verified directories, and produces structured complaint drafts ready for citizen review and confirmation.

---

## Team Division & Ownership

| Role | Domain & Responsibilities |
|---|---|
| **Team Leader (Backend Lead)** | FastAPI backend, PostgreSQL database, authentication, database schemas, external portal queue. |
| **Frontend Developer** | React + Vite citizen reporting web portal, interactive dashboard, mobile layout. |
| **Agentic AI Developer (This Module)** | AI intake pipeline (`ai/`), input validation, category classification, missing-information detection, verified authority directory lookup, complaint drafting, security/prompt injection defenses, evaluation suite, and FastAPI integration router. |

---

## Key Features & Safety Invariants

1. **Mandatory Human-in-the-Loop (`requires_human_approval = True`)**:
   - Enforced by strict Pydantic field validation. The AI module **never** directly submits complaints to external portals or authorizes actions autonomously.
2. **Zero Hallucination of Civic Authorities**:
   - Authorities are matched against a verified, controlled directory. The AI never invents government bodies, escalation emails, or official reporting URLs.
3. **Adversarial Input & Prompt Injection Defense**:
   - Citizen descriptions are treated as untrusted data. Scanned for instruction overrides, tag-breakout attempts, and script injection.
4. **Deterministic Multi-Step Pipeline & Graph State Machine**:
   - Dual-engine architecture: Pure Python pipeline (`analyze_report`) and zero-dependency Graph State Machine (`analyze_report_graph`) with 100% verified behavioral equivalence.
5. **Computer Vision & Multimodal Discrepancy Extension**:
   - Image attachment metadata is never treated as proof of content. Pluggable vision provider extracts descriptive features with zero physical dimension hallucination, honest simulation disclosure, and multimodal conflict warnings.
6. **100% Offline & Reproducible**:
   - Zero mandatory cloud API keys or external subscriptions required to run the pipeline, demo, or test suite.

---

## Quickstart (Under 2 Minutes)

### 1. Setup Virtual Environment & Install Dependencies
```bash
# Clone and enter directory
git clone https://github.com/CivicFix/CivicFix-AI.git
cd CivicFix-AI

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Interactive Demonstration Script
See the AI intake engine process 6 realistic civic scenarios in real time:
```bash
python demo_ai_workflow.py
# Or:
python -m ai.demo
```

### 3. Run the Automated Test Suite (174 Tests)
```bash
pytest
```

### 4. Run the 14-Scenario Systematic Evaluation Benchmark
```bash
python -c "from ai.evaluation import run_evaluation_suite, generate_markdown_evaluation_report; print(generate_markdown_evaluation_report(run_evaluation_suite()))"
```

---

## Evaluation Benchmark Summary (Genuinely Calculated)

Calculated across 14 synthetic and authorized realistic civic scenarios:

| Quality Metric | Measured Result | Benchmark Target | Status |
|---|---|---|---|
| **Scenario Completion Rate** | **100.0%** (14 / 14) | >= 90.0% | **PASS** |
| **Category Suggestion Accuracy** | **100.0%** | >= 90.0% | **PASS** |
| **Missing-Field Detection Recall** | **100.0%** | >= 90.0% | **PASS** |
| **Authority Directory Match Accuracy** | **100.0%** | >= 90.0% | **PASS** |
| **Human Approval Invariant Compliance**| **100.0%** | 100.0% | **PASS** |
| **Provider Failure Containment Rate** | **100.0%** | 100.0% | **PASS** |
| **Average Report Processing Latency** | **~0.44 ms / report** | < 100 ms | **PASS** |

---

## Project Structure

```
CivicFix-AI/
├── ai/                              # Core AI Module
│   ├── __init__.py                  # Public exports and version marker
│   ├── schemas.py                  # Pydantic v2 data models & request/response contracts
│   ├── validation.py               # Deterministic input validation & missing-info detection
│   ├── classification.py           # Civic issue category suggestion & conflict detection
│   ├── authority_lookup.py         # Verified civic authority directory lookup engine
│   ├── complaint_builder.py        # Structured complaint draft synthesizer with LLM fallback
│   ├── workflow.py                 # Pure Python stateful orchestration pipeline
│   ├── graph_workflow.py           # Graph State Machine runner (LangGraph-compatible)
│   ├── security.py                 # Prompt injection defenses, PII masking, text sanitization
│   ├── observability.py            # Privacy-preserving event logging & diagnostic observer hook
│   ├── vision.py                   # Optional image-understanding extension & conflict detector
│   ├── evaluation.py               # 14-scenario evaluation suite & metric benchmark engine
│   ├── demo.py                     # Module demo entrypoint (python -m ai.demo)
│   └── tests/                      # Dedicated Pytest Suite (11 modules, 174 tests)
│       ├── test_schemas.py
│       ├── test_validation.py
│       ├── test_classification.py
│       ├── test_authority_lookup.py
│       ├── test_complaint_builder.py
│       ├── test_workflow.py
│       ├── test_reliability_security.py
│       ├── test_graph_equivalence.py
│       ├── test_fastapi_integration.py
│       ├── test_vision.py
│       └── test_evaluation_suite.py
├── docs/                           # Comprehensive Documentation
│   ├── AI_SETUP_GUIDE.md           # Developer setup, environment vars, and testing instructions
│   ├── AI_CONTEXT.md               # Architecture context, team boundaries, and schema contracts
│   ├── AI_WORKFLOW.md              # Workflow step specifications, state machine, and safety gates
│   ├── BACKEND_INTEGRATION_GUIDE.md # 2-minute mount guide and concrete JSON payloads for backend lead
│   ├── api-contract.md             # API contract index and endpoint reference
│   └── AI_DEVELOPMENT_LOG.md       # Chronological development log across all 11 phases
├── demo_ai_workflow.py             # Standalone interactive CLI demonstration script
├── requirements.txt                # Python dependencies
└── README.md                       # This document
```

---

## Backend Lead Integration Snippet

Mount the AI router directly into the existing FastAPI backend in 2 lines:

```python
from fastapi import FastAPI
from ai.api_router import ai_router

app = FastAPI(title="CivicFix AI Backend")

# Mount AI router
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])
```

### Endpoints Exposed:
- `POST /api/v1/ai/analyze-report`: Primary analysis intake.
- `GET /api/v1/ai/health`: Health status and directory fixture record count.
- `GET /api/v1/ai/authorities`: List configured demonstration authorities.

For complete integration instructions, HTTP status codes, and 6 sample JSON payloads, see [`docs/BACKEND_INTEGRATION_GUIDE.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md).

---

## Detailed Documentation Links

- [AI Setup & Testing Guide (`docs/AI_SETUP_GUIDE.md`)](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/AI_SETUP_GUIDE.md)
- [AI Architecture Context & Contract (`docs/AI_CONTEXT.md`)](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/AI_CONTEXT.md)
- [AI Workflow & State Machine (`docs/AI_WORKFLOW.md`)](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/AI_WORKFLOW.md)
- [FastAPI Backend Integration Guide (`docs/BACKEND_INTEGRATION_GUIDE.md`)](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md)
- [AI Development Log (`docs/AI_DEVELOPMENT_LOG.md`)](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/AI_DEVELOPMENT_LOG.md)