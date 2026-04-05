"""
RED QUEEN — Risk Scoring Service
Calculate risk scores and generate flag reasons
"""

import re
from typing import List, Dict, Any, Tuple
from models.schemas import DetectedObject, ManifestMismatch
from config import RISK_TAXONOMY, RISK_LEVELS, WEAPON_CLASSES, PARTIAL_WEAPON_COMPONENTS


# Risk level hierarchy (higher index = higher risk)
RISK_LEVEL_HIERARCHY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def get_risk_level_priority(risk_level: str) -> int:
    """
    Get the priority of a risk level (higher = more severe).

    Args:
        risk_level: Risk level string (LOW, MEDIUM, HIGH, CRITICAL)

    Returns:
        Integer priority (0-3)
    """
    try:
        return RISK_LEVEL_HIERARCHY.index(risk_level.upper())
    except ValueError:
        return 0  # Default to LOW for unknown levels


def extract_ai_risk_level(ai_analysis: str) -> str:
    """
    Extract the risk level from AI analysis text.

    Looks for patterns like:
    - "Risk Level: HIGH"
    - "**Risk Level: CRITICAL**"
    - "overall risk assessment: LOW"

    Args:
        ai_analysis: AI-generated analysis text

    Returns:
        Extracted risk level (LOW, MEDIUM, HIGH, or CRITICAL)
    """
    if not ai_analysis:
        return "LOW"

    # Normalize text for searching
    text = ai_analysis.upper()

    # Pattern 1: "Risk Level: HIGH" or "**Risk Level: HIGH**"
    risk_level_pattern = r"RISK\s*LEVEL[:\s]+(LOW|MEDIUM|HIGH|CRITICAL)"
    match = re.search(risk_level_pattern, text)
    if match:
        return match.group(1)

    # Pattern 2: "overall risk assessment: HIGH"
    assessment_pattern = r"(?:OVERALL\s+)?RISK\s+(?:ASSESSMENT)?[:\s]+(LOW|MEDIUM|HIGH|CRITICAL)"
    match = re.search(assessment_pattern, text)
    if match:
        return match.group(1)

    # Pattern 3: Standalone risk keywords in bold or at start of lines
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        # Check for bold markdown: **HIGH** or __HIGH__
        if f"**{level}**" in text or f"__{level}__" in text:
            return level
        # Check for level at start of line
        if text.strip().startswith(level):
            return level

    # Default to LOW if no risk level found
    return "LOW"


def reconcile_risk_levels(rule_engine_risk: str, ai_risk: str) -> str:
    """
    Reconcile risk levels from rule engine and AI analysis.

    Always returns the HIGHEST risk level between the two sources.

    Args:
        rule_engine_risk: Risk level from rule-based engine
        ai_risk: Risk level from AI analysis

    Returns:
        The higher (more severe) risk level
    """
    rule_priority = get_risk_level_priority(rule_engine_risk)
    ai_priority = get_risk_level_priority(ai_risk)

    # Return the higher risk level
    if ai_priority > rule_priority:
        return ai_risk.upper()
    return rule_engine_risk.upper()


def is_weapon_related(class_name: str) -> bool:
    """Check if a class name represents a weapon or weapon component."""
    class_lower = class_name.lower()
    return class_lower in WEAPON_CLASSES or class_lower in PARTIAL_WEAPON_COMPONENTS


def score_detections(detections: List[Dict[str, Any]]) -> List[DetectedObject]:
    """
    Score detections using risk taxonomy.

    Args:
        detections: List of detection dicts from detection service

    Returns:
        List of DetectedObject with risk scores and tiers
    """
    scored_objects = []

    for detection in detections:
        class_name = detection.get("class_name", "unknown")
        confidence = round(detection.get("confidence", 0.0), 2)
        bbox = detection.get("bbox", [0, 0, 0, 0])

        # Look up risk taxonomy
        taxonomy_entry = RISK_TAXONOMY.get(class_name)

        if taxonomy_entry:
            risk_tier = taxonomy_entry["tier"]
            risk_score = taxonomy_entry["score"]
        else:
            # Check if it's a weapon-related class not in taxonomy
            if is_weapon_related(class_name):
                risk_tier = "PROHIBITED"
                risk_score = 0.85  # High default score for unknown weapon classes
            else:
                risk_tier = "UNKNOWN"
                risk_score = 0.20

        scored_objects.append(DetectedObject(
            class_name=class_name,
            confidence=confidence,
            risk_tier=risk_tier,
            risk_score=risk_score,
            bbox=bbox
        ))

    return scored_objects


def compute_risk_score(
    detections: List[DetectedObject],
    anomaly_score: float = 0.0,
    mismatch_score: float = 0.0,
    comparison_score: float = 0.0
) -> Tuple[float, str]:
    """
    Compute final risk score from multiple factors.

    Args:
        detections: List of scored DetectedObject
        anomaly_score: Score from anomaly detection (0.0-1.0)
        mismatch_score: Score from manifest mismatch (0.0-1.0)
        comparison_score: Score from vessel comparison (0.0-1.0)

    Returns:
        Tuple of (final_score, risk_level)
    """
    # Calculate detection risk
    if detections:
        max_detection_score = max(d.risk_score for d in detections)
        max_detection_confidence = max(d.confidence for d in detections)
        detection_risk = max_detection_score * max_detection_confidence
        
        # Check for weapon detections - escalate risk if weapons found
        weapon_detections = [d for d in detections if is_weapon_related(d.class_name)]
        if weapon_detections:
            # Ensure weapon detections result in elevated risk
            weapon_risk = max(d.risk_score * d.confidence for d in weapon_detections)
            detection_risk = max(detection_risk, weapon_risk)
            print(f"[RED QUEEN] Weapon detected - risk escalated based on weapon score: {weapon_risk:.2f}")
    else:
        detection_risk = 0.0

    # Compute weighted final score
    final_score = (
        detection_risk * 0.50 +
        anomaly_score * 0.20 +
        mismatch_score * 0.20 +
        comparison_score * 0.10
    )

    # Clamp between 0.0 and 1.0
    final_score = max(0.0, min(1.0, final_score))

    # Determine risk level
    if final_score >= RISK_LEVELS["CRITICAL"]:
        risk_level = "CRITICAL"
    elif final_score >= RISK_LEVELS["HIGH"]:
        risk_level = "HIGH"
    elif final_score >= RISK_LEVELS["MEDIUM"]:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return (final_score, risk_level)


def generate_flag_reason(
    detections: List[DetectedObject],
    mismatch: ManifestMismatch,
    anomaly_score: float
) -> str:
    """
    Generate human-readable flag reason explanation.

    Args:
        detections: List of scored detections
        mismatch: Manifest mismatch result
        anomaly_score: Anomaly detection score

    Returns:
        Plain English explanation string
    """
    if not detections:
        if mismatch.detected:
            return f"Manifest inconsistency detected: {mismatch.message}. Further review recommended."
        return "No prohibited items detected. Cargo appears consistent with declared manifest. Low risk shipment."

    # Find highest risk detection
    prohibited_detections = [d for d in detections if d.risk_tier == "PROHIBITED"]
    restricted_detections = [d for d in detections if d.risk_tier == "RESTRICTED"]
    suspicious_detections = [d for d in detections if d.risk_tier == "SUSPICIOUS"]

    parts = []

    if prohibited_detections:
        top_item = max(prohibited_detections, key=lambda d: d.confidence)
        # Check if it's weapon-related
        if is_weapon_related(top_item.class_name):
            parts.append(f"Firearm detected ({top_item.confidence * 100:.0f}% confidence) — classified PROHIBITED.")
            print(f"[RED QUEEN] Risk level escalated to HIGH - {top_item.class_name} detected")
        else:
            parts.append(f"Prohibited item detected: {top_item.class_name} ({top_item.confidence * 100:.0f}% confidence).")
    elif restricted_detections:
        top_item = max(restricted_detections, key=lambda d: d.confidence)
        parts.append(f"Restricted item detected: {top_item.class_name} ({top_item.confidence * 100:.0f}% confidence).")
    elif suspicious_detections:
        top_item = max(suspicious_detections, key=lambda d: d.confidence)
        parts.append(f"Suspicious item detected: {top_item.class_name} ({top_item.confidence * 100:.0f}% confidence).")

    if mismatch.detected:
        detected_items = ", ".join(mismatch.detected_categories) if mismatch.detected_categories else "items"
        parts.append(f"Manifest mismatch: declared {mismatch.declared_category or 'unknown'}, detected {detected_items}.")

    if anomaly_score > 0.5:
        parts.append("Image anomaly detected — possible concealment attempt.")

    if prohibited_detections:
        parts.append("Immediate physical inspection recommended.")
    elif restricted_detections or mismatch.detected:
        parts.append("Secondary inspection recommended.")
    else:
        parts.append("Routine inspection advised.")

    return " ".join(parts)
