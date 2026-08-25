/**
 * Diagnostics & "What Happened?" Forensic Inspector Module
 */

class DiagnosticInspector {
  constructor() {
    this.modal = document.getElementById("diagnosticModal");
    this.modalHeadline = document.getElementById("modalHeadline");
    this.modalAssessment = document.getElementById("modalAssessment");
    this.modalConfidence = document.getElementById("modalConfidence");
    this.modalSatSub = document.getElementById("modalSatSub");
    this.modalAlertBanner = document.getElementById("modalAlertBanner");
    this.modalAlertIcon = document.getElementById("modalAlertIcon");
    this.modalTableBody = document.getElementById("modalTableBody");
    this.modalCausesList = document.getElementById("modalCausesList");
    this.modalRecommendation = document.getElementById("modalRecommendation");

    this.initEvents();
  }

  initEvents() {
    const btnOpen = document.getElementById("btnInspectAnomaly");
    const btnOpenSub = document.getElementById("btnOpenDiagnosisModal");
    const btnClose = document.getElementById("btnCloseModal");
    const btnCloseSec = document.getElementById("btnModalCloseSecondary");
    const btnRebaseline = document.getElementById("btnModalRebaseline");

    if (btnOpen) btnOpen.addEventListener("click", () => this.open());
    if (btnOpenSub) btnOpenSub.addEventListener("click", () => this.open());
    if (btnClose) btnClose.addEventListener("click", () => this.close());
    if (btnCloseSec) btnCloseSec.addEventListener("click", () => this.close());

    if (btnRebaseline) {
      btnRebaseline.addEventListener("click", () => {
        if (window.app && window.app.activeSatellite) {
          window.app.triggerScenario("RESET_NOMINAL");
          this.showToast("Numerical propagation epoch re-baselined to current observed state.");
          this.close();
        }
      });
    }

    // Close on escape key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });

    // Close on outside backdrop click
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  }

  isOpen() {
    return this.modal && this.modal.classList.contains("active");
  }

  open() {
    if (!this.modal) return;
    this.updateModalContent();
    this.modal.classList.add("active");
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove("active");
  }

  updateModalContent() {
    if (!window.app || !window.app.latestDeviation) return;

    const dev = window.app.latestDeviation;
    const sat = window.app.activeSatellite;
    const diag = dev.diagnosis || {};
    const severity = dev.severity || "NORMAL";

    // Header info
    if (this.modalSatSub) {
      this.modalSatSub.textContent = `Satellite: ${sat ? sat.name : 'Unknown'} • NORAD: ${sat ? sat.norad_id : 'N/A'} • Epoch: ${dev.timestamp || new Date().toISOString()}`;
    }

    // Alert Banner Styling
    if (this.modalAlertBanner) {
      this.modalAlertBanner.className = `modal-alert-banner alert-banner-${severity.toLowerCase()}`;
    }

    if (this.modalAlertIcon) {
      if (severity === "CRITICAL") this.modalAlertIcon.className = "fa-solid fa-radiation";
      else if (severity === "WARNING") this.modalAlertIcon.className = "fa-solid fa-triangle-exclamation";
      else if (severity === "WATCH") this.modalAlertIcon.className = "fa-solid fa-eye";
      else this.modalAlertIcon.className = "fa-solid fa-shield-halved";
    }

    if (this.modalHeadline) this.modalHeadline.textContent = diag.status_headline || `${severity} ORBITAL STATE`;
    if (this.modalAssessment) this.modalAssessment.textContent = diag.assessment || "No anomalous deviations registered.";
    if (this.modalConfidence) this.modalConfidence.textContent = `CONFIDENCE: ${diag.confidence || 'HIGH'}`;

    // Render Parameter Comparison Table
    this.renderComparisonTable(dev);

    // Render Root Causes
    this.renderRootCauses(diag.possible_causes || []);

    // Recommendation
    if (this.modalRecommendation) {
      this.modalRecommendation.textContent = diag.recommended_action || "Continue nominal orbital tracking.";
    }
  }

  renderComparisonTable(dev) {
    if (!this.modalTableBody) return;

    const pred = dev.predicted_keplerian || {};
    const upd = dev.updated_keplerian || {};
    const deltas = dev.deltas || {};
    const rsw = dev.rsw_components || {};

    const rows = [
      {
        param: "3D Position Error (Δr)",
        pred: "0.00 km (Ref)",
        upd: `${dev.position_error_km.toFixed(3)} km`,
        delta: `Δr = ${dev.position_error_km.toFixed(3)} km`,
        eval: dev.position_error_km < 1.0 ? "🟢 Nominal" : dev.position_error_km < 5.0 ? "🟡 Watch" : "🔴 Discrepancy"
      },
      {
        param: "Along-Track Offset (S)",
        pred: "0.00 km (In-track)",
        upd: `${(rsw.along_track_km || 0).toFixed(3)} km`,
        delta: `${(rsw.along_track_km || 0) >= 0 ? '+' : ''}${(rsw.along_track_km || 0).toFixed(3)} km`,
        eval: Math.abs(rsw.along_track_km || 0) > 3.0 ? "⚠️ Longitudinal Drift" : "🟢 Conforms"
      },
      {
        param: "Cross-Track Offset (W)",
        pred: "0.00 km (Plane)",
        upd: `${(rsw.cross_track_km || 0).toFixed(3)} km`,
        delta: `${(rsw.cross_track_km || 0) >= 0 ? '+' : ''}${(rsw.cross_track_km || 0).toFixed(3)} km`,
        eval: Math.abs(rsw.cross_track_km || 0) > 2.0 ? "⚠️ Plane Offset" : "🟢 In-Plane"
      },
      {
        param: "Altitude (Mean Radius)",
        pred: `${(pred.altitude_km || 0).toFixed(1)} km`,
        upd: `${(upd.altitude_km || 0).toFixed(1)} km`,
        delta: `${(deltas.altitude_km || 0) >= 0 ? '+' : ''}${(deltas.altitude_km || 0).toFixed(2)} km`,
        eval: Math.abs(deltas.altitude_km || 0) > 1.5 ? "⚠️ Altitude Shift" : "🟢 Aligned"
      },
      {
        param: "Orbital Speed (ECI)",
        pred: `${(pred.speed_km_s || 0).toFixed(4)} km/s`,
        upd: `${(upd.speed_km_s || 0).toFixed(4)} km/s`,
        delta: `${dev.velocity_error_km_s.toFixed(5)} km/s`,
        eval: dev.velocity_error_km_s > 0.02 ? "⚠️ Velocity Delta" : "🟢 Within Tolerance"
      },
      {
        param: "Semi-Major Axis (a)",
        pred: `${(pred.semi_major_axis_km || 0).toFixed(2)} km`,
        upd: `${(upd.semi_major_axis_km || 0).toFixed(2)} km`,
        delta: `${(deltas.semi_major_axis_km || 0) >= 0 ? '+' : ''}${(deltas.semi_major_axis_km || 0).toFixed(2)} km`,
        eval: Math.abs(deltas.semi_major_axis_km || 0) > 1.0 ? "⚠️ Energy Change" : "🟢 Stable"
      },
      {
        param: "Inclination (i)",
        pred: `${(pred.inclination_deg || 0).toFixed(4)}°`,
        upd: `${(upd.inclination_deg || 0).toFixed(4)}°`,
        delta: `${(deltas.inclination_deg || 0) >= 0 ? '+' : ''}${(deltas.inclination_deg || 0).toFixed(4)}°`,
        eval: Math.abs(deltas.inclination_deg || 0) > 0.01 ? "⚠️ Plane Tilt" : "🟢 Nominal"
      }
    ];

    this.modalTableBody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 600;">${r.param}</td>
        <td class="mono">${r.pred}</td>
        <td class="mono">${r.upd}</td>
        <td class="mono" style="color: ${r.delta.includes('-') ? '#ff7597' : '#00f2ff'};">${r.delta}</td>
        <td>${r.eval}</td>
      </tr>
    `).join("");
  }

  renderRootCauses(causes) {
    if (!this.modalCausesList) return;

    if (!causes || causes.length === 0) {
      this.modalCausesList.innerHTML = `
        <div class="cause-card">
          <div class="cause-title">Nominal Keplerian Orbit Propagation</div>
          <div class="cause-desc">No anomalous flight perturbations or discrepancies detected.</div>
        </div>
      `;
      return;
    }

    this.modalCausesList.innerHTML = causes.map(c => `
      <div class="cause-card">
        <div class="cause-header">
          <span class="cause-title">${c.cause}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono" style="font-size: 11px; color: var(--color-cyan); font-weight: 700;">${c.likelihood || '50%'}</span>
            <div class="cause-prob-bar-wrap">
              <div class="cause-prob-bar" style="width: ${c.likelihood || '50%'};"></div>
            </div>
          </div>
        </div>
        <p class="cause-desc">${c.details || 'Identified by astrodynamic perturbation signature matching.'}</p>
      </div>
    `).join("");
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <i class="fa-solid fa-circle-info" style="color: var(--color-cyan);"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

window.diagnostics = new DiagnosticInspector();
