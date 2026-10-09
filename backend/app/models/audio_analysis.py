
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AudioAnalysis(Base):
    __tablename__ = "audio_analysis"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    audio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audio_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    bpm: Mapped[int | None] = mapped_column(
        Float,
        nullable=True,
    )
    musical_key: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    mode: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    analysis_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
