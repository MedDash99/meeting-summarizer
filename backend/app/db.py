"""SQLite database utilities for transcript persistence."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

DB_PATH = Path(__file__).parent.parent / "transcripts.db"


@contextmanager
def get_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database schema."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transcripts (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                original_filename TEXT NOT NULL,
                display_name TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'processing',
                transcript TEXT,
                summary_json TEXT,
                error TEXT
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transcripts_created_at 
            ON transcripts(created_at DESC)
        """)


def create_transcript(
    original_filename: str,
    model: str,
    status: str = "processing",
) -> str:
    """Create a new transcript record. Returns the ID."""
    transcript_id = uuid4().hex
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO transcripts (id, original_filename, display_name, model, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (transcript_id, original_filename, original_filename, model, status),
        )
    return transcript_id


def update_transcript(
    transcript_id: str,
    status: Optional[str] = None,
    transcript: Optional[str] = None,
    summary_json: Optional[str] = None,
    error: Optional[str] = None,
) -> bool:
    """Update transcript fields. Returns True if record was found."""
    updates = []
    params = []
    
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if transcript is not None:
        updates.append("transcript = ?")
        params.append(transcript)
    if summary_json is not None:
        updates.append("summary_json = ?")
        params.append(summary_json)
    if error is not None:
        updates.append("error = ?")
        params.append(error)
    
    if not updates:
        return False
    
    params.append(transcript_id)
    with get_connection() as conn:
        cursor = conn.execute(
            f"UPDATE transcripts SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        return cursor.rowcount > 0


def get_transcript(transcript_id: str) -> Optional[dict]:
    """Get a transcript by ID."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM transcripts WHERE id = ?",
            (transcript_id,),
        ).fetchone()
    
    if row is None:
        return None
    
    return dict(row)


def list_transcripts(limit: int = 20, offset: int = 0) -> list[dict]:
    """List transcripts ordered by creation date (newest first)."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, original_filename, display_name, model, status, error
            FROM transcripts
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    
    return [dict(row) for row in rows]


def count_transcripts() -> int:
    """Get total number of transcripts."""
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) as count FROM transcripts").fetchone()
    return row["count"]


def update_transcript_name(transcript_id: str, new_name: str) -> bool:
    """Update the display name of a transcript."""
    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE transcripts SET display_name = ? WHERE id = ?",
            (new_name, transcript_id),
        )
        return cursor.rowcount > 0


def delete_transcript(transcript_id: str) -> bool:
    """Delete a transcript by ID."""
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM transcripts WHERE id = ?",
            (transcript_id,),
        )
        return cursor.rowcount > 0
