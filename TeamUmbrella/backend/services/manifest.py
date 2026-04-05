"""
RED QUEEN — Manifest Service
Manifest consistency checking for cargo inspections
"""

from typing import List, Set
from models.schemas import DetectedObject, ManifestMismatch
from config import WEAPON_CLASSES, PARTIAL_WEAPON_COMPONENTS


# Category keywords mapping declared categories to detectable class names
CATEGORY_KEYWORDS = {
    "weapons": ["gun", "bullet", "knife", "baton", "pistol", "revolver", "firearm", "rifle"],
    "tools": ["hammer", "wrench", "pliers", "scissors"],
    "electronics": ["powerbank"],
    "textiles": [],
    "food": [],
    "documents": [],
    "machinery": ["hammer", "wrench"],
    "pharmaceuticals": [],
    "chemicals": ["sprayer"]
}

# Categories that should not contain weapons
NON_WEAPONS_CATEGORIES = {"textiles", "food", "documents", "electronics"}

# Prohibited/restricted items that indicate mismatch
HIGH_RISK_ITEMS = {"gun", "bullet", "knife", "baton", "handcuffs", "pistol", "revolver", "firearm", "rifle", "weapon", "ammo", "ammunition"}

# Weapon components that should trigger alerts
WEAPON_COMPONENTS = {"trigger", "barrel", "magazine", "gun_part"}


def check_manifest(
    manifest_text: str,
    detections: List[DetectedObject]
) -> ManifestMismatch:
    """
    Check if detected items are consistent with declared manifest.

    Args:
        manifest_text: Raw manifest text from shipping documents
        detections: List of detected objects with risk scores

    Returns:
        ManifestMismatch result with detected flag and message
    """
    manifest_lower = manifest_text.lower() if manifest_text else ""

    # Find which category is declared in manifest
    declared_category = None
    for category in CATEGORY_KEYWORDS.keys():
        if category in manifest_lower:
            declared_category = category
            break

    # Get detected class names
    detected_class_names = {d.class_name.lower() for d in detections}

    # Check for weapon-related items (including components)
    detected_weapons = detected_class_names & (HIGH_RISK_ITEMS | WEAPON_COMPONENTS)
    detected_high_risk = detected_class_names & HIGH_RISK_ITEMS

    # Determine if there's a mismatch
    mismatch_detected = False
    detected_categories = list(detected_class_names)
    message = ""

    # Case 1: Manifest says textiles/food/documents/electronics but weapons detected
    if declared_category in NON_WEAPONS_CATEGORIES and detected_weapons:
        mismatch_detected = True
        weapons_found = ", ".join(detected_weapons)
        message = f"Weapons detected in {declared_category} shipment"
        print(f"[RED QUEEN] Manifest mismatch: declared {declared_category}, detected firearm component: {weapons_found}")

    # Case 2: Manifest is empty but prohibited items detected
    elif not declared_category and detected_weapons:
        mismatch_detected = True
        weapons_found = ", ".join(detected_weapons)
        message = f"Prohibited items ({weapons_found}) detected without proper declaration"
        print(f"[RED QUEEN] Manifest mismatch: declared unknown, detected firearm component: {weapons_found}")

    # Case 3: Manifest declares weapons category - check if consistent
    elif declared_category == "weapons":
        # Weapons declared, check if detected items match
        expected_items = set(CATEGORY_KEYWORDS.get("weapons", []))
        # If weapons are declared but we detect unlisted weapon types, still flag
        unexpected_weapons = detected_weapons - expected_items
        if unexpected_weapons:
            mismatch_detected = True
            message = f"Undeclared weapon types detected: {', '.join(unexpected_weapons)}"
            print(f"[RED QUEEN] Manifest mismatch: declared weapons, but detected undeclared types: {unexpected_weapons}")

    # Case 4: Manifest declares one category but completely different items found
    elif declared_category:
        expected_items = set(CATEGORY_KEYWORDS.get(declared_category, []))
        # If manifest declares specific items but we detect weapons, that's a mismatch
        if expected_items and not (detected_class_names & expected_items) and detected_high_risk:
            mismatch_detected = True
            message = f"Detected items inconsistent with declared {declared_category} category"
            print(f"[RED QUEEN] Manifest mismatch: declared {declared_category}, detected {detected_high_risk}")

    # No mismatch
    if not mismatch_detected:
        if declared_category:
            message = f"Cargo consistent with declared {declared_category} category"
        else:
            message = "No manifest provided; inspection based on detected items only"

    return ManifestMismatch(
        detected=mismatch_detected,
        declared_category=declared_category or "",
        detected_categories=detected_categories,
        message=message
    )
