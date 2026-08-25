import unittest
import numpy as np
from datetime import datetime, timezone
from backend.satellite.anomaly import anomaly_detector
from backend.satellite.coordinate import calculate_rsw_errors
from backend.satellite.propagator import propagator


class TestAnomalyDetection(unittest.TestCase):

    def test_rsw_error_decomposition(self):
        r_ref = np.array([7000.0, 0.0, 0.0])
        v_ref = np.array([0.0, 7.5, 0.0])

        # Test along-track displacement of +5 km
        r_test = np.array([7000.0, 5.0, 0.0])
        v_test = np.array([0.0, 7.5, 0.0])

        rsw = calculate_rsw_errors(r_ref, v_ref, r_test, v_test)
        self.assertAlmostEqual(rsw["pos_error_total"], 5.0, delta=1e-3)
        self.assertAlmostEqual(rsw["along_track_error"], 5.0, delta=1e-2)
        self.assertAlmostEqual(rsw["radial_error"], 0.0, delta=1e-2)
        self.assertAlmostEqual(rsw["cross_track_error"], 0.0, delta=1e-2)

    def test_severity_classification(self):
        self.assertEqual(anomaly_detector.classify_severity(0.5, 0.002), "NORMAL")
        self.assertEqual(anomaly_detector.classify_severity(2.5, 0.01), "WATCH")
        self.assertEqual(anomaly_detector.classify_severity(12.0, 0.04), "WARNING")
        self.assertEqual(anomaly_detector.classify_severity(35.0, 0.12), "CRITICAL")

    def test_scenario_injection_and_diagnosis(self):
        sat_id = "iss"
        r_init = np.array([6800.0, 0.0, 0.0])
        v_init = np.array([0.0, 7.6, 0.0])
        state = {
            "_r_vec": r_init,
            "_v_vec": v_init
        }

        # Inject orbit raise maneuver
        sim_res = anomaly_detector.inject_scenario(sat_id, "ORBIT_RAISE_MANEUVER", magnitude_factor=1.0)
        self.assertEqual(sim_res["status"], "active")

        # Compute deviation
        dev = anomaly_detector.compute_deviation(sat_id, state, state)
        self.assertTrue(dev["position_error_km"] > 5.0)
        self.assertIn(dev["severity"], ["WARNING", "CRITICAL"])
        self.assertTrue(len(dev["diagnosis"]["possible_causes"]) > 0)
        self.assertIn("thruster", dev["diagnosis"]["possible_causes"][0]["cause"].lower())

        # Reset nominal
        reset_res = anomaly_detector.inject_scenario(sat_id, "RESET_NOMINAL")
        self.assertEqual(reset_res["status"], "reset")

        dev_reset = anomaly_detector.compute_deviation(sat_id, state, state)
        self.assertEqual(dev_reset["severity"], "NORMAL")
        self.assertAlmostEqual(dev_reset["position_error_km"], 0.0, delta=1e-3)


if __name__ == "__main__":
    unittest.main()
