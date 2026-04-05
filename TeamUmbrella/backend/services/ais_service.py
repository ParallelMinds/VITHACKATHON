"""
RED QUEEN — AIS Service
Automatic Identification System service for ship tracking
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime


class AISTrackingService:
    """
    Service for fetching ship data from AIS APIs.
    Uses AISStream.io or similar free AIS data sources.
    """

    def __init__(self, api_key: str = None):
        """Initialize the AIS tracking service."""
        # AISStream API endpoint and key
        self.base_url = "https://api.aisstream.io/v1"
        self.api_key = api_key or "df40ab2ec6a10049a0231c8816da1ceca7ac1f31"
        self.timeout = 10.0  # seconds

    async def get_nearby_ships(
        self,
        lat: float,
        lon: float,
        radius_km: float = 50.0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get ships near a given location.

        Args:
            lat: Latitude of the center point
            lon: Longitude of the center point
            radius_km: Search radius in kilometers
            limit: Maximum number of ships to return

        Returns:
            List of simplified ship data
        """
        # Calculate bounding box
        lat_range = radius_km / 111.0  # ~111 km per degree latitude
        lon_range = radius_km / (111.0 * abs(__import__("math").cos(__import__("math").radians(lat))))

        min_lat = lat - lat_range
        max_lat = lat + lat_range
        min_lon = lon - lon_range
        max_lon = lon + lon_range

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Try AISStream API first with authentication
                headers = {"Authorization": f"Token {self.api_key}"} if self.api_key else {}
                response = await client.get(
                    f"{self.base_url}/vessels",
                    params={
                        "minLat": min_lat,
                        "maxLat": max_lat,
                        "minLon": min_lon,
                        "maxLon": max_lon,
                        "limit": limit
                    },
                    headers=headers
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_aisstream_response(data.get("vessels", []))

        except httpx.HTTPError as e:
            print(f"[AISTrackingService] AISStream API error: {e}")

        # Fallback: Return mock data for demonstration
        return self._get_mock_ships(lat, lon, limit)

    def _parse_aisstream_response(self, vessels: List[Dict]) -> List[Dict[str, Any]]:
        """
        Parse AISStream API response to simplified ship format.

        Args:
            vessels: Raw vessel data from API

        Returns:
            List of simplified ship data
        """
        ships = []
        for vessel in vessels:
            ship_data = {
                "name": vessel.get("ShipName", "Unknown"),
                "lat": vessel.get("Latitude", 0.0),
                "lon": vessel.get("Longitude", 0.0),
                "speed": vessel.get("SOG", 0.0),  # Speed Over Ground
                "heading": vessel.get("TrueHeading", 0),
                "type": self._get_vessel_type(vessel.get("ShipType", 0))
            }
            ships.append(ship_data)
        return ships

    def _get_vessel_type(self, ship_type_code: int) -> str:
        """
        Convert AIS ship type code to human-readable type.

        Args:
            ship_type_code: AIS ship type code

        Returns:
            Human-readable vessel type
        """
        type_mapping = {
            20: "WIG",
            30: "Fishing",
            31: "Fishing",
            32: "Fishing",
            33: "Fishing",
            34: "Fishing",
            35: "Fishing",
            36: "Fishing",
            37: "Fishing",
            40: "Sailing",
            41: "Sailing",
            42: "Sailing",
            43: "Sailing",
            44: "Sailing",
            48: "Sailing",
            49: "Sailing",
            50: "Pleasure",
            51: "Pleasure",
            52: "Pleasure",
            53: "Pleasure",
            54: "Pleasure",
            55: "Pleasure",
            58: "Pleasure",
            60: "Cargo",
            61: "Cargo",
            62: "Cargo",
            63: "Cargo",
            64: "Cargo",
            65: "Cargo",
            66: "Cargo",
            67: "Cargo",
            68: "Cargo",
            69: "Cargo",
            70: "Cargo",
            71: "Cargo",
            72: "Cargo",
            73: "Cargo",
            74: "Cargo",
            75: "Cargo",
            76: "Cargo",
            77: "Cargo",
            78: "Cargo",
            79: "Cargo",
            80: "Tanker",
            81: "Tanker",
            82: "Tanker",
            83: "Tanker",
            84: "Tanker",
            85: "Tanker",
            86: "Tanker",
            87: "Tanker",
            88: "Tanker",
            89: "Tanker",
            90: "Tanker",
            91: "Tanker",
            92: "Tanker",
            93: "Tanker",
            94: "Tanker",
            95: "Tanker",
            96: "Tanker",
            97: "Tanker",
            98: "Tanker",
            99: "Tanker",
            100: "Other",
            101: "Other",
            102: "Other",
        }

        # Default ranges
        if 60 <= ship_type_code <= 79:
            return "Cargo"
        elif 80 <= ship_type_code <= 99:
            return "Tanker"
        elif 30 <= ship_type_code <= 39:
            return "Fishing"
        elif 40 <= ship_type_code <= 49:
            return "Sailing"
        elif 50 <= ship_type_code <= 59:
            return "Pleasure"

        return type_mapping.get(ship_type_code, "Other")

    def _get_mock_ships(self, lat: float, lon: float, limit: int) -> List[Dict[str, Any]]:
        """
        Generate mock ship data for demonstration when API is unavailable.

        Args:
            lat: Center latitude
            lon: Center longitude
            limit: Maximum number of ships

        Returns:
            List of mock ship data
        """
        import random

        ship_names = [
            "MSC ANNA", "EVER GIVEN", "MAERSK ESSEX", "CMA CGM MARCO POLO",
            "HAPAG LLOYD BERLIN", "COSCO SHIPPING UNIVERSE", "ONE STORK",
            "YM WELLNESS", "ZIM SAMMY OFER", "HMM ALGECIRAS",
            "PACIFIC VOYAGER", "ATLANTIC STAR", "INDIAN PEARL", "ARABIAN KNIGHT",
            "NORDIC SPIRIT", "BALTIC WIND", "MEDITERRANEAN QUEEN", "RED SEA TRADER"
        ]

        vessel_types = ["Cargo", "Tanker", "Container Ship", "Bulk Carrier", "Fishing"]

        ships = []
        for i in range(min(limit, len(ship_names))):
            # Generate position near the requested location
            ship_lat = lat + random.uniform(-0.5, 0.5)
            ship_lon = lon + random.uniform(-0.5, 0.5)

            ship = {
                "name": ship_names[i],
                "lat": round(ship_lat, 4),
                "lon": round(ship_lon, 4),
                "speed": round(random.uniform(0.0, 25.0), 1),
                "heading": random.randint(0, 359),
                "type": random.choice(vessel_types)
            }
            ships.append(ship)

        return ships


# Singleton instance (API key from env or default)
import os
_ais_api_key = os.getenv("AIS_API_KEY", "df40ab2ec6a10049a0231c8816da1ceca7ac1f31")
ais_service = AISTrackingService(api_key=_ais_api_key)
