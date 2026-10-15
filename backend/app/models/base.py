from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Give every constraint a predictable name (for example uq_users_email or
# ck_users_name_not_blank), so later Alembic migrations can find and change them.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Parent class for every model. Its metadata holds all table definitions."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
