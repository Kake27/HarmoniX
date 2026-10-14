"""persist full analysis results and status

Revision ID: 20261014_01
Revises: 745787c450b6
Create Date: 2026-10-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261014_01"
down_revision: Union[str, Sequence[str], None] = "745787c450b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "audio_analysis",
        sa.Column("status", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "audio_analysis",
        sa.Column(
            "results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "audio_analysis",
        sa.Column("error_message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("audio_analysis", "error_message")
    op.drop_column("audio_analysis", "results")
    op.drop_column("audio_analysis", "status")
