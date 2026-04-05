"""
RED QUEEN — AI Router
API endpoints for rule-based cargo analysis
"""

from fastapi import APIRouter, HTTPException

from models.schemas import AIAnalysisRequest, AIAnalysisResponse
from services.rule_engine import rule_engine
from services.risk import score_detections
from services.manifest import check_manifest
from models.schemas import ManifestMismatch

router = APIRouter()


@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_cargo(request: AIAnalysisRequest):
    """
    Analyze cargo inspection results using rule-based engine.

    Evaluates the manifest and detected objects using a deterministic
    rule-based decision engine to generate an inspection report.

    Args:
        request: Analysis request containing manifest and detected objects

    Returns:
        Rule-based inspection analysis report

    Raises:
        HTTPException: If analysis fails
    """
    try:
        # Convert detected objects to DetectedObject format
        from models.schemas import DetectedObject
        scored_detections = []
        for obj in request.detected_objects:
            scored_detections.append(DetectedObject(
                class_name=obj.class_name,
                confidence=obj.confidence,
                risk_tier="UNKNOWN",
                risk_score=0.5,
                bbox=[0, 0, 0, 0]
            ))

        # Check manifest mismatch
        manifest_mismatch = check_manifest(request.manifest, scored_detections)

        # Run rule-based judge
        result = rule_engine.evaluate(scored_detections, manifest_mismatch)

        return AIAnalysisResponse(
            inspection_report=result["inspection_report"],
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            flag_reason=result["flag_reason"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
