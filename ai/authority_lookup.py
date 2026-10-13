"""
ai/authority_lookup.py

Verified civic authority directory lookup for CivicFix AI.

Technical & Reliability Principles:
-----------------------------------
1. Deterministic Directory Matching:
   - Authority routing is strictly determined by searching an authenticated local
     authority directory. The language model is NEVER permitted to invent authorities,
     helpline numbers, URLs, or jurisdictional boundaries.
2. Controlled Demonstration Fixtures:
   - When no production PostgreSQL authority database is connected, a clearly labeled
     demonstration fixture is provided for local testing and development.
   - Every demo record explicitly sets `is_demo_fixture=True` and documents its origin.
3. Separation of Concerns & Security:
   - This module does NOT perform direct database SQL queries or bypass backend
     authorization. Future PostgreSQL integrations must be coordinated with the backend
     developer via a clean repository interface.
4. Ambiguity Preservation:
   - If multiple authorities hold overlapping jurisdiction (e.g. municipal ward roads vs.
     state highways), the system returns AMBIGUOUS_MATCH with all plausible alternatives
     rather than guessing or arbitrarily selecting one.
5. Zero Fabrication of Verification Dates:
   - If a directory entry lacks an official verification date, verification_date remains None.
"""

from typing import Any, Dict, List, Optional, Tuple, Union

from ai.schemas import (
    AuthorityDirectoryRecord,
    AuthorityMatchResult,
    AuthorityMatchStatus,
    CivicCategory,
    LocationInput,
)
from ai.validation import normalize_category, sanitize_text

# ---------------------------------------------------------------------------
# Demonstration Authority Directory Fixture
# ---------------------------------------------------------------------------
# Clearly labeled demonstration records used for offline testing and baseline verification.
# All records carry `is_demo_fixture=True`.

DEMONSTRATION_AUTHORITY_DIRECTORY: List[AuthorityDirectoryRecord] = [
    AuthorityDirectoryRecord(
        authority_id="DEMO_BBMP_ROAD_SOUTH",
        authority_name="Bruhat Bengaluru Mahanagara Palike",
        department="Road Infrastructure Division (South Zone)",
        city="Bengaluru",
        jurisdiction_zone="South Zone",
        supported_categories=[CivicCategory.POTHOLE, CivicCategory.ROAD_HAZARD],
        official_portal_url="https://bbmp.karnataka.gov.in",
        official_reporting_url="https://bbmp.karnataka.gov.in/grievance",
        contact_email="ee-roads-south@bbmp.gov.in",
        contact_phone="+91-80-2266-0000",
        source_reference="BBMP Ward Jurisdictions Charter 2026 (Demo Fixture)",
        is_verified=True,
        verification_date="2026-01-15",
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. Responsible for arterial and ward roads in Bengaluru South Zone.",
    ),
    AuthorityDirectoryRecord(
        authority_id="DEMO_BBMP_ROAD_CENTRAL",
        authority_name="Bruhat Bengaluru Mahanagara Palike",
        department="Road Infrastructure Division (Central Zone)",
        city="Bengaluru",
        jurisdiction_zone="Central Zone",
        supported_categories=[CivicCategory.POTHOLE, CivicCategory.ROAD_HAZARD],
        official_portal_url="https://bbmp.karnataka.gov.in",
        official_reporting_url="https://bbmp.karnataka.gov.in/grievance",
        contact_email="ee-roads-central@bbmp.gov.in",
        contact_phone="+91-80-2266-0001",
        source_reference="BBMP Ward Jurisdictions Charter 2026 (Demo Fixture)",
        is_verified=True,
        verification_date="2026-01-15",
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. Responsible for arterial and ward roads in Bengaluru Central Zone.",
    ),
    AuthorityDirectoryRecord(
        authority_id="DEMO_KPWD_HIGHWAYS_BLR",
        authority_name="Karnataka Public Works Department",
        department="State & National Highways Division",
        city="Bengaluru",
        jurisdiction_zone="All Zones",
        supported_categories=[CivicCategory.POTHOLE, CivicCategory.ROAD_HAZARD],
        official_portal_url="https://kpwd.karnataka.gov.in",
        official_reporting_url=None,  # Intentionally None: never fabricate reporting URL
        contact_email="contact@kpwd.gov.in",
        contact_phone=None,  # Intentionally None: never fabricate phone numbers
        source_reference="Karnataka PWD Road Classification Gazette (Demo Fixture)",
        is_verified=True,
        verification_date=None,  # Intentionally None: demonstrates unrecorded verification date
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. Responsible for notified state highway stretches passing through Bengaluru urban limits.",
    ),
    AuthorityDirectoryRecord(
        authority_id="DEMO_BBMP_SOLID_WASTE",
        authority_name="Bruhat Bengaluru Mahanagara Palike",
        department="Solid Waste Management Division",
        city="Bengaluru",
        jurisdiction_zone="All Zones",
        supported_categories=[CivicCategory.GARBAGE],
        official_portal_url="https://bbmp.karnataka.gov.in",
        official_reporting_url="https://bbmp.karnataka.gov.in/swm",
        contact_email="swm-complaints@bbmp.gov.in",
        contact_phone="+91-80-2222-1111",
        source_reference="BBMP SWM Departmental Notification 2026 (Demo Fixture)",
        is_verified=True,
        verification_date="2026-02-10",
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. City-wide jurisdiction for garbage clearing, bin clearance, and sanitation.",
    ),
    AuthorityDirectoryRecord(
        authority_id="DEMO_BESCOM_STREETLIGHT",
        authority_name="Bangalore Electricity Supply Company Limited",
        department="Operations & Street Lighting Division",
        city="Bengaluru",
        jurisdiction_zone="All Zones",
        supported_categories=[CivicCategory.STREET_LIGHTING, CivicCategory.ROAD_HAZARD],
        official_portal_url="https://bescom.karnataka.gov.in",
        official_reporting_url="https://bescom.karnataka.gov.in/complaints",
        contact_email="helpline@bescom.org",
        contact_phone="1912",
        source_reference="BESCOM Public Utility Directory (Demo Fixture)",
        is_verified=True,
        verification_date="2026-01-20",
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. City-wide authority for street lighting fixtures, electrical poles, and live wire hazards.",
    ),
    AuthorityDirectoryRecord(
        authority_id="DEMO_BWSSB_WATER_SEWER",
        authority_name="Bangalore Water Supply and Sewerage Board",
        department="Maintenance & Water Supply Division",
        city="Bengaluru",
        jurisdiction_zone="All Zones",
        supported_categories=[CivicCategory.WATER_LEAKAGE, CivicCategory.DRAINAGE_SEWAGE],
        official_portal_url="https://bwssb.karnataka.gov.in",
        official_reporting_url="https://bwssb.karnataka.gov.in/grievance",
        contact_email="complaints@bwssb.gov.in",
        contact_phone="+91-80-2294-5100",
        source_reference="BWSSB Citizen Charter 2026 (Demo Fixture)",
        is_verified=True,
        verification_date="2026-02-01",
        is_demo_fixture=True,
        notes="DEMONSTRATION FIXTURE - FOR TESTING PURPOSES ONLY. City-wide jurisdiction for drinking water pipelines, mains, and public sewerage.",
    ),
]


# ---------------------------------------------------------------------------
# Authority Lookup Functions
# ---------------------------------------------------------------------------

def _extract_location_details(
    location: Optional[Union[LocationInput, Dict[str, Any]]]
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Extracts (city, ward_or_zone, text_context) from a location input.
    """
    if location is None:
        return None, None, None

    if isinstance(location, LocationInput):
        city = location.city.strip() if location.city else None
        zone = location.ward_or_zone.strip() if location.ward_or_zone else None
        parts = [location.raw_address or "", location.landmark or ""]
        text_context = " ".join(p for p in parts if p).strip() or None
        return city, zone, text_context

    if isinstance(location, dict):
        city_raw = location.get("city")
        zone_raw = location.get("ward_or_zone")
        city = str(city_raw).strip() if city_raw else None
        zone = str(zone_raw).strip() if zone_raw else None
        parts = [str(location.get("raw_address") or ""), str(location.get("landmark") or "")]
        text_context = " ".join(p for p in parts if p).strip() or None
        return city, zone, text_context

    return None, None, None


def lookup_authority(
    category: Union[CivicCategory, str, None],
    location: Optional[Union[LocationInput, Dict[str, Any]]] = None,
    directory: Optional[List[AuthorityDirectoryRecord]] = None,
) -> AuthorityMatchResult:
    """
    Looks up the responsible civic authority in a verified directory.

    Strict Reliability Rules:
    - Performs matching ONLY against the controlled directory (defaults to DEMONSTRATION_AUTHORITY_DIRECTORY).
    - Requires sufficient location information (at least city) to perform a location-dependent match.
    - If location is missing or vague, returns NO_VERIFIED_MATCH with an explicit explanation.
    - If multiple authorities have overlapping jurisdiction, returns AMBIGUOUS_MATCH
      and lists plausible alternatives instead of arbitrarily guessing.
    - If no verified record exists, returns NO_VERIFIED_MATCH.
    - Only returns fields present in the directory record. Never fabricates verification dates or contact info.

    Args:
        category: Suggested or normalized CivicCategory.
        location: Structured LocationInput or dictionary containing location details.
        directory: Optional custom directory list (defaults to DEMONSTRATION_AUTHORITY_DIRECTORY).

    Returns:
        AuthorityMatchResult with match status and verified metadata.
    """
    active_directory = directory if directory is not None else DEMONSTRATION_AUTHORITY_DIRECTORY

    try:
        # 1. Normalize Category
        normalized_cat: Optional[CivicCategory] = None
        if isinstance(category, CivicCategory):
            normalized_cat = category
        elif isinstance(category, str):
            normalized_cat, _ = normalize_category(category)

        if normalized_cat is None or normalized_cat in (CivicCategory.UNKNOWN, CivicCategory.OTHER_CIVIC):
            return AuthorityMatchResult(
                status=AuthorityMatchStatus.NO_VERIFIED_MATCH,
                notes=(
                    f"Cannot match authority for category '{category or 'unknown'}'. "
                    "A specific civic issue category is required."
                ),
            )

        # 2. Location Sufficiency Check
        city, zone, text_context = _extract_location_details(location)

        if not city:
            return AuthorityMatchResult(
                status=AuthorityMatchStatus.NO_VERIFIED_MATCH,
                notes=(
                    "Insufficient location information. City or municipality is required "
                    "to identify the responsible civic authority."
                ),
            )

        # 3. Filter Directory Records by Category and City
        city_lower = city.lower()
        matching_records: List[AuthorityDirectoryRecord] = []

        for record in active_directory:
            if normalized_cat in record.supported_categories:
                if record.city.lower() == city_lower:
                    matching_records.append(record)

        if not matching_records:
            return AuthorityMatchResult(
                status=AuthorityMatchStatus.NO_VERIFIED_MATCH,
                matched_category_or_area=f"{normalized_cat.value} / {city}",
                notes=f"No verified authority found in directory for '{normalized_cat.value}' in {city}.",
            )

        # 4. Refine by Jurisdiction Zone if Available
        # If multiple records exist for this category in the city, check zone specificity
        if len(matching_records) > 1:
            location_zone_text = f"{zone or ''} {text_context or ''}".lower()

            zone_specific_matches = [
                rec for rec in matching_records
                if rec.jurisdiction_zone and rec.jurisdiction_zone.lower() != "all zones"
                and rec.jurisdiction_zone.lower() in location_zone_text
            ]

            if len(zone_specific_matches) == 1:
                # Location explicitly identified a single specific zone division
                matching_records = zone_specific_matches
            elif len(zone_specific_matches) > 1:
                # Multiple zones matched
                matching_records = zone_specific_matches
            # Otherwise, all candidates remain, leading to AMBIGUOUS_MATCH

        # 5. Evaluate Final Match Results
        if len(matching_records) == 1:
            rec = matching_records[0]
            jurisdiction_str = (
                f"{rec.city} ({rec.jurisdiction_zone})"
                if rec.jurisdiction_zone and rec.jurisdiction_zone != "All Zones"
                else rec.city
            )

            return AuthorityMatchResult(
                status=AuthorityMatchStatus.VERIFIED_MATCH,
                authority_id=rec.authority_id,
                authority_name=rec.authority_name,
                department=rec.department,
                jurisdiction=jurisdiction_str,
                matched_category_or_area=f"{normalized_cat.value} / {jurisdiction_str}",
                source_reference=rec.source_reference,
                verification_date=rec.verification_date,  # None if not in directory
                official_portal_url=rec.official_portal_url,
                official_reporting_url=rec.official_reporting_url,
                plausible_alternatives=[],
                is_demo_fixture=rec.is_demo_fixture,
                notes=rec.notes or f"Verified {rec.department} authority for {rec.city}.",
            )

        # Multiple overlapping authorities -> Ambiguous Match
        alternatives = [
            f"{rec.authority_name} ({rec.department})"
            for rec in matching_records
        ]
        return AuthorityMatchResult(
            status=AuthorityMatchStatus.AMBIGUOUS_MATCH,
            matched_category_or_area=f"{normalized_cat.value} / {city}",
            plausible_alternatives=alternatives,
            is_demo_fixture=any(r.is_demo_fixture for r in matching_records),
            notes=(
                f"Multiple overlapping authorities match category '{normalized_cat.value}' in {city}. "
                f"Clarification of specific zone or road type is required. Plausible: {', '.join(alternatives)}."
            ),
        )

    except Exception as exc:
        return AuthorityMatchResult(
            status=AuthorityMatchStatus.LOOKUP_ERROR,
            notes=f"Internal authority lookup failure: {type(exc).__name__}: {str(exc)}",
        )
