"""Pydantic models for ai-contract.md sections 2-5, and the output check.

Every analyzer (the fake one and any real LLM) receives an AnalysisInput and
returns a plain dict. validate_output() decides whether that dict may be stored.
"""

import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from app.models.choices import ISSUE_CATEGORIES
from app.schemas.common import IssueCategory

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


# --- Input (section 2) ----------------------------------------------------------


class AuthorityInput(BaseModel):
    id: uuid.UUID
    name: str
    region: str
    supported_categories: list[str]
    # Only verified authorities are ever sent to the AI.
    verification_status: Literal["verified"]


class AnalysisInput(BaseModel):
    report_id: uuid.UUID
    title: str
    description: str
    category: IssueCategory | None
    location_text: str | None
    latitude: float | None
    longitude: float | None
    # Always empty until evidence uploads exist (database-schema.md section 11).
    evidence_descriptions: list[str] = []
    available_authorities: list[AuthorityInput]


# --- Output (section 3) ---------------------------------------------------------
# extra="forbid" everywhere: unexpected fields (for example a verification_status
# the AI should not state) make the whole output invalid.


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SuggestedCategory(_Strict):
    # The AI may also answer "unknown" (section 4); it is never stored on a report.
    value: Literal[(*ISSUE_CATEGORIES, "unknown")]
    confidence: Annotated[float, Field(ge=0, le=1)] | None
    reason: Text


class MissingField(_Strict):
    field: Text
    reason: Text
    question: Text


class AuthoritySuggestion(_Strict):
    authority_id: uuid.UUID | None
    reason: Text


class ComplaintDraftSuggestion(_Strict):
    text: Text
    # Every draft needs citizen approval, so anything but true is invalid.
    requires_approval: Literal[True]


class ModelMetadata(_Strict):
    model_name: str | None
    prompt_version: Text


class AnalysisOutput(_Strict):
    report_id: uuid.UUID
    suggested_category: SuggestedCategory
    missing_fields: list[MissingField]
    authority_suggestion: AuthoritySuggestion
    complaint_draft: ComplaintDraftSuggestion
    warnings: list[str]
    model_metadata: ModelMetadata


# --- Validation (sections 5 and 6) ----------------------------------------------


class InvalidAnalysis(Exception):
    """The analyzer's output broke the contract. The message never contains report text."""


# Analyzers raise these instead of library errors, with messages that are safe
# to store (status codes only: no request details, report text, or keys).


class AnalyzerFailed(Exception):
    """The AI service returned an error. Stored as a failed run; the API returns 502."""


class AnalyzerUnavailable(Exception):
    """The AI service is busy or out of quota. Stored as a failed run; the API returns 503."""


def validate_output(raw: dict, analysis_input: AnalysisInput) -> AnalysisOutput:
    try:
        output = AnalysisOutput.model_validate(raw)
    except ValidationError as exc:
        # Report only where the problems are, not the values (which may be report text).
        locations = sorted({".".join(str(p) for p in e["loc"]) for e in exc.errors()})
        raise InvalidAnalysis(f"Output failed schema validation at: {', '.join(locations)}")

    if output.report_id != analysis_input.report_id:
        raise InvalidAnalysis("Output report_id does not match the report that was sent.")

    supplied = {authority.id for authority in analysis_input.available_authorities}
    suggested = output.authority_suggestion.authority_id
    if suggested is not None and suggested not in supplied:
        raise InvalidAnalysis("Output suggests an authority that was not supplied.")

    return output
