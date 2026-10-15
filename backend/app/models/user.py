import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """A citizen account (database-schema.md section 3)."""

    __tablename__ = "users"
    __table_args__ = (
        # Reject empty or whitespace-only values; NOT NULL alone allows "   ".
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        CheckConstraint("btrim(email) <> ''", name="email_not_blank"),
        CheckConstraint("btrim(password_hash) <> ''", name="password_hash_not_blank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Case-insensitive uniqueness: Aarav@example.com and aarav@example.com count as
# the same address. Defined after the class because it needs the email column.
Index("uq_users_email_lower", func.lower(User.email), unique=True)
