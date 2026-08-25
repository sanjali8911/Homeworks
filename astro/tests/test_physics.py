import unittest
import numpy as np
from backend.satellite.physics import (
    compute_acceleration,
    rk4_step,
    propagate_rk4,
    state_to_keplerian
)
from backend.config import MU_EARTH, EARTH_RADIUS_KM


class TestOrbitalPhysics(unittest.TestCase):

    def test_keplerian_elements_leo(self):
        # Circular orbit at 400 km altitude
        r_mag = EARTH_RADIUS_KM + 400.0
        v_mag = np.sqrt(MU_EARTH / r_mag)

        r_vec = np.array([r_mag, 0.0, 0.0])
        v_vec = np.array([0.0, v_mag, 0.0])

        elements = state_to_keplerian(r_vec, v_vec)
        self.assertAlmostEqual(elements["altitude_km"], 400.0, delta=1.0)
        self.assertAlmostEqual(elements["eccentricity"], 0.0, delta=1e-4)
        self.assertAlmostEqual(elements["inclination_deg"], 0.0, delta=1e-4)
        self.assertTrue(90.0 < elements["period_minutes"] < 95.0)

    def test_rk4_propagation_step(self):
        r_mag = EARTH_RADIUS_KM + 400.0
        v_mag = np.sqrt(MU_EARTH / r_mag)

        r_vec = np.array([r_mag, 0.0, 0.0])
        v_vec = np.array([0.0, v_mag, 0.0])

        r_next, v_next = rk4_step(r_vec, v_vec, dt=10.0, include_j2=True, include_drag=False)
        self.assertEqual(len(r_next), 3)
        self.assertEqual(len(v_next), 3)
        # Position should have moved primarily in Y direction
        self.assertTrue(r_next[1] > 0.0)

    def test_rk4_energy_conservation(self):
        # In pure two-body gravity (no drag, no J2), specific energy should be conserved
        r_mag = EARTH_RADIUS_KM + 600.0
        v_mag = np.sqrt(MU_EARTH / r_mag)

        r_vec = np.array([r_mag, 0.0, 0.0])
        v_vec = np.array([0.0, v_mag * np.cos(np.radians(28.5)), v_mag * np.sin(np.radians(28.5))])

        traj = propagate_rk4(r_vec, v_vec, total_seconds=300.0, step_size=10.0, include_j2=False, include_drag=False)
        self.assertGreater(len(traj), 10)

        # Compare initial and final specific energy
        _, r_init, v_init = traj[0]
        _, r_final, v_final = traj[-1]

        e_init = 0.5 * np.linalg.norm(v_init)**2 - MU_EARTH / np.linalg.norm(r_init)
        e_final = 0.5 * np.linalg.norm(v_final)**2 - MU_EARTH / np.linalg.norm(r_final)
        self.assertAlmostEqual(e_init, e_final, delta=1e-3)


if __name__ == "__main__":
    unittest.main()
