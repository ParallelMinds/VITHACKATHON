"""
RED QUEEN — Inspection Router
API endpoints for cargo inspection
"""

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse

from models.schemas import InspectionResponse, InspectionRecord, ManifestMismatch, InspectionHistoryItem
from services.detection import DetectionService
from services.risk import score_detections
from services.manifest import check_manifest
from services.anomaly import AnomalyService
from services.rule_engine import rule_engine
from utils.image import preprocess_image, encode_image_base64
from utils.annotations import draw_annotations
from database import save_inspection, get_recent_inspections, get_user_inspections
from routers.auth import get_current_user

router = APIRouter()

# Initialize services
detection_service = DetectionService()
anomaly_service = AnomalyService()


@router.post("/inspect", response_model=InspectionResponse)
async def inspect_cargo(
    image: UploadFile = File(...),
    manifest: str = Form(default=""),
    current_user: dict = Depends(get_current_user)
) -> InspectionResponse:
    """
    Inspect cargo image for prohibited items.

    Args:
        image: Uploaded cargo scan image
        manifest: Optional manifest text from shipping documents

    Returns:
        InspectionResponse with detections, risk score, and annotated image
    """
    try:
        # 1. Read image bytes from upload
        image_bytes = await image.read()

        # 2. Preprocess image
        processed_image = preprocess_image(image_bytes)

        # 3. Run detection service
        raw_detections = detection_service.detect(processed_image)

        # 4. Score detections with risk service
        scored_detections = score_detections(raw_detections)

        # 5. Check manifest mismatch
        manifest_mismatch = check_manifest(manifest, scored_detections)

        # 6. Run rule-based inspection judge
        judge_result = rule_engine.evaluate(scored_detections, manifest_mismatch)

        # 7. Draw annotations on image
        annotated_image = draw_annotations(processed_image, raw_detections)

        # 8. Encode annotated image to base64
        annotated_base64 = encode_image_base64(annotated_image)

        # 9. Generate UUID case_id
        case_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        # Get user_id from current_user
        user_id = current_user.get("id", "")

        # 10. Save to database
        inspection_data = {
            "id": case_id,
            "user_id": user_id,
            "timestamp": timestamp,
            "risk_level": judge_result["risk_level"],
            "risk_score": judge_result["risk_score"],
            "objects_detected": [d.model_dump() for d in scored_detections],
            "manifest_text": manifest,
            "mismatch_flag": manifest_mismatch.detected,
            "image_filename": image.filename or "unknown",
            "inspection_report": judge_result["inspection_report"],
            "rule_engine_risk": judge_result["risk_level"]
        }
        save_inspection(inspection_data)

        # Return response
        return InspectionResponse(
            case_id=case_id,
            timestamp=timestamp,
            annotated_image=annotated_base64,
            detections=scored_detections,
            risk_score=judge_result["risk_score"],
            risk_level=judge_result["risk_level"],
            flag_reason=judge_result["flag_reason"],
            manifest_mismatch=manifest_mismatch,
            inspection_report=judge_result["inspection_report"],
            rule_engine_risk=judge_result["risk_level"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspection failed: {str(e)}")


@router.get("/inspections", response_model=List[InspectionRecord])
async def get_inspections(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
) -> List[InspectionRecord]:
    """
    Get recent inspection records for the logged-in user.

    Args:
        limit: Maximum number of records to return (default 20)
        current_user: Authenticated user from JWT token

    Returns:
        List of recent InspectionRecord for the user
    """
    try:
        user_id = current_user.get("id", "")
        records = get_user_inspections(user_id=user_id, limit=limit)
        return [InspectionRecord(**record) for record in records]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve inspections: {str(e)}")


@router.get("/inspections/history", response_model=List[InspectionHistoryItem])
async def get_inspection_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
) -> List[InspectionHistoryItem]:
    """
    Get full inspection history for the logged-in user.

    Args:
        limit: Maximum number of records to return (default 50)
        current_user: Authenticated user from JWT token

    Returns:
        List of InspectionHistoryItem with id, timestamp, risk_level,
        detected_objects, and inspection_report
    """
    try:
        user_id = current_user.get("id", "")
        records = get_user_inspections(user_id=user_id, limit=limit)

        # Format for history response
        history = []
        for record in records:
            detected_objects = []
            for obj in record.get("objects_detected", []):
                if isinstance(obj, dict):
                    detected_objects.append(obj.get("class_name", "unknown"))
                else:
                    detected_objects.append(str(obj))

            history.append(InspectionHistoryItem(
                id=record["id"],
                timestamp=record["timestamp"],
                risk_level=record["risk_level"],
                detected_objects=detected_objects,
                inspection_report=record.get("inspection_report", "")
            ))

        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve inspection history: {str(e)}")
