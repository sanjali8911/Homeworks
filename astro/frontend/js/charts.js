/**
 * Real-Time Telemetry & Deviation History Charts Module (Chart.js)
 */

class TelemetryChart {
  constructor() {
    this.canvas = document.getElementById("deviationChart");
    this.chart = null;
    this.currentMode = "pos"; // 'pos', 'vel', 'rsw'
    this.maxPoints = 40;
    this.historyData = {
      labels: [],
      posError: [],
      velError: [],
      radial: [],
      alongTrack: [],
      crossTrack: []
    };

    this.initDrawer();
    this.initChart();
  }

  initDrawer() {
    const drawer = document.getElementById("chartsDrawer");
    const workspace = document.querySelector(".mission-workspace");
    const btnToggle = document.getElementById("btnToggleDrawer");
    const tabs = document.querySelectorAll(".drawer-tab");

    if (btnToggle && drawer && workspace) {
      btnToggle.addEventListener("click", () => {
        drawer.classList.toggle("collapsed");
        workspace.classList.toggle("drawer-collapsed");
        if (window.globe && window.globe.onWindowResize) {
          setTimeout(() => window.globe.onWindowResize(), 320);
        }
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.currentMode = tab.dataset.chart;
        this.updateChartConfig();
      });
    });
  }

  initChart() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");

    // Default configuration for Position Error
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: this.getDatasetsForMode("pos")
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            display: this.currentMode === "rsw",
            labels: {
              color: "#94a3b8",
              font: { family: "Inter", size: 10 },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: "rgba(10, 14, 26, 0.95)",
            titleColor: "#00f2ff",
            bodyColor: "#f8fafc",
            borderColor: "rgba(0, 242, 255, 0.3)",
            borderWidth: 1,
            padding: 8,
            titleFont: { family: "JetBrains Mono", size: 11 },
            bodyFont: { family: "JetBrains Mono", size: 10 }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#64748b",
              font: { family: "JetBrains Mono", size: 9 },
              maxRotation: 0,
              maxTicksLimit: 8
            }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: "#94a3b8",
              font: { family: "JetBrains Mono", size: 9 }
            },
            title: {
              display: true,
              text: "Position Error (km)",
              color: "#64748b",
              font: { family: "Inter", size: 9, weight: 600 }
            }
          }
        }
      }
    });
  }

  getDatasetsForMode(mode) {
    if (mode === "pos") {
      return [{
        label: "3D Position Error Δr (km)",
        data: [],
        borderColor: "#00f2ff",
        backgroundColor: "rgba(0, 242, 255, 0.12)",
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: "#00f2ff"
      }];
    } else if (mode === "vel") {
      return [{
        label: "3D Velocity Error Δv (km/s)",
        data: [],
        borderColor: "#ffaa00",
        backgroundColor: "rgba(255, 170, 0, 0.12)",
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: "#ffaa00"
      }];
    } else {
      // RSW Error Components
      return [
        {
          label: "Radial (R km)",
          data: [],
          borderColor: "#00ff88",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 1
        },
        {
          label: "Along-Track (S km)",
          data: [],
          borderColor: "#00f2ff",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 1
        },
        {
          label: "Cross-Track (W km)",
          data: [],
          borderColor: "#9d4edd",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 1
        }
      ];
    }
  }

  updateChartConfig() {
    if (!this.chart) return;

    this.chart.data.datasets = this.getDatasetsForMode(this.currentMode);
    this.chart.options.plugins.legend.display = this.currentMode === "rsw";

    const yTitle = this.currentMode === "pos"
      ? "Position Error (km)"
      : this.currentMode === "vel"
      ? "Velocity Error (km/s)"
      : "RSW Error (km)";

    this.chart.options.scales.y.title.text = yTitle;
    this.syncDataToChart();
  }

  loadHistory(historyList) {
    this.historyData.labels = [];
    this.historyData.posError = [];
    this.historyData.velError = [];
    this.historyData.radial = [];
    this.historyData.alongTrack = [];
    this.historyData.crossTrack = [];

    historyList.forEach(item => {
      const t = new Date(item.timestamp);
      const timeLabel = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:${String(t.getUTCSeconds()).padStart(2, '0')}`;

      this.historyData.labels.push(timeLabel);
      this.historyData.posError.push(item.pos_error_km);
      this.historyData.velError.push(item.vel_error_km_s);
      this.historyData.radial.push(item.radial_km || 0);
      this.historyData.alongTrack.push(item.along_track_km || 0);
      this.historyData.crossTrack.push(item.cross_track_km || 0);
    });

    this.syncDataToChart();
  }

  addDataPoint(timestamp, posError, velError, rsw) {
    const t = new Date(timestamp);
    const timeLabel = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:${String(t.getUTCSeconds()).padStart(2, '0')}`;

    this.historyData.labels.push(timeLabel);
    this.historyData.posError.push(posError);
    this.historyData.velError.push(velError);
    this.historyData.radial.push(rsw.radial_km || 0);
    this.historyData.alongTrack.push(rsw.along_track_km || 0);
    this.historyData.crossTrack.push(rsw.cross_track_km || 0);

    if (this.historyData.labels.length > this.maxPoints) {
      this.historyData.labels.shift();
      this.historyData.posError.shift();
      this.historyData.velError.shift();
      this.historyData.radial.shift();
      this.historyData.alongTrack.shift();
      this.historyData.crossTrack.shift();
    }

    this.syncDataToChart();
  }

  syncDataToChart() {
    if (!this.chart) return;

    this.chart.data.labels = [...this.historyData.labels];

    if (this.currentMode === "pos") {
      this.chart.data.datasets[0].data = [...this.historyData.posError];
    } else if (this.currentMode === "vel") {
      this.chart.data.datasets[0].data = [...this.historyData.velError];
    } else {
      this.chart.data.datasets[0].data = [...this.historyData.radial];
      this.chart.data.datasets[1].data = [...this.historyData.alongTrack];
      this.chart.data.datasets[2].data = [...this.historyData.crossTrack];
    }

    this.chart.update("none"); // update without costly full re-render
  }
}

window.telemetryChart = new TelemetryChart();
