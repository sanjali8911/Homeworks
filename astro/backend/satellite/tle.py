"""
TLE (Two-Line Element) fetching, parsing, caching, and epoch management.
"""

import json
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import httpx
from sgp4.api import Satrec, WGS72

from backend.config import (
    TLE_CACHE_PATH,
    SATELLITES_JSON_PATH,
    CELESTRAK_URLS
)

logger = logging.getLogger("satellite.tle")


def parse_tle_epoch(line1: str) -> datetime:
    """Extract UTC datetime from TLE Line 1 epoch field."""
    epoch_str = line1[18:32].strip()
    year_prefix = int(epoch_str[:2])
    year = 2000 + year_prefix if year_prefix < 57 else 1900 + year_prefix
    day_of_year = float(epoch_str[2:])

    base_dt = datetime(year, 1, 1, tzinfo=timezone.utc)
    epoch_dt = base_dt + timedelta(days=day_of_year - 1.0)
    return epoch_dt


def parse_bstar(line1: str) -> float:
    """Parse BSTAR drag term from TLE Line 1."""
    raw = line1[53:61].strip()
    if not raw or raw == "00000+0" or raw == "00000-0":
        return 0.0
    try:
        mantissa = float(raw[:-2]) / 100000.0
        exp = int(raw[-2:])
        return mantissa * (10.0 ** exp)
    except Exception:
        return 0.0


def parse_tle_metadata(line1: str, line2: str, name: str = "") -> Dict[str, Any]:
    """Parse detailed orbital metadata from Two-Line Element strings."""
    norad_id = int(line1[2:7].strip())
    int_designator = line1[9:17].strip()
    epoch_dt = parse_tle_epoch(line1)
    bstar = parse_bstar(line1)
    mean_motion_dot = float(line1[33:43].strip() or 0.0)

    inclination = float(line2[8:16].strip())
    raan = float(line2[17:25].strip())
    eccentricity_str = "0." + line2[26:33].strip()
    eccentricity = float(eccentricity_str)
    arg_perigee = float(line2[34:42].strip())
    mean_anomaly = float(line2[43:51].strip())
    mean_motion = float(line2[52:63].strip())  # revs per day
    rev_number = int(line2[63:68].strip() or 0)

    # Compute derived semi-major axis (approx from mean motion)
    # n in rad/s: n_rad = mean_motion * 2*pi / 86400
    n_rad = mean_motion * (2.0 * math.pi) / 86400.0
    mu = 398600.4418
    semi_major_axis = (mu / (n_rad ** 2)) ** (1.0 / 3.0) if n_rad > 0 else 0.0
    period_min = (86400.0 / mean_motion) / 60.0 if mean_motion > 0 else 0.0

    return {
        "norad_id": norad_id,
        "name": name,
        "intl_designator": int_designator,
        "epoch_utc": epoch_dt.isoformat(),
        "bstar": bstar,
        "mean_motion_dot": mean_motion_dot,
        "inclination_deg": inclination,
        "raan_deg": raan,
        "eccentricity": eccentricity,
        "arg_perigee_deg": arg_perigee,
        "mean_anomaly_deg": mean_anomaly,
        "mean_motion_rev_day": mean_motion,
        "rev_number": rev_number,
        "semi_major_axis_km": round(semi_major_axis, 2),
        "period_minutes": round(period_min, 2),
        "line1": line1,
        "line2": line2
    }


class TLEManager:
    """Manages loading, parsing, refreshing, and caching of satellite TLEs."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._satellites: List[Dict[str, Any]] = []
        self.load_local_data()

    def load_local_data(self) -> None:
        """Load satellites catalog and TLE cache from local JSON files."""
        if SATELLITES_JSON_PATH.exists():
            try:
                with open(SATELLITES_JSON_PATH, "r", encoding="utf-8") as f:
                    self._satellites = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load satellites.json: {e}")

        if TLE_CACHE_PATH.exists():
            try:
                with open(TLE_CACHE_PATH, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load tle_cache.json: {e}")

    def save_cache(self) -> None:
        """Persist current TLE cache to disk."""
        try:
            with open(TLE_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save tle_cache.json: {e}")

    def get_satellites(self) -> List[Dict[str, Any]]:
        """Return the curated satellite metadata list."""
        return self._satellites

    def get_satellite_by_id(self, sat_id: str) -> Optional[Dict[str, Any]]:
        """Find satellite metadata by slug id or norad_id."""
        for sat in self._satellites:
            if sat["id"] == sat_id or str(sat["norad_id"]) == str(sat_id):
                return sat
        return None

    def get_tle(self, norad_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve cached TLE for given NORAD ID."""
        key = str(norad_id)
        if key in self._cache:
            return self._cache[key]
        return None

    def update_tle(self, norad_id: int, name: str, line1: str, line2: str) -> None:
        """Update or insert a TLE in memory and save cache."""
        key = str(norad_id)
        self._cache[key] = {
            "name": name,
            "line1": line1.strip(),
            "line2": line2.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        self.save_cache()

    async def refresh_from_celestrak(self) -> Dict[str, Any]:
        """Fetch fresh TLEs from CelesTrak groups and update tracked catalog."""
        updated_count = 0
        norad_map = {sat["norad_id"]: sat["name"] for sat in self._satellites}

        async with httpx.AsyncClient(timeout=15.0) as client:
            for url in CELESTRAK_URLS:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        lines = resp.text.strip().splitlines()
                        for i in range(0, len(lines) - 2, 3):
                            name_line = lines[i].strip()
                            l1 = lines[i+1].strip()
                            l2 = lines[i+2].strip()
                            if l1.startswith("1 ") and l2.startswith("2 "):
                                try:
                                    nid = int(l1[2:7].strip())
                                    if nid in norad_map:
                                        self._cache[str(nid)] = {
                                            "name": norad_map[nid],
                                            "line1": l1,
                                            "line2": l2,
                                            "updated_at": datetime.now(timezone.utc).isoformat()
                                        }
                                        updated_count += 1
                                except Exception:
                                    continue
                except Exception as e:
                    logger.warning(f"Could not fetch TLE from {url}: {e}")

        if updated_count > 0:
            self.save_cache()

        return {
            "status": "success",
            "updated_count": updated_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Singleton instance
tle_manager = TLEManager()
