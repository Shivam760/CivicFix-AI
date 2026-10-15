from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Authority
from app.models.choices import ISSUE_CATEGORIES
from app.schemas.authority import AuthorityList

router = APIRouter(prefix="/authorities", tags=["authorities"])

# Only real categories are accepted; anything else returns a 422 error.
IssueCategory = Literal[ISSUE_CATEGORIES]


@router.get("", response_model=AuthorityList)
def list_authorities(
    db: Annotated[Session, Depends(get_db)],
    category: Annotated[IssueCategory | None, Query()] = None,
    region: Annotated[str | None, Query(max_length=200)] = None,
):
    """List the authority directory, verified and unverified (each is labeled)."""
    query = select(Authority).order_by(Authority.name)
    if category is not None:
        query = query.where(Authority.supported_categories.contains([category]))
    if region is not None:
        query = query.where(Authority.region == region)

    return {"items": db.scalars(query).all()}
