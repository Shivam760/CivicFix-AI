"""
ai/tests/test_validation.py

Unit tests for deterministic report validation and missing-information detection.
Tests cover valid reports, partially complete reports, malformed inputs, edge cases,
and strict safety constraints.
"""

import pytest

from ai.schemas import (
    AIAnalysisRequest,
    CivicCategory,
    EvidenceMetadata,
    LocationInput,
    ValidationStatus,
)
from ai.validation import (
    MIN_DESCRIPTION_LENGTH,
    detect_missing_information,
    normalize_category,
    sanitize_text,
    validate_report,
)


class TestTextSanitization:
    """Tests for text cleaning and control character removal."""

    def test_strip_null_bytes_and_control_chars(self):
        dirty = "Pothole\x00 near\x07 Main\x1f Street"
        cleaned = sanitize_text(dirty)
        assert "\x00" not in cleaned
        assert "\x07" not in cleaned
        assert "\x1f" not in cleaned
        assert cleaned == "Pothole near Main Street"

    def test_preserves_newlines_and_tabs(self):
        text = "Line 1\nLine 2\tTabbed"
        cleaned = sanitize_text(text)
        assert cleaned == "Line 1\nLine 2\tTabbed"

    def test_handles_non_string_input(self):
        assert sanitize_text(None) == ""  # type: ignore
        assert sanitize_text(12345) == ""  # type: ignore


class TestCategoryNormalization:
    """Tests for mapping user-provided categories to CivicCategory."""

    def test_known_synonyms(self):
        cat, ok = normalize_category("potholes")
        assert ok is True
        assert cat == CivicCategory.POTHOLE

        cat, ok = normalize_category("trash")
        assert ok is True
        assert cat == CivicCategory.GARBAGE

        cat, ok = normalize_category("broken pipe")
        assert ok is True
        assert cat == CivicCategory.WATER_LEAKAGE

        cat, ok = normalize_category("streetlight")
        assert ok is True
        assert cat == CivicCategory.STREET_LIGHTING

    def test_none_or_empty_category(self):
        cat, ok = normalize_category(None)
        assert ok is True
        assert cat is None

        cat, ok = normalize_category("   ")
        assert ok is True
        assert cat is None

    def test_unrecognized_category(self):
        cat, ok = normalize_category("alien invasion")
        assert ok is False
        assert cat is None


class TestDeterministicValidation:
    """Tests for validate_report and missing-information detection."""

    def test_fully_valid_report(self):
        """A complete, actionable report with coordinates and city is VALID."""
        payload = {
            "report_id": "rep-001",
            "description": "Deep pothole right after the 14th Cross junction on 80 Feet Road.",
            "category": "roads",
            "location": {
                "raw_address": "80 Feet Road, 14th Cross",
                "city": "Bengaluru",
                "latitude": 12.9344,
                "longitude": 77.6288,
            },
            "evidence_metadata": [
                {
                    "attachment_id": "att-1",
                    "file_type": "image/jpeg",
                    "filename": "pothole.jpg",
                    "file_size_bytes": 1024,
                }
            ],
        }
        res = validate_report(payload)
        assert res.is_valid is True
        assert res.status == ValidationStatus.VALID
        assert len(res.errors) == 0
        assert res.missing_info is not None
        assert res.missing_info.has_missing_info is False
        assert res.missing_info.is_location_complete is True
        assert res.missing_info.is_description_actionable is True
        assert res.sanitized_report is not None
        assert res.sanitized_report.report_id == "rep-001"

    def test_partially_valid_report_missing_location(self):
        """
        Prompt requirement: 'There is a pothole near my college'
        Must be marked as analyzable (is_valid=True, status=PARTIALLY_VALID)
        without silently inventing missing location details or rejecting it.
        """
        payload = {
            "description": "There is a massive pothole near my college entrance.",
            "category": "pothole",
        }
        res = validate_report(payload)
        assert res.is_valid is True
        assert res.status == ValidationStatus.PARTIALLY_VALID
        assert len(res.errors) == 0
        assert res.missing_info is not None
        assert res.missing_info.has_missing_info is True
        assert res.missing_info.is_location_complete is False
        assert "location.city" in res.missing_info.missing_fields
        assert len(res.missing_info.clarification_questions) > 0

    def test_partially_valid_location_missing_city(self):
        """Location has street/landmark but no city."""
        payload = {
            "description": "Water pipeline burst causing flood on the main street.",
            "location": {
                "raw_address": "Near Sony World Signal, Koramangala",
            },
        }
        res = validate_report(payload)
        assert res.is_valid is True
        assert res.status == ValidationStatus.PARTIALLY_VALID
        assert "location.city" in res.missing_info.missing_fields

    def test_short_description_lacks_actionable_detail(self):
        """Description meets minimum length (10) but is under actionable threshold (25)."""
        payload = {
            "description": "Big pothole here.",  # 17 chars
            "location": {
                "raw_address": "MG Road",
                "city": "Bengaluru",
            },
        }
        res = validate_report(payload)
        assert res.is_valid is True
        assert res.status == ValidationStatus.PARTIALLY_VALID
        assert res.missing_info.is_description_actionable is False
        assert "description.actionable_detail" in res.missing_info.missing_fields

    def test_empty_description_rejected(self):
        """Empty description is fatal (INVALID)."""
        res = validate_report({"description": ""})
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "EMPTY_VALUE" for e in res.errors)

    def test_whitespace_only_description_rejected(self):
        """Whitespace-only description is fatal (INVALID)."""
        res = validate_report({"description": "   \n\t   "})
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "EMPTY_VALUE" for e in res.errors)

    def test_missing_description_field_rejected(self):
        """Missing description key is fatal (INVALID)."""
        res = validate_report({"report_id": "rep-99"})
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "MISSING_FIELD" for e in res.errors)

    def test_description_below_min_length(self):
        """Description with fewer than 10 characters is fatal."""
        res = validate_report({"description": "Pothole"})  # 7 chars
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "TOO_SHORT" for e in res.errors)

    def test_description_exceeds_max_length(self):
        """Description exceeding 5000 characters is fatal."""
        res = validate_report({"description": "A" * 5001})
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "TOO_LONG" for e in res.errors)

    def test_invalid_payload_type(self):
        """Payload that is not a dict or request model is fatal."""
        res = validate_report(["not", "a", "dict"])
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "INVALID_PAYLOAD_TYPE" for e in res.errors)

    def test_unsupported_category_lenient_mode(self):
        """In default lenient mode, unrecognized category logs warning without failing."""
        payload = {
            "description": "Strange lights in the night sky over the highway.",
            "category": "ufo_sighting",
            "location": {"city": "Pune", "raw_address": "Highway 4"},
        }
        res = validate_report(payload, strict_categories=False)
        assert res.is_valid is True
        assert any(w.code == "UNSUPPORTED_CATEGORY" for w in res.warnings)
        assert len(res.errors) == 0

    def test_unsupported_category_strict_mode(self):
        """In strict category mode, unrecognized category causes INVALID status."""
        payload = {
            "description": "Strange lights in the night sky over the highway.",
            "category": "ufo_sighting",
        }
        res = validate_report(payload, strict_categories=True)
        assert res.is_valid is False
        assert res.status == ValidationStatus.INVALID
        assert any(e.code == "UNSUPPORTED_CATEGORY" for e in res.errors)

    def test_malformed_coordinates(self):
        """Out of bounds latitude / longitude trigger validation errors."""
        payload = {
            "description": "Broken streetlight outside apartment gate.",
            "location": {
                "city": "Bengaluru",
                "latitude": 99.5,  # > 90
                "longitude": 77.5,
            },
        }
        res = validate_report(payload)
        assert res.is_valid is False
        assert any(e.code == "OUT_OF_BOUNDS" for e in res.errors)

    def test_unsupported_extra_fields_rejected(self):
        """Strict field checking catches unauthorized extra fields."""
        payload = {
            "description": "Garbage dump accumulating near public park.",
            "admin_override_token": "malicious_token",
        }
        res = validate_report(payload, strict_fields=True)
        assert res.is_valid is False
        assert any(e.code == "UNSUPPORTED_FIELD" and e.field == "admin_override_token" for e in res.errors)

    def test_validates_ai_analysis_request_instance(self):
        """Validator seamlessly accepts AIAnalysisRequest model instance."""
        req = AIAnalysisRequest(
            description="Deep crater on residential road.",
            location=LocationInput(city="Chennai", raw_address="Anna Nagar 2nd Avenue"),
        )
        res = validate_report(req)
        assert res.is_valid is True
        assert res.status == ValidationStatus.VALID
        assert res.sanitized_report.description == "Deep crater on residential road."
