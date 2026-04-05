"""
RED QUEEN — Authentication Router
API endpoints for user authentication
"""

import uuid
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.schemas import UserCreate, UserLogin, Token, UserResponse
from utils.security import hash_password, verify_password, create_access_token, decode_access_token
from database import create_user, get_user_by_email, get_user_by_username, get_user_by_id, get_connection
from utils.dev_reset import reset_users_table, is_development_mode

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

# HTTP Bearer token security
security = HTTPBearer(auto_error=False)


def _is_development_mode() -> bool:
    """Check if running in development mode."""
    return os.getenv("RED_QUEEN_ENV", "development") == "development"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        User dict if authenticated

    Raises:
        HTTPException: If not authenticated
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """
    Register a new user account.

    Args:
        user_data: User registration data (username, email, password)

    Returns:
        Created user information

    Raises:
        HTTPException: If username or email already exists
    """
    logger.info("[RED QUEEN] Signup request received")

    # Normalize email to lowercase
    email = user_data.email.lower()
    username = user_data.username

    logger.info(f"[RED QUEEN] Checking if user exists: username={username}, email={email}")

    # Check if user already exists by username
    existing_user = get_user_by_username(username)
    if existing_user:
        logger.warning(f"[RED QUEEN] Signup failed: username '{username}' already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered"
        )

    # Check if email already exists
    existing_email = get_user_by_email(email)
    if existing_email:
        logger.warning(f"[RED QUEEN] Signup failed: email '{email}' already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered"
        )

    # Hash password
    logger.info("[RED QUEEN] Creating new user with hashed password")
    password_hash = hash_password(user_data.password)

    # Generate user ID
    user_id = str(uuid.uuid4())

    # Create user in database
    user = create_user(
        user_id=user_id,
        username=username,
        email=email,
        password_hash=password_hash
    )

    if user is None:
        logger.error("[RED QUEEN] Signup failed: database integrity error (user may already exist)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered"
        )

    logger.info(f"[RED QUEEN] User created successfully: username={username}, id={user_id}")
    return UserResponse(**user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Authenticate user and return JWT token.

    Args:
        credentials: User login credentials (email, password)

    Returns:
        Access token and token type

    Raises:
        HTTPException: If credentials are invalid
    """
    # Normalize email to lowercase
    email = credentials.email.lower()

    logger.info(f"[RED QUEEN] Login attempt for user: {email}")

    # Get user from database by email
    user = get_user_by_email(email)
    if user is None:
        logger.warning(f"[RED QUEEN] Login failed: user not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    logger.info("[RED QUEEN] User found in database")

    # Verify password using bcrypt comparison
    logger.info("[RED QUEEN] Verifying password hash")
    password_valid = verify_password(credentials.password, user["password_hash"])
    
    if not password_valid:
        logger.warning(f"[RED QUEEN] Login failed: password verification failed for {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    logger.info(f"[RED QUEEN] Password verification successful for {email}")

    # Create access token with username as subject
    access_token = create_access_token(data={"sub": user["username"], "user_id": user["id"]})

    logger.info(f"[RED QUEEN] Login successful: username={user['username']}, token generated")
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user["username"]
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Authenticated user from JWT token

    Returns:
        User information
    """
    return UserResponse(**current_user)


@router.post("/dev/reset-users")
async def dev_reset_users():
    """
    Development endpoint to reset all users.

    WARNING: Only works in development mode.
    Deletes all user records from the database.

    Returns:
        Status of the reset operation
    """
    if not _is_development_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation only allowed in development mode"
        )

    result = reset_users_table()

    if result["success"]:
        logger.info(f"[DEV] Reset users: deleted {result['deleted_count']} user(s)")
        return {
            "status": "success",
            "message": result["message"],
            "deleted_count": result["deleted_count"]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=result.get("error", "Operation not allowed")
        )


@router.post("/dev/create-test-user")
async def dev_create_test_user():
    """
    Development endpoint to create a test user.

    If user already exists, deletes and recreates with fresh password.
    Only works in development mode.

    Default test credentials:
    - username: testuser
    - email: testuser@example.com
    - password: TestPass123!

    Returns:
        Created/updated user information
    """
    if not _is_development_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation only allowed in development mode"
        )

    username = "testuser"
    email = "testuser@example.com"
    password = "TestPass123!"

    logger.info(f"[DEV] Creating/updating test user: {username}")

    # Check if user exists and delete if so
    existing_user = get_user_by_username(username)

    if existing_user:
        logger.info(f"[DEV] Test user exists, deleting old record")
        # Delete old user to create fresh record with new password
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE username = ?", (username,))
            conn.commit()
            conn.close()
            logger.info(f"[DEV] Deleted existing user: {username}")
        except Exception as e:
            logger.error(f"[DEV] Error deleting user: {e}")

    # Create new user
    password_hash = hash_password(password)
    user_id = str(uuid.uuid4())

    user = create_user(
        user_id=user_id,
        username=username,
        email=email,
        password_hash=password_hash
    )

    if user is None:
        logger.error(f"[DEV] Failed to create test user: {username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create test user"
        )

    logger.info(f"[DEV] Test user created: username={username}, email={email}")
    return {
        "status": "success",
        "message": "Test user created/updated",
        "username": username,
        "email": email,
        "password": password,
        "user": UserResponse(**user)
    }
