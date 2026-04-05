"""
RED QUEEN — Database Module
SQLite database operations for cargo inspections
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from config import DB_PATH, BASE_DIR


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database and create tables if they don't exist."""
    # Ensure database directory exists
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = get_connection()
    cursor = conn.cursor()

    # Create inspections table with user_id and inspection_report
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            timestamp TEXT,
            risk_level TEXT,
            risk_score REAL,
            objects_detected TEXT,
            manifest_text TEXT,
            mismatch_flag INTEGER,
            image_filename TEXT,
            inspection_report TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Add user_id column to existing inspections table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE inspections ADD COLUMN user_id TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Add inspection_report column to existing inspections table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE inspections ADD COLUMN inspection_report TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Add rule_engine_risk column to existing inspections table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE inspections ADD COLUMN rule_engine_risk TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Remove ai_risk column reference (no longer needed)
    # ai_risk column is deprecated but kept for backward compatibility

    conn.commit()
    conn.close()


def save_inspection(data: Dict[str, Any]) -> None:
    """Insert a new inspection record into the database."""
    conn = get_connection()
    cursor = conn.cursor()

    # Convert objects_detected list to JSON string
    objects_json = json.dumps(data.get("objects_detected", []))

    cursor.execute("""
        INSERT INTO inspections (id, user_id, timestamp, risk_level, risk_score,
                                 objects_detected, manifest_text,
                                 mismatch_flag, image_filename, inspection_report,
                                 rule_engine_risk)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("id"),
        data.get("user_id"),
        data.get("timestamp"),
        data.get("risk_level"),
        data.get("risk_score"),
        objects_json,
        data.get("manifest_text", ""),
        1 if data.get("mismatch_flag", False) else 0,
        data.get("image_filename", ""),
        data.get("inspection_report", ""),
        data.get("rule_engine_risk", "")
    ))

    conn.commit()
    conn.close()


def get_recent_inspections(limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve the most recent inspection records."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, timestamp, risk_level, risk_score, objects_detected,
               manifest_text, mismatch_flag, image_filename, inspection_report,
               rule_engine_risk
        FROM inspections
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    inspections = []
    for row in rows:
        inspection = {
            "id": row["id"],
            "user_id": row["user_id"],
            "timestamp": row["timestamp"],
            "risk_level": row["risk_level"],
            "risk_score": row["risk_score"],
            "objects_detected": json.loads(row["objects_detected"]) if row["objects_detected"] else [],
            "manifest_text": row["manifest_text"] or "",
            "mismatch_flag": bool(row["mismatch_flag"]),
            "image_filename": row["image_filename"] or "",
            "inspection_report": row["inspection_report"] or "",
            "rule_engine_risk": row["rule_engine_risk"] or ""
        }
        inspections.append(inspection)

    return inspections


def get_user_inspections(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Retrieve inspection records for a specific user.

    Args:
        user_id: The user's unique ID
        limit: Maximum number of records to return

    Returns:
        List of inspection records for the user
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, timestamp, risk_level, risk_score, objects_detected,
               manifest_text, mismatch_flag, image_filename, inspection_report,
               rule_engine_risk
        FROM inspections
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (user_id, limit))

    rows = cursor.fetchall()
    conn.close()

    inspections = []
    for row in rows:
        inspection = {
            "id": row["id"],
            "user_id": row["user_id"],
            "timestamp": row["timestamp"],
            "risk_level": row["risk_level"],
            "risk_score": row["risk_score"],
            "objects_detected": json.loads(row["objects_detected"]) if row["objects_detected"] else [],
            "manifest_text": row["manifest_text"] or "",
            "mismatch_flag": bool(row["mismatch_flag"]),
            "image_filename": row["image_filename"] or "",
            "inspection_report": row["inspection_report"] or "",
            "rule_engine_risk": row["rule_engine_risk"] or ""
        }
        inspections.append(inspection)

    return inspections


# ==================== User Database Functions ====================

def create_user(user_id: str, username: str, email: str, password_hash: str) -> Optional[Dict[str, Any]]:
    """
    Create a new user in the database.

    Args:
        user_id: Unique user ID
        username: Username
        email: Email address
        password_hash: Hashed password

    Returns:
        User dict if created successfully, None if user already exists
    """
    conn = get_connection()
    cursor = conn.cursor()
    created_at = datetime.utcnow().isoformat()

    # Normalize email to lowercase
    email = email.lower()

    try:
        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, username, email, password_hash, created_at))
        conn.commit()

        return {
            "id": user_id,
            "username": username,
            "email": email,
            "created_at": created_at
        }
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """
    Get a user by username.

    Args:
        username: Username to search for

    Returns:
        User dict if found, None otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, email, password_hash, created_at
        FROM users
        WHERE username = ?
    """, (username,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "created_at": row["created_at"]
        }
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a user by ID.

    Args:
        user_id: User ID to search for

    Returns:
        User dict if found, None otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, email, created_at
        FROM users
        WHERE id = ?
    """, (user_id,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "created_at": row["created_at"]
        }
    return None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Get a user by email.

    Args:
        email: Email address to search for

    Returns:
        User dict if found, None otherwise
    """
    # Normalize email to lowercase
    email = email.lower()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, email, password_hash, created_at
        FROM users
        WHERE email = ?
    """, (email,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "created_at": row["created_at"]
        }
    return None
