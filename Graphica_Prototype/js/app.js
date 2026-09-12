/**
 * CAPITOL COMMAND CENTER & BROADCAST PORTAL // MASTER CONTROLLER
 * Faithful recreation of the official Capitol broadcast website with
 * 3D Quarter Quell Clock Arena simulator and interactive YouTube surveillance feed.
 */

// ============================================================================
// CONFIGURATION: LIVE ARENA BROADCAST YOUTUBE FEED
// Set to any valid YouTube Video ID or URL ID (e.g. "n-7K_OjsDCQ")
// ============================================================================
const YOUTUBE_VIDEO_ID = "n-7K_OjsDCQ";

class CapitolCommandApp {
  constructor() {
    this.engine = null;
    this.map = null;
    this.audio = window.capitolAudio;
    this.selectedTributeId = null;
    this.currentView = 'view-broadcast'; // Default view is HOME broadcast
    this.currentZoomedSector = null;

    // Cache DOM Elements
    this.dom = {
      // Navigation & Views
      navButtons: document.querySelectorAll('.nav-link-btn'),
      views: document.querySelectorAll('.portal-view-container'),
      btnBackToHome: document.getElementById('btn-back-to-home'),

      // Fire Embers Background
      embersCanvas: document.getElementById('fire-embers-canvas'),

      // YouTube Feed
      youtubeIframe: document.getElementById('live-youtube-iframe'),
      youtubeFallback: document.getElementById('youtube-fallback-state'),

      // Telemetry & Indicators
      portalAliveCount: document.getElementById('portal-alive-count'),
      portalTrackerFill: document.getElementById('portal-tracker-fill'),
      portalFeedStream: document.getElementById('portal-feed-stream'),
      cycleLabel: document.getElementById('cycle-label'),
      clockDisplay: document.getElementById('clock-display'),
      creditsCount: document.getElementById('credits-count'),
      tributesAliveCount: document.getElementById('tributes-alive-count'),
      activeClockBadge: document.getElementById('active-clock-sector-badge'),

      // Arena Command View Components
      tributeCardsContainer: document.getElementById('tribute-cards-container'),
      filterDistrict: document.getElementById('roster-filter-district'),
      eventLogContainer: document.getElementById('event-log-container'),
      logTabs: document.querySelectorAll('.log-tab'),
      gamemakerSelect: document.getElementById('gamemaker-tribute-select'),

      // Sector HUD
      sectorZoomCard: document.getElementById('sector-zoom-card'),
      sectorHudIcon: document.getElementById('sector-hud-icon'),
      sectorHudHour: document.getElementById('sector-hud-hour'),
      sectorHudName: document.getElementById('sector-hud-name'),
      sectorHudCanonPill: document.getElementById('sector-hud-canon-pill'),
      sectorHudDanger: document.getElementById('sector-hud-danger'),
      sectorHudSummary: document.getElementById('sector-hud-summary'),
      sectorHudEnv: document.getElementById('sector-hud-env'),
      btnTriggerSectorTrap: document.getElementById('btn-trigger-sector-trap'),
      btnRecenterFromSector: document.getElementById('btn-recenter-from-sector'),
      btnCloseSectorZoom: document.getElementById('btn-close-sector-zoom'),

      // Target Locked Overlay
      mapTargetCard: document.getElementById('map-target-card'),
      targetCardBody: document.getElementById('target-card-body'),
      btnCloseTarget: document.getElementById('btn-close-target'),

      // Simulation Speed & Audio
      btnPause: document.getElementById('btn-pause'),
      speedBtns: {
        1: document.getElementById('btn-speed-1'),
        2: document.getElementById('btn-speed-2'),
        5: document.getElementById('btn-speed-5')
      },
      btnAudioToggle: document.getElementById('btn-audio-toggle'),

      // Modals
      modalNightfall: document.getElementById('modal-nightfall'),
      nightfallDayTitle: document.getElementById('nightfall-day-title'),
      nightfallFallenList: document.getElementById('nightfall-fallen-list'),
      btnCloseNightfall: document.getElementById('btn-close-nightfall'),
      modalVictory: document.getElementById('modal-victory'),
      victorShowcaseBox: document.getElementById('victor-showcase-box'),
      victoryRecapStats: document.getElementById('victory-recap-stats'),
      btnVictoryRestart: document.getElementById('btn-victory-restart')
    };

    this.activeLogFilter = 'all';
    this.init();
  }

  init() {
    // 1. Initialize Atmospheric Fire Embers Canvas Background
    this.initEmbersCanvas();

    // 2. Initialize Embedded YouTube Live Feed
    this.initYouTubePlayer();

    // 3. Initialize Simulation Engine
    this.engine = new SimulationEngine(INITIAL_TRIBUTES);

    // 4. Initialize 3D Three.js Clock Arena
    this.map = new TacticalArenaMap('three-canvas-container');

    // 5. Setup Callbacks & Events
    this.bindEngineCallbacks();
    this.setupEventListeners();

    // 6. Initial Render of UI
    this.renderRoster();
    this.renderTributesGallery();
    this.renderDistrictsGallery();
    this.updateTelemetry();
    this.updateTargetDropdown();
    this.map.updateTributePins(this.engine.tributes);

    // 7. Start Simulation Loop
    this.engine.start();

    // Initial broadcast commentary lines
    this.addPortalFeedLine('Capitol TV Broadcast Feed initialized.');
    this.addPortalFeedLine('President Snow delivers Quarter Quell address.');
    this.addPortalFeedLine('Caesar Flickerman: "Odds favoring District 1 & 12!"');
  }

  /**
   * Embedded YouTube Player Initialization & Fallback Handling
   */
  initYouTubePlayer() {
    const iframe = this.dom.youtubeIframe;
    const fallback = this.dom.youtubeFallback;
    
    if (!iframe) return;

    if (YOUTUBE_VIDEO_ID && YOUTUBE_VIDEO_ID.trim() !== "" && YOUTUBE_VIDEO_ID !== "REPLACE_WITH_MY_VIDEO_ID") {
      iframe.src = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&rel=0&modestbranding=1`;
      iframe.style.display = 'block';
      if (fallback) fallback.style.display = 'none';
    } else {
      iframe.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
    }
  }

  /**
   * Cinematic Fire Embers Background Animation
   */
  initEmbersCanvas() {
    const canvas = this.dom.embersCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 65;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.2,
        speedY: 0.3 + Math.random() * 0.9,
        speedX: (Math.random() - 0.5) * 0.5,
        alpha: 0.2 + Math.random() * 0.7,
        decay: 0.002 + Math.random() * 0.004,
        color: Math.random() > 0.35 ? '#F0CC58' : '#D6AF3F'
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.alpha -= p.decay;

        if (p.y < -10 || p.alpha <= 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
          p.alpha = 0.3 + Math.random() * 0.7;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#D6AF3F';
        ctx.fill();
      });

      requestAnimationFrame(render);
    };

    render();
  }

  bindEngineCallbacks() {
    this.engine.onTick = (state) => {
      this.updateTelemetry(state);
      this.renderRoster();
      this.updateTargetDropdown();
      this.map.updateTributePins(this.engine.tributes);

      const sec = state.activeSector;
      if (sec && this.dom.activeClockBadge) {
        this.dom.activeClockBadge.innerText = `${sec.hour}:00 ${sec.name.toUpperCase()}`;
      }
    };

    this.engine.onLog = (entry) => {
      this.appendLogEntry(entry);
      this.addPortalFeedLine(entry.text);
    };

    this.engine.onTributeFell = (victim) => {
      this.renderRoster();
      this.updateTelemetry();
      this.map.updateTributePins(this.engine.tributes);
      this.addPortalFeedLine(`CANNON: ${victim.name} (District ${victim.district}) has fallen.`);
    };

    this.engine.onSectorTrapTriggered = (sector) => {
      this.map.triggerDisasterEffect(sector.trapType, sector.target);
    };

    this.engine.onNightfall = (day, fallenToday) => {
      this.showNightfallMemorial(day, fallenToday);
    };

    this.engine.onVictory = (victor, stats) => {
      this.showVictoryScreen(victor, stats);
    };
  }

  setupEventListeners() {
    // Portal Navigation Tabs
    this.dom.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    if (this.dom.btnBackToHome) {
      this.dom.btnBackToHome.addEventListener('click', () => {
        this.switchView('view-broadcast');
      });
    }

    // Sponsor Buttons on Featured Cards (Cashmere & Gloss)
    document.querySelectorAll('.gold-sponsor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tributeId = btn.dataset.tributeId;
        const tributeName = btn.dataset.tributeName;
        if (tributeId) {
          if (this.engine.sendSponsorGift('medkit', tributeId)) {
            alert(`Sponsorship parachute dispatched to ${tributeName}!`);
            this.updateTelemetry();
          } else {
            alert('Insufficient Capitol Credits.');
          }
        }
      });
    });

    // Sponsor Market Item Buttons (Column 4 on Home)
    document.querySelectorAll('.market-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type || 'medkit';
        const cost = parseInt(btn.dataset.cost) || 100;
        const itemName = btn.dataset.name || 'Sponsor Package';
        const alive = this.engine.getAliveTributes();
        const rand = alive[Math.floor(Math.random() * alive.length)];

        if (this.engine.credits >= cost && rand) {
          this.engine.credits -= cost;
          this.engine.sendSponsorGift(type, rand.id);
          alert(`Silver Parachute with ${itemName} dispatched to ${rand.name} (District ${rand.district})!`);
          this.updateTelemetry();
        } else {
          alert('Insufficient Capitol Credits.');
        }
      });
    });

    // Speed Controls in Arena Command
    if (this.dom.btnPause) {
      this.dom.btnPause.addEventListener('click', () => {
        const isPaused = this.engine.togglePause();
        this.dom.btnPause.classList.toggle('active', isPaused);
        this.dom.btnPause.innerText = isPaused ? '▶' : '⏸';
        if (!isPaused) {
          Object.values(this.dom.speedBtns).forEach(b => b && b.classList.remove('active'));
          if (this.dom.speedBtns[this.engine.speedMultiplier]) {
            this.dom.speedBtns[this.engine.speedMultiplier].classList.add('active');
          }
        }
      });
    }

    [1, 2, 5].forEach(spd => {
      const btn = this.dom.speedBtns[spd];
      if (btn) {
        btn.addEventListener('click', () => {
          this.engine.setSpeed(spd);
          if (this.dom.btnPause) {
            this.dom.btnPause.classList.remove('active');
            this.dom.btnPause.innerText = '⏸';
          }
          Object.values(this.dom.speedBtns).forEach(b => b && b.classList.remove('active'));
          btn.classList.add('active');
        });
      }
    });

    if (this.dom.btnAudioToggle) {
      this.dom.btnAudioToggle.addEventListener('click', () => {
        const muted = this.audio.toggleMute();
        this.dom.btnAudioToggle.innerText = muted ? '🔇' : '🔊';
      });
    }

    // Roster District Filter
    if (this.dom.filterDistrict) {
      this.dom.filterDistrict.addEventListener('change', () => {
        this.renderRoster();
      });
    }

    // Sector Zoom HUD Buttons
    if (this.dom.btnTriggerSectorTrap) {
      this.dom.btnTriggerSectorTrap.addEventListener('click', () => {
        if (this.currentZoomedSector) {
          this.engine.triggerClockSectorTrap(this.currentZoomedSector);
        }
      });
    }

    if (this.dom.btnRecenterFromSector) {
      this.dom.btnRecenterFromSector.addEventListener('click', () => this.map.resetZoom());
    }
    if (this.dom.btnCloseSectorZoom) {
      this.dom.btnCloseSectorZoom.addEventListener('click', () => this.map.resetZoom());
    }

    // Log Filter Tabs
    this.dom.logTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.dom.logTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeLogFilter = tab.dataset.filter || 'all';
        this.filterLogEntries();
      });
    });

    // Gamemaker console buttons
    document.querySelectorAll('.sponsor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const targetId = this.selectedTributeId || (this.dom.gamemakerSelect ? this.dom.gamemakerSelect.value : null);
        const targetTribute = this.engine.getTributeById(targetId) || this.engine.getAliveTributes()[0];
        if (this.engine.sendSponsorGift(type, targetTribute ? targetTribute.id : null)) {
          this.map.triggerDisasterEffect('parachute', targetTribute ? targetTribute.coordinates : { x: 0, z: 0 });
          this.renderRoster();
          this.updateTelemetry();
        }
      });
    });

    document.querySelectorAll('.hazard-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (this.engine.deployHazard(type)) {
          this.renderRoster();
          this.updateTelemetry();
        }
      });
    });

    const spinBtn = document.getElementById('btn-spin-cornucopia');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => {
        if (this.engine.credits >= 100) {
          this.engine.credits -= 100;
          this.engine.spinCornucopia();
          this.updateTelemetry();
        }
      });
    }

    const skirmishBtn = document.getElementById('btn-force-skirmish');
    if (skirmishBtn) {
      skirmishBtn.addEventListener('click', () => {
        const alive = this.engine.getAliveTributes();
        if (alive.length >= 2) {
          const [t1, t2] = alive.sort(() => 0.5 - Math.random()).slice(0, 2);
          this.engine.resolveCombat(t1, t2);
          this.renderRoster();
          this.updateTelemetry();
        }
      });
    }

    if (this.dom.btnCloseNightfall) {
      this.dom.btnCloseNightfall.addEventListener('click', () => {
        this.dom.modalNightfall.style.display = 'none';
        if (this.engine.isPaused) this.engine.togglePause();
      });
    }

    if (this.dom.btnVictoryRestart) {
      this.dom.btnVictoryRestart.addEventListener('click', () => {
        this.dom.modalVictory.style.display = 'none';
        this.restartSimulation();
      });
    }
  }

  switchView(viewId) {
    this.currentView = viewId;

    this.dom.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    this.dom.views.forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });

    if (viewId === 'view-arena' && this.map) {
      setTimeout(() => this.map.onResize(), 60);
    }
  }

  showSectorDetailHUD(sector) {
    this.currentZoomedSector = sector;
    if (this.dom.sectorZoomCard) {
      this.dom.sectorZoomCard.style.display = 'block';
      this.dom.sectorHudIcon.innerText = sector.icon;
      this.dom.sectorHudHour.innerText = sector.hourLabel.toUpperCase();
      this.dom.sectorHudName.innerText = sector.name.toUpperCase();
      this.dom.sectorHudDanger.innerText = sector.dangerLevel;
      this.dom.sectorHudSummary.innerText = sector.summary;
      this.dom.sectorHudEnv.innerText = `Environment: ${sector.environment}`;

      if (this.dom.sectorHudCanonPill) {
        if (sector.isFanTheory) {
          this.dom.sectorHudCanonPill.className = 'canon-pill fan-theory';
          this.dom.sectorHudCanonPill.innerText = 'UNCONFIRMED / FAN THEORY';
        } else {
          this.dom.sectorHudCanonPill.className = 'canon-pill';
          this.dom.sectorHudCanonPill.innerText = 'CANONICAL';
        }
      }
    }
    this.audio.playClick();
  }

  showCornucopiaDetailHUD() {
    if (this.dom.sectorZoomCard) {
      this.dom.sectorZoomCard.style.display = 'block';
      this.dom.sectorHudIcon.innerText = '🌽';
      this.dom.sectorHudHour.innerText = 'ARENA CENTER';
      this.dom.sectorHudName.innerText = 'CORNUCOPIA ISLAND';
      this.dom.sectorHudDanger.innerText = 'CRITICAL WEAPONS CACHE';
      this.dom.sectorHudSummary.innerText = 'Central volcanic basalt island with angular golden weapons horn and 12 connecting spokes to the beach.';
      this.dom.sectorHudEnv.innerText = 'Environment: Volcanic basalt rock, tidal surf, supply crates';
      
      if (this.dom.sectorHudCanonPill) {
        this.dom.sectorHudCanonPill.className = 'canon-pill';
        this.dom.sectorHudCanonPill.innerText = 'CANONICAL (ARENA HUB)';
      }
    }
    this.audio.playClick();
  }

  hideSectorDetailHUD() {
    if (this.dom.sectorZoomCard) {
      this.dom.sectorZoomCard.style.display = 'none';
    }
    this.currentZoomedSector = null;
  }

  selectTribute(tributeId) {
    this.selectedTributeId = tributeId;
    if (this.dom.gamemakerSelect) {
      this.dom.gamemakerSelect.value = tributeId || '';
    }

    document.querySelectorAll('.tribute-card').forEach(card => {
      card.classList.toggle('targeted', card.dataset.id === tributeId);
    });

    if (this.map) this.map.selectTributePin(tributeId);

    if (tributeId) {
      const tribute = this.engine.getTributeById(tributeId);
      if (tribute && this.dom.mapTargetCard) {
        this.dom.mapTargetCard.style.display = 'block';
        this.dom.targetCardBody.innerHTML = `
          <div style="font-weight:800; color:#fff; font-size:13px;">${tribute.avatar} ${tribute.name}</div>
          <div style="color:var(--gold-bright);">District ${tribute.district} (${tribute.districtName})</div>
          <div>HP: ${tribute.health}% | Odds: ${tribute.odds || '10.00'}</div>
          <div>Sector: ${tribute.sector} | Status: ${tribute.status.toUpperCase()}</div>
        `;
      }
    } else if (this.dom.mapTargetCard) {
      this.dom.mapTargetCard.style.display = 'none';
    }
  }

  updateTelemetry(state = null) {
    const day = state ? state.day : this.engine.day;
    const aliveCount = state ? state.aliveCount : this.engine.getAliveTributes().length;
    const credits = state ? state.credits : this.engine.credits;

    if (this.dom.portalAliveCount) {
      this.dom.portalAliveCount.innerText = `${aliveCount} / 24`;
    }
    if (this.dom.portalTrackerFill) {
      this.dom.portalTrackerFill.style.width = `${(aliveCount / 24) * 100}%`;
    }

    if (this.dom.cycleLabel) this.dom.cycleLabel.innerText = `DAY ${day}`;
    if (this.dom.clockDisplay) this.dom.clockDisplay.innerText = this.engine.getFormattedTime();
    if (this.dom.creditsCount) this.dom.creditsCount.innerText = `${credits} CR`;
    if (this.dom.tributesAliveCount) this.dom.tributesAliveCount.innerText = `${aliveCount} / 24`;
  }

  addPortalFeedLine(text) {
    const container = this.dom.portalFeedStream;
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'feed-line';
    div.innerText = text;

    container.insertBefore(div, container.firstChild);
    if (container.children.length > 8) {
      container.removeChild(container.lastChild);
    }
  }

  renderRoster() {
    const container = this.dom.tributeCardsContainer;
    if (!container) return;
    container.innerHTML = '';

    const districtFilter = this.dom.filterDistrict ? this.dom.filterDistrict.value : 'all';

    this.engine.tributes.forEach(tribute => {
      if (districtFilter !== 'all' && tribute.district !== parseInt(districtFilter)) return;

      const card = document.createElement('div');
      card.className = `tribute-card ${tribute.status} ${this.selectedTributeId === tribute.id ? 'targeted' : ''}`;
      card.dataset.id = tribute.id;

      const imgHtml = tribute.image 
        ? `<img src="${tribute.image}" class="tribute-card-img" alt="${tribute.name}" onerror="this.outerHTML='<div class=\\'tribute-card-img\\' style=\\'display:flex;align-items:center;justify-content:center;\\'>${tribute.avatar}</div>'">`
        : `<div class="tribute-card-img" style="display:flex;align-items:center;justify-content:center;font-size:18px;">${tribute.avatar}</div>`;

      let hpClass = '';
      if (tribute.health <= 35) hpClass = 'danger';

      card.innerHTML = `
        <div class="tribute-card-top">
          ${imgHtml}
          <div class="tribute-card-info">
            <div class="tribute-card-name">${tribute.name}</div>
            <div class="tribute-card-district">District ${tribute.district} (${tribute.districtName})</div>
            <div class="tribute-card-hp-bar">
              <div class="tribute-card-hp-fill ${hpClass}" style="width:${tribute.health}%;"></div>
            </div>
          </div>
        </div>
        <div class="tribute-card-stats">
          <span>HP: ${tribute.health}%</span>
          <span>STR: ${tribute.strength}</span>
          <span>ODDS: ${tribute.odds || '10.00'}</span>
          <span>STATUS: ${tribute.status.toUpperCase()}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectTribute(tribute.id);
        this.audio.playClick();
      });

      container.appendChild(card);
    });
  }

  updateTargetDropdown() {
    const select = this.dom.gamemakerSelect;
    if (!select) return;
    const alive = this.engine.getAliveTributes();
    let html = '<option value="">-- AUTO-SELECT: HIGHEST ODDS --</option>';
    alive.forEach(t => {
      html += `<option value="${t.id}">${t.name} (District ${t.district} - HP: ${t.health}%)</option>`;
    });
    select.innerHTML = html;
  }

  appendLogEntry(entry) {
    if (!this.dom.eventLogContainer) return;
    const item = document.createElement('div');
    item.className = `log-entry ${entry.tag}`;
    item.dataset.tag = entry.tag;
    item.innerHTML = `<strong>[${entry.time}]</strong> ${entry.text}`;

    if (this.activeLogFilter !== 'all' && entry.tag !== this.activeLogFilter) {
      item.style.display = 'none';
    }

    this.dom.eventLogContainer.insertBefore(item, this.dom.eventLogContainer.firstChild);
    if (this.dom.eventLogContainer.children.length > 80) {
      this.dom.eventLogContainer.removeChild(this.dom.eventLogContainer.lastChild);
    }
  }

  filterLogEntries() {
    if (!this.dom.eventLogContainer) return;
    const items = this.dom.eventLogContainer.querySelectorAll('.log-entry');
    items.forEach(item => {
      if (this.activeLogFilter === 'all' || item.dataset.tag === this.activeLogFilter) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  showNightfallMemorial(day, fallenToday) {
    if (!this.dom.modalNightfall) return;
    this.dom.nightfallDayTitle.innerText = `FALLEN TRIBUTES — DAY ${day}`;
    this.dom.nightfallFallenList.innerHTML = '';
    fallenToday.forEach(victim => {
      const card = document.createElement('div');
      card.className = 'fallen-memorial-card';
      card.innerHTML = `
        <div style="font-size:24px;">${victim.avatar}</div>
        <div style="font-weight:800; color:#fff;">${victim.name}</div>
        <div style="color:var(--gold-bright);">District ${victim.district}</div>
      `;
      this.dom.nightfallFallenList.appendChild(card);
    });
    this.audio.playAnthem();
    this.dom.modalNightfall.style.display = 'flex';
  }

  showVictoryScreen(victor, stats) {
    if (!this.dom.modalVictory) return;
    this.dom.modalVictory.style.display = 'flex';
    this.dom.victorShowcaseBox.innerHTML = `
      <div style="font-size:36px; margin-bottom:8px;">${victor ? victor.avatar : '👑'}</div>
      <h3 style="font-family:var(--font-serif); font-size:24px; color:var(--gold-bright);">${victor ? victor.name : 'NO SURVIVORS'}</h3>
      <div style="color:var(--text-secondary); margin-top:4px;">VICTOR OF THE 75TH HUNGER GAMES // DISTRICT ${victor ? victor.district : ''}</div>
    `;
  }

  renderTributesGallery() {
    const container = document.getElementById('full-tributes-gallery-grid');
    if (!container) return;
    container.innerHTML = '';

    this.engine.tributes.forEach(t => {
      const card = document.createElement('div');
      card.className = 'featured-card';
      const imgHtml = t.image 
        ? `<img src="${t.image}" class="feat-card-img" alt="${t.name}" onerror="this.outerHTML='<div class=\\'feat-card-img\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:24px;\\'>${t.avatar}</div>'">`
        : `<div class="feat-card-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;">${t.avatar}</div>`;

      card.innerHTML = `
        <div class="tribute-photo-frame">
          ${imgHtml}
        </div>
        <div class="tribute-details-col">
          <div class="feat-tribute-heading">DISTRICT ${t.district} - ${t.name}</div>
          <div class="feat-district-sub">District ${t.district} (${t.districtName})</div>
          <div class="feat-odds-row">
            <span class="odds-label">ODDS</span>
            <span class="odds-number">${t.odds || '10.00'}</span>
          </div>
          <button class="gold-sponsor-btn" data-tribute-id="${t.id}" data-tribute-name="${t.name}">SPONSOR</button>
        </div>
      `;

      card.querySelector('.gold-sponsor-btn').addEventListener('click', () => {
        this.selectTribute(t.id);
        this.switchView('view-arena');
      });

      container.appendChild(card);
    });
  }

  renderDistrictsGallery() {
    const container = document.getElementById('districts-info-grid');
    if (!container) return;
    container.innerHTML = '';

    const districts = [
      { num: 1, name: 'Luxury', desc: 'Produces luxury goods for the Capitol. Known for producing aggressive, career victors including Gloss and Cashmere.' },
      { num: 2, name: 'Masonry & Defense', desc: 'Quarrying, stone carving, and Capitol Peacekeeper military weapons. Produced fierce victors Brutus and Enobaria.' },
      { num: 3, name: 'Technology', desc: 'Electronic components, wiring, semiconductors, and communications. Produced tech-geniuses Beetee and Wiress.' },
      { num: 4, name: 'Fishing', desc: 'Marine harvesting, netting, and underwater survival skills. Produced iconic victor Finnick Odair and Mags.' },
      { num: 5, name: 'Power & Electricity', desc: 'Hydroelectric dams and nuclear power generators providing electricity to Panem.' },
      { num: 6, name: 'Transportation', desc: 'High-speed maglev rails, hovercraft assemblies, and locomotive engines.' },
      { num: 7, name: 'Lumber', desc: 'Lumberjacks, tree harvesting, and paper mills. Produced combat axe-master Johanna Mason.' },
      { num: 8, name: 'Textiles', desc: 'Industrial fabric looms, cotton processing, and Peacekeeper uniform manufacturing.' },
      { num: 9, name: 'Grain', desc: 'Expansive wheat harvesting, grain silos, and agricultural mills.' },
      { num: 10, name: 'Livestock', desc: 'Cattle ranches, meat processing, and leather tanning.' },
      { num: 11, name: 'Agriculture', desc: 'Immense orchards, cotton, and grain fields surrounded by electrified fences. Produced Thresh, Rue, Chaff, and Seeder.' },
      { num: 12, name: 'Coal Mining', desc: 'Deep subterranean coal extraction in the Appalachian mountains. Produced Katniss Everdeen, Peeta Mellark, and Haymitch Abernathy.' }
    ];

    districts.forEach(d => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-card-title">DISTRICT ${d.num} — ${d.name.toUpperCase()}</div>
        <p style="font-size:12px; color:var(--text-secondary);">${d.desc}</p>
      `;
      container.appendChild(card);
    });
  }

  restartSimulation() {
    this.engine = new SimulationEngine(INITIAL_TRIBUTES);
    this.bindEngineCallbacks();
    this.renderRoster();
    this.updateTelemetry();
    this.map.resetZoom();
    this.map.updateTributePins(this.engine.tributes);
    this.engine.start();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.capitolApp = new CapitolCommandApp();
});
