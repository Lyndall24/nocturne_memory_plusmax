"""
Migration 012: Add Expectation table for session-level memory loading preferences.

Expectation table stores user preferences for how memories should be loaded and expressed.
intensity / dependency / expression each range 0-2.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def up(engine: AsyncEngine):
    """Create the expectations table."""
    async with engine.begin() as conn:
        await conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS expectations (
                session_id  VARCHAR(128) PRIMARY KEY,
                intensity   INTEGER NOT NULL DEFAULT 1,
                dependency  INTEGER NOT NULL DEFAULT 1,
                expression  INTEGER NOT NULL DEFAULT 1,
                note        TEXT,
                updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ))
