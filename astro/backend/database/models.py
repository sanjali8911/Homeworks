"""
Pydantic schemas and data transfer models for API requests/responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SatelliteBase(BaseModel):
    id: str
    norad_id: int
    name: str
    category: str
    orbit_type: str
    description: str
    launch_year: int
    country: str
    mass_kg: float
    color: str


class SatelliteStatusResponse(SatelliteBase):
    current_position: Dict[str, Any]
    keplerian: Dict[str, Any]
    severity: str
    position_error_km: float
    velocity_error_km_s: float
    has_active_simulation: bool


class ScenarioSimulationRequest(BaseModel):
    scenario_type: str = Field(
        ...,
        description="Type of orbital perturbation to simulate (e.g. ORBIT_RAISE_MANEUVER, ATMOSPHERIC_DRAG_SPIKE, INCLINATION_PLANE_CHANGE, DEORBIT_BURN, SENSOR_EPHEMERIS_UPDATE, RESET_NOMINAL)"
    )
    magnitude_factor: float = Field(1.0, description="Multiplier factor for deviation scale", ge=0.1, le=10.0)


class DeviationResponse(BaseModel):
    timestamp: str
    sat_id: str
    severity: str
    position_error_km: float
    velocity_error_km_s: float
    rsw_components: Dict[str, float]
    deltas: Dict[str, float]
    predicted_keplerian: Dict[str, Any]
    updated_keplerian: Dict[str, Any]
    diagnosis: Dict[str, Any]
    has_active_simulation: bool
    simulation_info: Optional[Dict[str, Any]] = None
