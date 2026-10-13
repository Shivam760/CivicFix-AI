"""
ai/tests/test_schemas.py

Comprehensive test suite for CivicFix AI Pydantic schemas.
Tests validation of valid, edge-case, and invalid payloads for both request and response models.
"""

import pytest
from pydantic import ValidationError

from ai.schemas import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AuthorityMatchResult,
    AuthorityMatchStatus,
    CivicCategory,
    ComplaintDraft,
    EvidenceMetadata,
    LocationInput,
    UrgencyLevel,
    EXAMPLE_VALID_REQUEST,
    EXAMPLE_VALID_RESPONSE,
    EXAMPLE_UNVERIFIED_REQUEST,
    EXAMPLE_UNVERIFIED_RESPONSE,
)


class TestRequestSchemas:
    """Test suite for AIAnalysisRequest and child models."""

    def test_minimal_valid_request(self):
        """A report with only the mandatory description is valid."""
        req = AIAnalysisRequest(description="Broken streetlight on Main Street.")
        assert req.description == "Broken streetlight on Main Street."
        assert req.report_id is None
        assert req.category is None
        assert req.location is None
        assert req.evidence_metadata is None

    def test_full_valid_request(self):
        """A full report payload parses all nested objects correctly."""
        req = AIAnalysisRequest(
            report_id="rep-12345",
            description="Massive pothole near bus stand.",
            category="roads",
            location=LocationInput(
                raw_address="123 MG Road",
                landmark="Near Bus Stop",
                latitude=12.9716,
                longitude=77.5946,
                city="Bengaluru",
                ward_or_zone="Central Zone"
            ),
            evidence_metadata=[
                EvidenceMetadata(
                    attachment_id="att-1",
                    file_type="image/jpeg",
                    filename="photo.jpg",
                    url="https://example.com/photo.jpg",
                    file_size_bytes=2048,
                    user_caption="Pothole view"
                )
            ]
        )
        assert req.report_id == "rep-12345"
        assert req.location.latitude == 12.9716
        assert len(req.evidence_metadata) == 1
        assert req.evidence_metadata[0].file_size_bytes == 2048

    def test_empty_description_rejected(self):
        """Empty string description should raise a validation error."""
        with pytest.raises(ValidationError):
            AIAnalysisRequest(description="")

    def test_whitespace_only_description_rejected(self):
        """Whitespace-only description should be rejected by validator."""
        with pytest.raises(ValidationError) as exc_info:
            AIAnalysisRequest(description="    \n\t   ")
        assert "Description must contain non-whitespace characters" in str(exc_info.value)

    def test_forbid_extra_fields_in_request(self):
        """Extra undeclared fields should trigger validation error due to extra='forbid'."""
        with pytest.raises(ValidationError):
            AIAnalysisRequest(
                description="Valid description",
                unrecognized_injection="hacked_payload"  # type: ignore
            )

    def test_invalid_latitude_bounds(self):
        """Latitude must be between -90.0 and 90.0."""
        with pytest.raises(ValidationError):
            LocationInput(latitude=91.0)
        with pytest.raises(ValidationError):
            LocationInput(latitude=-90.1)

    def test_invalid_longitude_bounds(self):
        """Longitude must be between -180.0 and 180.0."""
        with pytest.raises(ValidationError):
            LocationInput(longitude=180.1)
        with pytest.raises(ValidationError):
            LocationInput(longitude=-181.0)

    def test_negative_file_size_rejected(self):
        """File size in bytes cannot be negative."""
        with pytest.raises(ValidationError):
            EvidenceMetadata(
                attachment_id="att-99",
                file_type="image/png",
                file_size_bytes=-10
            )


class TestResponseSchemas:
    """Test suite for AIAnalysisResponse and child models."""

    def test_valid_verified_response(self):
        """Valid response with verified authority match."""
        resp = AIAnalysisResponse(
            report_id="rep-101",
            original_category="roads",
            suggested_category=CivicCategory.POTHOLE,
            urgency=UrgencyLevel.HIGH,
            is_hazard=True,
            missing_fields=[],
            clarification_questions=[],
            authority_match=AuthorityMatchResult(
                status=AuthorityMatchStatus.VERIFIED_MATCH,
                authority_id="BBMP_01",
                authority_name="Bruhat Bengaluru Mahanagara Palike",
                department="Roads & Infrastructure",
                jurisdiction="Bengaluru South",
                matched_category_or_area="pothole / South",
                source_reference="BBMP Official Directory 2026",
                verification_date="2026-02-01",
                notes="Verified department"
            ),
            complaint_draft=ComplaintDraft(
                title="Dangerous Pothole on South End Road",
                formal_body="To BBMP Road Infrastructure Department:\n\nPlease inspect and repair the severe crater on South End Road.",
                key_facts=["Location: South End Road", "Severity: High hazard to motorists"],
                suggested_tags=["pothole", "bbmp", "road-hazard"]
            ),
            warnings=["Accident risk detected."],
            requires_human_approval=True
        )
        assert resp.suggested_category == CivicCategory.POTHOLE
        assert resp.authority_match.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert resp.requires_human_approval is True

    def test_unverified_authority_allows_null_metadata(self):
        """No verified match can safely carry null values without inventing fake data."""
        match = AuthorityMatchResult(
            status=AuthorityMatchStatus.NO_VERIFIED_MATCH,
            authority_id=None,
            authority_name=None,
            department=None,
            verification_date=None,
            notes="No directory entry found for the provided location."
        )
        assert match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert match.verification_date is None
        assert match.authority_id is None

    def test_ambiguous_authority_status(self):
        """Ambiguous authority matches are cleanly represented."""
        match = AuthorityMatchResult(
            status=AuthorityMatchStatus.AMBIGUOUS_MATCH,
            notes="Boundary overlap between Municipal Corporation and PWD."
        )
        assert match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH

    def test_lookup_error_status(self):
        """Lookup errors are cleanly represented."""
        match = AuthorityMatchResult(
            status=AuthorityMatchStatus.LOOKUP_ERROR,
            notes="Directory query timeout."
        )
        assert match.status == AuthorityMatchStatus.LOOKUP_ERROR

    def test_human_approval_defaults_to_true(self):
        """The safety invariant requires_human_approval must default to True."""
        resp = AIAnalysisResponse(
            suggested_category=CivicCategory.GARBAGE,
            authority_match=AuthorityMatchResult(status=AuthorityMatchStatus.NO_VERIFIED_MATCH),
            complaint_draft=ComplaintDraft(
                title="Grievance: Uncollected Garbage",
                formal_body="To the Municipal Ward Office:\n\nPlease clear the accumulated waste at the reported location."
            )
        )
        assert resp.requires_human_approval is True

    def test_confidence_score_bounds(self):
        """Confidence score if present must be within [0.0, 1.0]."""
        # Valid confidence
        resp_valid = AIAnalysisResponse(
            suggested_category=CivicCategory.DRAINAGE_SEWAGE,
            confidence=0.85,
            authority_match=AuthorityMatchResult(status=AuthorityMatchStatus.NO_VERIFIED_MATCH),
            complaint_draft=ComplaintDraft(
                title="Sewage Overflow Issue",
                formal_body="Formal complaint regarding open sewage overflow."
            )
        )
        assert resp_valid.confidence == 0.85

        # Invalid confidence > 1.0
        with pytest.raises(ValidationError):
            AIAnalysisResponse(
                suggested_category=CivicCategory.DRAINAGE_SEWAGE,
                confidence=1.05,
                authority_match=AuthorityMatchResult(status=AuthorityMatchStatus.NO_VERIFIED_MATCH),
                complaint_draft=ComplaintDraft(
                    title="Sewage Overflow Issue",
                    formal_body="Formal complaint regarding open sewage overflow."
                )
            )

        # Invalid confidence < 0.0
        with pytest.raises(ValidationError):
            AIAnalysisResponse(
                suggested_category=CivicCategory.DRAINAGE_SEWAGE,
                confidence=-0.1,
                authority_match=AuthorityMatchResult(status=AuthorityMatchStatus.NO_VERIFIED_MATCH),
                complaint_draft=ComplaintDraft(
                    title="Sewage Overflow Issue",
                    formal_body="Formal complaint regarding open sewage overflow."
                )
            )

    def test_draft_body_too_short_rejected(self):
        """Complaint draft formal body must meet minimum length for formal completeness."""
        with pytest.raises(ValidationError):
            ComplaintDraft(
                title="Pothole Issue",
                formal_body="Too short"  # min_length is 20
            )


class TestExampleConstants:
    """Validate that all embedded module examples parse cleanly against schemas."""

    def test_example_valid_request(self):
        req = AIAnalysisRequest.model_validate(EXAMPLE_VALID_REQUEST)
        assert req.report_id == "rep-98a7c2-2026"
        assert req.location.city == "Bengaluru"

    def test_example_valid_response(self):
        resp = AIAnalysisResponse.model_validate(EXAMPLE_VALID_RESPONSE)
        assert resp.suggested_category == CivicCategory.POTHOLE
        assert resp.authority_match.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert resp.requires_human_approval is True

    def test_example_unverified_request(self):
        req = AIAnalysisRequest.model_validate(EXAMPLE_UNVERIFIED_REQUEST)
        assert req.location is None

    def test_example_unverified_response(self):
        resp = AIAnalysisResponse.model_validate(EXAMPLE_UNVERIFIED_RESPONSE)
        assert resp.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert resp.authority_match.verification_date is None
        assert len(resp.missing_fields) > 0
