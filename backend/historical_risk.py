"""
Project Aegis — M4: Historical Risk / Bayesian Scoring Module
Bayesian risk scoring based on route, shipper, and cargo type history.

Seeded profiles:
  - Guayaquil → Antwerp (Narcotics corridor, risk 92)
  - Libya → Crete (Smuggling/pressure shift, risk 88)
  - Shipper 'Aether Electronics' (Under-declaration, risk 78)
  - Organic cargo from South America: baseline 85
"""

import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import yaml

logger = logging.getLogger("aegis.historical_risk")

CONFIG_PATH = Path(__file__).parent / "config.yaml"
DATA_DIR = Path(__file__).parent


def _load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ──────────────────────────────────────────────
# Risk Profile Database
# ──────────────────────────────────────────────

# Pre-seeded risk intelligence database
ROUTE_RISK_DB = {
    "guayaquil|antwerp": {
        "risk_score": 92,
        "risk_type": "Narcotics",
        "corridor": "Guayaquil → Antwerp",
        "notes": "Primary cocaine trafficking corridor. Containerized cargo frequently used. High interception rate at Antwerp port.",
        "historical_seizures": 47,
        "last_seizure": "2026-02",
        "commodity_risk": {"organic": 0.95, "food": 0.90, "clothing": 0.85},
    },
    "libya|crete": {
        "risk_score": 88,
        "risk_type": "Smuggling/Arms",
        "corridor": "Libya → Crete",
        "notes": "High-risk pressure shifting route. Firearms, contraband, and human trafficking concerns. Unstable origin state.",
        "historical_seizures": 23,
        "last_seizure": "2026-01",
        "commodity_risk": {"electronics": 0.80, "machinery": 0.75, "personal": 0.70},
    },
    "colombia|rotterdam": {
        "risk_score": 85,
        "risk_type": "Narcotics",
        "corridor": "Colombia → Rotterdam",
        "notes": "Secondary narcotics corridor via European ports.",
        "historical_seizures": 31,
        "last_seizure": "2025-11",
        "commodity_risk": {"organic": 0.90, "food": 0.85},
    },
    "dubai|any": {
        "risk_score": 55,
        "risk_type": "Gold/Luxury Smuggling",
        "corridor": "Dubai → Various",
        "notes": "Gold and luxury goods smuggling hub. Under-valuation common.",
        "historical_seizures": 12,
        "last_seizure": "2025-12",
        "commodity_risk": {"electronics": 0.60, "personal": 0.50},
    },
    "china|any": {
        "risk_score": 40,
        "risk_type": "Counterfeiting/IP",
        "corridor": "China → Various",
        "notes": "Counterfeit goods and IP infringement risk. High volume trade mitigates per-shipment risk.",
        "historical_seizures": 18,
        "last_seizure": "2026-01",
        "commodity_risk": {"electronics": 0.50, "clothing": 0.45},
    },
}

SHIPPER_RISK_DB = {
    "aether electronics": {
        "risk_score": 78,
        "risk_type": "Under-declaration",
        "notes": "Historical pattern of under-declaring luxury/high-value items. 3 recorded discrepancies in past 12 months.",
        "incident_count": 3,
        "last_incident": "2025-10",
        "flagged_categories": ["electronics", "personal"],
    },
    "global transit corp": {
        "risk_score": 45,
        "risk_type": "Documentation",
        "notes": "Minor documentation inconsistencies. Generally compliant.",
        "incident_count": 1,
        "last_incident": "2025-06",
        "flagged_categories": ["machinery"],
    },
}

# South American hubs with elevated organic cargo baseline
SOUTH_AMERICAN_HUBS = {
    "guayaquil", "bogota", "medellin", "lima", "cartagena",
    "santos", "buenos aires", "valparaiso", "callao", "barranquilla",
    "colombia", "ecuador", "peru", "bolivia", "brazil", "argentina",
    "chile", "venezuela", "south america"
}


# ──────────────────────────────────────────────
# Bayesian Risk Computation
# ──────────────────────────────────────────────

def compute_historical_risk(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    shipper: Optional[str] = None,
    cargo_type: Optional[str] = None,
    detections: Optional[List[Dict]] = None,
) -> Dict:
    """
    Compute Bayesian historical risk score.

    Prior = historical intelligence (route + shipper + cargo baseline)
    Likelihood = current scan evidence (detection results)
    Posterior = weighted combination

    Returns:
        risk_score: int (0-100)
        risk_factors: List[Dict] — contributing factors with reasoning
        reasoning: str — summary reasoning
    """
    t0 = time.time()
    config = _load_config()
    hist_cfg = config.get("historical_risk", {})
    prior_weight = hist_cfg.get("prior_weight", 0.4)
    scan_weight = hist_cfg.get("scan_weight", 0.6)

    risk_factors = []
    prior_scores = []

    # ── Route Risk ──
    route_risk = _get_route_risk(origin, destination)
    if route_risk:
        prior_scores.append(route_risk["risk_score"])
        risk_factors.append({
            "factor": "Route Intelligence",
            "score": route_risk["risk_score"],
            "type": route_risk["risk_type"],
            "detail": route_risk["notes"],
            "corridor": route_risk.get("corridor", f"{origin} → {destination}"),
            "seizures": route_risk.get("historical_seizures", 0),
        })

    # ── Shipper Risk ──
    shipper_risk = _get_shipper_risk(shipper)
    if shipper_risk:
        prior_scores.append(shipper_risk["risk_score"])
        risk_factors.append({
            "factor": "Shipper Profile",
            "score": shipper_risk["risk_score"],
            "type": shipper_risk["risk_type"],
            "detail": shipper_risk["notes"],
            "incidents": shipper_risk.get("incident_count", 0),
        })

    # ── South American Organic Cargo Baseline ──
    if origin and cargo_type:
        origin_lower = origin.lower().strip()
        cargo_lower = cargo_type.lower().strip()
        is_south_american = any(hub in origin_lower for hub in SOUTH_AMERICAN_HUBS)
        is_organic = cargo_lower in {"organic", "food", "clothing", "textiles", "personal", "fragile"}

        if is_south_american and is_organic:
            baseline = 85
            prior_scores.append(baseline)
            risk_factors.append({
                "factor": "Regional Cargo Baseline",
                "score": baseline,
                "type": "Elevated Baseline",
                "detail": f"Organic cargo from South American hub ({origin}). Baseline risk score 85/100 due to historical narcotics concealment patterns.",
            })

    # ── Route-Cargo Cross-Reference ──
    if route_risk and cargo_type:
        cargo_lower = cargo_type.lower().strip()
        commodity_risks = route_risk.get("commodity_risk", {})
        for commodity, risk_mult in commodity_risks.items():
            if commodity in cargo_lower:
                adjusted = int(route_risk["risk_score"] * risk_mult)
                prior_scores.append(adjusted)
                risk_factors.append({
                    "factor": "Route-Cargo Cross-Reference",
                    "score": adjusted,
                    "type": "Correlation",
                    "detail": f"'{cargo_type}' cargo on {route_risk.get('corridor', 'this route')} has {risk_mult:.0%} historical correlation with {route_risk['risk_type']} seizures.",
                })
                break

    # ── Compute Prior Score ──
    if prior_scores:
        prior_risk = max(prior_scores)  # Use max risk signal (conservative)
    else:
        prior_risk = 20  # Default baseline for unknown routes/shippers

    # ── Likelihood from Current Scan ──
    scan_risk = 0
    if detections:
        high_threat = [d for d in detections if d.get("threat_level", 0) >= 4]
        med_threat = [d for d in detections if d.get("threat_level", 0) == 3]
        if high_threat:
            scan_risk = min(100, 60 + len(high_threat) * 15)
        elif med_threat:
            scan_risk = min(100, 30 + len(med_threat) * 10)
        else:
            scan_risk = min(100, len(detections) * 5)

    # ── Bayesian Posterior ──
    posterior = int(prior_weight * prior_risk + scan_weight * scan_risk)
    posterior = max(0, min(100, posterior))

    # ── Build Reasoning ──
    if risk_factors:
        top_factor = max(risk_factors, key=lambda f: f["score"])
        reasoning = (
            f"Historical risk: {posterior}/100. "
            f"Primary factor: {top_factor['factor']} — {top_factor['type']} "
            f"(score {top_factor['score']}/100). {top_factor['detail']}"
        )
    else:
        reasoning = f"Historical risk: {posterior}/100. No specific historical intelligence available for this route/shipper."

    latency = (time.time() - t0) * 1000

    return {
        "risk_score": posterior,
        "prior_risk": prior_risk,
        "scan_risk": scan_risk,
        "risk_factors": risk_factors,
        "reasoning": reasoning,
        "origin": origin,
        "destination": destination,
        "shipper": shipper,
        "cargo_type": cargo_type,
        "latency_ms": round(latency, 1),
    }


def _get_route_risk(origin: Optional[str], destination: Optional[str]) -> Optional[Dict]:
    """Look up route in risk database."""
    if not origin and not destination:
        return None

    origin_lower = (origin or "").lower().strip()
    dest_lower = (destination or "").lower().strip()

    # Exact route match
    key = f"{origin_lower}|{dest_lower}"
    if key in ROUTE_RISK_DB:
        return ROUTE_RISK_DB[key]

    # Origin-to-any match
    for route_key, route_data in ROUTE_RISK_DB.items():
        parts = route_key.split("|")
        if len(parts) == 2:
            r_origin, r_dest = parts
            if r_origin in origin_lower and (r_dest == "any" or r_dest in dest_lower):
                return route_data
            if r_dest in dest_lower and r_origin in origin_lower:
                return route_data

    return None


def _get_shipper_risk(shipper: Optional[str]) -> Optional[Dict]:
    """Look up shipper in risk database."""
    if not shipper:
        return None

    shipper_lower = shipper.lower().strip()
    for shipper_key, shipper_data in SHIPPER_RISK_DB.items():
        if shipper_key in shipper_lower or shipper_lower in shipper_key:
            return shipper_data

    return None


# ──────────────────────────────────────────────
# Risk Profile Query API
# ──────────────────────────────────────────────

def get_known_routes() -> List[Dict]:
    """Return all known high-risk routes for display."""
    routes = []
    for key, data in ROUTE_RISK_DB.items():
        parts = key.split("|")
        routes.append({
            "origin": parts[0].title() if len(parts) > 0 else "Unknown",
            "destination": parts[1].title() if len(parts) > 1 else "Any",
            "risk_score": data["risk_score"],
            "risk_type": data["risk_type"],
            "corridor": data.get("corridor", key),
            "seizures": data.get("historical_seizures", 0),
            "notes": data["notes"],
        })
    return sorted(routes, key=lambda r: r["risk_score"], reverse=True)


def get_known_shippers() -> List[Dict]:
    """Return all known flagged shippers for display."""
    shippers = []
    for key, data in SHIPPER_RISK_DB.items():
        shippers.append({
            "name": key.title(),
            "risk_score": data["risk_score"],
            "risk_type": data["risk_type"],
            "incidents": data.get("incident_count", 0),
            "notes": data["notes"],
        })
    return sorted(shippers, key=lambda s: s["risk_score"], reverse=True)
