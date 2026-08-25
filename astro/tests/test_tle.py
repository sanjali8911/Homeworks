import unittest
from datetime import datetime, timezone
from backend.satellite.tle import parse_tle_metadata, parse_tle_epoch, tle_manager
from backend.satellite.propagator import propagator


class TestTLEAndPropagation(unittest.TestCase):

    def setUp(self):
        self.iss_l1 = "1 25544U 98067A   24080.52847222  .00014381  00000+0  25916-3 0  9993"
        self.iss_l2 = "2 25544  51.6418 208.3145 0004928 112.5209 247.6402 15.49842183444438"

    def test_parse_tle_metadata(self):
        meta = parse_tle_metadata(self.iss_l1, self.iss_l2, "ISS")
        self.assertEqual(meta["norad_id"], 25544)
        self.assertAlmostEqual(meta["inclination_deg"], 51.6418, delta=0.01)
        self.assertAlmostEqual(meta["period_minutes"], 92.9, delta=1.0)
        self.assertEqual(meta["rev_number"], 44443)

    def test_sgp4_propagation(self):
        dt = datetime(2024, 3, 20, 12, 0, 0, tzinfo=timezone.utc)
        state = propagator.propagate_sgp4(self.iss_l1, self.iss_l2, dt)

        self.assertIn("eci", state)
        self.assertIn("geodetic", state)
        self.assertTrue(350.0 < state["geodetic"]["altitude_km"] < 450.0)
        self.assertTrue(7.0 < state["keplerian"]["speed_km_s"] < 8.0)
        self.assertTrue(-90.0 <= state["geodetic"]["latitude"] <= 90.0)
        self.assertTrue(-180.0 <= state["geodetic"]["longitude"] <= 180.0)

    def test_orbit_trajectory_generation(self):
        dt = datetime(2024, 3, 20, 12, 0, 0, tzinfo=timezone.utc)
        traj = propagator.get_orbit_trajectory(self.iss_l1, self.iss_l2, dt, num_points=50)

        self.assertEqual(len(traj["points_ecef"]), 51)
        self.assertEqual(len(traj["ground_track"]), 51)


if __name__ == "__main__":
    unittest.main()
