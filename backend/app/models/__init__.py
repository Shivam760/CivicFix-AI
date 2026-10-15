# Import every model here so Base.metadata knows about all tables.
# Alembic reads Base.metadata when generating migrations.
from app.models.base import Base
from app.models.user import User

__all__ = ["Base", "User"]
