"""
RED QUEEN — Development Reset Utility
Utilities for resetting development data safely.
"""

import os
import logging

from database import get_connection

logger = logging.getLogger(__name__)


def is_development_mode() -> bool:
    """Check if running in development mode."""
    return os.getenv("RED_QUEEN_ENV", "development") == "development"


def reset_users_table() -> dict:
    """
    Reset the users table by deleting all user records.
    
    Safety: Only works in development mode.
    
    Returns:
        dict with status and count of deleted users
    """
    if not is_development_mode():
        logger.error("reset_users_table() blocked: not in development mode")
        return {
            "success": False,
            "error": "Operation only allowed in development mode",
            "deleted_count": 0
        }
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Count existing users
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    # Delete all users
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    
    logger.info(f"[DEV RESET] Deleted {count} user(s) from users table")
    
    return {
        "success": True,
        "deleted_count": count,
        "message": f"Successfully deleted {count} user(s)"
    }


def reset_all_tables() -> dict:
    """
    Reset all application tables (users and inspections).
    
    Safety: Only works in development mode.
    
    Returns:
        dict with status and counts
    """
    if not is_development_mode():
        logger.error("reset_all_tables() blocked: not in development mode")
        return {
            "success": False,
            "error": "Operation only allowed in development mode"
        }
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Count and delete users
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    cursor.execute("DELETE FROM users")
    
    # Count and delete inspections
    cursor.execute("SELECT COUNT(*) FROM inspections")
    inspection_count = cursor.fetchone()[0]
    cursor.execute("DELETE FROM inspections")
    
    conn.commit()
    conn.close()
    
    logger.info(f"[DEV RESET] Deleted {user_count} user(s) and {inspection_count} inspection(s)")
    
    return {
        "success": True,
        "users_deleted": user_count,
        "inspections_deleted": inspection_count,
        "message": f"Deleted {user_count} user(s) and {inspection_count} inspection(s)"
    }
