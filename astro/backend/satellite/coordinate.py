"""
Coordinate transformations for astrodynamics:
- ECI (TEME / J2000) <-> ECEF (Earth-Centered Earth-Fixed)
- ECEF <-> Geodetic (WGS-84 Latitude, Longitude, Altitude)
- RSW / RIC (Radial, Along-Track / In-Track, Cross-Track) orbital local frame
- Greenwich Mean Sidereal Time (GMST) calculations
"""

import math
from datetime import datetime, timezone
from typing import Tuple, Dict, Any
import numpy as np
from backend.config import (
    EARTH_RADIUS_KM,
    EARTH_FLATTENING,
    EARTH_ROTATION_RATE
)

# WGS-84 Parameters
WGS84_A = EARTH_RADIUS_KM  # 6378.137 km (semi-major axis)
WGS84_F = EARTH_FLATTENING  # 1 / 298.257223563
WGS84_B = WGS84_A * (1.0 - WGS84_F)  # 6356.7523142 km (semi-minor axis)
WGS84_E2 = 2.0 * WGS84_F - WGS84_F ** 2  # first eccentricity squared


def datetime_to_jd(dt: datetime) -> float:
    """Convert UTC datetime to Julian Date (JD)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    year = dt.year
    month = dt.month
    day = dt.day + (
        dt.hour + (dt.minute + (dt.second + dt.microsecond / 1e6) / 60.0) / 60.0
    ) / 24.0

    if month <= 2:
        year -= 1
        month += 12

    A = math.floor(year / 100.0)
    B = 2 - A + math.floor(A / 4.0)

    jd = math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + B - 1524.5
    return jd


def gmst_from_datetime(dt: datetime) -> float:
    """
    Compute Greenwich Mean Sidereal Time (GMST) in radians for a given UTC datetime.
    IAU-76 formula.
    """
    jd = datetime_to_jd(dt)
    t_ut1 = (jd - 2451545.0) / 36525.0  # Julian centuries since J2000.0

    # GMST in seconds of time
    gmst_sec = (
        67310.54841
        + (876600.0 * 3600.0 + 8640184.812866) * t_ut1
        + 0.093104 * (t_ut1 ** 2)
        - 6.2e-6 * (t_ut1 ** 3)
    )

    # Convert seconds to radians in range [0, 2pi)
    gmst_rad = (gmst_sec % 86400.0) * (2.0 * math.pi / 86400.0)
    return gmst_rad % (2.0 * math.pi)


def eci_to_ecef(r_eci: np.ndarray, v_eci: np.ndarray, dt: datetime) -> Tuple[np.ndarray, np.ndarray]:
    """
    Transform ECI (TEME) position (km) and velocity (km/s) vectors to ECEF frame.
    """
    theta = gmst_from_datetime(dt)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    # Rotation matrix from ECI to ECEF about Z-axis
    R_z = np.array([
        [cos_t, sin_t, 0.0],
        [-sin_t, cos_t, 0.0],
        [0.0, 0.0, 1.0]
    ])

    r_ecef = R_z @ r_eci

    # Velocity in ECEF accounts for Earth rotation: v_ecef = R_z * v_eci - omega x r_ecef
    omega_vec = np.array([0.0, 0.0, EARTH_ROTATION_RATE])
    v_ecef = (R_z @ v_eci) - np.cross(omega_vec, r_ecef)

    return r_ecef, v_ecef


def ecef_to_geodetic(r_ecef: np.ndarray) -> Tuple[float, float, float]:
    """
    Transform ECEF position (km) [x, y, z] to Geodetic coordinates:
    - Latitude in degrees (-90 to +90)
    - Longitude in degrees (-180 to +180)
    - Altitude in km above WGS-84 reference ellipsoid
    Uses Bowring's high-precision algorithm.
    """
    x, y, z = float(r_ecef[0]), float(r_ecef[1]), float(r_ecef[2])
    p = math.hypot(x, y)
    
    # Check for singularity at poles
    if p < 1e-6:
        lat = 90.0 if z >= 0 else -90.0
        lon = 0.0
        alt = abs(z) - WGS84_B
        return lat, lon, alt

    lon = math.degrees(math.atan2(y, x))

    # Bowring's closed-form algorithm
    e_prime2 = (WGS84_A ** 2 - WGS84_B ** 2) / (WGS84_B ** 2)
    theta = math.atan2(z * WGS84_A, p * WGS84_B)

    sin_th = math.sin(theta)
    cos_th = math.cos(theta)

    lat_rad = math.atan2(
        z + e_prime2 * WGS84_B * (sin_th ** 3),
        p - WGS84_E2 * WGS84_A * (cos_th ** 3)
    )

    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    N = WGS84_A / math.sqrt(1.0 - WGS84_E2 * (sin_lat ** 2))
    alt = p / cos_lat - N

    lat = math.degrees(lat_rad)
    return lat, lon, alt


def eci_to_geodetic(r_eci: np.ndarray, dt: datetime) -> Tuple[float, float, float]:
    """Convenience helper to convert ECI position directly to Geodetic coordinates."""
    v_zero = np.zeros(3)
    r_ecef, _ = eci_to_ecef(r_eci, v_zero, dt)
    return ecef_to_geodetic(r_ecef)


def calculate_rsw_errors(
    r_ref: np.ndarray,
    v_ref: np.ndarray,
    r_test: np.ndarray,
    v_test: np.ndarray
) -> Dict[str, float]:
    """
    Compute error components in the RSW (Radial, Along-Track / In-Track, Cross-Track) orbital frame.
    - Radial (R): along the position vector
    - Cross-track (W): normal to the orbital plane (h = r x v)
    - Along-track / In-track (S): along velocity in plane (W x R)
    """
    # 3D Total errors
    delta_r = r_test - r_ref
    delta_v = v_test - v_ref

    pos_error_total = float(np.linalg.norm(delta_r))
    vel_error_total = float(np.linalg.norm(delta_v))

    # Construct RSW unit vectors
    norm_r = np.linalg.norm(r_ref)
    if norm_r < 1e-6:
        return {
            "pos_error_total": pos_error_total,
            "vel_error_total": vel_error_total,
            "radial_error": 0.0,
            "along_track_error": 0.0,
            "cross_track_error": 0.0,
            "radial_vel_error": 0.0,
            "along_track_vel_error": 0.0,
            "cross_track_vel_error": 0.0,
        }

    u_R = r_ref / norm_r
    h_vec = np.cross(r_ref, v_ref)
    norm_h = np.linalg.norm(h_vec)
    
    if norm_h < 1e-6:
        u_W = np.array([0.0, 0.0, 1.0])
    else:
        u_W = h_vec / norm_h

    u_S = np.cross(u_W, u_R)

    # Project position and velocity differences onto RSW frame
    r_error_R = float(np.dot(delta_r, u_R))
    r_error_S = float(np.dot(delta_r, u_S))
    r_error_W = float(np.dot(delta_r, u_W))

    v_error_R = float(np.dot(delta_v, u_R))
    v_error_S = float(np.dot(delta_v, u_S))
    v_error_W = float(np.dot(delta_v, u_W))

    return {
        "pos_error_total": pos_error_total,
        "vel_error_total": vel_error_total,
        "radial_error": r_error_R,
        "along_track_error": r_error_S,
        "cross_track_error": r_error_W,
        "radial_vel_error": v_error_R,
        "along_track_vel_error": v_error_S,
        "cross_track_vel_error": v_error_W,
    }
