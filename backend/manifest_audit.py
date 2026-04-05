"""
Project Aegis — M3/M5a: NLP Manifest Audit Module
Compares declared manifest text against detection results.

Detects:
  - Category mismatches (declared textiles, found weapons)
  - Count discrepancies (declared 5 items, detected 12)
  - Undeclared item types
  - Suspicious keyword patterns in declarations
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("aegis.manifest_audit")


# ──────────────────────────────────────────────
# Cargo Category Taxonomy
# ──────────────────────────────────────────────

CARGO_CATEGORIES = {
    "weapons": {
        "keywords": ["gun", "firearm", "pistol", "rifle", "ammunition", "bullet", "weapon"],
        "detected_classes": ["Gun", "Bullet"],
        "risk_weight": 1.0,
    },
    "sharp_objects": {
        "keywords": ["knife", "blade", "scissors", "cutter", "sharp"],
        "detected_classes": ["Knife", "Scissors"],
        "risk_weight": 0.8,
    },
    "blunt_weapons": {
        "keywords": ["baton", "hammer", "bat", "club"],
        "detected_classes": ["Baton", "Hammer"],
        "risk_weight": 0.7,
    },
    "tools": {
        "keywords": ["tool", "wrench", "plier", "screwdriver", "hardware"],
        "detected_classes": ["Wrench", "Pliers"],
        "risk_weight": 0.3,
    },
    "electronics": {
        "keywords": ["electronic", "battery", "powerbank", "charger", "device", "laptop", "phone"],
        "detected_classes": ["Powerbank"],
        "risk_weight": 0.2,
    },
    "flammables": {
        "keywords": ["lighter", "flammable", "aerosol", "spray", "gas"],
        "detected_classes": ["Lighter", "Sprayer"],
        "risk_weight": 0.6,
    },
    "restraints": {
        "keywords": ["handcuff", "restraint", "shackle"],
        "detected_classes": ["HandCuffs"],
        "risk_weight": 0.5,
    },
    "clothing": {
        "keywords": ["clothing", "textile", "fabric", "garment", "apparel", "shirt", "pants"],
        "detected_classes": [],
        "risk_weight": 0.0,
    },
    "food": {
        "keywords": ["food", "produce", "fruit", "vegetable", "grain", "perishable"],
        "detected_classes": [],
        "risk_weight": 0.0,
    },
    "documents": {
        "keywords": ["document", "paper", "file", "book", "stationery"],
        "detected_classes": [],
        "risk_weight": 0.0,
    },
    "machinery": {
        "keywords": ["machinery", "engine", "motor", "mechanical", "industrial"],
        "detected_classes": [],
        "risk_weight": 0.1,
    },
}

# Suspicious declaration patterns
SUSPICIOUS_PATTERNS = [
    (r"\b(personal\s+effects?|misc|miscellaneous|various|assorted|general\s+cargo)\b",
     "Vague/generic description — commonly used to avoid specific scrutiny"),
    (r"\b(gift|sample|no\s+commercial\s+value|NCV)\b",
     "Gift/sample declaration — sometimes used to lower perceived value"),
    (r"\b(consolidat|mixed\s+lot|bulk\s+misc)\b",
     "Consolidated/mixed lot — higher risk due to difficulty of verification"),
]


# ──────────────────────────────────────────────
# Manifest Parsing
# ──────────────────────────────────────────────

def parse_manifest(manifest_text: str) -> Dict:
    """
    Parse declared manifest text to extract:
      - declared categories
      - declared item count (if specified)
      - declared weight/value (if specified)
      - suspicious patterns
    """
    if not manifest_text or not manifest_text.strip():
        return {
            "declared_categories": [],
            "declared_count": None,
            "suspicious_patterns": [],
            "raw_text": "",
        }

    text_lower = manifest_text.lower().strip()

    # Identify declared categories
    declared_cats = []
    for cat_name, cat_info in CARGO_CATEGORIES.items():
        for kw in cat_info["keywords"]:
            if kw in text_lower:
                declared_cats.append(cat_name)
                break

    # Try to extract count
    count_match = re.search(r'(\d+)\s*(items?|pieces?|units?|boxes?|cartons?|pcs)', text_lower)
    declared_count = int(count_match.group(1)) if count_match else None

    # Check for suspicious patterns
    suspicious = []
    for pattern, reason in SUSPICIOUS_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            suspicious.append(reason)

    return {
        "declared_categories": declared_cats,
        "declared_count": declared_count,
        "suspicious_patterns": suspicious,
        "raw_text": manifest_text.strip(),
    }


# ──────────────────────────────────────────────
# Manifest vs. Detection Audit
# ──────────────────────────────────────────────

def audit_manifest(
    manifest_text: Optional[str],
    detections: List[Dict],
    declared_cargo: Optional[str] = None
) -> Dict:
    """
    Compare manifest declaration against detection results.

    Returns:
        audit_score: float (0-1, higher = more mismatches)
        severity: str (CRITICAL, HIGH, MEDIUM, LOW, CLEAR)
        issues: List[str] — human-readable issue descriptions
        details: Dict — detailed breakdown
    """
    # Combine manifest_text and declared_cargo
    combined_text = " ".join(filter(None, [manifest_text, declared_cargo]))
    manifest = parse_manifest(combined_text)

    issues = []
    severity_scores = []

    detected_classes = set(d["class"] for d in detections)
    detected_categories = set()
    for det_cls in detected_classes:
        for cat_name, cat_info in CARGO_CATEGORIES.items():
            if det_cls in cat_info["detected_classes"]:
                detected_categories.add(cat_name)

    # ── Check 1: Category Mismatch ──
    # Items detected that are NOT in declared categories
    undeclared_categories = detected_categories - set(manifest["declared_categories"])
    for ucat in undeclared_categories:
        cat_info = CARGO_CATEGORIES[ucat]
        found_items = [d["class"] for d in detections if d["class"] in cat_info["detected_classes"]]
        if found_items:
            severity = cat_info["risk_weight"]
            severity_scores.append(severity)
            items_str = ", ".join(set(found_items))
            if severity >= 0.8:
                issues.append(
                    f"CRITICAL MISMATCH: {items_str} detected but not declared. "
                    f"Category '{ucat}' absent from manifest."
                )
            elif severity >= 0.5:
                issues.append(
                    f"HIGH MISMATCH: {items_str} detected, category '{ucat}' not in manifest."
                )
            else:
                issues.append(
                    f"UNDECLARED: {items_str} detected, category '{ucat}' not explicitly declared."
                )

    # ── Check 2: Declared but NOT detected (potential legitimacy or concealment) ──
    if manifest["declared_categories"]:
        benign_declared = set(manifest["declared_categories"]) - detected_categories
        # Only flag if benign items declared but prohibited items found
        if benign_declared and detected_categories:
            prohibited_cats = {"weapons", "sharp_objects", "blunt_weapons", "flammables", "restraints"}
            found_prohibited = detected_categories & prohibited_cats
            if found_prohibited:
                issues.append(
                    f"CONCEALMENT CONCERN: Declared '{', '.join(benign_declared)}' but detected "
                    f"prohibited categories: {', '.join(found_prohibited)}. "
                    f"Possible attempt to conceal prohibited items within legitimate cargo."
                )
                severity_scores.append(0.9)

    # ── Check 3: Count Discrepancy ──
    if manifest["declared_count"] is not None:
        actual_count = len(detections)
        if actual_count > manifest["declared_count"] * 1.5:
            issues.append(
                f"COUNT DISCREPANCY: Declared {manifest['declared_count']} items, "
                f"detected {actual_count}. Significant over-count may indicate undeclared goods."
            )
            severity_scores.append(0.6)
        elif actual_count > manifest["declared_count"]:
            issues.append(
                f"MINOR COUNT DISCREPANCY: Declared {manifest['declared_count']} items, "
                f"detected {actual_count}."
            )
            severity_scores.append(0.3)

    # ── Check 4: Suspicious Patterns ──
    for pattern_issue in manifest["suspicious_patterns"]:
        issues.append(f"DECLARATION FLAG: {pattern_issue}")
        severity_scores.append(0.4)

    # ── Check 5: No Declaration Provided ──
    if not combined_text.strip():
        if detections:
            issues.append(
                f"NO MANIFEST: {len(detections)} items detected but no cargo declaration provided. "
                f"Manual verification required."
            )
            severity_scores.append(0.5)

    # ── Compute Overall Audit Score ──
    if severity_scores:
        audit_score = min(1.0, max(severity_scores) * 0.6 + (sum(severity_scores) / len(severity_scores)) * 0.4)
    else:
        audit_score = 0.0

    # Map to severity level
    if audit_score >= 0.8:
        severity = "CRITICAL"
    elif audit_score >= 0.6:
        severity = "HIGH"
    elif audit_score >= 0.3:
        severity = "MEDIUM"
    elif audit_score > 0:
        severity = "LOW"
    else:
        severity = "CLEAR"

    return {
        "audit_score": round(audit_score, 3),
        "severity": severity,
        "issues": issues,
        "declared_categories": manifest["declared_categories"],
        "detected_categories": list(detected_categories),
        "declared_count": manifest["declared_count"],
        "detected_count": len(detections),
        "suspicious_patterns": manifest["suspicious_patterns"],
        "reasoning": (
            f"Manifest audit: {len(issues)} issue(s) found. "
            f"Declared categories: {manifest['declared_categories'] or ['None']}. "
            f"Detected categories: {list(detected_categories) or ['None']}."
        ),
    }
