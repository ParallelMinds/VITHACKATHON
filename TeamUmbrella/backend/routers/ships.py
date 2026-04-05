"""
RED QUEEN — Ships Router
API endpoints for ship tracking and AIS data
"""

from typing import List

from fastapi import APIRouter, Query, HTTPException

from models.schemas import ShipPosition
from services.ais_service import ais_service

router = APIRouter()


@router.get("/nearby", response_model=List[ShipPosition])
async def get_nearby_ships(
    lat: float = Query(..., description="Latitude of the center point"),
    lon: float = Query(..., description="Longitude of the center point"),
    radius: float = Query(default=50.0, description="Search radius in kilometers"),
    limit: int = Query(default=50, description="Maximum number of ships to return")
) -> List[dict]:
    """
    Get ships near a specified location using AIS data.

    Args:
        lat: Latitude of the center point
        lon: Longitude of the center point
        radius: Search radius in kilometers (default: 50)
        limit: Maximum number of ships to return (default: 50)

    Returns:
        List of ships with position, speed, heading, and type information
        formatted for direct use in frontend maps
    """
    try:
        ships = await ais_service.get_nearby_ships(
            lat=lat,
            lon=lon,
            radius_km=radius,
            limit=limit
        )
        # Return as list of dicts for frontend compatibility
        return ships
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve ship data: {str(e)}"
        )
