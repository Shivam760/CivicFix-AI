"""
ai/validation.py

Deterministic report validation and missing-information detection for CivicFix AI.

Conceptual Difference: Input Validation vs. Missing-Information Detection:
--------------------------------------------------------------------------
1. Input Validation (Structural & Safety Gate):
   - Scope: Evaluates whether the incoming payload is well-formed, safe, within
     permitted character bounds, and conforms to expected data types.
   - Purpose: Protects downstream components from malformed JSON, empty submissions,
     abusive strings, or unexpected field injections.
   - Outcome: If validation fails, the report is classified as INVALID (is_valid=False)
     and CANNOT be analyzed further.

2. Missing-Information Detection (Semantic Completeness Gate):
   - Scope: Evaluates whether a structurally valid report contains sufficient factual
     information (e.g. location, landmark, city, actionable severity) required for
     authority lookup and complaint drafting.
   - Purpose: Identifies information gaps so the application can guide the citizen with
     targeted clarification questions without rejecting their report.
   - Outcome: If information is missing, the report is classified as PARTIALLY_VALID
     (is_valid=True). Downstream analysis proceeds, but missing fields are flagged and
     clarification prompts are generated. No information is silently invented.
"""

from typing import Any, Dict, List, Optional, Set, Tuple, Union
from pydantic import ValidationError

from ai.schemas import (
    AIAnalysisRequest,
    CivicCategory,
    EvidenceMetadata,
    LocationInput,
    MissingInfoResult,
    ReportValidationResult,
    ValidationIssue,
    ValidationStatus,
)
from ai.security import detect_prompt_injection

# ---------------------------------------------------------------------------
# Validation Constraints & Mappings
# ---------------------------------------------------------------------------

MIN_DESCRIPTION_LENGTH: int = 10
MAX_DESCRIPTION_LENGTH: int = 5000
MIN_ACTIONABLE_DESCRIPTION_LENGTH: int = 25

SUPPORTED_REQUEST_FIELDS: Set[str] = {
    "report_id",
    "description",
    "category",
    "location",
    "evidence_metadata",
}

SUPPORTED_LOCATION_FIELDS: Set[str] = {
    "raw_address",
    "landmark",
    "latitude",
    "longitude",
    "city",
    "ward_or_zone",
}

SUPPORTED_EVIDENCE_FIELDS: Set[str] = {
    "attachment_id",
    "file_type",
    "filename",
    "url",
    "file_size_bytes",
    "user_caption",
}

# Mapping common citizen category hints to standard CivicCategory enums
CATEGORY_SYNONYMS: Dict[str, CivicCategory] = {
    "pothole": CivicCategory.POTHOLE,
    "potholes": CivicCategory.POTHOLE,
    "road": CivicCategory.POTHOLE,
    "roads": CivicCategory.POTHOLE,
    "crater": CivicCategory.POTHOLE,
    "asphalt": CivicCategory.POTHOLE,
    "garbage": CivicCategory.GARBAGE,
    "trash": CivicCategory.GARBAGE,
    "waste": CivicCategory.GARBAGE,
    "rubbish": CivicCategory.GARBAGE,
    "dump": CivicCategory.GARBAGE,
    "sanitation": CivicCategory.GARBAGE,
    "street_lighting": CivicCategory.STREET_LIGHTING,
    "streetlight": CivicCategory.STREET_LIGHTING,
    "streetlights": CivicCategory.STREET_LIGHTING,
    "street light": CivicCategory.STREET_LIGHTING,
    "dark street": CivicCategory.STREET_LIGHTING,
    "light": CivicCategory.STREET_LIGHTING,
    "lamp": CivicCategory.STREET_LIGHTING,
    "water_leakage": CivicCategory.WATER_LEAKAGE,
    "water leakage": CivicCategory.WATER_LEAKAGE,
    "water leak": CivicCategory.WATER_LEAKAGE,
    "water": CivicCategory.WATER_LEAKAGE,
    "pipe": CivicCategory.WATER_LEAKAGE,
    "burst pipe": CivicCategory.WATER_LEAKAGE,
    "broken pipe": CivicCategory.WATER_LEAKAGE,
    "drainage_sewage": CivicCategory.DRAINAGE_SEWAGE,
    "drainage": CivicCategory.DRAINAGE_SEWAGE,
    "sewage": CivicCategory.DRAINAGE_SEWAGE,
    "sewer": CivicCategory.DRAINAGE_SEWAGE,
    "drain": CivicCategory.DRAINAGE_SEWAGE,
    "road_hazard": CivicCategory.ROAD_HAZARD,
    "hazard": CivicCategory.ROAD_HAZARD,
    "wire": CivicCategory.ROAD_HAZARD,
    "electric wire": CivicCategory.ROAD_HAZARD,
    "fallen tree": CivicCategory.ROAD_HAZARD,
    "other": CivicCategory.OTHER_CIVIC,
    "other_civic": CivicCategory.OTHER_CIVIC,
}


# ---------------------------------------------------------------------------
# Text & Category Normalization Helpers
# ---------------------------------------------------------------------------

def sanitize_text(text: str) -> str:
    """
    Sanitizes raw user text by removing null bytes, non-printable control
    characters (preserving standard newlines/tabs), and normalizing whitespace.

    Args:
        text: Raw user-provided string.

    Returns:
        Sanitized string stripped of dangerous control characters.
    """
    if not isinstance(text, str):
        return ""
    # Strip null bytes and non-printable characters below ASCII 32 except \n, \r, \t
    cleaned_chars = [
        ch for ch in text
        if ch in ("\n", "\r", "\t") or ord(ch) >= 32
    ]
    return "".join(cleaned_chars).strip()


def normalize_category(category_input: Optional[str]) -> Tuple[Optional[CivicCategory], bool]:
    """
    Attempts to map a user-supplied category string to a recognized CivicCategory.

    Args:
        category_input: The raw category string provided by user.

    Returns:
        A tuple of (normalized_category, is_recognized):
        - If category_input is None or empty: (None, True) - absence is valid.
        - If category matches a known category: (CivicCategory, True).
        - If category is unrecognized: (None, False).
    """
    if category_input is None:
        return None, True

    cleaned = category_input.strip().lower()
    if not cleaned:
        return None, True

    if cleaned in CATEGORY_SYNONYMS:
        return CATEGORY_SYNONYMS[cleaned], True

    # Check direct match with CivicCategory values
    for member in CivicCategory:
        if member.value == cleaned:
            return member, True

    return None, False


# ---------------------------------------------------------------------------
# Missing-Information Detection
# ---------------------------------------------------------------------------

def detect_missing_information(report: AIAnalysisRequest) -> MissingInfoResult:
    """
    Analyzes a structurally valid report to identify factual gaps needed for
    authority lookup and formal complaint drafting.

    This function never rejects the report. Instead, it inspects:
    1. Location Completeness: Does the report provide geographic specificity
       (coordinates, or street address/landmark combined with city)?
    2. Description Actionability: Does the text provide enough detail for a
       civic engineer or authority to locate and understand the problem?

    Args:
        report: A validated AIAnalysisRequest instance.

    Returns:
        MissingInfoResult containing missing field names, boolean completeness
        indicators, and targeted clarification questions.
    """
    missing_fields: List[str] = []
    clarification_questions: List[str] = []

    # 1. Location Completeness Check
    loc = report.location
    is_location_complete = False

    if loc is None:
        missing_fields.extend(["location.city", "location.raw_address"])
        clarification_questions.append(
            "Which city and street or landmark is this issue located near?"
        )
    else:
        has_coords = loc.latitude is not None and loc.longitude is not None
        has_city = bool(loc.city and loc.city.strip())
        has_street_or_landmark = bool(
            (loc.raw_address and loc.raw_address.strip())
            or (loc.landmark and loc.landmark.strip())
        )

        # Complete scenario A: Coordinates + City or Address
        # Complete scenario B: Street/Landmark + City
        if (has_coords and (has_city or has_street_or_landmark)) or (has_street_or_landmark and has_city):
            is_location_complete = True
        else:
            if not has_city:
                missing_fields.append("location.city")
                clarification_questions.append("Which city or municipality is this located in?")
            if not has_street_or_landmark and not has_coords:
                missing_fields.append("location.raw_address")
                clarification_questions.append("What is the street name, cross road, or nearby landmark?")

    # 2. Description Actionability Check
    sanitized_desc = sanitize_text(report.description)
    is_description_actionable = len(sanitized_desc) >= MIN_ACTIONABLE_DESCRIPTION_LENGTH

    if not is_description_actionable:
        missing_fields.append("description.actionable_detail")
        clarification_questions.append(
            "Could you provide a few more details about the issue (e.g. size, severity, or immediate hazards)?"
        )

    has_missing = bool(missing_fields)

    return MissingInfoResult(
        has_missing_info=has_missing,
        missing_fields=missing_fields,
        clarification_questions=clarification_questions,
        is_location_complete=is_location_complete,
        is_description_actionable=is_description_actionable,
    )


# ---------------------------------------------------------------------------
# Deterministic Report Validation
# ---------------------------------------------------------------------------

def validate_report(
    report: Union[AIAnalysisRequest, Dict[str, Any], Any],
    strict_categories: bool = False,
    strict_fields: bool = True,
) -> ReportValidationResult:
    """
    Performs deterministic, rule-based validation on an incoming civic report.

    Validates:
    - Payload type (must be dictionary or AIAnalysisRequest).
    - Unrecognized/unsupported top-level or nested fields (when strict_fields=True).
    - Description presence, non-emptiness, and length bounds (10 to 5000 chars).
    - Category validity (flags unrecognized categories as warning or error based on strict_categories).
    - Location coordinate bounds (latitude in [-90, 90], longitude in [-180, 180]).
    - Evidence attachment metadata structure and non-negative file sizes.

    Distinguishes:
    - INVALID: Structural flaws, empty/malicious fields, or constraint violations that
      prevent any analysis.
    - PARTIALLY_VALID: Structurally sound and analyzable, but missing geographic or
      actionable details needed for authority lookup.
    - VALID: Structurally sound and contains complete location and description info.

    Args:
        report: Input report payload as a dictionary or AIAnalysisRequest.
        strict_categories: If True, unsupported categories cause validation error;
                           if False, unsupported categories produce a warning.
        strict_fields: If True, extra undeclared fields cause validation errors.

    Returns:
        ReportValidationResult detailing validation status, issues, and missing info.
    """
    errors: List[ValidationIssue] = []
    warnings: List[ValidationIssue] = []

    # 1. Payload Type Check
    if not isinstance(report, (dict, AIAnalysisRequest)):
        errors.append(
            ValidationIssue(
                field="report",
                code="INVALID_PAYLOAD_TYPE",
                message=f"Report must be a dict or AIAnalysisRequest, received {type(report).__name__}.",
            )
        )
        return ReportValidationResult(
            status=ValidationStatus.INVALID,
            is_valid=False,
            sanitized_report=None,
            errors=errors,
            warnings=warnings,
            missing_info=None,
        )

    # Convert to dict for uniform raw inspection
    raw_dict: Dict[str, Any] = (
        report.model_dump() if isinstance(report, AIAnalysisRequest) else dict(report)
    )

    # 2. Strict Field Inspection (Top-level)
    if strict_fields:
        extra_keys = set(raw_dict.keys()) - SUPPORTED_REQUEST_FIELDS
        for extra_key in sorted(extra_keys):
            errors.append(
                ValidationIssue(
                    field=extra_key,
                    code="UNSUPPORTED_FIELD",
                    message=f"Field '{extra_key}' is not a supported report field.",
                )
            )

    # 3. Description Validation
    if "description" not in raw_dict or raw_dict["description"] is None:
        errors.append(
            ValidationIssue(
                field="description",
                code="MISSING_FIELD",
                message="Description is a mandatory field.",
            )
        )
    elif not isinstance(raw_dict["description"], str):
        errors.append(
            ValidationIssue(
                field="description",
                code="INVALID_TYPE",
                message=f"Description must be a string, received {type(raw_dict['description']).__name__}.",
            )
        )
    else:
        sanitized_desc = sanitize_text(raw_dict["description"])
        if len(sanitized_desc) == 0:
            errors.append(
                ValidationIssue(
                    field="description",
                    code="EMPTY_VALUE",
                    message="Description cannot be empty or whitespace-only.",
                )
            )
        elif len(sanitized_desc) < MIN_DESCRIPTION_LENGTH:
            errors.append(
                ValidationIssue(
                    field="description",
                    code="TOO_SHORT",
                    message=(
                        f"Description length ({len(sanitized_desc)}) is below minimum requirement "
                        f"of {MIN_DESCRIPTION_LENGTH} characters."
                    ),
                )
            )
        elif len(sanitized_desc) > MAX_DESCRIPTION_LENGTH:
            errors.append(
                ValidationIssue(
                    field="description",
                    code="TOO_LONG",
                    message=(
                        f"Description length ({len(sanitized_desc)}) exceeds maximum limit "
                        f"of {MAX_DESCRIPTION_LENGTH} characters."
                    ),
                )
            )
        else:
            raw_dict["description"] = sanitized_desc
            is_inj, inj_rationale = detect_prompt_injection(sanitized_desc)
            if is_inj:
                warnings.append(
                    ValidationIssue(
                        field="description",
                        code="PROMPT_INJECTION_SUSPECTED",
                        message=f"Adversarial instruction pattern detected: {inj_rationale}. Instructions neutralized.",
                    )
                )

    # 4. Category Validation
    raw_cat = raw_dict.get("category")
    if raw_cat is not None:
        if not isinstance(raw_cat, str):
            errors.append(
                ValidationIssue(
                    field="category",
                    code="INVALID_TYPE",
                    message=f"Category must be a string, received {type(raw_cat).__name__}.",
                )
            )
        else:
            normalized, is_recognized = normalize_category(raw_cat)
            if not is_recognized:
                issue = ValidationIssue(
                    field="category",
                    code="UNSUPPORTED_CATEGORY",
                    message=(
                        f"Category '{raw_cat}' is not a recognized civic category. "
                        "The AI module will classify the issue independently."
                    ),
                )
                if strict_categories:
                    errors.append(issue)
                else:
                    warnings.append(issue)

    # 5. Location Validation
    loc_val = raw_dict.get("location")
    if loc_val is not None:
        if not isinstance(loc_val, (dict, LocationInput)):
            errors.append(
                ValidationIssue(
                    field="location",
                    code="INVALID_TYPE",
                    message=f"Location must be an object or LocationInput, received {type(loc_val).__name__}.",
                )
            )
        else:
            loc_dict = loc_val.model_dump() if isinstance(loc_val, LocationInput) else dict(loc_val)
            if strict_fields:
                extra_loc_keys = set(loc_dict.keys()) - SUPPORTED_LOCATION_FIELDS
                for extra_key in sorted(extra_loc_keys):
                    errors.append(
                        ValidationIssue(
                            field=f"location.{extra_key}",
                            code="UNSUPPORTED_FIELD",
                            message=f"Field 'location.{extra_key}' is not recognized.",
                        )
                    )

            lat = loc_dict.get("latitude")
            if lat is not None:
                if not isinstance(lat, (int, float)):
                    errors.append(
                        ValidationIssue(
                            field="location.latitude",
                            code="INVALID_TYPE",
                            message="Latitude must be a numeric value.",
                        )
                    )
                elif not (-90.0 <= float(lat) <= 90.0):
                    errors.append(
                        ValidationIssue(
                            field="location.latitude",
                            code="OUT_OF_BOUNDS",
                            message=f"Latitude {lat} must be within [-90.0, 90.0].",
                        )
                    )

            lon = loc_dict.get("longitude")
            if lon is not None:
                if not isinstance(lon, (int, float)):
                    errors.append(
                        ValidationIssue(
                            field="location.longitude",
                            code="INVALID_TYPE",
                            message="Longitude must be a numeric value.",
                        )
                    )
                elif not (-180.0 <= float(lon) <= 180.0):
                    errors.append(
                        ValidationIssue(
                            field="location.longitude",
                            code="OUT_OF_BOUNDS",
                            message=f"Longitude {lon} must be within [-180.0, 180.0].",
                        )
                    )

            # Sanitize string fields
            for str_field in ("raw_address", "landmark", "city", "ward_or_zone"):
                val = loc_dict.get(str_field)
                if val is not None and isinstance(val, str):
                    loc_dict[str_field] = sanitize_text(val)

            raw_dict["location"] = loc_dict

    # 6. Evidence Metadata Validation
    meta_val = raw_dict.get("evidence_metadata")
    if meta_val is not None:
        if not isinstance(meta_val, list):
            errors.append(
                ValidationIssue(
                    field="evidence_metadata",
                    code="INVALID_TYPE",
                    message="Evidence metadata must be a list of attachment records.",
                )
            )
        else:
            sanitized_evidence_items: List[Dict[str, Any]] = []
            for idx, item in enumerate(meta_val):
                if not isinstance(item, (dict, EvidenceMetadata)):
                    errors.append(
                        ValidationIssue(
                            field=f"evidence_metadata[{idx}]",
                            code="INVALID_TYPE",
                            message="Each evidence item must be an object.",
                        )
                    )
                else:
                    item_dict = item.model_dump() if isinstance(item, EvidenceMetadata) else dict(item)
                    if strict_fields:
                        extra_item_keys = set(item_dict.keys()) - SUPPORTED_EVIDENCE_FIELDS
                        for extra_key in sorted(extra_item_keys):
                            errors.append(
                                ValidationIssue(
                                    field=f"evidence_metadata[{idx}].{extra_key}",
                                    code="UNSUPPORTED_FIELD",
                                    message=f"Field 'evidence_metadata[{idx}].{extra_key}' is not recognized.",
                                )
                            )
                    size = item_dict.get("file_size_bytes")
                    if size is not None:
                        if not isinstance(size, int) or size < 0:
                            errors.append(
                                ValidationIssue(
                                    field=f"evidence_metadata[{idx}].file_size_bytes",
                                    code="OUT_OF_BOUNDS",
                                    message="File size in bytes must be a non-negative integer.",
                                )
                            )
                    # Sanitize user_caption and scan for prompt injection
                    caption = item_dict.get("user_caption")
                    if caption is not None and isinstance(caption, str):
                        sanitized_caption = sanitize_text(caption)
                        item_dict["user_caption"] = sanitized_caption
                        is_inj, inj_rationale = detect_prompt_injection(sanitized_caption)
                        if is_inj:
                            warnings.append(
                                ValidationIssue(
                                    field=f"evidence_metadata[{idx}].user_caption",
                                    code="PROMPT_INJECTION_SUSPECTED",
                                    message=f"Adversarial instruction pattern in caption: {inj_rationale}. Instructions neutralized.",
                                )
                            )
                    sanitized_evidence_items.append(item_dict)
            raw_dict["evidence_metadata"] = sanitized_evidence_items

    # 7. Final Evaluation
    if errors:
        return ReportValidationResult(
            status=ValidationStatus.INVALID,
            is_valid=False,
            sanitized_report=None,
            errors=errors,
            warnings=warnings,
            missing_info=None,
        )

    # Build validated AIAnalysisRequest
    try:
        sanitized_request = AIAnalysisRequest.model_validate(raw_dict)
    except ValidationError as val_err:
        for err in val_err.errors():
            loc_str = ".".join(str(p) for p in err["loc"])
            errors.append(
                ValidationIssue(
                    field=loc_str,
                    code="SCHEMA_VALIDATION_ERROR",
                    message=err["msg"],
                )
            )
        return ReportValidationResult(
            status=ValidationStatus.INVALID,
            is_valid=False,
            sanitized_report=None,
            errors=errors,
            warnings=warnings,
            missing_info=None,
        )

    # 8. Missing Information Detection
    missing_info = detect_missing_information(sanitized_request)
    overall_status = (
        ValidationStatus.PARTIALLY_VALID
        if missing_info.has_missing_info
        else ValidationStatus.VALID
    )

    return ReportValidationResult(
        status=overall_status,
        is_valid=True,
        sanitized_report=sanitized_request,
        errors=[],
        warnings=warnings,
        missing_info=missing_info,
    )
