import uuid

import pytest

from app.models import Authority

URL = "/api/v1/authorities"


@pytest.fixture
def region():
    """A unique region, so each test only sees the authorities it creates."""
    return f"test-region-{uuid.uuid4()}"


def add_authority(db_session, region, name, categories, **fields) -> Authority:
    authority = Authority(name=name, region=region, supported_categories=categories, **fields)
    db_session.add(authority)
    db_session.flush()
    return authority


def test_lists_authorities_in_a_region_sorted_by_name(client, db_session, region):
    add_authority(db_session, region, "Water Board", ["other"])
    add_authority(db_session, region, "City Council", ["garbage"])

    response = client.get(URL, params={"region": region})

    assert response.status_code == 200
    assert [a["name"] for a in response.json()["items"]] == ["City Council", "Water Board"]


def test_response_has_contract_fields(client, db_session, region):
    authority = add_authority(db_session, region, "City Council", ["garbage"])

    [item] = client.get(URL, params={"region": region}).json()["items"]

    assert item == {
        "id": str(authority.id),
        "name": "City Council",
        "supported_categories": ["garbage"],
        "region": region,
        "contact_url": None,
        "verification_status": "unverified",
    }


def test_filters_by_category(client, db_session, region):
    add_authority(db_session, region, "City Council", ["garbage", "road_damage"])
    add_authority(db_session, region, "Power Board", ["streetlight"])

    response = client.get(URL, params={"region": region, "category": "streetlight"})

    assert [a["name"] for a in response.json()["items"]] == ["Power Board"]


def test_unverified_authorities_are_included_and_labeled(client, db_session, region):
    add_authority(db_session, region, "Unverified Office", ["garbage"])

    [item] = client.get(URL, params={"region": region}).json()["items"]

    assert item["verification_status"] == "unverified"


def test_unknown_region_returns_empty_list(client, region):
    response = client.get(URL, params={"region": region})

    assert response.status_code == 200
    assert response.json() == {"items": []}


@pytest.mark.parametrize("category", ["unknown", "potholes"])
def test_invalid_category_returns_validation_error(client, category):
    response = client.get(URL, params={"category": category})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["field"] == "category"
