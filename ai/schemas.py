"""
ai/schemas.py

Pydantic models and data contracts for the CivicFix AI analysis workflow.

Design Principles:
1. Strict Separation: Preserves the citizen's original input category distinct from
   the AI's suggested classification.
2. Verified Authorities Only: Differentiates verified directory matches from ambiguous,
   unverified, or error states. Never invents metadata or verification dates.
3. Untrusted Metadata: Distinguishes evidence attachment metadata from actual computer vision
   analysis. A file attachment does not imply automated visual verification.
4. Human Approval Invariant: Every complaint draft defaults to requiring citizen review
   and explicit approval before any external routing.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CivicCategory(str, Enum):
    """
    Standard civic categories recognized by the CivicFix AI system.
    """
    POTHOLE = "pothole"
    GARBAGE = "garbage"
    STREET_LIGHTING = "street_lighting"
    WATER_LEAKAGE = "water_leakage"
    DRAINAGE_SEWAGE = "drainage_sewage"
    ROAD_HAZARD = "road_hazard"
    OTHER_CIVIC = "other_civic"
    UNKNOWN = "unknown"


class AuthorityMatchStatus(str, Enum):
    """
    Categorical outcome of looking up a responsible civic authority.

    - VERIFIED_MATCH: Authority record was matched against a verified local directory.
    - AMBIGUOUS_MATCH: Multiple potential authorities match; needs manual routing or clarification.
    - NO_VERIFIED_MATCH: No authoritative record exists in the directory for this category/area.
    - LOOKUP_ERROR: An internal or directory query failure occurred during lookup.
    """
    VERIFIED_MATCH = "verified_match"
    AMBIGUOUS_MATCH = "ambiguous_match"
    NO_VERIFIED_MATCH = "no_verified_match"
    LOOKUP_ERROR = "lookup_error"


class UrgencyLevel(str, Enum):
    """
    Assessed real-world urgency of the reported civic issue.
    """
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ValidationStatus(str, Enum):
    """
    Validation status of an incoming report.

    - VALID: Input is structurally sound, safe, and contains sufficient detail for complete processing.
    - PARTIALLY_VALID: Input is structurally sound and analyzable, but lacks critical information (e.g. location) for authority matching.
    - INVALID: Input violates structural constraints, is empty, malformed, or exceeds safety bounds and cannot be processed.
    """
    VALID = "valid"
    PARTIALLY_VALID = "partially_valid"
    INVALID = "invalid"


class CategoryMatchStrength(str, Enum):
    """
    Heuristic indicator of how strongly the report description matches a category.

    - STRONG_MATCH: Highly specific, unequivocal civic keywords detected.
    - WEAK_MATCH: Generic or solitary keyword match with modest specificity.
    - AMBIGUOUS: Competing keyword signals across multiple categories or vague wording.
    - NO_MATCH: No recognized civic category keywords found in description.
    """
    STRONG_MATCH = "strong_match"
    WEAK_MATCH = "weak_match"
    AMBIGUOUS = "ambiguous"
    NO_MATCH = "no_match"


class WorkflowState(str, Enum):
    """
    Execution state of the end-to-end AI analysis workflow.

    - INVALID_INPUT: Input failed structural validation; processing stopped safely.
    - NEEDS_MORE_INFO: Report is analyzable, but critical location or description details are missing.
    - NEEDS_AUTHORITY_REVIEW: Analysis complete and draft ready, but authority assignment is unverified or ambiguous.
    - DRAFT_READY: Complete analysis with verified authority and complaint draft prepared for citizen review.
    - ANALYSIS_FAILED: An internal or unrecoverable error occurred during execution.
    """
    INVALID_INPUT = "invalid_input"
    NEEDS_MORE_INFO = "needs_more_info"
    NEEDS_AUTHORITY_REVIEW = "needs_authority_review"
    DRAFT_READY = "draft_ready"
    ANALYSIS_FAILED = "analysis_failed"


# ---------------------------------------------------------------------------
# Request Models (Input Contract)
# ---------------------------------------------------------------------------

class LocationInput(BaseModel):
    """
    Structured geographic information provided by the citizen or GPS sensor.
    All fields are optional because citizens often report issues without exact coordinates.
    """
    model_config = ConfigDict(extra="forbid")

    raw_address: Optional[str] = Field(
        default=None,
        max_length=500,
        description="User-entered street address or textual location description."
    )
    landmark: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Prominent nearby landmark (e.g., 'Opposite Metro Pillar 142')."
    )
    latitude: Optional[float] = Field(
        default=None,
        ge=-90.0,
        le=90.0,
        description="WGS84 latitude coordinate in decimal degrees [-90.0, 90.0]."
    )
    longitude: Optional[float] = Field(
        default=None,
        ge=-180.0,
        le=180.0,
        description="WGS84 longitude coordinate in decimal degrees [-180.0, 180.0]."
    )
    city: Optional[str] = Field(
        default=None,
        max_length=100,
        description="City or municipality name (e.g., 'Bengaluru', 'Pune')."
    )
    ward_or_zone: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Administrative ward number, zone name, or municipal subdivision."
    )


class EvidenceMetadata(BaseModel):
    """
    Metadata describing an uploaded evidence attachment (e.g. photo of pothole).

    CRITICAL SAFETY NOTE:
    Presence of metadata (filename, URL, mime-type) does NOT imply that the AI has
    inspected, verified, or understood the image content. Filenames or URLs must never
    be treated as proof of the reported civic issue.
    """
    model_config = ConfigDict(extra="forbid")

    attachment_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique identifier for the uploaded attachment."
    )
    file_type: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="MIME type of the attachment (e.g., 'image/jpeg', 'image/png')."
    )
    filename: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Original upload filename as submitted by the client."
    )
    url: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Storage URL or relative path to the stored media asset."
    )
    file_size_bytes: Optional[int] = Field(
        default=None,
        ge=0,
        description="Size of the file in bytes if known."
    )
    user_caption: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Optional caption or remark supplied by the citizen for this attachment."
    )


class AIAnalysisRequest(BaseModel):
    """
    Input payload received by the AI module from the FastAPI backend.
    Represents an untrusted citizen report pending analysis.
    """
    model_config = ConfigDict(extra="forbid")

    report_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Unique report identifier assigned by backend (e.g., UUID)."
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Raw free-text description provided by the citizen. Mandatory."
    )
    category: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Optional category pre-selected or hinted by citizen in frontend form."
    )
    location: Optional[LocationInput] = Field(
        default=None,
        description="Optional structured location details."
    )
    evidence_metadata: Optional[List[EvidenceMetadata]] = Field(
        default=None,
        description="Optional list of attachment metadata records. Does not imply visual verification."
    )

    @field_validator("description")
    @classmethod
    def check_non_empty_after_strip(cls, value: str) -> str:
        """Ensure the description does not consist solely of whitespace."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Description must contain non-whitespace characters.")
        return stripped


# ---------------------------------------------------------------------------
# Validation & Missing Information Models
# ---------------------------------------------------------------------------

class ValidationIssue(BaseModel):
    """
    Represents an individual structural error, constraint violation, or warning.
    """
    model_config = ConfigDict(extra="forbid")

    field: str = Field(
        ...,
        description="Path or name of the field causing the issue (e.g., 'description', 'location.city')."
    )
    code: str = Field(
        ...,
        description="Machine-readable code identifying the issue type (e.g., 'MISSING_FIELD', 'TOO_SHORT')."
    )
    message: str = Field(
        ...,
        description="Human-readable description explaining the issue and expected format."
    )


class MissingInfoResult(BaseModel):
    """
    Diagnostic assessment of what useful information is absent from an analyzable report.

    Distinguishes input validation (is the input parseable and safe?) from
    missing-information detection (what facts are needed to complete the complaint?).
    """
    model_config = ConfigDict(extra="forbid")

    has_missing_info: bool = Field(
        ...,
        description="True if critical information needed for authority routing or drafting is missing."
    )
    missing_fields: List[str] = Field(
        default_factory=list,
        description="List of specific fields that are missing or incomplete."
    )
    clarification_questions: List[str] = Field(
        default_factory=list,
        description="Targeted questions the citizen can answer to fill in missing details."
    )
    is_location_complete: bool = Field(
        ...,
        description="True if the report provides enough geographic detail for authority directory lookup."
    )
    is_description_actionable: bool = Field(
        ...,
        description="True if the description provides sufficient actionable detail about the problem."
    )


class ReportValidationResult(BaseModel):
    """
    Overall structured outcome of deterministic report validation.
    """
    model_config = ConfigDict(extra="forbid")

    status: ValidationStatus = Field(
        ...,
        description="Overall validation status: valid, partially_valid, or invalid."
    )
    is_valid: bool = Field(
        ...,
        description="True if the report is structurally valid and can proceed to analysis (valid or partially_valid)."
    )
    sanitized_report: Optional[AIAnalysisRequest] = Field(
        default=None,
        description="Cleaned and validated AIAnalysisRequest instance if is_valid is True."
    )
    errors: List[ValidationIssue] = Field(
        default_factory=list,
        description="Fatal structural errors that render the input INVALID."
    )
    warnings: List[ValidationIssue] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g. unrecognized category fallback) that do not block processing."
    )
    missing_info: Optional[MissingInfoResult] = Field(
        default=None,
        description="Information gaps analysis populated when is_valid is True."
    )


class CategorySuggestionResult(BaseModel):
    """
    Deterministic result of civic category suggestion.

    Strict Reliability Rules:
    - confidence is strictly None unless a calibrated probability model is integrated.
    - match_strength explicitly reflects heuristic keyword quality.
    - has_category_conflict exposes any discrepancy with citizen's self-selected category.
    """
    model_config = ConfigDict(extra="forbid")

    suggested_category: CivicCategory = Field(
        ...,
        description="Deterministic suggested category inferred from description."
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Calibrated probability score. Strictly None for rule-based heuristics."
    )
    match_strength: CategoryMatchStrength = Field(
        ...,
        description="Heuristic match quality: strong_match, weak_match, ambiguous, or no_match."
    )
    matched_keywords: List[str] = Field(
        default_factory=list,
        description="Specific keywords from citizen text that triggered category matching."
    )
    secondary_candidates: List[CivicCategory] = Field(
        default_factory=list,
        description="Alternative candidate categories when multiple categories match."
    )
    original_category: Optional[str] = Field(
        default=None,
        description="Citizen's raw input category if provided."
    )
    has_category_conflict: bool = Field(
        default=False,
        description="True if citizen's self-selected category differs from the suggested category."
    )
    conflict_rationale: Optional[str] = Field(
        default=None,
        description="Explanation when citizen category conflicts with AI suggestion."
    )


# ---------------------------------------------------------------------------
# Authority Directory & Matching Models
# ---------------------------------------------------------------------------

class AuthorityDirectoryRecord(BaseModel):
    """
    Schema for a verified civic authority entry in the official directory.

    Strict Reliability Rules:
    - Never invent contact info or URLs.
    - If verification_date is unavailable, it must be None.
    - is_demo_fixture must be True for demonstration records.
    """
    model_config = ConfigDict(extra="forbid")

    authority_id: str = Field(
        ...,
        max_length=100,
        description="Stable unique identifier for the authority."
    )
    authority_name: str = Field(
        ...,
        max_length=200,
        description="Official civic body name."
    )
    department: str = Field(
        ...,
        max_length=150,
        description="Responsible department or division."
    )
    city: str = Field(
        ...,
        max_length=100,
        description="Municipality or metropolitan area."
    )
    jurisdiction_zone: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Specific administrative zone or ward ('All Zones' if city-wide)."
    )
    supported_categories: List[CivicCategory] = Field(
        ...,
        description="Civic complaint categories serviced by this division."
    )
    official_portal_url: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Official government portal URL when documented."
    )
    official_reporting_url: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Public grievance submission portal URL when documented."
    )
    contact_email: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Official department grievance email when documented."
    )
    contact_phone: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Official helpline phone number when documented."
    )
    source_reference: str = Field(
        ...,
        max_length=255,
        description="Documentary source verifying this authority's jurisdiction."
    )
    is_verified: bool = Field(
        default=True,
        description="Verification status."
    )
    verification_date: Optional[str] = Field(
        default=None,
        max_length=50,
        description="ISO date when this record was officially verified. None if unrecorded."
    )
    is_demo_fixture: bool = Field(
        default=False,
        description="True if this is a demonstration/mock test record."
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Administrative or routing notes."
    )


class AuthorityMatchResult(BaseModel):
    """
    Result of looking up the responsible civic authority in a verified directory.

    Strict Reliability Rules:
    - If status != VERIFIED_MATCH, authority_id, department, and jurisdiction may be None.
    - verification_date is populated ONLY when the directory entry includes an actual
      recorded verification date. NEVER invent or hallucinate this date.
    - source_reference explicitly records the origin of the verified contact/routing info.
    - If multiple departments match, status is AMBIGUOUS_MATCH and plausible_alternatives lists them.
    """
    model_config = ConfigDict(extra="forbid")

    status: AuthorityMatchStatus = Field(
        ...,
        description="Match outcome: verified_match, ambiguous_match, no_verified_match, or lookup_error."
    )
    authority_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Identifier of authority in verified registry (e.g., 'BBMP_ROAD_01')."
    )
    authority_name: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Official name of the civic body (e.g., 'Bruhat Bengaluru Mahanagara Palike')."
    )
    department: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Specific department responsible (e.g., 'Road Infrastructure Department')."
    )
    jurisdiction: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Geographic jurisdiction or administrative zone."
    )
    matched_category_or_area: Optional[str] = Field(
        default=None,
        max_length=100,
        description="The category or geographic query key that led to this directory match."
    )
    source_reference: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Reference documenting the directory's official verification source."
    )
    verification_date: Optional[str] = Field(
        default=None,
        max_length=50,
        description="ISO date string when the directory record was verified. None if unrecorded."
    )
    official_portal_url: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Official government portal URL when present in directory record."
    )
    official_reporting_url: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Official online grievance submission portal URL when present."
    )
    plausible_alternatives: List[str] = Field(
        default_factory=list,
        description="List of alternative authority/department names when matching is ambiguous."
    )
    is_demo_fixture: bool = Field(
        default=False,
        description="True if the match originates from a demonstration/testing fixture."
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Explanatory notes regarding match quality, routing instructions, or lookup failure."
    )


class ComplaintDraft(BaseModel):
    """
    AI-generated structured complaint draft ready for citizen review and confirmation.
    """
    model_config = ConfigDict(extra="forbid")

    title: str = Field(
        ...,
        min_length=5,
        max_length=200,
        description="Concise, formal subject line for the civic complaint."
    )
    formal_body: str = Field(
        ...,
        min_length=20,
        max_length=5000,
        description="Structured, polite, factual description suitable for municipal submission."
    )
    key_facts: List[str] = Field(
        default_factory=list,
        description="Bullet-point summary of factual claims extracted from citizen report."
    )
    suggested_tags: List[str] = Field(
        default_factory=list,
        description="Categorical tags for filtering and indexing (e.g., ['pothole', 'traffic-hazard'])."
    )
    generation_method: str = Field(
        default="deterministic_template",
        description="Method used to produce draft: 'deterministic_template' or 'llm_provider'."
    )
    disclaimer: str = Field(
        default="AI-generated draft for citizen review. Review and edit before external submission.",
        description="Notice indicating that the draft has not been submitted and requires human approval."
    )
    missing_confirmations: List[str] = Field(
        default_factory=list,
        description="Items requiring explicit citizen confirmation or manual resolution."
    )


class VisionAnalysisResult(BaseModel):
    """
    Structured outcome of computer vision analysis on an uploaded civic image attachment.

    Safety Principles:
    - Zero Hallucination: Never claims structural depth or hazard measurements not substantiated by sensors.
    - Honest Simulation: If generated by a mock or simulation adapter, `is_simulated` is strictly True.
    - Separation of Claims: Visual observations are recorded separately from citizen statements.
    """
    model_config = ConfigDict(extra="forbid")

    attachment_id: str = Field(..., description="ID of the analyzed evidence attachment.")
    detected_category: CivicCategory = Field(..., description="Category inferred from visual features.")
    visual_observations: List[str] = Field(default_factory=list, description="Factual descriptive visual features.")
    is_clear: bool = Field(default=True, description="False if image is blurry, dark, occluded, or unidentifiable.")
    uncertainty_rationale: Optional[str] = Field(default=None, description="Explanation when image is ambiguous or low quality.")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Calibrated confidence if supported, else None.")
    model_provider: str = Field(default="mock_vision_adapter", description="Identifier of vision model or provider.")
    is_simulated: bool = Field(default=True, description="Explicit indicator that this analysis was produced by a test/mock adapter.")
    notes: Optional[str] = Field(default=None, description="Additional technical or routing context.")


class AIAnalysisResponse(BaseModel):
    """
    Standard output payload returned by the AI module to the FastAPI backend.
    """
    model_config = ConfigDict(extra="forbid")

    report_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Echoes the report_id from request for traceability."
    )
    original_category: Optional[str] = Field(
        default=None,
        description="Citizen's raw category input, preserved verbatim for auditing and comparison."
    )
    suggested_category: CivicCategory = Field(
        ...,
        description="AI-classified civic category based on textual analysis."
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional model confidence score [0.0, 1.0]. None if heuristic or uncalibrated."
    )
    urgency: UrgencyLevel = Field(
        default=UrgencyLevel.MEDIUM,
        description="Assessed public hazard or severity level."
    )
    is_hazard: bool = Field(
        default=False,
        description="True if the issue presents immediate bodily injury or acute safety risk."
    )
    missing_fields: List[str] = Field(
        default_factory=list,
        description="List of critical fields missing from citizen report (e.g., ['location.landmark'])."
    )
    clarification_questions: List[str] = Field(
        default_factory=list,
        description="Targeted follow-up questions to help the citizen clarify missing information."
    )
    authority_match: AuthorityMatchResult = Field(
        ...,
        description="Civic authority matched from verified directory, or explicit unverified indicator."
    )
    complaint_draft: ComplaintDraft = Field(
        ...,
        description="Structured formal complaint draft prepared for citizen review."
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Advisory warnings (e.g., unverified authority, missing landmark, acute danger)."
    )
    requires_human_approval: bool = Field(
        default=True,
        description="Safety invariant: must always be True. Requires explicit citizen approval before submission."
    )
    visual_analysis: Optional[List[VisionAnalysisResult]] = Field(
        default=None,
        description="Optional visual defect inspection results if evidence attachments were analyzed by a vision model.",
    )
    workflow_state: Optional[WorkflowState] = Field(
        default=None,
        description="Final execution state of the workflow for this report."
    )
    execution_trace: List[str] = Field(
        default_factory=list,
        description="Audit trace of individual workflow stage outcomes."
    )

    @field_validator("requires_human_approval")
    @classmethod
    def enforce_human_approval_invariant(cls, value: bool) -> bool:
        """
        Enforces the mandatory human approval safety invariant.
        The AI analysis workflow must NEVER authorize external submission or bypass citizen review.
        """
        if value is not True:
            raise ValueError(
                "requires_human_approval must strictly be True. The AI module is not authorized to bypass human review."
            )
        return True


class WorkflowStep(str, Enum):
    """
    Individual steps executed in the analysis workflow.
    """
    VALIDATION = "validation"
    CLASSIFICATION = "classification"
    MISSING_INFO_DETECTION = "missing_info_detection"
    AUTHORITY_LOOKUP = "authority_lookup"
    COMPLAINT_DRAFTING = "complaint_drafting"
    VISION_ANALYSIS = "vision_analysis"


class WorkflowStepTrace(BaseModel):
    """
    Audit log entry for an individual workflow step.
    Does not log sensitive citizen personal data.
    """
    model_config = ConfigDict(extra="forbid")

    step: WorkflowStep = Field(..., description="Stage name.")
    success: bool = Field(..., description="True if step succeeded.")
    details: str = Field(..., description="Factual summary of step execution or decision.")


class WorkflowEventName(str, Enum):
    """
    Standard observable workflow event names.
    """
    WORKFLOW_STARTED = "workflow_started"
    VALIDATION_COMPLETED = "validation_completed"
    MISSING_INFO_IDENTIFIED = "missing_info_identified"
    CATEGORY_SUGGESTION_COMPLETED = "category_suggestion_completed"
    AUTHORITY_LOOKUP_COMPLETED = "authority_lookup_completed"
    DRAFT_GENERATION_COMPLETED = "draft_generation_completed"
    VISION_ANALYSIS_COMPLETED = "vision_analysis_completed"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"


class WorkflowEvent(BaseModel):
    """
    Observable event recorded during workflow execution.
    Contains metadata only; strictly avoids logging personal information (PII) or full descriptions.
    """
    model_config = ConfigDict(extra="forbid")

    event_name: WorkflowEventName = Field(..., description="Name of the recorded workflow event.")
    report_id: Optional[str] = Field(default=None, description="Report identifier if available.")
    timestamp: str = Field(..., description="ISO 8601 timestamp string when the event occurred.")
    step: Optional[WorkflowStep] = Field(default=None, description="Associated workflow step.")
    status: str = Field(..., description="'success', 'warning', or 'failed'.")
    error_code: Optional[str] = Field(default=None, description="Standardized error code if failed.")
    metadata: dict = Field(default_factory=dict, description="Redacted, non-PII diagnostic metadata.")


class WorkflowResult(BaseModel):
    """
    Stateful execution outcome returned by the workflow orchestrator.
    """
    model_config = ConfigDict(extra="forbid")

    workflow_state: WorkflowState = Field(
        ...,
        description="High-level workflow state: invalid_input, needs_more_info, needs_authority_review, draft_ready, or analysis_failed."
    )
    response: Optional[AIAnalysisResponse] = Field(
        default=None,
        description="Standard AIAnalysisResponse if report was analyzable, None if invalid or failed."
    )
    step_traces: List[WorkflowStepTrace] = Field(
        default_factory=list,
        description="Auditable trace of steps executed."
    )
    errors: List[ValidationIssue] = Field(
        default_factory=list,
        description="Structural or fatal errors if processing stopped."
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Advisory warnings collected across workflow stages."
    )


# ---------------------------------------------------------------------------
# Realistic Example Payloads
# ---------------------------------------------------------------------------

EXAMPLE_VALID_REQUEST = {
    "report_id": "rep-98a7c2-2026",
    "description": "Deep pothole right after the 14th Cross junction on 80 Feet Road. Two scooters slipped here this morning during rain.",
    "category": "roads",
    "location": {
        "raw_address": "80 Feet Road, 14th Cross, Koramangala 4th Block",
        "landmark": "Near Sony World Signal, opposite Cafe Coffee Day",
        "latitude": 12.9344,
        "longitude": 77.6288,
        "city": "Bengaluru",
        "ward_or_zone": "South Zone, Ward 151"
    },
    "evidence_metadata": [
        {
            "attachment_id": "att-001",
            "file_type": "image/jpeg",
            "filename": "pothole_waterlogged.jpg",
            "url": "https://storage.civicfix.local/uploads/att-001.jpg",
            "file_size_bytes": 1420500,
            "user_caption": "Photo of the crater filled with water"
        }
    ]
}

EXAMPLE_VALID_RESPONSE = {
    "report_id": "rep-98a7c2-2026",
    "original_category": "roads",
    "suggested_category": "pothole",
    "confidence": None,
    "urgency": "high",
    "is_hazard": True,
    "missing_fields": [],
    "clarification_questions": [],
    "authority_match": {
        "status": "verified_match",
        "authority_id": "BBMP_ROAD_INFRA_SOUTH",
        "authority_name": "Bruhat Bengaluru Mahanagara Palike",
        "department": "Road Infrastructure Division (South Zone)",
        "jurisdiction": "Ward 151 (Koramangala), Bengaluru",
        "matched_category_or_area": "pothole / South Zone",
        "source_reference": "BBMP Official Ward Jurisdictions Directory 2026-Q1",
        "verification_date": "2026-01-15",
        "notes": "Verified municipal road department responsible for arterial and sub-arterial ward roads."
    },
    "complaint_draft": {
        "title": "Urgent: Dangerous Road Crater / Pothole on 80 Feet Road, Koramangala",
        "formal_body": "To the Executive Engineer, Road Infrastructure Division, BBMP:\n\nThis is a formal report regarding a severe pothole located on 80 Feet Road, 14th Cross, Koramangala 4th Block, opposite Cafe Coffee Day. The depression has caused multiple two-wheeler accidents and presents an ongoing hazard to commuters, particularly during wet weather. Immediate road patching and safety cordoning are requested.",
        "key_facts": [
            "Location: 80 Feet Road, 14th Cross, Koramangala 4th Block (opposite Cafe Coffee Day)",
            "Coordinates: 12.9344, 77.6288 (Ward 151)",
            "Hazard: Deep pothole causing vehicular skidding / two-wheeler accidents",
            "Evidence: 1 citizen photograph attached"
        ],
        "suggested_tags": [
            "pothole",
            "road-safety",
            "koramangala",
            "bbmp",
            "traffic-hazard"
        ]
    },
    "warnings": [
        "High urgency: Report notes two accidents already occurred. Escalation recommended."
    ],
    "requires_human_approval": True
}

EXAMPLE_UNVERIFIED_REQUEST = {
    "description": "Garbage has not been collected for a week near the corner store.",
    "category": None,
    "location": None,
    "evidence_metadata": None
}

EXAMPLE_UNVERIFIED_RESPONSE = {
    "report_id": None,
    "original_category": None,
    "suggested_category": "garbage",
    "confidence": None,
    "urgency": "medium",
    "is_hazard": False,
    "missing_fields": [
        "location.raw_address",
        "location.city",
        "location.landmark"
    ],
    "clarification_questions": [
        "Could you specify the street address, city, or nearby landmark where the garbage is piling up?",
        "Is the garbage blocking pedestrian movement or public roads?"
    ],
    "authority_match": {
        "status": "no_verified_match",
        "authority_id": None,
        "authority_name": None,
        "department": None,
        "jurisdiction": None,
        "matched_category_or_area": None,
        "source_reference": None,
        "verification_date": None,
        "notes": "No verified authority can be established because geographic location details were omitted."
    },
    "complaint_draft": {
        "title": "Grievance: Uncollected Municipal Waste Accumulation",
        "formal_body": "To the Concerned Municipal Authority:\n\nThis complaint concerns continuous accumulation of uncollected municipal garbage over a one-week period. Prompt clearance and sanitation servicing are urgently requested once location details are confirmed.",
        "key_facts": [
            "Issue: Uncollected waste over a seven-day period",
            "Location: Vague / pending citizen clarification"
        ],
        "suggested_tags": [
            "garbage",
            "sanitation",
            "waste-collection"
        ]
    },
    "warnings": [
        "Location information is missing; report cannot be routed to a specific civic authority until clarified."
    ],
    "requires_human_approval": True
}
