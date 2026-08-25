"""
WebSocket server endpoints for high-frequency real-time satellite telemetry and anomaly streaming.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.satellite.tle import tle_manager
from backend.satellite.propagator import propagator
from backend.satellite.anomaly import anomaly_detector
from backend.database.db import db_manager

logger = logging.getLogger("api.websocket")
ws_router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket client connections."""

    def __init__(self):
        self.satellite_connections: Dict[str, Set[WebSocket]] = {}
        self.fleet_connections: Set[WebSocket] = set()

    async def connect_satellite(self, sat_id: str, websocket: WebSocket):
        await websocket.accept()
        if sat_id not in self.satellite_connections:
            self.satellite_connections[sat_id] = set()
        self.satellite_connections[sat_id].add(websocket)

    def disconnect_satellite(self, sat_id: str, websocket: WebSocket):
        if sat_id in self.satellite_connections:
            self.satellite_connections[sat_id].discard(websocket)
            if not self.satellite_connections[sat_id]:
                del self.satellite_connections[sat_id]

    async def connect_fleet(self, websocket: WebSocket):
        await websocket.accept()
        self.fleet_connections.add(websocket)

    def disconnect_fleet(self, websocket: WebSocket):
        self.fleet_connections.discard(websocket)


manager = ConnectionManager()


@ws_router.websocket("/ws/satellite/{sat_id}")
async def websocket_satellite_stream(websocket: WebSocket, sat_id: str):
    """
    Stream sub-second telemetry, coordinates, Keplerian elements, and real-time deviation metrics
    for a selected satellite to the frontend at ~2 Hz.
    """
    sat = tle_manager.get_satellite_by_id(sat_id)
    if not sat:
        await websocket.close(code=4004, reason=f"Satellite '{sat_id}' not found")
        return

    tle = tle_manager.get_tle(sat["norad_id"])
    if not tle:
        await websocket.close(code=4004, reason=f"TLE for '{sat_id}' not found")
        return

    await manager.connect_satellite(sat_id, websocket)
    logger.info(f"WebSocket client connected to satellite stream: {sat_id}")

    try:
        while True:
            now_dt = datetime.now(timezone.utc)
            # Propagate current state via SGP4
            state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
            # Compute deviation
            deviation = anomaly_detector.compute_deviation(sat_id, state, state)

            payload = {
                "type": "telemetry_update",
                "sat_id": sat_id,
                "name": sat["name"],
                "timestamp": now_dt.isoformat(),
                "geodetic": state["geodetic"],
                "ecef": state["ecef"],
                "eci": state["eci"],
                "keplerian": state["keplerian"],
                "deviation": {
                    "severity": deviation["severity"],
                    "position_error_km": deviation["position_error_km"],
                    "velocity_error_km_s": deviation["velocity_error_km_s"],
                    "rsw": deviation["rsw_components"],
                    "deltas": deviation["deltas"],
                    "diagnosis": deviation["diagnosis"],
                    "has_active_simulation": deviation["has_active_simulation"],
                    "simulation_info": deviation["simulation_info"]
                }
            }

            await websocket.send_json(payload)
            await asyncio.sleep(0.5)  # 2 Hz telemetry stream

    except WebSocketDisconnect:
        manager.disconnect_satellite(sat_id, websocket)
        logger.info(f"WebSocket disconnected from satellite stream: {sat_id}")
    except Exception as e:
        logger.error(f"WebSocket error in satellite stream {sat_id}: {e}")
        manager.disconnect_satellite(sat_id, websocket)


@ws_router.websocket("/ws/fleet")
async def websocket_fleet_stream(websocket: WebSocket):
    """
    Stream fleet-wide status snapshots at 1 Hz for all tracked satellites.
    """
    await manager.connect_fleet(websocket)
    logger.info("WebSocket client connected to fleet stream")

    try:
        while True:
            now_dt = datetime.now(timezone.utc)
            satellites = tle_manager.get_satellites()
            fleet_data = []

            for sat in satellites:
                tle = tle_manager.get_tle(sat["norad_id"])
                if not tle:
                    continue
                try:
                    state = propagator.propagate_sgp4(tle["line1"], tle["line2"], now_dt)
                    dev = anomaly_detector.compute_deviation(sat["id"], state, state)
                    fleet_data.append({
                        "id": sat["id"],
                        "name": sat["name"],
                        "color": sat.get("color", "#00f2ff"),
                        "orbit_type": sat.get("orbit_type", "LEO"),
                        "category": sat.get("category", "General"),
                        "latitude": state["geodetic"]["latitude"],
                        "longitude": state["geodetic"]["longitude"],
                        "altitude_km": state["geodetic"]["altitude_km"],
                        "ecef": state["ecef"],
                        "severity": dev["severity"],
                        "position_error_km": dev["position_error_km"],
                        "has_active_simulation": dev["has_active_simulation"]
                    })
                except Exception:
                    continue

            await websocket.send_json({
                "type": "fleet_update",
                "timestamp": now_dt.isoformat(),
                "count": len(fleet_data),
                "satellites": fleet_data
            })
            await asyncio.sleep(1.0)  # 1 Hz fleet broadcast

    except WebSocketDisconnect:
        manager.disconnect_fleet(websocket)
        logger.info("WebSocket disconnected from fleet stream")
    except Exception as e:
        logger.error(f"WebSocket error in fleet stream: {e}")
        manager.disconnect_fleet(websocket)
