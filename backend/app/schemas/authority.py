import uuid

from pydantic import BaseModel, ConfigDict


class AuthorityOut(BaseModel):
    """One authority as returned by the API (api-contract.md section 9)."""

    # Lets Pydantic read values straight from an Authority model object.
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    supported_categories: list[str]
    region: str
    contact_url: str | None
    verification_status: str


class AuthorityList(BaseModel):
    items: list[AuthorityOut]
