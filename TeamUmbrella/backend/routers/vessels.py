"""
RED QUEEN — Vessels Router
API endpoints for vessel tracking and information
"""

from typing import List
from fastapi import APIRouter

router = APIRouter()


@router.get("/vessels")
async def get_vessels() -> List[dict]:
    """
    Get list of vessels approaching port.
    
    Returns:
        List of vessel information including position, cargo, and risk level
    """
    return [
        {
            "id": "v001",
            "name": "MV Zafar",
            "flag": "Pakistan",
            "origin": "Karachi",
            "eta": "23 Mar 2026 06:30",
            "declared_cargo": "Textile Goods",
            "risk_level": "HIGH",
            "ais_status": "Transmitting",
            "lat": 19.8,
            "lng": 67.2
        },
        {
            "id": "v002",
            "name": "KM Atlas",
            "flag": "Iran",
            "origin": "Bandar Abbas",
            "eta": "24 Mar 2026 14:00",
            "declared_cargo": "Machine Parts",
            "risk_level": "HIGH",
            "ais_status": "Intermittent",
            "lat": 21.2,
            "lng": 65.8
        },
        {
            "id": "v003",
            "name": "Al Noor",
            "flag": "UAE",
            "origin": "Dubai",
            "eta": "22 Mar 2026 22:00",
            "declared_cargo": "Consumer Electronics",
            "risk_level": "MEDIUM",
            "ais_status": "Transmitting",
            "lat": 20.1,
            "lng": 66.5
        },
        {
            "id": "v004",
            "name": "SL Cargo 7",
            "flag": "Sri Lanka",
            "origin": "Colombo",
            "eta": "22 Mar 2026 08:45",
            "declared_cargo": "Spices and Foodstuff",
            "risk_level": "MEDIUM",
            "ais_status": "Transmitting",
            "lat": 17.5,
            "lng": 72.8
        },
        {
            "id": "v005",
            "name": "Pacific Star",
            "flag": "Singapore",
            "origin": "Singapore",
            "eta": "25 Mar 2026 10:00",
            "declared_cargo": "Industrial Equipment",
            "risk_level": "LOW",
            "ais_status": "Transmitting",
            "lat": 18.9,
            "lng": 69.4
        },
        {
            "id": "v006",
            "name": "Nord Express",
            "flag": "Germany",
            "origin": "Hamburg",
            "eta": "26 Mar 2026 16:20",
            "declared_cargo": "Pharmaceuticals",
            "risk_level": "LOW",
            "ais_status": "Transmitting",
            "lat": 20.5,
            "lng": 68.1
        }
    ]
