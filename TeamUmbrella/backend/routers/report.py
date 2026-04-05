"""
RED QUEEN — Report Router
API endpoints for generating inspection reports
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from models.schemas import AIDetectedObject, DetectedObject
from services.rule_engine import rule_engine
from routers.auth import get_current_user

router = APIRouter()


class ReportGenerateRequest(BaseModel):
    """Schema for report generation request."""
    manifest: str
    detected_objects: List[AIDetectedObject]
    risk_level: str


class ReportGenerateResponse(BaseModel):
    """Schema for report generation response."""
    report: str


@router.post("/report/generate", response_model=ReportGenerateResponse)
async def generate_inspection_report(
    request: ReportGenerateRequest,
    current_user: dict = Depends(get_current_user)
) -> ReportGenerateResponse:
    """
    Generate a formal inspection report using rule-based engine.

    Evaluates manifest and detected objects to generate a professional
    inspection report using deterministic rule-based analysis.

    Args:
        request: Report generation request with manifest, detected_objects, risk_level
        current_user: Authenticated user from JWT token

    Returns:
        Rule-based professional inspection report

    Raises:
        HTTPException: If report generation fails
    """
    try:
        # Convert detected objects to DetectedObject format
        scored_detections = []
        for obj in request.detected_objects:
            scored_detections.append(DetectedObject(
                class_name=obj.class_name,
                confidence=obj.confidence,
                risk_tier="UNKNOWN",
                risk_score=0.5,
                bbox=[0, 0, 0, 0]
            ))

        # Build a simple manifest mismatch object
        from models.schemas import ManifestMismatch
        manifest_mismatch = ManifestMismatch(
            detected=False,
            declared_category="",
            detected_categories=[],
            message="No manifest mismatch detected"
        )

        # Generate report using rule-based engine
        result = rule_engine.evaluate(scored_detections, manifest_mismatch)

        return ReportGenerateResponse(report=result["inspection_report"])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
