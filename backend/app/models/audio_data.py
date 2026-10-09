
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AudioFileData(Base):
    __tablename__ = "audio_files"

    __table_args__ = (
        CheckConstraint(
            "file_size_bytes > 0",
            name="ck_audio_file_size_positive",
        ),
        CheckConstraint(
            "duration IS NULL OR duration > 0",
            name="ck_audio_duration_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_audio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audio_files.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    storage_url: Mapped[str] = mapped_column(
        String(2048),
        nullable=False,
    )
    file_format: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    file_size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    duration: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    sample_rate: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    channels: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="UPLOADED",
        server_default="UPLOADED",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
