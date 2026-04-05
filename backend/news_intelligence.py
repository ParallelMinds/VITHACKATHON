"""
Project Aegis — M8: News Intelligence / Threat Pulse Module
Fetches News API → extracts smuggling trends → dynamically adjusts detection sensitivity.

Key features:
  - Monitors for seizure, contraband, customs fraud keywords
  - Tracks monitored ports (Antwerp, Rotterdam, Guayaquil, Crete, Dubai, etc.)
  - When news reports a seizure at a port, boosts risk for incoming shipments
  - Caches results (5-min TTL) to minimize API calls
"""

import logging
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import yaml
from pathlib import Path

logger = logging.getLogger("aegis.news_intel")

CONFIG_PATH = Path(__file__).parent / "config.yaml"


def _load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ──────────────────────────────────────────────
# Cache
# ──────────────────────────────────────────────

_cache = {
    "articles": [],
    "threat_pulse": {},
    "port_alerts": {},
    "weight_adjustments": {},
    "last_fetch": 0,
    "fetch_error": None,
}


# ──────────────────────────────────────────────
# News API Fetch
# ──────────────────────────────────────────────

def _fetch_news(config: dict) -> List[Dict]:
    """Fetch articles from News API."""
    try:
        import requests
    except ImportError:
        logger.error("requests library not installed")
        return []

    news_cfg = config.get("news_api", {})
    api_key = news_cfg.get("api_key", "")
    base_url = news_cfg.get("base_url", "https://newsapi.org/v2/everything")
    keywords = news_cfg.get("keywords", [])
    max_articles = news_cfg.get("max_articles", 20)

    if not api_key:
        logger.warning("News API key not configured")
        return []

    # Build query from keywords
    query = " OR ".join(f'"{kw}"' for kw in keywords[:5])

    # Fetch last 7 days
    from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        response = requests.get(
            base_url,
            params={
                "q": query,
                "from": from_date,
                "sortBy": "relevancy",
                "pageSize": max_articles,
                "language": "en",
                "apiKey": api_key,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "ok":
            logger.warning(f"News API returned status: {data.get('status')}")
            return []

        articles = data.get("articles", [])
        logger.info(f"Fetched {len(articles)} news articles")
        return articles

    except Exception as e:
        logger.warning(f"News API fetch failed: {e}")
        _cache["fetch_error"] = str(e)
        return []


# ──────────────────────────────────────────────
# Analysis Engine
# ──────────────────────────────────────────────

def _analyze_articles(articles: List[Dict], config: dict) -> Dict:
    """
    Analyze fetched articles to extract:
      - Port-specific alerts
      - Commodity threat pulse
      - Dynamic weight adjustments
    """
    news_cfg = config.get("news_api", {})
    monitored_ports = [p.lower() for p in news_cfg.get("monitored_ports", [])]
    boost_keywords = news_cfg.get("boost_keywords", {})
    port_boost = news_cfg.get("port_boost_multiplier", 1.25)

    port_alerts = {}       # port → list of alerts
    threat_pulse = {}      # keyword → count
    weight_adjustments = {} # port → multiplier

    for article in articles:
        title = (article.get("title") or "").lower()
        desc = (article.get("description") or "").lower()
        content = (article.get("content") or "").lower()
        combined = f"{title} {desc} {content}"
        source = article.get("source", {}).get("name", "Unknown")
        pub_date = article.get("publishedAt", "")[:10]

        # Track keyword frequency
        for keyword, boost_val in boost_keywords.items():
            if keyword in combined:
                threat_pulse[keyword] = threat_pulse.get(keyword, 0) + 1

        # Check for port mentions
        for port in monitored_ports:
            if port in combined:
                if port not in port_alerts:
                    port_alerts[port] = []

                # Extract relevant info
                alert_text = _extract_alert(article, port, boost_keywords)
                if alert_text:
                    port_alerts[port].append({
                        "alert": alert_text,
                        "source": source,
                        "date": pub_date,
                        "url": article.get("url", ""),
                    })

                    # Apply port boost
                    # More mentions = higher boost
                    current_boost = weight_adjustments.get(port, 1.0)
                    weight_adjustments[port] = min(2.0, current_boost * port_boost)

    return {
        "port_alerts": port_alerts,
        "threat_pulse": threat_pulse,
        "weight_adjustments": weight_adjustments,
    }


def _extract_alert(article: Dict, port: str, boost_keywords: Dict) -> Optional[str]:
    """Extract a concise alert string from an article mentioning a port."""
    title = article.get("title", "")
    desc = article.get("description", "")
    combined = f"{title} {desc}".lower()

    # Find which threat keywords appear
    found_threats = []
    for keyword in boost_keywords:
        if keyword in combined:
            found_threats.append(keyword)

    if not found_threats:
        return None

    threats_str = ", ".join(found_threats)
    source = article.get("source", {}).get("name", "Unknown Source")
    date = article.get("publishedAt", "")[:10]

    return f"{port.title()} — {threats_str} reported ({source}, {date}): {title[:120]}"


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def get_threat_intelligence(force_refresh: bool = False) -> Dict:
    """
    Get current threat intelligence. Uses cached data if available.

    Returns:
        alerts: List[str] — top-level alert strings
        port_alerts: Dict[str, List] — per-port detailed alerts
        threat_pulse: Dict[str, int] — keyword frequency
        weight_adjustments: Dict[str, float] — per-port risk multipliers
        last_updated: str
        source: str
    """
    config = _load_config()
    news_cfg = config.get("news_api", {})

    if not news_cfg.get("enabled", False):
        return {
            "alerts": [],
            "port_alerts": {},
            "threat_pulse": {},
            "weight_adjustments": {},
            "last_updated": None,
            "source": "disabled",
        }

    cache_ttl = news_cfg.get("cache_ttl_seconds", 300)
    now = time.time()

    # Check cache
    if not force_refresh and (now - _cache["last_fetch"]) < cache_ttl and _cache["articles"]:
        analysis = _analyze_articles(_cache["articles"], config)
        return _build_response(analysis, from_cache=True)

    # Fetch fresh data
    articles = _fetch_news(config)
    if articles:
        _cache["articles"] = articles
        _cache["last_fetch"] = now
        _cache["fetch_error"] = None
    elif _cache["articles"]:
        # Use stale cache if fetch failed
        articles = _cache["articles"]
        logger.info("Using cached articles after fetch failure")

    if not articles:
        return {
            "alerts": ["News intelligence unavailable — API fetch failed"],
            "port_alerts": {},
            "threat_pulse": {},
            "weight_adjustments": {},
            "last_updated": None,
            "source": "error",
            "error": _cache.get("fetch_error", "No data"),
        }

    analysis = _analyze_articles(articles, config)
    _cache["port_alerts"] = analysis["port_alerts"]
    _cache["threat_pulse"] = analysis["threat_pulse"]
    _cache["weight_adjustments"] = analysis["weight_adjustments"]

    return _build_response(analysis, from_cache=False)


def _build_response(analysis: Dict, from_cache: bool) -> Dict:
    """Build the public response from analysis results."""
    # Build top-level alerts
    alerts = []
    for port, port_alert_list in analysis["port_alerts"].items():
        for alert_info in port_alert_list[:2]:  # Max 2 per port
            alerts.append(alert_info["alert"])

    # Add threat pulse summary
    pulse = analysis["threat_pulse"]
    if pulse:
        top_threats = sorted(pulse.items(), key=lambda x: x[1], reverse=True)[:3]
        pulse_str = ", ".join(f"{kw} ({count} reports)" for kw, count in top_threats)
        alerts.insert(0, f"Active Threat Pulse: {pulse_str}")

    # Add port boost alerts
    for port, multiplier in analysis["weight_adjustments"].items():
        if multiplier > 1.1:
            alerts.append(
                f"DYNAMIC BOOST: Risk multiplier for {port.title()} shipments increased to {multiplier:.2f}x due to active intelligence."
            )

    return {
        "alerts": alerts[:10],  # Cap at 10 alerts
        "port_alerts": analysis["port_alerts"],
        "threat_pulse": analysis["threat_pulse"],
        "weight_adjustments": analysis["weight_adjustments"],
        "article_count": len(_cache.get("articles", [])),
        "last_updated": datetime.fromtimestamp(_cache["last_fetch"]).strftime("%Y-%m-%d %H:%M:%S") if _cache["last_fetch"] else None,
        "source": "cache" if from_cache else "live",
    }


def get_port_risk_multiplier(port: str) -> float:
    """
    Get the dynamic risk multiplier for a specific port.
    Used by risk fusion to adjust weights based on active intelligence.
    """
    if not _cache["weight_adjustments"]:
        # Try to refresh
        get_threat_intelligence()

    port_lower = port.lower().strip()
    return _cache.get("weight_adjustments", {}).get(port_lower, 1.0)


def get_destination_boost(destination: Optional[str]) -> float:
    """
    Check if a destination matches any port with active intelligence.
    Returns the boost multiplier (1.0 = no boost).
    """
    if not destination:
        return 1.0

    dest_lower = destination.lower().strip()
    adjustments = _cache.get("weight_adjustments", {})

    for port, multiplier in adjustments.items():
        if port in dest_lower or dest_lower in port:
            return multiplier

    return 1.0
