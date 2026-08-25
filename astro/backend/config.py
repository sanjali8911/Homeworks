from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = BASE_DIR / "backend" / "database" / "satellite_monitor.db"
SATELLITES_JSON_PATH = DATA_DIR / "satellites.json"
TLE_CACHE_PATH = DATA_DIR / "tle_cache.json"

# Physical Constants (WGS-84 / Earth Gravitational Model)
MU_EARTH = 398600.4418  # Standard gravitational parameter (km^3 / s^2)
EARTH_RADIUS_KM = 6378.137  # Earth equatorial radius (km)
EARTH_FLATTENING = 1.0 / 298.257223563  # WGS-84 flattening
J2_PERTURBATION = 1.08262668e-3  # Second zonal harmonic (Earth oblateness)
EARTH_ROTATION_RATE = 7.2921159e-5  # rad/s (Earth angular speed)
SPEED_OF_LIGHT_KM_S = 299792.458  # km/s

# Atmospheric Density Parameters (Exponential model for LEO drag)
RHO_0 = 3.614e-13  # kg/m^3 at 700km base
H_SCALE = 88.667  # scale height in km
CD_DEFAULT = 2.2  # Typical satellite drag coefficient

# Anomaly Severity Thresholds (in km for position, km/s for velocity)
ANOMALY_THRESHOLDS = {
    "NORMAL": {"max_position_error": 1.0, "max_velocity_error": 0.005},
    "WATCH": {"max_position_error": 5.0, "max_velocity_error": 0.020},
    "WARNING": {"max_position_error": 20.0, "max_velocity_error": 0.080},
    "CRITICAL": {"min_position_error": 20.0, "min_velocity_error": 0.080},
}

# CelesTrak TLE Sources
CELESTRAK_URLS = [
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=tle",
]
