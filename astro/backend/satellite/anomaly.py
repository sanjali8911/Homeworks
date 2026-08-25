"""
Orbital deviation computation, anomaly severity classification,
scenario injection, and 'What Happened?' root-cause forensic diagnosis engine.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np

from backend.config import ANOMALY_THRESHOLDS
from backend.satellite.coordinate import calculate_rsw_errors
from backend.satellite.physics import state_to_keplerian


class AnomalyDetector:
    """Evaluates orbital state discrepancies, classifies severity, and generates diagnostic reports."""

    def __init__(self):
        # In-memory active scenario perturbations: {sat_id: {type, magnitude, applied_at, delta_r, delta_v}}
        self._active_simulations: Dict[str, Dict[str, Any]] = {}

    def inject_scenario(self, sat_id: str, scenario_type: str, magnitude_factor: float = 1.0) -> Dict[str, Any]:
        """
        Inject a simulated orbital perturbation/maneuver on a satellite to test anomaly detection.
        Supported scenarios:
        - 'ORBIT_RAISE_MANEUVER' (Posigrade thruster burn, raising semi-major axis)
        - 'ATMOSPHERIC_DRAG_SPIKE' (Geomagnetic solar storm increasing LEO drag)
        - 'INCLINATION_PLANE_CHANGE' (Cross-track thrust altering inclination)
        - 'DEORBIT_BURN' (Retrograde thruster firing lowering altitude)
        - 'SENSOR_EPHEMERIS_UPDATE' (Ground radar sensor calibration offset)
        - 'RESET_NOMINAL' (Restores nominal tracking)
        """
        if scenario_type == "RESET_NOMINAL":
            if sat_id in self._active_simulations:
                del self._active_simulations[sat_id]
            return {
                "sat_id": sat_id,
                "status": "reset",
                "message": f"Perturbation cleared for satellite {sat_id}. Nominal tracking restored."
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        sim_data = {
            "scenario_type": scenario_type,
            "magnitude_factor": magnitude_factor,
            "applied_at": now_iso,
        }

        if scenario_type == "ORBIT_RAISE_MANEUVER":
            # Delta V along-track +12 m/s -> raises altitude by ~7.5 km
            sim_data["delta_r_vec"] = np.array([4.2, 8.5, 3.1]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([0.008, 0.015, 0.005]) * magnitude_factor
            sim_data["name"] = "Orbital Altitude Raise Maneuver"
            sim_data["description"] = "Posigrade thruster firing detected (+15 m/s along-track delta-v), raising orbital semi-major axis."

        elif scenario_type == "ATMOSPHERIC_DRAG_SPIKE":
            # High along-track deceleration lag
            sim_data["delta_r_vec"] = np.array([-1.5, -9.8, -2.4]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([-0.003, -0.019, -0.004]) * magnitude_factor
            sim_data["name"] = "Geomagnetic Storm Drag Perturbation"
            sim_data["description"] = "Solar activity induced atmospheric expansion causing unmodeled aerodynamic braking in LEO."

        elif scenario_type == "INCLINATION_PLANE_CHANGE":
            # Large cross-track normal offset
            sim_data["delta_r_vec"] = np.array([1.2, 2.1, 14.5]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([0.002, 0.004, 0.038]) * magnitude_factor
            sim_data["name"] = "Orbital Plane Change (Cross-Track Burn)"
            sim_data["description"] = "Out-of-plane cross-track thrust detected, modifying orbital inclination and ascending node."

        elif scenario_type == "DEORBIT_BURN":
            # Significant retrograde burn
            sim_data["delta_r_vec"] = np.array([-5.2, -18.4, -4.1]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([-0.012, -0.042, -0.009]) * magnitude_factor
            sim_data["name"] = "Retrograde De-orbit Thruster Burn"
            sim_data["description"] = "High-energy retrograde burn lowering perigee altitude into upper atmospheric decay corridor."

        elif scenario_type == "SENSOR_EPHEMERIS_UPDATE":
            # Radar sensor observation update shift
            sim_data["delta_r_vec"] = np.array([1.8, -2.2, 1.4]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([0.003, -0.004, 0.002]) * magnitude_factor
            sim_data["name"] = "Sensor Ephemeris Refinement Shift"
            sim_data["description"] = "Ground optical / radar tracking observation update with refined state estimation."

        else:
            sim_data["delta_r_vec"] = np.array([0.5, 0.8, 0.3]) * magnitude_factor
            sim_data["delta_v_vec"] = np.array([0.001, 0.002, 0.001]) * magnitude_factor
            sim_data["name"] = "Custom Deviation Scenario"
            sim_data["description"] = "Simulated orbital state perturbation."

        self._active_simulations[sat_id] = sim_data
        return {
            "sat_id": sat_id,
            "status": "active",
            "scenario": sim_data["name"],
            "description": sim_data["description"],
            "applied_at": now_iso
        }

    def get_active_simulation(self, sat_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve active simulated scenario for satellite if any."""
        return self._active_simulations.get(sat_id)

    def compute_deviation(
        self,
        sat_id: str,
        predicted_state: Dict[str, Any],
        actual_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates position/velocity errors between predicted and actual/updated state,
        including simulated scenario perturbations if active.
        """
        r_pred = np.array(predicted_state["_r_vec"], dtype=float)
        v_pred = np.array(predicted_state["_v_vec"], dtype=float)

        r_act = np.array(actual_state["_r_vec"], dtype=float)
        v_act = np.array(actual_state["_v_vec"], dtype=float)

        # Apply active simulation perturbations if present
        sim = self.get_active_simulation(sat_id)
        if sim and "delta_r_vec" in sim:
            r_act = r_act + sim["delta_r_vec"]
            v_act = v_act + sim["delta_v_vec"]

        # Calculate RSW decomposed errors
        rsw_errors = calculate_rsw_errors(
            r_ref=r_pred,
            v_ref=v_pred,
            r_test=r_act,
            v_test=v_act
        )

        pos_error_km = rsw_errors["pos_error_total"]
        vel_error_km_s = rsw_errors["vel_error_total"]

        # Keplerian elements for both
        kepler_pred = state_to_keplerian(r_pred, v_pred)
        kepler_act = state_to_keplerian(r_act, v_act)

        # Deltas
        delta_sma = round(kepler_act["semi_major_axis_km"] - kepler_pred["semi_major_axis_km"], 3)
        delta_ecc = round(kepler_act["eccentricity"] - kepler_pred["eccentricity"], 6)
        delta_inc = round(kepler_act["inclination_deg"] - kepler_pred["inclination_deg"], 4)
        delta_alt = round(kepler_act["altitude_km"] - kepler_pred["altitude_km"], 2)
        delta_period = round(kepler_act["period_minutes"] - kepler_pred["period_minutes"], 3)
        delta_energy = round(kepler_act["specific_energy"] - kepler_pred["specific_energy"], 4)

        # Severity Classification
        severity = self.classify_severity(pos_error_km, vel_error_km_s)

        # Diagnosis
        diagnosis = self.diagnose_anomaly(
            sat_id=sat_id,
            severity=severity,
            pos_error_km=pos_error_km,
            vel_error_km_s=vel_error_km_s,
            rsw_errors=rsw_errors,
            kepler_pred=kepler_pred,
            kepler_act=kepler_act,
            delta_sma=delta_sma,
            delta_inc=delta_inc,
            delta_alt=delta_alt,
            sim=sim
        )

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sat_id": sat_id,
            "severity": severity,
            "position_error_km": round(pos_error_km, 3),
            "velocity_error_km_s": round(vel_error_km_s, 5),
            "rsw_components": {
                "radial_km": round(rsw_errors["radial_error"], 3),
                "along_track_km": round(rsw_errors["along_track_error"], 3),
                "cross_track_km": round(rsw_errors["cross_track_error"], 3),
                "radial_vel_km_s": round(rsw_errors["radial_vel_error"], 5),
                "along_track_vel_km_s": round(rsw_errors["along_track_vel_error"], 5),
                "cross_track_vel_km_s": round(rsw_errors["cross_track_vel_error"], 5),
            },
            "deltas": {
                "semi_major_axis_km": delta_sma,
                "eccentricity": delta_ecc,
                "inclination_deg": delta_inc,
                "altitude_km": delta_alt,
                "period_minutes": delta_period,
                "specific_energy": delta_energy
            },
            "predicted_keplerian": kepler_pred,
            "updated_keplerian": kepler_act,
            "diagnosis": diagnosis,
            "has_active_simulation": sim is not None,
            "simulation_info": {
                "name": sim["name"],
                "description": sim["description"]
            } if sim else None
        }

    @staticmethod
    def classify_severity(pos_error_km: float, vel_error_km_s: float) -> str:
        """Classify anomaly severity level according to physical tolerances."""
        if pos_error_km < ANOMALY_THRESHOLDS["NORMAL"]["max_position_error"] and vel_error_km_s < ANOMALY_THRESHOLDS["NORMAL"]["max_velocity_error"]:
            return "NORMAL"
        elif pos_error_km < ANOMALY_THRESHOLDS["WATCH"]["max_position_error"]:
            return "WATCH"
        elif pos_error_km < ANOMALY_THRESHOLDS["WARNING"]["max_position_error"]:
            return "WARNING"
        else:
            return "CRITICAL"

    @staticmethod
    def diagnose_anomaly(
        sat_id: str,
        severity: str,
        pos_error_km: float,
        vel_error_km_s: float,
        rsw_errors: Dict[str, float],
        kepler_pred: Dict[str, float],
        kepler_act: Dict[str, float],
        delta_sma: float,
        delta_inc: float,
        delta_alt: float,
        sim: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Automated 'What Happened?' root-cause forensic engine.
        Generates contextual astrodynamic explanations and probable cause confidence rankings.
        """
        if severity == "NORMAL":
            return {
                "status_headline": "NOMINAL ORBIT TRACKING",
                "assessment": "Orbit conforms within high-precision numerical ephemeris tolerances.",
                "confidence": "HIGH",
                "possible_causes": [
                    {"cause": "Normal Keplerian trajectory propagation", "likelihood": "98%"},
                    {"cause": "Sub-kilometer numerical integration truncation noise", "likelihood": "2%"}
                ],
                "recommended_action": "Continue automated background monitoring."
            }

        along_track = rsw_errors["along_track_error"]
        cross_track = rsw_errors["cross_track_error"]
        radial = rsw_errors["radial_error"]

        possible_causes = []

        # 1. Check for Orbit Raise / Posigrade Maneuver
        if delta_sma > 1.0 or (delta_alt > 1.5 and along_track > 3.0):
            possible_causes.append({
                "cause": "Orbital altitude raise / posigrade thruster maneuver",
                "likelihood": "88%",
                "details": f"Semi-major axis expanded by {delta_sma:+.2f} km with positive energy gain."
            })

        # 2. Check for De-orbit / Retrograde Maneuver
        elif delta_sma < -1.0 or (delta_alt < -1.5 and along_track < -3.0):
            possible_causes.append({
                "cause": "Retrograde braking / orbit lowering thruster maneuver",
                "likelihood": "85%",
                "details": f"Semi-major axis decreased by {delta_sma:+.2f} km and along-track velocity retarded."
            })

        # 3. Check for Inclination / Plane Change
        if abs(cross_track) > 3.0 or abs(delta_inc) > 0.015:
            possible_causes.append({
                "cause": "Out-of-plane orbital plane adjustment / inclination burn",
                "likelihood": "82%",
                "details": f"Cross-track displacement of {cross_track:+.2f} km and inclination delta {delta_inc:+.4f}°."
            })

        # 4. Check for Atmospheric Drag Perturbation
        if kepler_act["altitude_km"] < 500.0 and along_track < -1.0 and abs(cross_track) < 2.0:
            possible_causes.append({
                "cause": "Atmospheric density fluctuation / Solar geomagnetic storm drag",
                "likelihood": "75%",
                "details": f"Low Earth orbit ({kepler_act['altitude_km']:.1f} km) experiencing unmodeled drag deceleration."
            })

        # 5. Check for Ephemeris / TLE Refinement
        if len(possible_causes) == 0 or (abs(delta_sma) < 0.8 and pos_error_km < 8.0):
            possible_causes.append({
                "cause": "New orbital element solution / Sensor tracking refinement",
                "likelihood": "68%",
                "details": "Ground radar / optical station ephemeris update differing from prior prediction."
            })

        # Fallbacks for completeness
        possible_causes.append({
            "cause": "Numerical integrator truncation vs. SGP4 perturbation model divergence",
            "likelihood": "35%",
            "details": "Accumulated time step drift between analytical SGP4 and numerical RK4 model."
        })

        if severity == "WATCH":
            headline = "MINOR ORBITAL DEVIATION DETECTED"
            assessment = "Slight deviation exceeding sub-kilometer baseline. Satellite remains in safe envelope."
            action = "Monitor next orbital pass for persistent drift."
        elif severity == "WARNING":
            headline = "ELEVATED ORBITAL DEVIATION DETECTED"
            assessment = "Significant discrepancy detected between predicted physics propagation and updated telemetry."
            action = "Flag for ephemeris re-propagation and maneuver confirmation."
        else:
            headline = "CRITICAL ORBITAL ANOMALY DETECTED"
            assessment = "Major state vector departure detected. High probability of intentional maneuver or sudden external event."
            action = "Immediate orbital re-baseline required; notify flight dynamics mission operations."

        return {
            "status_headline": headline,
            "assessment": assessment,
            "confidence": "HIGH" if severity in ("WARNING", "CRITICAL") else "MEDIUM",
            "possible_causes": possible_causes[:4],
            "recommended_action": action
        }


anomaly_detector = AnomalyDetector()
