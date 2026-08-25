"""
Unified satellite orbital propagator:
- SGP4 high-accuracy analytical propagation
- RK4 numerical perturbation physics propagation
- Orbit path ribbon generator for 3D visualization
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sgp4.api import Satrec, jday

from backend.satellite.coordinate import (
    datetime_to_jd,
    eci_to_ecef,
    ecef_to_geodetic,
    eci_to_geodetic
)
from backend.satellite.physics import (
    state_to_keplerian,
    propagate_rk4,
    rk4_step
)
from backend.satellite.tle import tle_manager, parse_tle_metadata


class OrbitPropagator:
    """Propagates satellite state vectors using SGP4 and numerical physics models."""

    @staticmethod
    def create_satrec_from_tle(line1: str, line2: str) -> Satrec:
        """Instantiate SGP4 Satrec from TLE lines."""
        return Satrec.twoline2rv(line1, line2)

    @classmethod
    def propagate_sgp4(
        cls,
        line1: str,
        line2: str,
        target_dt: datetime
    ) -> Dict[str, Any]:
        """
        Propagate satellite to target_dt using SGP4.
        Returns state dictionary with ECI, ECEF, Geodetic coordinates, and Keplerian elements.
        """
        if target_dt.tzinfo is None:
            target_dt = target_dt.replace(tzinfo=timezone.utc)
        else:
            target_dt = target_dt.astimezone(timezone.utc)

        sat = cls.create_satrec_from_tle(line1, line2)
        jd, fr = jday(
            target_dt.year,
            target_dt.month,
            target_dt.day,
            target_dt.hour,
            target_dt.minute,
            target_dt.second + target_dt.microsecond / 1e6
        )

        e, r, v = sat.sgp4(jd, fr)
        if e != 0:
            raise RuntimeError(f"SGP4 propagation error code: {e}")

        r_eci = np.array(r, dtype=float)  # km
        v_eci = np.array(v, dtype=float)  # km/s

        r_ecef, v_ecef = eci_to_ecef(r_eci, v_eci, target_dt)
        lat, lon, alt = ecef_to_geodetic(r_ecef)
        keplerian = state_to_keplerian(r_eci, v_eci)

        # Ground speed
        ground_speed_km_s = float(np.linalg.norm(v_ecef))

        return {
            "timestamp": target_dt.isoformat(),
            "eci": {
                "x": round(float(r_eci[0]), 3),
                "y": round(float(r_eci[1]), 3),
                "z": round(float(r_eci[2]), 3),
                "vx": round(float(v_eci[0]), 4),
                "vy": round(float(v_eci[1]), 4),
                "vz": round(float(v_eci[2]), 4),
            },
            "ecef": {
                "x": round(float(r_ecef[0]), 3),
                "y": round(float(r_ecef[1]), 3),
                "z": round(float(r_ecef[2]), 3),
                "vx": round(float(v_ecef[0]), 4),
                "vy": round(float(v_ecef[1]), 4),
                "vz": round(float(v_ecef[2]), 4),
            },
            "geodetic": {
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "altitude_km": round(alt, 2),
                "ground_speed_km_s": round(ground_speed_km_s, 4),
            },
            "keplerian": keplerian,
            "_r_vec": r_eci,
            "_v_vec": v_eci,
            "_r_ecef": r_ecef,
            "_v_ecef": v_ecef
        }

    @classmethod
    def propagate_numerical(
        cls,
        r_init: np.ndarray,
        v_init: np.ndarray,
        start_dt: datetime,
        duration_seconds: float,
        step_size: float = 30.0,
        bstar: float = 0.0,
        include_j2: bool = True,
        include_drag: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Propagate forward in time from (r_init, v_init) using RK4 numerical physics.
        Returns list of predicted states at each step.
        """
        raw_traj = propagate_rk4(
            r_init=r_init,
            v_init=v_init,
            total_seconds=duration_seconds,
            step_size=step_size,
            bstar=bstar,
            include_j2=include_j2,
            include_drag=include_drag
        )

        results = []
        for offset_sec, r_vec, v_vec in raw_traj:
            step_dt = start_dt + timedelta(seconds=offset_sec)
            r_ecef, v_ecef = eci_to_ecef(r_vec, v_vec, step_dt)
            lat, lon, alt = ecef_to_geodetic(r_ecef)
            kepler = state_to_keplerian(r_vec, v_vec)

            results.append({
                "time_offset_sec": offset_sec,
                "timestamp": step_dt.isoformat(),
                "eci": {
                    "x": round(float(r_vec[0]), 3),
                    "y": round(float(r_vec[1]), 3),
                    "z": round(float(r_vec[2]), 3),
                    "vx": round(float(v_vec[0]), 4),
                    "vy": round(float(v_vec[1]), 4),
                    "vz": round(float(v_vec[2]), 4),
                },
                "ecef": {
                    "x": round(float(r_ecef[0]), 3),
                    "y": round(float(r_ecef[1]), 3),
                    "z": round(float(r_ecef[2]), 3),
                },
                "geodetic": {
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "altitude_km": round(alt, 2),
                },
                "keplerian": kepler
            })

        return results

    @classmethod
    def get_orbit_trajectory(
        cls,
        line1: str,
        line2: str,
        current_dt: datetime,
        num_points: int = 120,
        periods: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generate smooth 3D orbit trajectory ribbons in ECEF and ECI coordinates
        for 3D Earth visualization.
        """
        meta = parse_tle_metadata(line1, line2)
        period_min = max(meta["period_minutes"], 45.0)
        total_seconds = period_min * 60.0 * periods

        # Sample from -half_period to +half_period
        dt_start = current_dt - timedelta(seconds=total_seconds * 0.3)
        dt_end = current_dt + timedelta(seconds=total_seconds * 0.7)
        step_sec = total_seconds / max(num_points, 10)

        points_eci = []
        points_ecef = []
        ground_track = []

        sat = cls.create_satrec_from_tle(line1, line2)

        for i in range(num_points + 1):
            t = dt_start + timedelta(seconds=i * step_sec)
            jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
            e, r, v = sat.sgp4(jd, fr)
            if e == 0:
                r_eci = np.array(r, dtype=float)
                v_eci = np.array(v, dtype=float)
                r_ecef, _ = eci_to_ecef(r_eci, v_eci, t)
                lat, lon, alt = ecef_to_geodetic(r_ecef)

                points_eci.append({
                    "x": round(float(r_eci[0]), 2),
                    "y": round(float(r_eci[1]), 2),
                    "z": round(float(r_eci[2]), 2),
                    "time": t.isoformat()
                })
                points_ecef.append({
                    "x": round(float(r_ecef[0]), 2),
                    "y": round(float(r_ecef[1]), 2),
                    "z": round(float(r_ecef[2]), 2),
                    "time": t.isoformat()
                })
                ground_track.append({
                    "lat": round(lat, 3),
                    "lon": round(lon, 3),
                    "alt": round(alt, 2),
                    "time": t.isoformat()
                })

        return {
            "period_minutes": period_min,
            "points_eci": points_eci,
            "points_ecef": points_ecef,
            "ground_track": ground_track
        }


propagator = OrbitPropagator()
