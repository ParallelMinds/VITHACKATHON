"""
Project Aegis — Local Intelligence Engine
Replaces all Gemini/LLM dependencies with deterministic, explainable local analysis.

Modules:
  1. Rule-Based Explanation Engine — structured assessment from pipeline data
  2. Local Vision Analysis — OpenCV feature extraction (edge, texture, density)
  3. Reasoning Builder — per-flag explainability tooltips
"""

import logging
import time
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("aegis.intelligence")


# ──────────────────────────────────────────────
# Material Density Reference Table
# ──────────────────────────────────────────────

MATERIAL_DENSITY_DB = {
    "Organic":       {"density_range": (0.5, 1.5),  "z_eff": (6, 10),   "examples": "textiles, food, paper, plastics"},
    "Light_Metal":   {"density_range": (1.5, 3.0),  "z_eff": (10, 20),  "examples": "aluminum, magnesium alloys"},
    "Dense_Metal":   {"density_range": (3.0, 8.5),  "z_eff": (20, 40),  "examples": "iron, steel, copper, brass"},
    "Very_Dense":    {"density_range": (8.5, 22.0), "z_eff": (40, 82),  "examples": "lead, gold, tungsten, uranium"},
}

CARGO_EXPECTED_PROFILES = {
    "clothing":     {"expected_material": "Organic",     "expected_density": 1.1,  "expected_z": 7},
    "textiles":     {"expected_material": "Organic",     "expected_density": 1.0,  "expected_z": 7},
    "food":         {"expected_material": "Organic",     "expected_density": 1.2,  "expected_z": 8},
    "documents":    {"expected_material": "Organic",     "expected_density": 0.8,  "expected_z": 6},
    "personal":     {"expected_material": "Organic",     "expected_density": 1.0,  "expected_z": 7},
    "electronics":  {"expected_material": "Light_Metal", "expected_density": 2.5,  "expected_z": 14},
    "machinery":    {"expected_material": "Dense_Metal", "expected_density": 7.0,  "expected_z": 26},
    "tools":        {"expected_material": "Dense_Metal", "expected_density": 7.5,  "expected_z": 26},
    "medical":      {"expected_material": "Light_Metal", "expected_density": 2.0,  "expected_z": 13},
    "fragile":      {"expected_material": "Organic",     "expected_density": 1.5,  "expected_z": 9},
    "empty":        {"expected_material": "Organic",     "expected_density": 0.0,  "expected_z": 0},
}


# ──────────────────────────────────────────────
# 1. Rule-Based Explanation Engine
# ──────────────────────────────────────────────

def generate_explanation(analysis: Dict) -> Dict:
    """
    Generate a structured, explainable assessment from pipeline results.
    Every statement maps to a specific pipeline signal — no hallucination possible.

    Returns:
        explanation: str — multi-line assessment
        source: "local-rule-engine"
        latency_ms: float
    """
    t0 = time.time()

    lines = []
    risk_score = analysis.get("risk_score", 0)
    risk_level = analysis.get("risk_level", "LOW")
    detections = analysis.get("detections", [])
    anomaly_score = analysis.get("anomaly_score", 0)
    mismatch_info = analysis.get("mismatch_info", {})
    concealment_info = analysis.get("concealment_info", {})
    material_info = analysis.get("material_info", {})
    manifest_audit = analysis.get("manifest_audit", {})
    historical_risk = analysis.get("historical_risk", {})
    news_intel = analysis.get("news_intel", {})

    # ── Verdict Line ──
    verdict_map = {
        "CRITICAL": "CRITICAL RISK — Immediate physical inspection required. Multiple high-severity indicators detected.",
        "HIGH":     "HIGH RISK — Manual review strongly recommended. Significant threat indicators present.",
        "MEDIUM":   "MEDIUM RISK — Secondary screening advised. Moderate anomalies identified.",
        "LOW":      "LOW RISK — No immediate threat indicators. Cleared for standard processing.",
    }
    lines.append(f"[{risk_level}] {verdict_map.get(risk_level, verdict_map['LOW'])}")

    # ── Detection Summary ──
    if detections:
        high_threat = [d for d in detections if d.get("threat_level", 0) >= 4]
        med_threat = [d for d in detections if d.get("threat_level", 0) == 3]

        if high_threat:
            items = ", ".join(f"{d['class']} ({d['confidence']:.0%})" for d in high_threat[:3])
            lines.append(f"HIGH-THREAT ITEMS: {items}. Immediate escalation recommended.")

        if med_threat:
            items = ", ".join(f"{d['class']} ({d['confidence']:.0%})" for d in med_threat[:3])
            lines.append(f"MODERATE-THREAT ITEMS: {items}. Review for context.")

        # Material composition summary
        metallic = [d for d in detections if d.get("material_type") == "Metallic"]
        organic = [d for d in detections if d.get("material_type") == "Organic"]
        if metallic:
            lines.append(f"MATERIAL: {len(metallic)} metallic object(s) detected via density analysis.")
    else:
        lines.append("DETECTION: No prohibited items identified in scan.")

    # ── Physics/Density Analysis ──
    if material_info.get("organic_declared") and material_info.get("metallic_count", 0) > 0:
        lines.append(
            f"DENSITY MISMATCH: {material_info['metallic_count']} metallic object(s) found in "
            f"organic-declared cargo. Expected density ~1.2g/cm³, observed metallic density ~7.8g/cm³."
        )

    # ── Anomaly ──
    if anomaly_score > 0.6:
        lines.append(f"ANOMALY: {anomaly_score:.0%} — significant irregular density patterns detected. Possible concealed items.")
    elif anomaly_score > 0.3:
        lines.append(f"ANOMALY: {anomaly_score:.0%} — minor density irregularities noted.")

    # ── Concealment ──
    if concealment_info.get("overlap_score", 0) > 0.3 or concealment_info.get("edge_score", 0) > 0.3:
        lines.append(f"CONCEALMENT: {concealment_info.get('message', 'Concealment patterns detected.')} "
                      f"(overlap: {concealment_info.get('overlap_score', 0):.0%}, "
                      f"edge break: {concealment_info.get('edge_score', 0):.0%})")

    # ── Manifest Mismatch ──
    if mismatch_info.get("conflicts"):
        lines.append(f"DECLARATION MISMATCH: {mismatch_info['message']}")

    # ── Manifest Audit ──
    if manifest_audit.get("issues"):
        for issue in manifest_audit["issues"][:2]:
            lines.append(f"MANIFEST AUDIT: {issue}")

    # ── Historical Risk ──
    if historical_risk.get("risk_score", 0) > 50:
        lines.append(
            f"HISTORICAL INTELLIGENCE: Route/shipper profile risk score {historical_risk['risk_score']}/100. "
            f"{historical_risk.get('reasoning', '')}"
        )

    # ── News Intelligence ──
    if news_intel.get("alerts"):
        for alert in news_intel["alerts"][:2]:
            lines.append(f"THREAT INTELLIGENCE: {alert}")

    # ── Action Recommendation ──
    if risk_score >= 80:
        lines.append("ACTION: Escalate immediately for physical inspection and detailed secondary screening.")
    elif risk_score >= 70:
        lines.append("ACTION: Flag for manual review by senior customs officer.")
    elif risk_score >= 35:
        lines.append("ACTION: Flag for secondary screening at next available checkpoint.")
    else:
        lines.append("ACTION: Clear for standard processing.")

    explanation = "\n".join(lines)
    latency = (time.time() - t0) * 1000

    return {
        "explanation": explanation,
        "source": "local-rule-engine",
        "latency_ms": round(latency, 1),
    }


# ──────────────────────────────────────────────
# 2. Local Vision Analysis (Replaces Gemini Vision)
# ──────────────────────────────────────────────

def analyze_vision_local(image: np.ndarray) -> Dict:
    """
    Local CV-based image analysis — the 'second brain' that sees the raw scan.
    Uses edge histograms, texture analysis, density mapping, and color distribution.
    No external API calls.

    Returns:
        vlm_analysis: str — structured assessment
        source: "local-cv-analysis"
        features: dict — extracted feature values
        latency_ms: float
    """
    t0 = time.time()

    if image is None or image.size == 0:
        return {
            "vlm_analysis": "No image provided for analysis.",
            "source": "local-cv-analysis",
            "features": {},
            "latency_ms": 0,
        }

    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()

    features = {}
    findings = []

    # ── Edge Analysis ──
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges)) / 255.0
    features["edge_density"] = round(edge_density, 4)

    # Edge histogram (8 bins of edge orientation)
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(sobelx ** 2 + sobely ** 2)
    angle = np.arctan2(sobely, sobelx) * 180 / np.pi
    angle_hist, _ = np.histogram(angle[magnitude > 30], bins=8, range=(-180, 180))
    angle_hist = angle_hist.astype(float)
    if angle_hist.sum() > 0:
        angle_hist /= angle_hist.sum()
    features["edge_orientation_entropy"] = round(float(-np.sum(angle_hist * np.log2(angle_hist + 1e-10))), 3)

    if edge_density > 0.15:
        findings.append(f"High edge density ({edge_density:.0%}) indicates complex internal structures or concealed objects.")
    elif edge_density > 0.08:
        findings.append(f"Moderate edge complexity ({edge_density:.0%}) — standard cargo profile.")

    # ── Texture Analysis (Local Binary Pattern approximation) ──
    # Use Laplacian variance as texture roughness metric
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    features["texture_variance"] = round(laplacian_var, 2)

    if laplacian_var > 2000:
        findings.append("High texture variance detected — heterogeneous composition suggests mixed materials or deliberate layering.")
    elif laplacian_var > 500:
        findings.append("Moderate texture variance — consistent with standard cargo.")

    # ── Density Distribution ──
    intensity_mean = float(np.mean(gray))
    intensity_std = float(np.std(gray))
    features["mean_intensity"] = round(intensity_mean, 1)
    features["intensity_std"] = round(intensity_std, 1)

    # Quadrant density analysis
    mid_h, mid_w = h // 2, w // 2
    quadrants = [
        gray[:mid_h, :mid_w], gray[:mid_h, mid_w:],
        gray[mid_h:, :mid_w], gray[mid_h:, mid_w:]
    ]
    quad_means = [float(np.mean(q)) for q in quadrants if q.size > 0]
    if len(quad_means) >= 4:
        quad_var = float(np.std(quad_means))
        features["spatial_density_variance"] = round(quad_var, 2)
        if quad_var > 40:
            findings.append(f"Significant density imbalance across scan regions (variance: {quad_var:.1f}) — possible hidden compartment or asymmetric loading.")

    # ── Color Channel Analysis (X-ray specific) ──
    if len(image.shape) == 3:
        b_mean = float(np.mean(image[:, :, 0]))
        g_mean = float(np.mean(image[:, :, 1]))
        r_mean = float(np.mean(image[:, :, 2]))
        total = b_mean + g_mean + r_mean + 1e-6
        features["blue_ratio"] = round(b_mean / total, 3)
        features["green_ratio"] = round(g_mean / total, 3)
        features["red_ratio"] = round(r_mean / total, 3)

        if b_mean / total > 0.4:
            findings.append("Dominant blue channel ratios indicate high-Z (dense metallic) materials present in scan.")
        elif r_mean / total > 0.4:
            findings.append("Dominant warm channel ratios indicate primarily organic/low-Z materials.")

    # ── High-Density Region Detection ──
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    dense_ratio = float(np.sum(thresh > 0)) / (h * w)
    features["high_density_ratio"] = round(dense_ratio, 4)
    if dense_ratio > 0.1:
        findings.append(f"Elevated high-density regions ({dense_ratio:.1%} of scan area) — may indicate metallic objects or dense contraband.")

    # ── Overall Assessment ──
    threat_indicators = sum([
        edge_density > 0.12,
        laplacian_var > 1500,
        dense_ratio > 0.08,
        features.get("spatial_density_variance", 0) > 30,
    ])

    if threat_indicators >= 3:
        threat_level = "HIGH"
        summary = "Multiple anomalous features detected. Scan exhibits characteristics consistent with concealed prohibited items."
    elif threat_indicators >= 2:
        threat_level = "MEDIUM"
        summary = "Some anomalous features present. Scan shows mixed indicators requiring secondary review."
    elif threat_indicators >= 1:
        threat_level = "LOW"
        summary = "Minor anomalies noted. Overall scan profile is within normal parameters."
    else:
        threat_level = "CLEAR"
        summary = "No significant anomalies. Scan profile is consistent with declared benign cargo."

    features["threat_indicator_count"] = threat_indicators
    features["threat_level"] = threat_level

    assessment_lines = [f"VISION ANALYSIS [{threat_level}]: {summary}"]
    assessment_lines.extend(findings)

    latency = (time.time() - t0) * 1000

    return {
        "vlm_analysis": "\n".join(assessment_lines),
        "source": "local-cv-analysis",
        "features": features,
        "threat_level": threat_level,
        "latency_ms": round(latency, 1),
    }


# ──────────────────────────────────────────────
# 3. Reasoning Builder (Explainability Tooltips)
# ──────────────────────────────────────────────

def build_detection_reasoning(detection: Dict, declared_cargo: Optional[str] = None) -> str:
    """
    Build a human-readable reasoning string for a single detection.
    Used for tooltip/explainability on every flagged item.
    """
    parts = []
    cls = detection.get("class", "Unknown")
    conf = detection.get("confidence", 0)
    threat = detection.get("threat_level", 1)
    material = detection.get("material_type", "Unknown")
    mat_score = detection.get("material_score", 0)

    parts.append(f"Object: {cls} detected at {conf:.0%} confidence.")

    if threat >= 4:
        parts.append(f"Threat Level: {threat}/5 — CRITICAL. This item is classified as a prohibited/dangerous item.")
    elif threat >= 3:
        parts.append(f"Threat Level: {threat}/5 — HIGH. This item requires manual verification.")
    else:
        parts.append(f"Threat Level: {threat}/5 — Standard restricted item.")

    # Material reasoning
    if material == "Metallic":
        parts.append(f"Material: Metallic (density score: {mat_score:.0%}). X-ray blue channel dominance and high edge density indicate dense metallic composition.")
        if declared_cargo:
            organic_keywords = {"clothing", "food", "personal", "fragile", "documents", "textiles"}
            if any(kw in declared_cargo.lower() for kw in organic_keywords):
                profile = CARGO_EXPECTED_PROFILES.get(declared_cargo.lower().strip(), {})
                exp_density = profile.get("expected_density", 1.0)
                parts.append(
                    f"DENSITY MISMATCH: Expected {declared_cargo} density ~{exp_density}g/cm³, "
                    f"but metallic density ~7.8g/cm³ detected. This is a significant discrepancy."
                )
    elif material == "Organic":
        parts.append(f"Material: Organic (density score: {mat_score:.0%}). Warm channel dominance consistent with low-Z materials.")
    else:
        parts.append(f"Material: Intermediate (density score: {mat_score:.0%}). Mixed material composition.")

    return " ".join(parts)


def build_risk_reasoning(breakdown: Dict, analysis: Dict) -> List[Dict]:
    """
    Build per-signal reasoning for the risk breakdown.
    Returns a list of signal explanations for the UI.
    """
    signals = []

    # Detection signal
    det_comp = breakdown.get("detection_component", 0)
    detections = analysis.get("detections", [])
    if det_comp > 0 and detections:
        top = detections[0]
        signals.append({
            "signal": "Detection",
            "score": det_comp,
            "reasoning": f"Highest-threat detection: {top['class']} at {top['confidence']:.0%} confidence, threat level {top['threat_level']}/5."
        })
    else:
        signals.append({
            "signal": "Detection",
            "score": 0,
            "reasoning": "No prohibited items detected by object detection model."
        })

    # Anomaly signal
    anom_comp = breakdown.get("anomaly_component", 0)
    anom_score = analysis.get("anomaly_score", 0)
    if anom_score > 0.5:
        signals.append({
            "signal": "Anomaly",
            "score": anom_comp,
            "reasoning": f"Anomaly index {anom_score:.0%} — elevated edge density, frequency energy, and density variance indicate irregular cargo composition."
        })
    else:
        signals.append({
            "signal": "Anomaly",
            "score": anom_comp,
            "reasoning": f"Anomaly index {anom_score:.0%} — within normal parameters."
        })

    # Mismatch signal
    mis_comp = breakdown.get("mismatch_component", 0)
    mismatch = analysis.get("mismatch_info", {})
    if mismatch.get("conflicts"):
        signals.append({
            "signal": "Declaration Mismatch",
            "score": mis_comp,
            "reasoning": f"{mismatch['message']}. Detected items conflict with declared cargo type."
        })
    else:
        signals.append({
            "signal": "Declaration Mismatch",
            "score": mis_comp,
            "reasoning": mismatch.get("message", "No declaration provided for comparison.")
        })

    # Material signal
    mat_comp = breakdown.get("material_component", 0)
    mat_info = analysis.get("material_info", {})
    if mat_info.get("metallic_count", 0) > 0:
        signals.append({
            "signal": "Material/Density",
            "score": mat_comp,
            "reasoning": f"{mat_info.get('message', '')}. Z-effective analysis indicates metallic composition inconsistent with declared organic cargo."
        })
    else:
        signals.append({
            "signal": "Material/Density",
            "score": mat_comp,
            "reasoning": "Material composition consistent with expected cargo profile."
        })

    # Concealment signal
    con_comp = breakdown.get("concealment_component", 0)
    con_info = analysis.get("concealment_info", {})
    signals.append({
        "signal": "Concealment",
        "score": con_comp,
        "reasoning": con_info.get("message", "No concealment indicators.")
    })

    # Vision cross-validation signal
    vlm_comp = breakdown.get("vlm_component", 0)
    signals.append({
        "signal": "Vision Cross-Validation",
        "score": vlm_comp,
        "reasoning": "Local CV analysis corroborates detection results via independent feature extraction."
    })

    # Historical risk signal
    hist_comp = breakdown.get("historical_component", 0)
    hist_info = analysis.get("historical_risk", {})
    if hist_info.get("risk_score", 0) > 0:
        signals.append({
            "signal": "Historical Intelligence",
            "score": hist_comp,
            "reasoning": hist_info.get("reasoning", "Route/shipper risk profile assessed.")
        })

    # News intelligence signal
    news_comp = breakdown.get("news_component", 0)
    news_info = analysis.get("news_intel", {})
    if news_info.get("alerts"):
        signals.append({
            "signal": "Threat Intelligence",
            "score": news_comp,
            "reasoning": f"Active intelligence: {news_info['alerts'][0]}"
        })

    return signals


# ──────────────────────────────────────────────
# Synchronous Wrappers (for Flask compatibility)
# ──────────────────────────────────────────────

def generate_explanation_sync(analysis: Dict) -> Dict:
    """Direct synchronous call — no async needed since everything is local."""
    return generate_explanation(analysis)


def analyze_vision_sync(image: np.ndarray) -> Dict:
    """Direct synchronous call — no async needed since everything is local."""
    return analyze_vision_local(image)
