"""
Database connection, SQLite schema management, and time-series query utilities.
"""

import sqlite3
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path

from backend.config import DATABASE_PATH

logger = logging.getLogger("database.db")


def get_db_connection() -> sqlite3.Connection:
    """Create and configure a SQLite connection with row factory."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db() -> None:
    """Initialize database tables and indexes."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Satellites table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS satellites (
                id TEXT PRIMARY KEY,
                norad_id INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                orbit_type TEXT,
                description TEXT,
                launch_year INTEGER,
                country TEXT,
                mass_kg REAL,
                color TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # Deviations history table (time series for Chart.js)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deviations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                satellite_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                pos_error_km REAL NOT NULL,
                vel_error_km_s REAL NOT NULL,
                radial_km REAL,
                along_track_km REAL,
                cross_track_km REAL,
                severity TEXT NOT NULL,
                FOREIGN KEY (satellite_id) REFERENCES satellites (id)
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dev_sat_time ON deviations(satellite_id, timestamp);")

        # Anomaly event logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS anomaly_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                satellite_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                severity TEXT NOT NULL,
                headline TEXT NOT NULL,
                assessment TEXT NOT NULL,
                position_error_km REAL NOT NULL,
                velocity_error_km_s REAL NOT NULL,
                diagnosis_json TEXT,
                acknowledged INTEGER DEFAULT 0,
                FOREIGN KEY (satellite_id) REFERENCES satellites (id)
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_anom_sat_time ON anomaly_events(satellite_id, timestamp);")

        conn.commit()
    logger.info("Database schema initialized successfully.")


class DatabaseManager:
    """Database operations manager for satellites, deviations, and anomaly logs."""

    @staticmethod
    def sync_satellites(satellites_data: List[Dict[str, Any]]) -> None:
        """Sync curated satellite catalog to database."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for sat in satellites_data:
                cursor.execute("""
                    INSERT INTO satellites (
                        id, norad_id, name, category, orbit_type, description,
                        launch_year, country, mass_kg, color, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        norad_id=excluded.norad_id,
                        name=excluded.name,
                        category=excluded.category,
                        orbit_type=excluded.orbit_type,
                        description=excluded.description,
                        launch_year=excluded.launch_year,
                        country=excluded.country,
                        mass_kg=excluded.mass_kg,
                        color=excluded.color
                """, (
                    sat["id"],
                    sat["norad_id"],
                    sat["name"],
                    sat.get("category", "General"),
                    sat.get("orbit_type", "LEO"),
                    sat.get("description", ""),
                    sat.get("launch_year", 2000),
                    sat.get("country", "Unknown"),
                    sat.get("mass_kg", 1000.0),
                    sat.get("color", "#00f2ff"),
                    now_iso
                ))
            conn.commit()

    @staticmethod
    def log_deviation(
        satellite_id: str,
        pos_error_km: float,
        vel_error_km_s: float,
        radial_km: float,
        along_track_km: float,
        cross_track_km: float,
        severity: str,
        timestamp: Optional[str] = None
    ) -> None:
        """Record deviation telemetry data point."""
        t_str = timestamp or datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO deviations (
                    satellite_id, timestamp, pos_error_km, vel_error_km_s,
                    radial_km, along_track_km, cross_track_km, severity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                satellite_id, t_str, pos_error_km, vel_error_km_s,
                radial_km, along_track_km, cross_track_km, severity
            ))
            conn.commit()

    @staticmethod
    def get_deviation_history(satellite_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent deviation time-series records for charting."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT timestamp, pos_error_km, vel_error_km_s, radial_km, along_track_km, cross_track_km, severity
                FROM deviations
                WHERE satellite_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (satellite_id, limit))
            rows = cursor.fetchall()

        results = []
        for r in reversed(rows):  # return chronological order
            results.append({
                "timestamp": r["timestamp"],
                "pos_error_km": r["pos_error_km"],
                "vel_error_km_s": r["vel_error_km_s"],
                "radial_km": r["radial_km"],
                "along_track_km": r["along_track_km"],
                "cross_track_km": r["cross_track_km"],
                "severity": r["severity"]
            })
        return results

    @staticmethod
    def log_anomaly_event(
        satellite_id: str,
        severity: str,
        headline: str,
        assessment: str,
        pos_error_km: float,
        vel_error_km_s: float,
        diagnosis_dict: Dict[str, Any]
    ) -> int:
        """Log a new detected anomaly alert event."""
        now_iso = datetime.now(timezone.utc).isoformat()
        diag_json = json.dumps(diagnosis_dict)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO anomaly_events (
                    satellite_id, timestamp, severity, headline, assessment,
                    position_error_km, velocity_error_km_s, diagnosis_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                satellite_id, now_iso, severity, headline, assessment,
                pos_error_km, vel_error_km_s, diag_json
            ))
            event_id = cursor.lastrowid
            conn.commit()
        return event_id

    @staticmethod
    def get_recent_anomaly_events(limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent anomaly events across all satellites."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT a.id, a.satellite_id, s.name as satellite_name, a.timestamp,
                       a.severity, a.headline, a.assessment, a.position_error_km,
                       a.velocity_error_km_s, a.diagnosis_json, a.acknowledged
                FROM anomaly_events a
                LEFT JOIN satellites s ON a.satellite_id = s.id
                ORDER BY a.timestamp DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()

        events = []
        for r in rows:
            diag = {}
            if r["diagnosis_json"]:
                try:
                    diag = json.loads(r["diagnosis_json"])
                except Exception:
                    pass
            events.append({
                "id": r["id"],
                "satellite_id": r["satellite_id"],
                "satellite_name": r["satellite_name"] or r["satellite_id"],
                "timestamp": r["timestamp"],
                "severity": r["severity"],
                "headline": r["headline"],
                "assessment": r["assessment"],
                "position_error_km": r["position_error_km"],
                "velocity_error_km_s": r["velocity_error_km_s"],
                "diagnosis": diag,
                "acknowledged": bool(r["acknowledged"])
            })
        return events


db_manager = DatabaseManager()
