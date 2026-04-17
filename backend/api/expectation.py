"""
Expectation API - Session-level memory loading preferences.

Stores user preferences for how memories should be loaded and expressed.
intensity / dependency / expression each range 0-2.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from db import get_db_manager
from db.models import Expectation

router = APIRouter(prefix="/expectation", tags=["expectation"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ExpectationPayload(BaseModel):
    intensity: Annotated[int, Field(ge=0, le=2)] = 1
    dependency: Annotated[int, Field(ge=0, le=2)] = 1
    expression: Annotated[int, Field(ge=0, le=2)] = 1
    note: str | None = None


class ExpectationResponse(BaseModel):
    session_id: str
    intensity: int
    dependency: int
    expression: int
    note: str | None
    updated_at: datetime | None


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

async def _get_or_default(session, session_id: str) -> ExpectationResponse:
    result = await session.execute(
        select(Expectation).where(Expectation.session_id == session_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return ExpectationResponse(
            session_id=session_id,
            intensity=1,
            dependency=1,
            expression=1,
            note=None,
            updated_at=None,
        )
    return ExpectationResponse(
        session_id=row.session_id,
        intensity=row.intensity,
        dependency=row.dependency,
        expression=row.expression,
        note=row.note,
        updated_at=row.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=ExpectationResponse)
async def get_expectation(session_id: str):
    """Return current expectation for a session, or defaults if not set."""
    db = get_db_manager()
    async with db.session() as s:
        return await _get_or_default(s, session_id)


@router.post("/{session_id}", response_model=ExpectationResponse)
async def upsert_expectation(session_id: str, payload: ExpectationPayload):
    """Create or update expectation for a session (upsert)."""
    db = get_db_manager()
    async with db.session() as s:
        result = await s.execute(
            select(Expectation).where(Expectation.session_id == session_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = Expectation(session_id=session_id)
            s.add(row)
        row.intensity = payload.intensity
        row.dependency = payload.dependency
        row.expression = payload.expression
        row.note = payload.note
        row.updated_at = datetime.utcnow()
        await s.flush()
        return ExpectationResponse(
            session_id=row.session_id,
            intensity=row.intensity,
            dependency=row.dependency,
            expression=row.expression,
            note=row.note,
            updated_at=row.updated_at,
        )


@router.delete("/{session_id}")
async def delete_expectation(session_id: str):
    """Remove stored expectation (session will revert to defaults)."""
    db = get_db_manager()
    async with db.session() as s:
        result = await s.execute(
            select(Expectation).where(Expectation.session_id == session_id)
        )
        row = result.scalar_one_or_none()
        if row is not None:
            await s.delete(row)
    return {"deleted": session_id}
