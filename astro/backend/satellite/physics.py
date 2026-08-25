"""
Numerical orbital mechanics, equations of motion, perturbation modeling,
and Keplerian orbital element conversions.
"""

import math
from typing import Tuple, Dict, Any, List
import numpy as np
from backend.config import (
    MU_EARTH,
    EARTH_RADIUS_KM,
    J2_PERTURBATION,
    EARTH_ROTATION_RATE,
    RHO_0,
    H_SCALE,
    CD_DEFAULT
)


def compute_acceleration(
    r_vec: np.ndarray,
    v_vec: np.ndarray,
    bstar: float = 0.0,
    area_to_mass: float = 0.01,
    include_j2: bool = True,
    include_drag: bool = True
) -> np.ndarray:
    """
    Computes total acceleration in ECI frame [ax, ay, az] (km/s^2) acting on a satellite:
    1. Primary two-body Earth point-mass gravity
    2. J2 zonal harmonic (Earth oblateness equatorial bulge)
    3. Atmospheric drag (for LEO regimes)
    """
    r = float(np.linalg.norm(r_vec))
    if r < 1.0:
        return np.zeros(3)

    x, y, z = float(r_vec[0]), float(r_vec[1]), float(r_vec[2])
    r2 = r * r
    r3 = r2 * r
    r5 = r2 * r3
    r7 = r5 * r2

    # 1. Two-body Keplerian gravity: a_grav = -mu * r / r^3
    a_grav = -MU_EARTH * r_vec / r3

    # 2. J2 Perturbation (Earth's equatorial bulge)
    a_j2 = np.zeros(3)
    if include_j2:
        z2 = z * z
        factor_j2 = 1.5 * J2_PERTURBATION * MU_EARTH * (EARTH_RADIUS_KM ** 2) / r5
        a_j2[0] = factor_j2 * x * (5.0 * z2 / r2 - 1.0)
        a_j2[1] = factor_j2 * y * (5.0 * z2 / r2 - 1.0)
        a_j2[2] = factor_j2 * z * (5.0 * z2 / r2 - 3.0)

    # 3. Atmospheric Drag (LEO altitude < 1000 km)
    a_drag = np.zeros(3)
    altitude = r - EARTH_RADIUS_KM
    if include_drag and altitude > 80.0 and altitude < 1000.0:
        # Relative velocity with rotating atmosphere
        v_rel = v_vec - np.cross(np.array([0.0, 0.0, EARTH_ROTATION_RATE]), r_vec)
        v_rel_norm = float(np.linalg.norm(v_rel))

        # Density approximation in kg/km^3
        # Reference rho0 at 200 km = 2.789e-10 kg/m^3 = 2.789e-1 kg/km^3
        rho = 2.789e-1 * math.exp(-(altitude - 200.0) / max(H_SCALE, 10.0))  # kg/km^3
        # If BSTAR given from TLE: B* = (CD * A) / (2 * m) * rho0_ref
        b_eff = max(abs(bstar) * 1e-4, 1e-7) if bstar != 0.0 else (CD_DEFAULT * area_to_mass * 1e-3)
        drag_mag = 0.5 * rho * b_eff * (v_rel_norm ** 2)
        if v_rel_norm > 1e-6:
            a_drag = -drag_mag * (v_rel / v_rel_norm)

    return a_grav + a_j2 + a_drag


def rk4_step(
    r_vec: np.ndarray,
    v_vec: np.ndarray,
    dt: float,
    bstar: float = 0.0,
    include_j2: bool = True,
    include_drag: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Advances state vector (position r, velocity v) forward by time step dt (seconds)
    using 4th-Order Runge-Kutta (RK4) numerical integration.
    """
    # k1
    k1_r = v_vec
    k1_v = compute_acceleration(r_vec, v_vec, bstar, include_j2=include_j2, include_drag=include_drag)

    # k2
    r_k2 = r_vec + 0.5 * dt * k1_r
    v_k2 = v_vec + 0.5 * dt * k1_v
    k2_r = v_k2
    k2_v = compute_acceleration(r_k2, v_k2, bstar, include_j2=include_j2, include_drag=include_drag)

    # k3
    r_k3 = r_vec + 0.5 * dt * k2_r
    v_k3 = v_vec + 0.5 * dt * k2_v
    k3_r = v_k3
    k3_v = compute_acceleration(r_k3, v_k3, bstar, include_j2=include_j2, include_drag=include_drag)

    # k4
    r_k4 = r_vec + dt * k3_r
    v_k4 = v_vec + dt * k3_v
    k4_r = v_k4
    k4_v = compute_acceleration(r_k4, v_k4, bstar, include_j2=include_j2, include_drag=include_drag)

    # Update state
    r_next = r_vec + (dt / 6.0) * (k1_r + 2.0 * k2_r + 2.0 * k3_r + k4_r)
    v_next = v_vec + (dt / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)

    return r_next, v_next


def propagate_rk4(
    r_init: np.ndarray,
    v_init: np.ndarray,
    total_seconds: float,
    step_size: float = 30.0,
    bstar: float = 0.0,
    include_j2: bool = True,
    include_drag: bool = True
) -> List[Tuple[float, np.ndarray, np.ndarray]]:
    """
    Numerically propagates orbit over total_seconds using RK4.
    Returns list of tuples: [(time_offset_sec, r_vec, v_vec), ...]
    """
    trajectory = [(0.0, np.copy(r_init), np.copy(v_init))]
    r_curr = np.copy(r_init)
    v_curr = np.copy(v_init)

    current_t = 0.0
    sign = 1.0 if total_seconds >= 0 else -1.0
    abs_total = abs(total_seconds)
    dt = sign * min(step_size, abs_total)

    while abs(current_t) < abs_total:
        remaining = abs_total - abs(current_t)
        actual_step = sign * min(abs(dt), remaining)
        r_curr, v_curr = rk4_step(r_curr, v_curr, actual_step, bstar, include_j2=include_j2, include_drag=include_drag)
        current_t += actual_step
        trajectory.append((current_t, np.copy(r_curr), np.copy(v_curr)))

    return trajectory


def state_to_keplerian(r_vec: np.ndarray, v_vec: np.ndarray) -> Dict[str, float]:
    """
    Converts ECI position (km) and velocity (km/s) state vectors to Classical Orbital Elements (COEs):
    - a: Semi-major axis (km)
    - e: Eccentricity (dimensionless)
    - i: Inclination (deg)
    - raan: Longitude of Ascending Node / RAAN (deg)
    - arg_perigee: Argument of Perigee (deg)
    - true_anomaly: True Anomaly (deg)
    - period_minutes: Orbital Period (minutes)
    - apogee_alt_km: Apogee Altitude above Earth surface (km)
    - perigee_alt_km: Perigee Altitude above Earth surface (km)
    - specific_energy: Specific Orbital Energy (km^2 / s^2)
    - speed_km_s: Orbital speed magnitude (km/s)
    - altitude_km: Current altitude above Earth mean radius (km)
    """
    r = float(np.linalg.norm(r_vec))
    v = float(np.linalg.norm(v_vec))

    if r < 1e-6 or v < 1e-6:
        return {
            "semi_major_axis_km": 0.0,
            "eccentricity": 0.0,
            "inclination_deg": 0.0,
            "raan_deg": 0.0,
            "arg_perigee_deg": 0.0,
            "true_anomaly_deg": 0.0,
            "period_minutes": 0.0,
            "apogee_alt_km": 0.0,
            "perigee_alt_km": 0.0,
            "specific_energy": 0.0,
            "speed_km_s": 0.0,
            "altitude_km": 0.0
        }

    # Specific angular momentum vector h = r x v
    h_vec = np.cross(r_vec, v_vec)
    h = float(np.linalg.norm(h_vec))

    # Node vector n = k x h = [-h_y, h_x, 0]
    n_vec = np.array([-h_vec[1], h_vec[0], 0.0])
    n = float(np.linalg.norm(n_vec))

    # Specific mechanical energy epsilon = v^2/2 - mu/r
    epsilon = (v * v) / 2.0 - (MU_EARTH / r)

    # Semi-major axis a = -mu / (2 * epsilon)
    if abs(epsilon) > 1e-9:
        a = -MU_EARTH / (2.0 * epsilon)
    else:
        a = float("inf")

    # Eccentricity vector e_vec = ((v^2 - mu/r)*r - (r.v)*v) / mu
    rdotv = float(np.dot(r_vec, v_vec))
    e_vec = ((v * v - MU_EARTH / r) * r_vec - rdotv * v_vec) / MU_EARTH
    e = float(np.linalg.norm(e_vec))

    # Inclination i = acos(h_z / h)
    cos_i = max(min(h_vec[2] / h, 1.0), -1.0)
    inc_deg = math.degrees(math.acos(cos_i))

    # Longitude of Ascending Node (RAAN)
    if n > 1e-8:
        cos_raan = max(min(n_vec[0] / n, 1.0), -1.0)
        raan_deg = math.degrees(math.acos(cos_raan))
        if n_vec[1] < 0:
            raan_deg = 360.0 - raan_deg
    else:
        raan_deg = 0.0

    # Argument of Perigee
    if n > 1e-8 and e > 1e-6:
        cos_argp = max(min(float(np.dot(n_vec, e_vec)) / (n * e), 1.0), -1.0)
        argp_deg = math.degrees(math.acos(cos_argp))
        if e_vec[2] < 0:
            argp_deg = 360.0 - argp_deg
    else:
        argp_deg = 0.0

    # True Anomaly nu
    if e > 1e-6:
        cos_nu = max(min(float(np.dot(e_vec, r_vec)) / (e * r), 1.0), -1.0)
        nu_deg = math.degrees(math.acos(cos_nu))
        if rdotv < 0:
            nu_deg = 360.0 - nu_deg
    else:
        nu_deg = 0.0

    # Orbital Period T = 2 * pi * sqrt(a^3 / mu)
    if a > 0:
        period_sec = 2.0 * math.pi * math.sqrt((a ** 3) / MU_EARTH)
        period_min = period_sec / 60.0
    else:
        period_min = 0.0

    # Apogee & Perigee Altitudes
    apogee_km = a * (1.0 + e) - EARTH_RADIUS_KM
    perigee_km = a * (1.0 - e) - EARTH_RADIUS_KM
    altitude_km = r - EARTH_RADIUS_KM

    return {
        "semi_major_axis_km": round(a, 3),
        "eccentricity": round(e, 6),
        "inclination_deg": round(inc_deg, 4),
        "raan_deg": round(raan_deg, 4),
        "arg_perigee_deg": round(argp_deg, 4),
        "true_anomaly_deg": round(nu_deg, 4),
        "period_minutes": round(period_min, 2),
        "apogee_alt_km": round(apogee_km, 2),
        "perigee_alt_km": round(perigee_km, 2),
        "specific_energy": round(epsilon, 4),
        "speed_km_s": round(v, 4),
        "altitude_km": round(altitude_km, 2)
    }
