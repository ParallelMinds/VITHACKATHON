"""
RED QUEEN — Rule-Based Inspection Judge
Deterministic decision engine for cargo inspection analysis
"""

from typing import List, Dict, Any, Tuple
from models.schemas import DetectedObject, ManifestMismatch


# Object risk weights — base risk values for object categories
OBJECT_RISK_WEIGHTS = {
    # Prohibited weapons
    "gun": 0.90,
    "pistol": 0.90,
    "revolver": 0.90,
    "firearm": 0.90,
    "rifle": 0.90,
    "weapon": 0.90,
    "bullet": 0.85,
    "ammo": 0.85,
    "ammunition": 0.85,
    "gun_part": 0.80,
    "trigger": 0.80,
    "barrel": 0.80,
    "magazine": 0.80,
    # Restricted items
    "knife": 0.75,
    "handcuffs": 0.65,
    "baton": 0.60,
    # Suspicious tools
    "hammer": 0.45,
    "wrench": 0.40,
    "pliers": 0.35,
    "scissors": 0.30,
    "lighter": 0.30,
    "sprayer": 0.25,
    # Normal items
    "powerbank": 0.10,
}

# Risk level thresholds
RISK_LEVEL_THRESHOLDS = {
    "HIGH": 0.75,
    "MEDIUM": 0.50,
}


class RuleBasedJudge:
    """
    Deterministic rule-based decision engine for cargo inspection.
    Evaluates detection results and generates inspection reports
    without relying on external AI services.
    """

    def evaluate(
        self,
        detections: List[DetectedObject],
        manifest_mismatch: ManifestMismatch
    ) -> Dict[str, Any]:
        """
        Evaluate detection results and produce a structured inspection report.

        Args:
            detections: List of detected objects with risk scores
            manifest_mismatch: Manifest mismatch status

        Returns:
            Dictionary containing risk_score, risk_level, flag_reason,
            manifest_mismatch, and inspection_report
        """
        # Compute risk score
        risk_score = self._compute_risk_score(detections, manifest_mismatch)

        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)

        # Generate flag reason
        flag_reason = self._generate_flag_reason(detections, manifest_mismatch)

        # Generate inspection report
        inspection_report = self._generate_report(
            detections, manifest_mismatch, risk_score, risk_level
        )

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "flag_reason": flag_reason,
            "manifest_mismatch": manifest_mismatch,
            "inspection_report": inspection_report,
        }

    def _compute_risk_score(
        self,
        detections: List[DetectedObject],
        manifest_mismatch: ManifestMismatch
    ) -> float:
        """
        Compute risk score using object weights and confidence.

        Formula:
            risk_score = object_weight × confidence
            + 0.3 if manifest mismatch detected
            + 0.2 if multiple suspicious objects detected

        Args:
            detections: List of detected objects
            manifest_mismatch: Manifest mismatch status

        Returns:
            Risk score between 0.0 and 1.0
        """
        if not detections:
            # No detections — check manifest mismatch only
            if manifest_mismatch.detected:
                return min(1.0, 0.3)
            return 0.0

        # Find the highest-risk detection
        max_risk_score = 0.0
        for detection in detections:
            object_weight = OBJECT_RISK_WEIGHTS.get(
                detection.class_name.lower(), 0.4
            )
            detection_risk = object_weight * detection.confidence
            if detection_risk > max_risk_score:
                max_risk_score = detection_risk

        risk_score = max_risk_score

        # Add manifest mismatch bonus
        if manifest_mismatch.detected:
            risk_score += 0.3

        # Add multiple suspicious objects bonus
        if len(detections) >= 2:
            risk_score += 0.2

        # Clamp to [0.0, 1.0]
        return round(min(1.0, max(0.0, risk_score)), 2)

    def _determine_risk_level(self, risk_score: float) -> str:
        """
        Convert risk score to risk category.

        risk_score > 0.75 → HIGH
        risk_score > 0.50 → MEDIUM
        risk_score ≤ 0.50 → LOW

        Args:
            risk_score: Computed risk score

        Returns:
            Risk level string (LOW, MEDIUM, HIGH)
        """
        if risk_score > RISK_LEVEL_THRESHOLDS["HIGH"]:
            return "HIGH"
        elif risk_score > RISK_LEVEL_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        else:
            return "LOW"

    def _generate_flag_reason(
        self,
        detections: List[DetectedObject],
        manifest_mismatch: ManifestMismatch
    ) -> str:
        """
        Generate a human-readable flag reason.

        Args:
            detections: List of detected objects
            manifest_mismatch: Manifest mismatch status

        Returns:
            Plain English explanation string
        """
        if not detections:
            if manifest_mismatch.detected:
                return (
                    f"Manifest inconsistency detected: {manifest_mismatch.message}. "
                    "Further review recommended."
                )
            return (
                "No prohibited items detected. "
                "Cargo appears consistent with declared manifest. "
                "Low risk shipment."
            )

        parts = []

        # Categorize detections by risk
        high_risk = [
            d for d in detections
            if OBJECT_RISK_WEIGHTS.get(d.class_name.lower(), 0.4) >= 0.75
        ]
        medium_risk = [
            d for d in detections
            if 0.50 <= OBJECT_RISK_WEIGHTS.get(d.class_name.lower(), 0.4) < 0.75
        ]
        low_risk = [
            d for d in detections
            if OBJECT_RISK_WEIGHTS.get(d.class_name.lower(), 0.4) < 0.50
        ]

        if high_risk:
            top_item = max(high_risk, key=lambda d: d.confidence)
            parts.append(
                f"Prohibited item detected: {top_item.class_name} "
                f"({top_item.confidence * 100:.0f}% confidence)."
            )
        elif medium_risk:
            top_item = max(medium_risk, key=lambda d: d.confidence)
            parts.append(
                f"Restricted item detected: {top_item.class_name} "
                f"({top_item.confidence * 100:.0f}% confidence)."
            )
        elif low_risk:
            top_item = max(low_risk, key=lambda d: d.confidence)
            parts.append(
                f"Suspicious item detected: {top_item.class_name} "
                f"({top_item.confidence * 100:.0f}% confidence)."
            )

        if manifest_mismatch.detected:
            detected_items = (
                ", ".join(manifest_mismatch.detected_categories)
                if manifest_mismatch.detected_categories
                else "items"
            )
            parts.append(
                f"Manifest mismatch: declared {manifest_mismatch.declared_category or 'unknown'}, "
                f"detected {detected_items}."
            )

        if len(detections) >= 2:
            parts.append(
                f"Multiple suspicious objects detected ({len(detections)} items)."
            )

        # Recommendation
        if high_risk:
            parts.append("Immediate physical inspection recommended.")
        elif medium_risk or manifest_mismatch.detected:
            parts.append("Secondary inspection recommended.")
        else:
            parts.append("Routine inspection advised.")

        return " ".join(parts)

    def _generate_report(
        self,
        detections: List[DetectedObject],
        manifest_mismatch: ManifestMismatch,
        risk_score: float,
        risk_level: str
    ) -> str:
        """
        Generate a structured inspection report using deterministic templates.

        Args:
            detections: List of detected objects
            manifest_mismatch: Manifest mismatch status
            risk_score: Computed risk score
            risk_level: Determined risk level

        Returns:
            Formatted inspection report string
        """
        # Determine primary detected object
        if detections:
            primary_detection = max(detections, key=lambda d: d.confidence)
            detected_object = primary_detection.class_name
            confidence = primary_detection.confidence
        else:
            detected_object = "None"
            confidence = 0.0

        # Manifest status
        manifest_status = "Not Declared" if manifest_mismatch.detected else "Declared"

        # Recommendation based on risk level
        if risk_level == "HIGH":
            recommendation = "Secondary inspection recommended."
        elif risk_level == "MEDIUM":
            recommendation = "Additional review advised before clearance."
        else:
            recommendation = "Standard clearance procedures apply."

        # Build report
        report_lines = [
            "INSPECTION REPORT",
            "",
            f"Detected Object: {detected_object}",
            f"Confidence: {confidence:.2f}",
            "",
            f"Manifest Status: {manifest_status}",
            "",
            f"Risk Score: {risk_score:.2f}",
            f"Risk Level: {risk_level}",
            "",
            "Recommendation:",
            recommendation,
        ]

        # Add details about multiple detections if applicable
        if len(detections) > 1:
            report_lines.append("")
            report_lines.append(f"Additional Detections ({len(detections) - 1}):")
            for d in detections[1:]:
                report_lines.append(f"  - {d.class_name} ({d.confidence:.2f})")

        # Add manifest mismatch details
        if manifest_mismatch.detected:
            report_lines.append("")
            report_lines.append(
                f"Manifest Mismatch: {manifest_mismatch.message}"
            )

        return "\n".join(report_lines)


# Singleton instance
rule_engine = RuleBasedJudge()
