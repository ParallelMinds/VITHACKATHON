"""
CIIBS local explanation assistant.
Rule-based text explanation and image insight generation.
No external generative model dependency.
"""

import logging
import os
import time
from typing import Dict

import cv2
import numpy as np
import yaml

logger = logging.getLogger("ciibs.llm")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")


def _load_config() -> dict:
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def _build_rule_explanation(analysis: Dict) -> str:
    risk_score = analysis.get("risk_score", 0)
    risk_level = analysis.get("risk_level", "LOW")
    anomaly_score = analysis.get("anomaly_score", 0)
    concealment_score = analysis.get("concealment_score", 0)
    detections = analysis.get("detections", [])

    if detections:
        top_items = ", ".join(
            f"{d.get('class', 'Unknown')} ({int(d.get('confidence', 0) * 100)}%)"
            for d in detections[:3]
        )
        detect_line = f"Top detections: {top_items}."
    else:
        detect_line = "No prohibited object class was detected in this scan."

    mismatch_msg = analysis.get("mismatch_info", {}).get("message", "No declaration mismatch detected.")

    if risk_score >= 80:
        action = "Immediate physical inspection is recommended."
    elif risk_score >= 70:
        action = "Escalate to high-priority secondary inspection."
    elif risk_score >= 35:
        action = "Flag for secondary review before clearance."
    else:
        action = "Cargo can proceed with routine checks."

    return (
        f"Risk is {risk_level} ({risk_score}/100). "
        f"{detect_line} "
        f"Anomaly={int(anomaly_score * 100)}%, Concealment={int(concealment_score * 100)}%. "
        f"Declaration check: {mismatch_msg}. "
        f"{action}"
    )


def _build_rule_vision_note(image: np.ndarray) -> str:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    edges = cv2.Canny(gray, 50, 150)

    mean_intensity = float(np.mean(gray))
    edge_density = float(np.mean(edges > 0))
    intensity_std = float(np.std(gray))

    if edge_density > 0.12 and intensity_std > 40:
        pattern_flag = "High structural complexity observed"
    elif edge_density > 0.07:
        pattern_flag = "Moderate structural complexity observed"
    else:
        pattern_flag = "Low structural complexity observed"

    if mean_intensity < 70:
        density_hint = "overall dense profile"
    elif mean_intensity < 130:
        density_hint = "mixed density profile"
    else:
        density_hint = "lighter density profile"

    return (
        f"Rule-based image insight: {pattern_flag}; {density_hint}. "
        f"Edge density={edge_density:.3f}, intensity spread={intensity_std:.1f}."
    )


def generate_explanation_sync(analysis: Dict) -> Dict:
    """Return local rule-based explanation."""
    config = _load_config()
    if not config.get("llm", {}).get("enabled", True):
        return {
            "explanation": analysis.get("explanation", "Explain mode disabled"),
            "source": "template",
            "latency_ms": 0,
        }

    t0 = time.time()
    explanation = _build_rule_explanation(analysis)
    latency = (time.time() - t0) * 1000
    return {
        "explanation": explanation,
        "source": "rule-engine",
        "latency_ms": round(latency, 1),
    }


def analyze_vision_sync(image: np.ndarray) -> Dict:
    """Return local rule-based image insight summary."""
    config = _load_config()
    vision_cfg = config.get("llm", {}).get("vision", {})
    if not vision_cfg.get("enabled", False):
        return {
            "vlm_analysis": "Vision analysis disabled",
            "source": "disabled",
            "latency_ms": 0,
        }

    t0 = time.time()
    note = _build_rule_vision_note(image)
    latency = (time.time() - t0) * 1000
    return {
        "vlm_analysis": note,
        "source": "rule-vision",
        "latency_ms": round(latency, 1),
    }
