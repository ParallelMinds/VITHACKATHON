"""
RED QUEEN — Configuration Module
Cargo Intelligence System Configuration
"""

import os
from pathlib import Path

# Base directory for the backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = str(Path(__file__).resolve().parent / "models" / "best.pt")
DB_PATH = os.path.join(BASE_DIR, "db_storage", "redqueen.db")
CONFIDENCE_THRESHOLD = 0.35
IMAGE_SIZE = 640

# Weapon detection thresholds
WEAPON_CONFIDENCE_THRESHOLD = 0.25  # Lower threshold for weapon-related items
STANDARD_CONFIDENCE_THRESHOLD = 0.50  # Standard threshold for other items

# Weapon class names that should be normalized to firearm category
WEAPON_CLASSES = {
    "gun", "pistol", "revolver", "firearm", "rifle", "gun_part", "weapon",
    "bullet", "ammo", "ammunition"
}

# Partial weapon components that indicate firearm presence
PARTIAL_WEAPON_COMPONENTS = {
    "trigger", "barrel", "magazine", "gun_part"
}

# Map weapon class names to normalized categories
WEAPON_CATEGORY_MAP = {
    "gun": "firearm",
    "pistol": "firearm",
    "revolver": "firearm",
    "firearm": "firearm",
    "rifle": "firearm",
    "gun_part": "firearm",
    "weapon": "firearm",
    "bullet": "ammunition",
    "ammo": "ammunition",
    "ammunition": "ammunition",
    "trigger": "firearm",
    "barrel": "firearm",
    "magazine": "firearm"
}

RISK_TAXONOMY = {
    "gun":        {"tier": "PROHIBITED",  "score": 1.00},
    "bullet":     {"tier": "PROHIBITED",  "score": 0.95},
    "knife":      {"tier": "RESTRICTED",  "score": 0.75},
    "handcuffs":  {"tier": "SUSPICIOUS",  "score": 0.65},
    "baton":      {"tier": "SUSPICIOUS",  "score": 0.60},
    "hammer":     {"tier": "SUSPICIOUS",  "score": 0.45},
    "wrench":     {"tier": "SUSPICIOUS",  "score": 0.40},
    "pliers":     {"tier": "SUSPICIOUS",  "score": 0.35},
    "scissors":   {"tier": "SUSPICIOUS",  "score": 0.30},
    "lighter":    {"tier": "SUSPICIOUS",  "score": 0.30},
    "sprayer":    {"tier": "SUSPICIOUS",  "score": 0.25},
    "powerbank":  {"tier": "NORMAL",      "score": 0.10},
    # Additional weapon-related classes
    "pistol":     {"tier": "PROHIBITED",  "score": 1.00},
    "revolver":   {"tier": "PROHIBITED",  "score": 1.00},
    "firearm":    {"tier": "PROHIBITED",  "score": 1.00},
    "rifle":      {"tier": "PROHIBITED",  "score": 1.00},
    "gun_part":   {"tier": "PROHIBITED",  "score": 0.90},
    "weapon":     {"tier": "PROHIBITED",  "score": 1.00},
    "ammo":       {"tier": "PROHIBITED",  "score": 0.95},
    "ammunition": {"tier": "PROHIBITED",  "score": 0.95},
    "trigger":    {"tier": "PROHIBITED",  "score": 0.85},
    "barrel":     {"tier": "PROHIBITED",  "score": 0.85},
    "magazine":   {"tier": "PROHIBITED",  "score": 0.85}
}

RISK_LEVELS = {
    "CRITICAL": 0.70,
    "HIGH":     0.50,
    "MEDIUM":   0.30,
    "LOW":      0.00
}
