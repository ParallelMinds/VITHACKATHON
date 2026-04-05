"""
RED QUEEN — Pydantic Schemas
Data models for API request/response validation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


# ==================== User / Auth Schemas ====================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str
    password: str


class UserLoginOld(BaseModel):
    """Old schema for user login (deprecated)."""
    """Schema for user login."""
    username: str
    password: str


class Token(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    username: str


class UserResponse(UserBase):
    """Schema for user information response."""
    id: str
    created_at: str


class TokenData(BaseModel):
    """Schema for decoded token data."""
    username: Optional[str] = None


# ==================== Ship / AIS Schemas ====================

class ShipPosition(BaseModel):
    """Schema for ship position data from AIS."""
    name: str
    lat: float
    lon: float
    speed: float
    heading: int
    type: str


class ShipsNearbyRequest(BaseModel):
    """Schema for nearby ships request."""
    lat: float
    lon: float


# ==================== AI Analysis Schemas (Rule-Based) ====================

class AIDetectedObject(BaseModel):
    """Schema for detected objects in analysis request."""
    class_name: str
    confidence: float


class AIAnalysisRequest(BaseModel):
    """Schema for analysis request."""
    manifest: str
    detected_objects: List[AIDetectedObject]


class AIAnalysisResponse(BaseModel):
    """Schema for rule-based analysis response."""
    inspection_report: str
    risk_score: float
    risk_level: str
    flag_reason: str


# ==================== Existing Inspection Schemas ====================

class DetectedObject(BaseModel):
    """Represents a detected object in cargo scan."""
    class_name: str
    confidence: float = Field(..., description="Detection confidence rounded to 2 decimal places")
    risk_tier: str
    risk_score: float
    bbox: List[int] = Field(..., description="Bounding box [x1, y1, x2, y2]")


class ManifestMismatch(BaseModel):
    """Represents manifest mismatch detection result."""
    detected: bool
    declared_category: str
    detected_categories: List[str]
    message: str


class InspectionResponse(BaseModel):
    """Response model for cargo inspection endpoint."""
    case_id: str
    timestamp: str
    annotated_image: str = Field(..., description="Base64 encoded annotated image")
    detections: List[DetectedObject]
    risk_score: float
    risk_level: str = Field(..., description="Risk level from rule-based judge")
    flag_reason: str
    manifest_mismatch: ManifestMismatch
    inspection_report: str = Field(default="", description="Rule-based inspection report")
    # Risk breakdown for transparency
    rule_engine_risk: str = Field(default="", description="Risk level from rule-based engine")


class InspectionRecord(BaseModel):
    """Database record model for inspection history."""
    id: str
    user_id: Optional[str] = None
    timestamp: str
    risk_level: str
    risk_score: float
    objects_detected: List
    manifest_text: str
    mismatch_flag: bool
    inspection_report: str = ""
    rule_engine_risk: str = ""


class InspectionHistoryItem(BaseModel):
    """Simplified inspection history item for history endpoint."""
    id: str
    timestamp: str
    risk_level: str
    detected_objects: List[str]
    inspection_report: str
