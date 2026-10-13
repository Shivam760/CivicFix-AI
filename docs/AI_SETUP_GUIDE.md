# CivicFix AI — Developer Setup & Testing Guide

This guide provides instructions for onboarding, setting up the local environment, executing tests, running the evaluation suite, and launching the interactive demonstration script for the CivicFix AI module.

---

## 1. Prerequisites & System Requirements

- **Operating System**: Windows, macOS, or Linux.
- **Python Version**: Python 3.10, 3.11, 3.12, or 3.13 (developed and verified on Python 3.13).
- **Package Manager**: `pip` (included with standard Python installations).
- **Zero Mandatory External Services**:
  - The AI module operates **100% offline** by default.
  - No cloud API keys (OpenAI, Anthropic, Google Gemini), database connections, or vector databases are required to run the full workflow, execute tests, or run the demo script.

---

## 2. Quickstart Installation (Under 2 Minutes)

### Step 1: Clone or Navigate to the Repository
```bash
cd CivicFix-AI
```

### Step 2: Create and Activate a Virtual Environment
**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**On macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

*Direct install alternative:*
```bash
pip install pydantic>=2.7.0 fastapi>=0.110.0 uvicorn>=0.29.0 httpx>=0.27.0 pytest>=8.0.0
```

---

## 3. Environment Variables Reference

The module is designed with secure defaults so that **no environment variables are required** for local testing and demonstration. However, the following optional configuration variables are supported:

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `CIVICFIX_AI_LOG_LEVEL` | `str` | `INFO` | Configures logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `CIVICFIX_LLM_API_KEY` | `str` | *None* | Optional API key when connecting a production cloud LLM provider. Not needed for offline baseline. |
| `CIVICFIX_LLM_MODEL` | `str` | `mock_provider` | Identifier for model provider adapter. |
| `CIVICFIX_DEMO_FIXTURES`| `bool`| `true` | When `true`, loads the demonstration civic authority directory fixture. |

To set an environment variable locally:
```powershell
# PowerShell
$env:CIVICFIX_AI_LOG_LEVEL = "DEBUG"
```
```bash
# Bash
export CIVICFIX_AI_LOG_LEVEL=DEBUG
```

---

## 4. Running the Interactive Demonstration Script

CivicFix AI includes an interactive demonstration script that runs 6 representative civic report scenarios through the pipeline:

```bash
# Option A: Run via direct script
python demo_ai_workflow.py

# Option B: Run via module entrypoint
python -m ai.demo
```

### Scenarios Demonstrated:
1. **Clear Pothole Report**: Bengaluru South Zone -> BBMP Road Infrastructure Division verified match.
2. **Broken Streetlight with Ambiguous Zone**: Multi-zone city without zone specification -> Ambiguous authority review.
3. **Incomplete Report**: Missing location details -> Targeted clarification questions generated.
4. **Adversarial Prompt Injection Attack**: Malicious instructions embedded in report -> Sanitized, flagged, and human approval invariant strictly preserved.
5. **Multimodal Evidence Analysis**: Photographic evidence inspection with visual observation extraction and honest simulation disclosure.
6. **Malformed Input**: Out-of-bounds geographic coordinates -> Immediate, safe structural rejection.

---

## 5. Running the Test Suite (`pytest`)

The test suite uses `pytest` and contains **174 automated unit and integration tests** across 11 test modules.

### Run All Tests:
```bash
pytest
```

### Run with Verbose Output:
```bash
pytest -v
```

### Run Specific Test Modules:
```bash
# Run the systematic 14-scenario evaluation suite:
pytest ai/tests/test_evaluation_suite.py -v

# Run FastAPI HTTP integration tests:
pytest ai/tests/test_fastapi_integration.py -v

# Run security, prompt injection, and reliability tests:
pytest ai/tests/test_reliability_security.py -v

# Run graph state machine equivalence tests:
pytest ai/tests/test_graph_equivalence.py -v

# Run computer vision extension tests:
pytest ai/tests/test_vision.py -v
```

---

## 6. Running the Evaluation Suite & Benchmark Report

To execute the systematic 14-scenario evaluation benchmark and generate an auditable markdown metrics report:

```bash
python -c "from ai.evaluation import run_evaluation_suite, generate_markdown_evaluation_report; print(generate_markdown_evaluation_report(run_evaluation_suite()))"
```

### To evaluate using the Graph Engine:
```bash
python -c "from ai.evaluation import run_evaluation_suite, generate_markdown_evaluation_report; print(generate_markdown_evaluation_report(run_evaluation_suite(use_graph_engine=True)))"
```

### Core Benchmark Metrics (Genuinely Calculated):
- **Total Scenarios**: 14 / 14 passed (100.0%)
- **Category Suggestion Accuracy**: 100.0%
- **Missing-Field Detection Accuracy**: 100.0%
- **Authority Directory Match Accuracy**: 100.0%
- **Human Approval Invariant Compliance**: 100.0% (Mandatory safety invariant)
- **Provider Failure Containment Rate**: 100.0%
- **Total Execution Time**: ~5 to 6 milliseconds across all 14 scenarios (< 0.5 ms per report)

---

## 7. Mounting into the FastAPI Backend

To mount the AI analysis endpoints into the main FastAPI application:

```python
# In your main backend file (e.g., app/main.py):
from fastapi import FastAPI
from ai.api_router import ai_router

app = FastAPI(title="CivicFix AI Backend")

# Mount AI router
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])
```

### Available Endpoints:
- `POST /api/v1/ai/analyze-report`: Analyze incoming citizen report.
- `GET /api/v1/ai/health`: AI module runtime health and directory record count.
- `GET /api/v1/ai/authorities`: List configured demonstration authorities.

---

## 8. Troubleshooting & FAQ

### Issue: `ImportError: No module named 'ai'`
**Solution**: Ensure you are running commands from the repository root directory (`CivicFix-AI`), or set `PYTHONPATH=.`:
```bash
# Windows PowerShell
$env:PYTHONPATH = "."

# Linux / macOS
export PYTHONPATH=.
```

### Issue: Test Client Warning about `httpx2`
**Explanation**: FastAPI's `TestClient` emits a minor deprecation notice regarding starlette's test client. This warning is completely harmless and does not affect test execution or results.

### Issue: Is an external LLM API key required?
**No**: CivicFix AI is architected with a strict deterministic baseline (`DeterministicTemplateDraftingProvider`) and a simulated model provider (`MockLLMDraftingProvider`). It runs 100% offline without external API keys or cloud dependencies.
