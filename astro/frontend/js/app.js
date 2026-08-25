/**
 * Main Application Coordinator, WebSocket Stream Listener & Telemetry HUD Module
 */

class AstroTraceApp {
  constructor() {
    this.satellites = [];
    this.activeSatellite = null;
    this.latestTelemetry = null;
    this.latestDeviation = null;
    this.activeFilter = "ALL";
    this.searchQuery = "";

    // WebSocket connections
    this.satSocket = null;
    this.fleetSocket = null;

    // DOM Elements
    this.satList = document.getElementById("satList");
    this.searchInput = document.getElementById("satSearchInput");
    this.utcClock = document.getElementById("utcClock");
    this.tickerFleetCount = document.getElementById("tickerFleetCount");
    this.fleetCountBadge = document.getElementById("fleetCountBadge");
    this.normalCount = document.getElementById("normalCount");
    this.watchCount = document.getElementById("watchCount");
    this.anomalyCount = document.getElementById("anomalyCount");

    // HUD Elements
    this.hudSatName = document.getElementById("hudSatName");
    this.hudSatCategory = document.getElementById("hudSatCategory");
    this.hudSatOrbitType = document.getElementById("hudSatOrbitType");
    this.hudNoradId = document.getElementById("hudNoradId");
    this.hudStatusBadge = document.getElementById("hudStatusBadge");
    this.hudStatusText = document.getElementById("hudStatusText");
    this.hudColorBar = document.getElementById("hudColorBar");

    // Telemetry Elements
    this.telAltitude = document.getElementById("telAltitude");
    this.telVelocity = document.getElementById("telVelocity");
    this.telLatitude = document.getElementById("telLatitude");
    this.telLongitude = document.getElementById("telLongitude");
    this.telAltRange = document.getElementById("telAltRange");
    this.telGroundSpeed = document.getElementById("telGroundSpeed");

    // Deviation Elements
    this.devBadge = document.getElementById("devBadge");
    this.devPosError = document.getElementById("devPosError");
    this.devVelError = document.getElementById("devVelError");
    this.devPosBar = document.getElementById("devPosBar");
    this.devVelBar = document.getElementById("devVelBar");
    this.rswRadial = document.getElementById("rswRadial");
    this.rswAlong = document.getElementById("rswAlong");
    this.rswCross = document.getElementById("rswCross");
    this.diagHeadline = document.getElementById("diagHeadline");
    this.diagText = document.getElementById("diagText");

    // Keplerian Elements
    this.kepSMA = document.getElementById("kepSMA");
    this.kepEcc = document.getElementById("kepEcc");
    this.kepInc = document.getElementById("kepInc");
    this.kepRaan = document.getElementById("kepRaan");
    this.kepArgp = document.getElementById("kepArgp");
    this.kepPeriod = document.getElementById("kepPeriod");

    this.init();
  }

  async init() {
    this.startClock();
    this.initFilterEvents();
    this.initScenarioEvents();
    this.initHeaderButtons();

    await this.fetchSatellites();
    if (this.satellites.length > 0) {
      this.selectSatellite(this.satellites[0].id);
    }

    this.connectFleetWebSocket();
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, "0");
      const m = String(now.getUTCMinutes()).padStart(2, "0");
      const s = String(now.getUTCSeconds()).padStart(2, "0");
      if (this.utcClock) {
        this.utcClock.textContent = `${h}:${m}:${s} UTC`;
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  async fetchSatellites() {
    try {
      const res = await fetch("/api/satellites");
      if (!res.ok) throw new Error("Failed to fetch satellites");
      this.satellites = await res.json();
      this.renderFleetList();
      this.updateFleetStats();
    } catch (err) {
      console.error("Error fetching fleet:", err);
    }
  }

  updateFleetStats() {
    const total = this.satellites.length;
    let norm = 0, watch = 0, anom = 0;

    this.satellites.forEach(s => {
      if (s.severity === "NORMAL") norm++;
      else if (s.severity === "WATCH") watch++;
      else anom++;
    });

    if (this.tickerFleetCount) this.tickerFleetCount.textContent = `${total} Satellites`;
    if (this.fleetCountBadge) this.fleetCountBadge.textContent = `${total} SAT`;
    if (this.normalCount) this.normalCount.textContent = norm;
    if (this.watchCount) this.watchCount.textContent = watch;
    if (this.anomalyCount) this.anomalyCount.textContent = anom;
  }

  renderFleetList() {
    if (!this.satList) return;

    const filtered = this.satellites.filter(s => {
      const matchFilter = this.activeFilter === "ALL" || s.orbit_type === this.activeFilter;
      const matchSearch = !this.searchQuery || 
        s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        String(s.norad_id).includes(this.searchQuery);
      return matchFilter && matchSearch;
    });

    this.satList.innerHTML = filtered.map(s => {
      const isActive = this.activeSatellite && this.activeSatellite.id === s.id;
      const sev = s.severity || "NORMAL";
      return `
        <div class="sat-card ${isActive ? 'active' : ''}" data-id="${s.id}">
          <div class="sat-card-info">
            <div class="sat-card-icon" style="color: ${s.color || '#00f2ff'};">
              <i class="fa-solid fa-satellite"></i>
            </div>
            <div>
              <div class="sat-card-name">
                ${s.name}
              </div>
              <div class="sat-card-sub">
                ${s.orbit_type} • NORAD ${s.norad_id}
              </div>
            </div>
          </div>
          <span class="status-pill ${sev.toLowerCase()}">${sev}</span>
        </div>
      `;
    }).join("");

    // Attach click listeners
    const cards = this.satList.querySelectorAll(".sat-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        this.selectSatellite(card.dataset.id);
      });
    });
  }

  async selectSatellite(satId) {
    const sat = this.satellites.find(s => s.id === satId);
    if (!sat) return;

    this.activeSatellite = sat;
    this.renderFleetList();

    // Update Top HUD
    if (this.hudSatName) this.hudSatName.textContent = sat.name;
    if (this.hudSatCategory) this.hudSatCategory.textContent = sat.category;
    if (this.hudSatOrbitType) this.hudSatOrbitType.textContent = `${sat.orbit_type} Orbit`;
    if (this.hudNoradId) this.hudNoradId.textContent = sat.norad_id;
    if (this.hudColorBar) this.hudColorBar.style.background = sat.color || "#00f2ff";

    // 1. Fetch Orbit Trajectory & Predicted Orbit for 3D globe
    try {
      const [orbitRes, predRes, histRes] = await Promise.all([
        fetch(`/api/satellite/${satId}/orbit?periods=1.0&num_points=120`),
        fetch(`/api/satellite/${satId}/prediction?hours=6&step_seconds=60`),
        fetch(`/api/satellite/${satId}/history?limit=40`)
      ]);

      const orbitData = await orbitRes.json();
      const predData = await predRes.json();
      const histData = await histRes.json();

      if (window.globe) {
        window.globe.updateOrbitTrajectories(orbitData, predData);
      }

      if (window.telemetryChart) {
        window.telemetryChart.loadHistory(histData);
      }
    } catch (err) {
      console.error("Error loading orbit/prediction/history:", err);
    }

    // 2. Connect to Satellite WebSocket
    this.connectSatelliteWebSocket(satId);
  }

  connectSatelliteWebSocket(satId) {
    if (this.satSocket) {
      this.satSocket.close();
      this.satSocket = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/satellite/${satId}`;

    try {
      this.satSocket = new WebSocket(wsUrl);

      this.satSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "telemetry_update") {
            this.handleTelemetryUpdate(data);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      this.satSocket.onerror = (err) => {
        console.warn("Satellite WS error:", err);
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
    }
  }

  connectFleetWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/fleet`;

    try {
      this.fleetSocket = new WebSocket(wsUrl);

      this.fleetSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "fleet_update" && data.satellites) {
            // Update local satellite list statuses
            data.satellites.forEach(fs => {
              const local = this.satellites.find(s => s.id === fs.id);
              if (local) {
                local.severity = fs.severity;
                local.position_error_km = fs.position_error_km;
                local.has_active_simulation = fs.has_active_simulation;
                local.ecef = fs.ecef;
              }
            });

            this.renderFleetList();
            this.updateFleetStats();

            if (window.globe) {
              window.globe.updateFleetMarkers(data.satellites, this.activeSatellite ? this.activeSatellite.id : null);
            }
          }
        } catch (e) {
          console.error("Error parsing fleet WS:", e);
        }
      };
    } catch (e) {
      console.error("Fleet WebSocket connection failed:", e);
    }
  }

  handleTelemetryUpdate(data) {
    this.latestTelemetry = data;
    this.latestDeviation = {
      ...data.deviation,
      timestamp: data.timestamp,
      predicted_keplerian: data.keplerian,
      updated_keplerian: data.keplerian,
      rsw_components: data.deviation.rsw,
      deltas: data.deviation.deltas
    };

    const geo = data.geodetic || {};
    const ecef = data.ecef || {};
    const kep = data.keplerian || {};
    const dev = data.deviation || {};
    const sev = dev.severity || "NORMAL";

    // 1. Update 3D Globe
    if (window.globe) {
      window.globe.updateSatellitePosition(ecef, geo, sev);
    }

    // 2. Update HUD Badge
    if (this.hudStatusBadge && this.hudStatusText) {
      this.hudStatusBadge.className = `hud-status-badge badge-${sev.toLowerCase()}`;
      this.hudStatusText.textContent = sev;
    }

    // 3. Update Key Telemetry Metrics
    if (this.telAltitude) this.telAltitude.textContent = geo.altitude_km ? geo.altitude_km.toFixed(1) : "--";
    if (this.telVelocity) this.telVelocity.textContent = kep.speed_km_s ? kep.speed_km_s.toFixed(3) : "--";
    if (this.telLatitude) this.telLatitude.textContent = geo.latitude !== undefined ? `${Math.abs(geo.latitude).toFixed(3)}° ${geo.latitude >= 0 ? 'N' : 'S'}` : "--";
    if (this.telLongitude) this.telLongitude.textContent = geo.longitude !== undefined ? `${Math.abs(geo.longitude).toFixed(3)}° ${geo.longitude >= 0 ? 'E' : 'W'}` : "--";
    if (this.telAltRange) this.telAltRange.textContent = `Apogee ${kep.apogee_alt_km || '--'} km • Perigee ${kep.perigee_alt_km || '--'} km`;
    if (this.telGroundSpeed) this.telGroundSpeed.textContent = `Ground Speed ${geo.ground_speed_km_s ? geo.ground_speed_km_s.toFixed(2) : '--'} km/s`;

    // 4. Update Deviation Card
    if (this.devBadge) {
      this.devBadge.className = `dev-badge badge-${sev.toLowerCase()}`;
      this.devBadge.textContent = sev;
    }
    if (this.devPosError) {
      this.devPosError.innerHTML = `${dev.position_error_km.toFixed(3)} <span class="unit">km</span>`;
    }
    if (this.devVelError) {
      this.devVelError.innerHTML = `${dev.velocity_error_km_s.toFixed(4)} <span class="unit">km/s</span>`;
    }

    // Error Bar width % (capped at 100%)
    if (this.devPosBar) {
      const posPct = Math.min((dev.position_error_km / 25.0) * 100, 100);
      this.devPosBar.style.width = `${Math.max(posPct, 4)}%`;
      this.devPosBar.style.background = sev === "CRITICAL" ? "var(--color-critical)" : sev === "WARNING" ? "var(--color-warning)" : sev === "WATCH" ? "var(--color-watch)" : "var(--color-normal)";
    }
    if (this.devVelBar) {
      const velPct = Math.min((dev.velocity_error_km_s / 0.1) * 100, 100);
      this.devVelBar.style.width = `${Math.max(velPct, 4)}%`;
      this.devVelBar.style.background = sev === "CRITICAL" ? "var(--color-critical)" : sev === "WARNING" ? "var(--color-warning)" : sev === "WATCH" ? "var(--color-watch)" : "var(--color-normal)";
    }

    // RSW components
    const rsw = dev.rsw || {};
    if (this.rswRadial) this.rswRadial.textContent = `${(rsw.radial_km || 0) >= 0 ? '+' : ''}${(rsw.radial_km || 0).toFixed(2)} km`;
    if (this.rswAlong) this.rswAlong.textContent = `${(rsw.along_track_km || 0) >= 0 ? '+' : ''}${(rsw.along_track_km || 0).toFixed(2)} km`;
    if (this.rswCross) this.rswCross.textContent = `${(rsw.cross_track_km || 0) >= 0 ? '+' : ''}${(rsw.cross_track_km || 0).toFixed(2)} km`;

    // Quick Diagnosis snippet
    const diag = dev.diagnosis || {};
    if (this.diagHeadline) this.diagHeadline.textContent = diag.status_headline || "NOMINAL TRACKING";
    if (this.diagText) this.diagText.textContent = diag.assessment || "Conforms with numerical baseline.";

    // 5. Update Classical Orbital Elements
    if (this.kepSMA) this.kepSMA.textContent = `${kep.semi_major_axis_km || '--'} km`;
    if (this.kepEcc) this.kepEcc.textContent = kep.eccentricity !== undefined ? kep.eccentricity.toFixed(6) : "--";
    if (this.kepInc) this.kepInc.textContent = `${kep.inclination_deg || '--'}°`;
    if (this.kepRaan) this.kepRaan.textContent = `${kep.raan_deg || '--'}°`;
    if (this.kepArgp) this.kepArgp.textContent = `${kep.arg_perigee_deg || '--'}°`;
    if (this.kepPeriod) this.kepPeriod.textContent = `${kep.period_minutes || '--'} min`;

    // 6. Update Real-Time Chart
    if (window.telemetryChart) {
      window.telemetryChart.addDataPoint(data.timestamp, dev.position_error_km, dev.velocity_error_km_s, rsw);
    }
  }

  async triggerScenario(scenarioType) {
    if (!this.activeSatellite) return;

    try {
      const res = await fetch(`/api/satellite/${this.activeSatellite.id}/simulate-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_type: scenarioType,
          magnitude_factor: 1.0
        })
      });

      const data = await res.json();
      const isReset = scenarioType === "RESET_NOMINAL";

      if (isReset) {
        // Clear the red deviated orbit on reset
        if (window.globe) {
          window.globe.clearDeviatedOrbit();
        }
        if (window.diagnostics) {
          window.diagnostics.showToast("✅ Reset to nominal — deviated orbit cleared.");
        }
      } else {
        // Fetch the PERTURBED RK4 prediction trajectory — this carries the
        // injected scenario deviation. Extract ECEF points and draw them
        // as a full red dashed orbit path (same style as amber predicted path).
        try {
          const satId = this.activeSatellite.id;
          // Use a longer step to cover ~1 full orbital period in ~120 points
          const predRes = await fetch(`/api/satellite/${satId}/prediction?hours=3&step_seconds=90`);
          const predData = await predRes.json();

          if (window.globe && predData && predData.trajectory && predData.trajectory.length > 1) {
            // Map the trajectory's per-point ecef objects into flat {x,y,z} array
            const ecefPoints = predData.trajectory.map(pt => pt.ecef || pt);
            window.globe.updateDeviatedOrbit(ecefPoints);
          }
        } catch (predErr) {
          console.warn("Could not fetch deviated trajectory:", predErr);
        }

        if (window.diagnostics) {
          window.diagnostics.showToast(`🔴 ${data.scenario || scenarioType} — deviated orbit shown in red.`);
        }
      }
    } catch (err) {
      console.error("Error triggering scenario:", err);
    }
  }

  initScenarioEvents() {
    const scenarioBtns = document.querySelectorAll(".scenario-btn[data-scenario]");
    scenarioBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.triggerScenario(btn.dataset.scenario);
      });
    });
  }

  initFilterEvents() {
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderFleetList();
      });
    }

    // Category Tabs
    const tabBtns = document.querySelectorAll(".fleet-tabs .tab-btn");
    tabBtns.forEach(tab => {
      tab.addEventListener("click", () => {
        tabBtns.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.activeFilter = tab.dataset.filter;
        this.renderFleetList();
      });
    });
  }

  initHeaderButtons() {
    const btnSync = document.getElementById("btnRefreshTLE");
    if (btnSync) {
      btnSync.addEventListener("click", async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        try {
          await fetch("/api/tle/refresh", { method: "POST" });
          if (window.diagnostics) {
            window.diagnostics.showToast("CelesTrak TLE sync initiated in background.");
          }
        } catch (e) {
          console.error("Error syncing TLE:", e);
        } finally {
          setTimeout(() => {
            btnSync.disabled = false;
            btnSync.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync TLEs';
          }, 2000);
        }
      });
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.app = new AstroTraceApp();
});
