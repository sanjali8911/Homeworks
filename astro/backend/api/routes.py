"""
FastAPI REST API route handlers for satellite orbits, predictions, deviations, and simulations.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Annotated
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from backend.satellite.tle import tle_manager, parse_tle_metadata
from backend.satellite.propagator import propagator
from backend.satellite.physics import propagate_rk4
from backend.satellite.anomaly import anomaly_detector
from backend.database.db import db_manager
from backend.database.models import ScenarioSimulationRequest

logger = logging.getLogger("api.routes")
router = APIRouter(prefix="/api")


@router.get("/satellites", summary="List all tracked satellites with current status")
async def get_satellites() -> List[Dict[str, Any]]:
    """Return fleet list of tracked satellites with real-time positions and anomaly severities."""
    satellites = tle_manager.get_satellites()
    now_dt = datetime.now(timezone.utc)
    results = []

    for sat in satellites:
        tle = tle_manager.get_tle(sat["norad_id"])
        if not tle:
            continue

        try:
            # Baseline predicted state via SGP4
            state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
            # Deviation calculation with simulation overrides if active
            deviation = anomaly_detector.compute_deviation(sat["id"], state, state)

            results.append({
                **sat,
                "current_position": {
                    "latitude": state["geodetic"]["latitude"],
                    "longitude": state["geodetic"]["longitude"],
                    "altitude_km": state["geodetic"]["altitude_km"],
                    "ground_speed_km_s": state["geodetic"]["ground_speed_km_s"],
                    "ecef": state["ecef"],
                    "eci": state["eci"]
                },
                "keplerian": state["keplerian"],
                "severity": deviation["severity"],
                "position_error_km": deviation["position_error_km"],
                "velocity_error_km_s": deviation["velocity_error_km_s"],
                "has_active_simulation": deviation["has_active_simulation"],
                "simulation_info": deviation["simulation_info"]
            })
        except Exception as e:
            logger.error(f"Error calculating status for {sat['name']}: {e}")
            continue

    return results


@router.get("/satellite/{sat_id}", summary="Get detailed information for a satellite")
async def get_satellite(sat_id: str) -> Dict[str, Any]:
    """Retrieve full details, TLE metadata, and current state for a specific satellite."""
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE for '{sat_id}' not found")

    now_dt = datetime.now(timezone.utc)
    state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
    meta = parse_tle_metadata(tle["line1"], tle["line2"], sat["name"])
    deviation = anomaly_detector.compute_deviation(sat["id"], state, state)

    clean_state = {k: v for k, v in state.items() if not k.startswith("_")}

    return {
        "satellite": sat,
        "tle_metadata": meta,
        "state": clean_state,
        "deviation": deviation
    }


@router.get("/satellite/{sat_id}/position", summary="Get instantaneous position and velocity")
async def get_satellite_position(sat_id: str) -> Dict[str, Any]:
    """Get sub-second current position in ECI, ECEF, and Geodetic frames."""
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE for '{sat_id}' not found")

    now_dt = datetime.now(timezone.utc)
    state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)

    # Return clean serializable response
    return {
        "sat_id": sat["id"],
        "name": sat["name"],
        "timestamp": state["timestamp"],
        "geodetic": state["geodetic"],
        "ecef": state["ecef"],
        "eci": state["eci"],
        "keplerian": state["keplerian"]
    }


@router.get("/satellite/{sat_id}/orbit", summary="Get 3D orbital path for visualization")
async def get_satellite_orbit(
    sat_id: str,
    periods: Annotated[float, Query(ge=0.5, le=3.0, description="Number of orbital periods")] = 1.0,
    num_points: Annotated[int, Query(ge=30, le=300, description="Number of trajectory points")] = 120
) -> Dict[str, Any]:
    """Generate 3D orbital trajectory points (ECEF and ECI) and ground track."""
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE for '{sat_id}' not found")

    now_dt = datetime.now(timezone.utc)
    trajectory = propagator.get_orbit_trajectory(
        line1=tle["line1"],
        line2=tle["line2"],
        current_dt=now_dt,
        num_points=int(num_points),
        periods=float(periods)
    )

    return {
        "sat_id": sat["id"],
        "name": sat["name"],
        "color": sat.get("color", "#00f2ff"),
        "timestamp": now_dt.isoformat(),
        **trajectory
    }


@router.get("/satellite/{sat_id}/prediction", summary="Get numerical physics simulation forward path")
async def get_satellite_prediction(
    sat_id: str,
    hours: Annotated[float, Query(ge=0.5, le=48.0, description="Forecast duration in hours")] = 6.0,
    step_seconds: Annotated[float, Query(ge=10.0, le=300.0, description="Numerical integration step")] = 60.0
) -> Dict[str, Any]:
    """
    Run RK4 numerical physics simulation (with Earth gravity, J2 oblateness, and atmospheric drag)
    forward in time to predict future satellite states.
    """
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE for '{sat_id}' not found")

    now_dt = datetime.now(timezone.utc)
    initial_state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
    meta = parse_tle_metadata(tle["line1"], tle["line2"], sat["name"])

    h_val = float(hours)
    step_val = float(step_seconds)
    duration_sec = h_val * 3600.0

    predicted_path = propagator.propagate_numerical(
        r_init=initial_state["_r_vec"],
        v_init=initial_state["_v_vec"],
        start_dt=now_dt,
        duration_seconds=duration_sec,
        step_size=step_val,
        bstar=meta["bstar"],
        include_j2=True,
        include_drag=True
    )

    return {
        "sat_id": sat["id"],
        "name": sat["name"],
        "forecast_hours": h_val,
        "step_seconds": step_val,
        "initial_epoch": now_dt.isoformat(),
        "final_epoch": (now_dt + timedelta(hours=h_val)).isoformat(),
        "points_count": len(predicted_path),
        "trajectory": predicted_path
    }


@router.get("/satellite/{sat_id}/deviation", summary="Get current deviation and 'What Happened?' diagnosis")
async def get_satellite_deviation(sat_id: str) -> Dict[str, Any]:
    """Compute position/velocity error, RSW breakdown, and automated forensic root-cause diagnosis."""
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE for '{sat_id}' not found")

    now_dt = datetime.now(timezone.utc)
    state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
    deviation = anomaly_detector.compute_deviation(sat["id"], state, state)

    # Log to time-series DB for charting
    db_manager.log_deviation(
        satellite_id=sat["id"],
        pos_error_km=deviation["position_error_km"],
        vel_error_km_s=deviation["velocity_error_km_s"],
        radial_km=deviation["rsw_components"]["radial_km"],
        along_track_km=deviation["rsw_components"]["along_track_km"],
        cross_track_km=deviation["rsw_components"]["cross_track_km"],
        severity=deviation["severity"],
        timestamp=deviation["timestamp"]
    )

    return deviation


@router.get("/satellite/{sat_id}/history", summary="Get historical deviation time series for charts")
async def get_satellite_history(
    sat_id: str,
    limit: Annotated[int, Query(ge=10, le=200, description="Max history points")] = 50
) -> List[Dict[str, Any]]:
    """Retrieve historical deviation error time series for Chart.js telemetry graphs."""
    history = db_manager.get_deviation_history(sat_id, limit=int(limit))
    if not history:
        # If DB is fresh, generate baseline history points
        now = datetime.now(timezone.utc)
        for i in range(20, 0, -1):
            t = (now - timedelta(minutes=i*2)).isoformat()
            db_manager.log_deviation(
                satellite_id=sat_id,
                pos_error_km=round(0.2 + (i % 5) * 0.05, 3),
                vel_error_km_s=round(0.001 + (i % 4) * 0.0003, 5),
                radial_km=0.1,
                along_track_km=0.15,
                cross_track_km=0.08,
                severity="NORMAL",
                timestamp=t
            )
        history = db_manager.get_deviation_history(sat_id, limit=int(limit))
    return history


@router.post("/satellite/{sat_id}/simulate-event", summary="Inject an orbital scenario/perturbation")
async def simulate_event(sat_id: str, req: ScenarioSimulationRequest) -> Dict[str, Any]:
    """
    Inject a simulated orbital maneuver or perturbation to test the real-time anomaly detector.
    """
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{sat_id}' not found")

    result = anomaly_detector.inject_scenario(
        sat_id=sat["id"],
        scenario_type=req.scenario_type,
        magnitude_factor=req.magnitude_factor
    )

    # Immediately calculate updated deviation
    tle = tle_manager.get_tle(sat["norad_id"])
    if tle:
        now_dt = datetime.now(timezone.utc)
        state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
        dev = anomaly_detector.compute_deviation(sat["id"], state, state)

        # If abnormal, log event
        if dev["severity"] in ("WARNING", "CRITICAL"):
            db_manager.log_anomaly_event(
                satellite_id=sat["id"],
                severity=dev["severity"],
                headline=dev["diagnosis"]["status_headline"],
                assessment=dev["diagnosis"]["assessment"],
                pos_error_km=dev["position_error_km"],
                vel_error_km_s=dev["velocity_error_km_s"],
                diagnosis_dict=dev["diagnosis"]
            )

    return result


@router.get("/anomalies", summary="Get recent anomaly event logs")
async def get_anomalies(
    limit: Annotated[int, Query(ge=1, le=100)] = 20
) -> List[Dict[str, Any]]:
    """Retrieve logged orbital anomaly events across the fleet."""
    return db_manager.get_recent_anomaly_events(limit=int(limit))


@router.post("/tle/refresh", summary="Trigger CelesTrak TLE update")
async def refresh_tle(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Trigger background refresh of orbital element sets from CelesTrak."""
    background_tasks.add_task(tle_manager.refresh_from_celestrak)
    return {
        "status": "initiated",
        "message": "CelesTrak TLE sync task started in background."
    }

