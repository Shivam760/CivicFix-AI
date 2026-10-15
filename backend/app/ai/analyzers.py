"""Analyzers: functions that turn an AnalysisInput into a raw output dict.

AI_PROVIDER in backend/.env chooses which one the API uses: "fake" (default,
used by tests) or "gemini" (see app/ai/gemini.py).
"""

import os
from collections.abc import Callable

from app.ai import gemini
from app.ai.contract import AnalysisInput
from app.errors import ApiError

Analyzer = Callable[[AnalysisInput], dict]

PROMPT_VERSION = "v1"
FAKE_MODEL_NAME = "fake-analyzer"


def fake_analyze(data: AnalysisInput) -> dict:
    """A predictable stand-in for a real AI, for development and tests.

    It invents nothing: it repeats the citizen's category, picks a supplied
    authority only if one supports that category, and builds the draft from
    the citizen's own title and description.
    """
    category = data.category or "unknown"
    matches = [a for a in data.available_authorities if category in a.supported_categories]
    authority = matches[0] if matches else None

    missing_fields = []
    if data.location_text is None and data.latitude is None:
        missing_fields.append(
            {
                "field": "exact_location",
                "reason": "The report has no location.",
                "question": "Where exactly is the issue?",
            }
        )

    return {
        "report_id": str(data.report_id),
        "suggested_category": {
            "value": category,
            "confidence": None,
            "reason": "The fake analyzer repeats the citizen's category."
            if data.category
            else "No category was given, and the fake analyzer does not guess.",
        },
        "missing_fields": missing_fields,
        "authority_suggestion": {
            "authority_id": str(authority.id) if authority else None,
            "reason": "First supplied authority that supports this category."
            if authority
            else "No supplied authority supports this category.",
        },
        "complaint_draft": {
            "text": f"Subject: {data.title}\n\n{data.description}\n\n"
            "I request that this issue be inspected and resolved.",
            "requires_approval": True,
        },
        "warnings": ["Produced by a fake analyzer for development, not by a real AI model."],
        "model_metadata": {"model_name": FAKE_MODEL_NAME, "prompt_version": PROMPT_VERSION},
    }


def get_analyzer() -> Analyzer:
    """FastAPI dependency. Tests override it to simulate failures."""
    provider = os.getenv("AI_PROVIDER", "fake")
    if provider == "fake":
        return fake_analyze
    if provider == "gemini":
        try:
            gemini.settings()  # fail now, before a run is stored, if the key is missing
        except gemini.GeminiNotConfigured:
            raise ApiError(503, "AI_UNAVAILABLE", "The AI service is not configured.")
        return gemini.gemini_analyze
    raise ApiError(503, "AI_UNAVAILABLE", "The AI service is not configured.")
