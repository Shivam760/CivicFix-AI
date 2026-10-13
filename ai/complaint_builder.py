"""
ai/complaint_builder.py

Structured complaint draft generator for CivicFix AI.

Technical & Reliability Principles:
-----------------------------------
1. Zero Fact Invention:
   - The complaint draft organizes only facts explicitly provided in the report.
   - Never invent report dates, times, road names, injury claims, damage estimates,
     prior complaints, or municipal policy.
2. Separation of Facts vs. AI Suggestions:
   - Citizen claims are presented objectively ("Citizen reports: ...").
   - AI suggestions and missing data are clearly partitioned under explicit review notes.
3. Unverified Evidence Guard:
   - Uploaded attachments are described solely by their metadata count.
   - Never claim that computer vision or image inspection verified the defect.
4. Robust Fallback & Model Segregation:
   - Uses a pluggable DraftingProvider abstraction.
   - Default provider is the DeterministicTemplateDraftingProvider (100% offline, pure Python).
   - If an optional LLM provider fails, times out, or produces malformed output, the system
     gracefully falls back to the deterministic template without corrupting the workflow.
5. Mandatory Human Approval:
   - Generated drafts are prepared exclusively for citizen review and confirmation.
   - There is NO automated transmission or submission.
"""

import json
import logging
from typing import Any, Callable, Dict, List, Optional, Protocol, Tuple, Type, Union, runtime_checkable
from pydantic import ValidationError

from ai.classification import suggest_category
from ai.schemas import (
    AIAnalysisRequest,
    AuthorityMatchResult,
    AuthorityMatchStatus,
    CategorySuggestionResult,
    CivicCategory,
    ComplaintDraft,
    LocationInput,
    MissingInfoResult,
)
from ai.security import format_safe_llm_prompt
from ai.validation import detect_missing_information, sanitize_text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model Exception Hierarchy
# ---------------------------------------------------------------------------

class ModelError(Exception):
    """Base exception for model provider failures."""
    error_code: str = "MODEL_ERROR"

    def __init__(self, message: str = "Model execution failed", error_code: Optional[str] = None):
        super().__init__(message)
        if error_code:
            self.error_code = error_code


class ModelTimeoutError(ModelError):
    """Raised when an external model request times out (transient, retryable)."""
    error_code: str = "MODEL_TIMEOUT"


class ModelConnectionError(ModelError):
    """Raised when network connection to the provider fails (transient, retryable)."""
    error_code: str = "MODEL_CONNECTION_ERROR"


class ModelRateLimitError(ModelError):
    """Raised when API provider rate limits are exceeded (transient, retryable)."""
    error_code: str = "MODEL_RATE_LIMIT"


class MissingCredentialsError(ModelError):
    """Raised when API keys or authentication credentials are missing (non-transient)."""
    error_code: str = "MISSING_CREDENTIALS"


class ModelMalformedOutputError(ModelError):
    """Raised when model returns invalid JSON or unparseable output (non-transient)."""
    error_code: str = "MALFORMED_OUTPUT"


class ModelMissingFieldError(ModelError):
    """Raised when model response lacks mandatory fields (non-transient)."""
    error_code: str = "MISSING_REQUIRED_FIELDS"


class ModelUnexpectedTypeError(ModelError):
    """Raised when model response contains unexpected data types (non-transient)."""
    error_code: str = "UNEXPECTED_DATA_TYPE"


class ModelUnsupportedCategoryError(ModelError):
    """Raised when model output contains an unsupported category."""
    error_code: str = "UNSUPPORTED_CATEGORY"


# ---------------------------------------------------------------------------
# Model Response Validation & Retry Helpers
# ---------------------------------------------------------------------------

def validate_model_draft_output(raw_output: Any) -> ComplaintDraft:
    """
    Strictly validates raw model output before use in the workflow.

    Checks:
    - Parses JSON if raw_output is a string.
    - Ensures raw_output is a valid dictionary structure.
    - Validates mandatory fields: 'title' and 'formal_body'.
    - Validates data types and schema constraints via ComplaintDraft.

    Raises:
        ModelMalformedOutputError: If JSON decoding fails.
        ModelMissingFieldError: If mandatory fields are absent.
        ModelUnexpectedTypeError: If data types do not conform.
    """
    if raw_output is None:
        raise ModelMissingFieldError("Model returned empty or null output.")

    parsed: Dict[str, Any]
    if isinstance(raw_output, str):
        try:
            parsed = json.loads(raw_output)
        except json.JSONDecodeError as exc:
            raise ModelMalformedOutputError(f"Model returned invalid JSON string: {exc}") from exc
    elif isinstance(raw_output, dict):
        parsed = raw_output
    elif isinstance(raw_output, ComplaintDraft):
        return raw_output
    else:
        raise ModelUnexpectedTypeError(
            f"Expected dict, JSON string, or ComplaintDraft, received {type(raw_output).__name__}"
        )

    # Validate required fields and types before Pydantic parsing
    for req_field in ("title", "formal_body"):
        if req_field not in parsed or parsed[req_field] is None:
            raise ModelMissingFieldError(f"Missing required field '{req_field}' in model output.")
        if not isinstance(parsed[req_field], str):
            raise ModelUnexpectedTypeError(
                f"Field '{req_field}' must be a string, received {type(parsed[req_field]).__name__}"
            )

    try:
        draft = ComplaintDraft.model_validate(parsed)
    except ValidationError as err:
        raise ModelMalformedOutputError(f"ComplaintDraft schema validation failed: {err}") from err

    return draft


def execute_with_retry(
    operation: Callable[[], Any],
    max_retries: int = 2,
    retryable_exceptions: Tuple[Type[Exception], ...] = (
        ModelTimeoutError,
        ModelConnectionError,
        ModelRateLimitError,
    ),
) -> Any:
    """
    Executes a model operation with transient error retry.

    Rules:
    - ONLY retries transient network errors (timeouts, connection drops, rate limits).
    - NEVER retries non-transient errors (missing credentials, malformed JSON, prompt injections).
    - Max retries default to 2 attempts.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            return operation()
        except retryable_exceptions as exc:
            last_exc = exc
            logger.warning(
                f"Transient model error on attempt {attempt + 1}/{max_retries + 1}: {exc}. "
                f"{'Retrying...' if attempt < max_retries else 'Max retries exhausted.'}"
            )
            if attempt == max_retries:
                raise
        except Exception:
            # Non-retryable error: fail immediately to allow clean fallback
            raise
    if last_exc:
        raise last_exc


# ---------------------------------------------------------------------------
# Drafting Provider Abstraction
# ---------------------------------------------------------------------------

@runtime_checkable
class DraftingProvider(Protocol):
    """
    Interface for complaint draft generators.
    Allows swappable implementations (deterministic template, mock LLM, production LLM).
    """

    def generate_draft(
        self,
        report: AIAnalysisRequest,
        category: CivicCategory,
        authority: Optional[AuthorityMatchResult],
        missing_info: Optional[MissingInfoResult],
    ) -> ComplaintDraft:
        """Generates a structured complaint draft from report and analysis data."""
        ...


# ---------------------------------------------------------------------------
# Deterministic Template Drafting Provider (Baseline / Fallback)
# ---------------------------------------------------------------------------

class DeterministicTemplateDraftingProvider:
    """
    Factual, deterministic complaint draft builder using strict Python templates.
    Operates 100% offline without external API keys or LLM dependencies.
    """

    def generate_draft(
        self,
        report: AIAnalysisRequest,
        category: CivicCategory,
        authority: Optional[AuthorityMatchResult],
        missing_info: Optional[MissingInfoResult],
    ) -> ComplaintDraft:
        sanitized_desc = sanitize_text(report.description)
        loc = report.location

        # 1. Format Location Summary
        loc_parts: List[str] = []
        if loc:
            if loc.raw_address:
                loc_parts.append(loc.raw_address)
            if loc.landmark:
                loc_parts.append(f"near {loc.landmark}")
            if loc.ward_or_zone:
                loc_parts.append(f"({loc.ward_or_zone})")
            if loc.city:
                loc_parts.append(loc.city)
            if loc.latitude is not None and loc.longitude is not None:
                loc_parts.append(f"[GPS: {loc.latitude:.4f}, {loc.longitude:.4f}]")

        location_summary = ", ".join(loc_parts) if loc_parts else "Location not specified by citizen"

        # 2. Format Addressee / Recipient Header
        missing_confirmations: List[str] = []
        if authority and authority.status == AuthorityMatchStatus.VERIFIED_MATCH:
            header = (
                f"To: {authority.department}, {authority.authority_name}\n"
                f"Jurisdiction: {authority.jurisdiction or 'Local Municipal Division'}"
            )
        elif authority and authority.status == AuthorityMatchStatus.AMBIGUOUS_MATCH:
            header = (
                "To: Concerned Municipal Authority\n"
                f"[NOTE: Responsibility is ambiguous between: {', '.join(authority.plausible_alternatives)}. "
                "Citizen or administrative routing confirmation required.]"
            )
            missing_confirmations.append("Confirm responsible authority department")
        else:
            header = (
                "To: Concerned Municipal Authority\n"
                "[NOTE: Responsible civic authority has NOT been verified. Manual assignment required.]"
            )
            missing_confirmations.append("Assign responsible civic authority")

        # 3. Format Evidence Summary (Non-Vision)
        if report.evidence_metadata and len(report.evidence_metadata) > 0:
            evidence_summary = (
                f"{len(report.evidence_metadata)} media attachment(s) submitted by citizen. "
                "(Note: File metadata attached; content is unverified by automated systems)."
            )
        else:
            evidence_summary = "None provided."

        # 4. Format Category Title
        category_title = category.value.replace("_", " ").title()
        if loc and (loc.raw_address or loc.landmark or loc.city):
            primary_loc = loc.landmark or loc.raw_address or loc.city
            title = f"Civic Grievance: {category_title} Reported at {primary_loc}"
        else:
            title = f"Civic Grievance: {category_title} (Location Clarification Required)"

        # Ensure title fits within length bounds
        if len(title) > 200:
            title = title[:197] + "..."

        # 5. Build Formal Body
        body_sections: List[str] = [
            header,
            "",
            "Subject: Formal Civic Issue Report",
            "",
            "1. REPORTED ISSUE DETAILS",
            f"Citizen Description: \"{sanitized_desc}\"",
            f"Categorized Issue: {category_title}",
            "",
            "2. LOCATION INFORMATION",
            f"Location: {location_summary}",
            "",
            "3. EVIDENCE ATTACHMENTS",
            f"Submitted Media: {evidence_summary}",
        ]

        # 6. Append Missing Information & Confirmations
        if missing_info and missing_info.has_missing_info:
            body_sections.extend([
                "",
                "4. PENDING CITIZEN CLARIFICATIONS",
                "The following information was not provided in the original report and should be confirmed before municipal submission:",
            ])
            for field in missing_info.missing_fields:
                clean_field = field.replace(".", " ").replace("_", " ").title()
                body_sections.append(f"- {clean_field}")
                missing_confirmations.append(f"Provide {clean_field}")

        body_sections.extend([
            "",
            "Request: Please inspect the reported site and initiate necessary civic maintenance or repair.",
            "",
            "[Draft prepared by CivicFix AI for citizen review. Explicit approval required before submission.]"
        ])

        formal_body = "\n".join(body_sections)

        # 7. Build Key Facts Summary
        key_facts: List[str] = [
            f"Issue Type: {category_title}",
            f"Citizen Statement: \"{sanitized_desc[:120]}{'...' if len(sanitized_desc) > 120 else ''}\"",
            f"Location: {location_summary}",
            f"Authority Status: {authority.status.value if authority else 'unverified'}",
            f"Evidence Count: {len(report.evidence_metadata or [])}",
        ]

        # 8. Suggested Tags
        tags: List[str] = [category.value, "civic-complaint"]
        if loc and loc.city:
            tags.append(loc.city.lower())
        if authority and authority.authority_id:
            tags.append(authority.authority_id.lower())

        return ComplaintDraft(
            title=title,
            formal_body=formal_body,
            key_facts=key_facts,
            suggested_tags=tags,
            generation_method="deterministic_template",
            disclaimer="AI-generated draft for citizen review. Review and edit before external submission.",
            missing_confirmations=missing_confirmations,
        )


# ---------------------------------------------------------------------------
# Mock LLM Provider (For Testing Model Integration, Fallback, & Errors)
# ---------------------------------------------------------------------------

class MockLLMDraftingProvider:
    """
    Mock LLM provider used to test model integration, schema validation,
    transient retry handling, and failure fallback without calling external network APIs.
    """

    def __init__(
        self,
        mock_response: Optional[Union[Dict[str, Any], str]] = None,
        should_fail: bool = False,
        error_message: str = "Simulated LLM provider timeout",
        failure_mode: Optional[str] = None,
        attempts_before_success: int = 0,
    ):
        self.mock_response = mock_response
        self.should_fail = should_fail
        self.error_message = error_message
        self.failure_mode = failure_mode
        self.attempts_before_success = attempts_before_success
        self.call_count: int = 0

    def generate_draft(
        self,
        report: AIAnalysisRequest,
        category: CivicCategory,
        authority: Optional[AuthorityMatchResult],
        missing_info: Optional[MissingInfoResult],
    ) -> ComplaintDraft:
        self.call_count += 1

        # Simulate transient failure retry if configured
        if self.attempts_before_success > 0 and self.call_count <= self.attempts_before_success:
            raise ModelTimeoutError(
                f"Simulated transient timeout on attempt {self.call_count}"
            )

        # Direct explicit failure flags
        if self.should_fail:
            raise RuntimeError(self.error_message)

        if self.failure_mode == "timeout":
            raise ModelTimeoutError(self.error_message)
        elif self.failure_mode == "connection_error":
            raise ModelConnectionError("Simulated network connection drop to LLM API")
        elif self.failure_mode == "rate_limit":
            raise ModelRateLimitError("Simulated LLM provider 429 Rate Limit Exceeded")
        elif self.failure_mode == "missing_credentials":
            raise MissingCredentialsError("Simulated missing API key: CIVICFIX_LLM_API_KEY is not set")
        elif self.failure_mode == "malformed_json":
            return validate_model_draft_output("{malformed json string: missing quotes")
        elif self.failure_mode == "missing_fields":
            return validate_model_draft_output({"title": "Incomplete draft missing formal_body"})
        elif self.failure_mode == "unexpected_type":
            return validate_model_draft_output({"title": 12345, "formal_body": "Body text with integer title"})

        if self.mock_response is not None:
            # Validates against ComplaintDraft schema with validate_model_draft_output
            return validate_model_draft_output(self.mock_response)

        # Default mock output
        return ComplaintDraft(
            title=f"Mock LLM: {category.value.title()} Complaint",
            formal_body=(
                f"Formal grievance generated by mock LLM provider regarding {category.value}.\n"
                f"Description: {report.description}\n"
                "Please take necessary corrective municipal action."
            ),
            key_facts=[f"Category: {category.value}", f"Report ID: {report.report_id or 'none'}"],
            suggested_tags=[category.value, "mock-llm"],
            generation_method="llm_provider",
            disclaimer="AI-generated draft for citizen review. Review and edit before external submission.",
            missing_confirmations=[],
        )


# ---------------------------------------------------------------------------
# Main Public Drafting Function
# ---------------------------------------------------------------------------

def build_complaint(
    report: Union[AIAnalysisRequest, Dict[str, Any]],
    analysis: Optional[Union[CategorySuggestionResult, CivicCategory, Dict[str, Any]]] = None,
    authority_match: Optional[Union[AuthorityMatchResult, Dict[str, Any]]] = None,
    provider: Optional[DraftingProvider] = None,
) -> ComplaintDraft:
    """
    Assembles a factual, structured complaint draft from available report data.

    Safety & Reliability Rules:
    - Never invent missing facts (dates, road names, injury claims, severity).
    - If provider is an LLM and fails or outputs invalid data, safely falls back
      to DeterministicTemplateDraftingProvider without corrupting the workflow.
    - Missing location or authority details remain explicitly identified.
    - Requires human review before any downstream submission.

    Args:
        report: AIAnalysisRequest or dictionary containing citizen report.
        analysis: CategorySuggestionResult, CivicCategory, or analysis dictionary.
        authority_match: AuthorityMatchResult or authority dictionary.
        provider: Swappable DraftingProvider (defaults to DeterministicTemplateDraftingProvider).

    Returns:
        Validated ComplaintDraft instance.
    """
    # 1. Normalize Report
    if isinstance(report, AIAnalysisRequest):
        req = report
    elif isinstance(report, dict):
        req = AIAnalysisRequest.model_validate(report)
    else:
        raise TypeError(f"Expected AIAnalysisRequest or dict, received {type(report).__name__}")

    # 2. Normalize Category
    resolved_category: CivicCategory = CivicCategory.OTHER_CIVIC
    if isinstance(analysis, CategorySuggestionResult):
        resolved_category = analysis.suggested_category
    elif isinstance(analysis, CivicCategory):
        resolved_category = analysis
    elif isinstance(analysis, dict) and "suggested_category" in analysis:
        cat_val = analysis["suggested_category"]
        resolved_category = cat_val if isinstance(cat_val, CivicCategory) else CivicCategory(cat_val)
    else:
        # Infer deterministically if not supplied
        cat_result = suggest_category(req)
        resolved_category = cat_result.suggested_category

    # 3. Normalize Authority Match
    resolved_authority: Optional[AuthorityMatchResult] = None
    if isinstance(authority_match, AuthorityMatchResult):
        resolved_authority = authority_match
    elif isinstance(authority_match, dict):
        resolved_authority = AuthorityMatchResult.model_validate(authority_match)

    # 4. Detect Missing Information
    missing_info = detect_missing_information(req)

    # 5. Select Provider and Generate Draft
    active_provider = provider if provider is not None else DeterministicTemplateDraftingProvider()

    try:
        draft = execute_with_retry(
            lambda: active_provider.generate_draft(
                report=req,
                category=resolved_category,
                authority=resolved_authority,
                missing_info=missing_info,
            ),
            max_retries=2,
        )
        return draft
    except Exception as exc:
        err_code = getattr(exc, "error_code", "DRAFTING_PROVIDER_FAILURE")
        logger.warning(
            f"Complaint drafting provider {type(active_provider).__name__} failed "
            f"[{err_code}]: {exc}. Falling back to DeterministicTemplateDraftingProvider."
        )
        # Fallback to deterministic template
        fallback_provider = DeterministicTemplateDraftingProvider()
        fallback_draft = fallback_provider.generate_draft(
            report=req,
            category=resolved_category,
            authority=resolved_authority,
            missing_info=missing_info,
        )
        # Record that fallback occurred
        fallback_draft.generation_method = "deterministic_template_fallback"
        fallback_draft.missing_confirmations.append(
            f"Review AI draft (generated via fallback due to {err_code})"
        )
        return fallback_draft
