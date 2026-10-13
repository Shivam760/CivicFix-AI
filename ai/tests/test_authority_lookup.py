"""
ai/tests/test_authority_lookup.py

Comprehensive unit tests for verified authority directory lookup.
Tests cover verified matches, ambiguous matches, missing locations, unrecorded metadata,
no-match cases, and custom directory injection.
"""

import pytest

from ai.authority_lookup import (
    DEMONSTRATION_AUTHORITY_DIRECTORY,
    lookup_authority,
)
from ai.schemas import (
    AuthorityDirectoryRecord,
    AuthorityMatchStatus,
    CivicCategory,
    LocationInput,
)


class TestVerifiedAuthorityMatches:
    """Tests for single, unequivocal verified authority matches."""

    def test_solid_waste_verified_match_bengaluru(self):
        """Garbage complaint in Bengaluru matches BBMP Solid Waste Division."""
        loc = LocationInput(city="Bengaluru")
        res = lookup_authority(CivicCategory.GARBAGE, loc)
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.authority_id == "DEMO_BBMP_SOLID_WASTE"
        assert res.authority_name == "Bruhat Bengaluru Mahanagara Palike"
        assert res.department == "Solid Waste Management Division"
        assert res.verification_date == "2026-02-10"
        assert res.is_demo_fixture is True
        assert len(res.plausible_alternatives) == 0

    def test_water_leakage_verified_match_bengaluru(self):
        """Water leak complaint in Bengaluru matches BWSSB."""
        res = lookup_authority(CivicCategory.WATER_LEAKAGE, {"city": "Bengaluru"})
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.authority_id == "DEMO_BWSSB_WATER_SEWER"
        assert "BWSSB" in res.authority_name or "Water Supply" in res.authority_name
        assert res.verification_date == "2026-02-01"

    def test_street_lighting_verified_match_bengaluru(self):
        """Streetlight complaint in Bengaluru matches BESCOM."""
        res = lookup_authority("street_lighting", {"city": "Bengaluru"})
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.authority_id == "DEMO_BESCOM_STREETLIGHT"
        assert res.verification_date == "2026-01-20"

    def test_zone_specific_pothole_match(self):
        """Pothole in Bengaluru with explicit South Zone resolves uniquely to BBMP South."""
        loc = LocationInput(city="Bengaluru", ward_or_zone="South Zone")
        res = lookup_authority(CivicCategory.POTHOLE, loc)
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.authority_id == "DEMO_BBMP_ROAD_SOUTH"
        assert "South Zone" in res.jurisdiction


class TestAmbiguousAuthorityMatches:
    """Tests for preserving ambiguity when multiple authorities have overlapping jurisdiction."""

    def test_unspecified_zone_pothole_is_ambiguous(self):
        """
        Pothole in Bengaluru without zone or highway context could belong to
        BBMP South, BBMP Central, or State PWD -> Must return AMBIGUOUS_MATCH.
        """
        loc = LocationInput(city="Bengaluru")
        res = lookup_authority(CivicCategory.POTHOLE, loc)
        assert res.status == AuthorityMatchStatus.AMBIGUOUS_MATCH
        assert res.authority_id is None
        assert len(res.plausible_alternatives) >= 2
        assert "Clarification" in res.notes or "overlapping" in res.notes


class TestMissingLocationHandling:
    """Tests requiring sufficient location information before matching."""

    def test_none_location_returns_no_verified_match(self):
        """Missing location input must not guess or match randomly."""
        res = lookup_authority(CivicCategory.GARBAGE, None)
        assert res.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert res.authority_id is None
        assert "location information" in res.notes.lower()

    def test_empty_city_returns_no_verified_match(self):
        """Location with street but no city cannot identify authority."""
        loc = LocationInput(raw_address="12th Main Road, near post office")
        res = lookup_authority(CivicCategory.POTHOLE, loc)
        assert res.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert res.authority_id is None
        assert "city" in res.notes.lower()


class TestNoMatchCases:
    """Tests for unsupported cities or non-specific categories."""

    def test_unsupported_city(self):
        """City with no directory entries returns NO_VERIFIED_MATCH."""
        loc = LocationInput(city="Pune")
        res = lookup_authority(CivicCategory.GARBAGE, loc)
        assert res.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert res.authority_id is None
        assert "No verified authority found" in res.notes

    def test_other_civic_category_no_match(self):
        """Category OTHER_CIVIC cannot be routed to a specific authority."""
        loc = LocationInput(city="Bengaluru")
        res = lookup_authority(CivicCategory.OTHER_CIVIC, loc)
        assert res.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert res.authority_id is None

    def test_unknown_category_no_match(self):
        """Category UNKNOWN returns NO_VERIFIED_MATCH."""
        loc = LocationInput(city="Bengaluru")
        res = lookup_authority(CivicCategory.UNKNOWN, loc)
        assert res.status == AuthorityMatchStatus.NO_VERIFIED_MATCH


class TestZeroFabricationInvariants:
    """Verify that unrecorded fields remain None and are never fabricated."""

    def test_unrecorded_verification_date_preserved_as_none(self):
        """
        Record DEMO_KPWD_HIGHWAYS_BLR has verification_date=None in directory.
        When matched directly, it must remain None.
        """
        single_record_dir = [
            r for r in DEMONSTRATION_AUTHORITY_DIRECTORY
            if r.authority_id == "DEMO_KPWD_HIGHWAYS_BLR"
        ]
        res = lookup_authority(
            CivicCategory.POTHOLE,
            {"city": "Bengaluru"},
            directory=single_record_dir
        )
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.verification_date is None
        assert res.official_reporting_url is None

    def test_demo_fixture_flag_propagated(self):
        """Every match from the demo directory is explicitly flagged as is_demo_fixture=True."""
        res = lookup_authority(CivicCategory.GARBAGE, {"city": "Bengaluru"})
        assert res.is_demo_fixture is True


class TestCustomDirectoryInjection:
    """Tests dependency injection of custom directories for unit testing."""

    def test_custom_directory_match(self):
        custom_dir = [
            AuthorityDirectoryRecord(
                authority_id="TEST_MUNICIPALITY_01",
                authority_name="Test Municipality",
                department="Sanitation Dept",
                city="Testville",
                supported_categories=[CivicCategory.GARBAGE],
                source_reference="Test Gazette 2026",
                is_verified=True,
                verification_date="2026-03-01",
                is_demo_fixture=True,
            )
        ]
        res = lookup_authority(CivicCategory.GARBAGE, {"city": "Testville"}, directory=custom_dir)
        assert res.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.authority_id == "TEST_MUNICIPALITY_01"
        assert res.authority_name == "Test Municipality"
