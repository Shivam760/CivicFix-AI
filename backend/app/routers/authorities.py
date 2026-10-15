from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Authority
from app.schemas.authority import AuthorityList
from app.schemas.common import IssueCategory

router = APIRouter(prefix="/authorities", tags=["authorities"])


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
