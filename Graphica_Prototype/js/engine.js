/**
 * 75th QUARTER QUELL // SIMULATION & CLOCK ENGINE
 * Manages hourly clock progression, authentic clock sector trap triggers,
 * tribute encounters, tribute deaths, and Gamemaker controls.
 */

class SimulationEngine {
  constructor(tributesData) {
    this.tributes = JSON.parse(JSON.stringify(tributesData));
    this.day = 1;
    this.hour = 12; // Start at 12:00 (Lightning Tree strike!)
    this.credits = 500;
    this.isPaused = false;
    this.speedMultiplier = 1; // 1x = 3000ms per hour
    this.baseTickInterval = 3000;
    this.timerId = null;

    this.logs = [];
    this.dayFallenTributes = [];
    this.allFallenTributes = [];
    this.activeClockSector = 12;

    // Callbacks
    this.onTick = null;
    this.onLog = null;
    this.onTributeFell = null;
    this.onNightfall = null;
    this.onDaybreak = null;
    this.onVictory = null;
    this.onSectorTrapTriggered = null;
  }

  start() {
    this.scheduleNextTick();
  }

  scheduleNextTick() {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.isPaused) return;

    const delay = this.baseTickInterval / this.speedMultiplier;
    this.timerId = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, delay);
  }

  setSpeed(speed) {
    if (speed === 0) {
      this.isPaused = true;
      if (this.timerId) clearTimeout(this.timerId);
    } else {
      this.isPaused = false;
      this.speedMultiplier = speed;
      this.scheduleNextTick();
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.scheduleNextTick();
    } else if (this.timerId) {
      clearTimeout(this.timerId);
    }
    return this.isPaused;
  }

  getAliveTributes() {
    return this.tributes.filter(t => t.status !== 'deceased');
  }

  getDeceasedTributes() {
    return this.tributes.filter(t => t.status === 'deceased');
  }

  getTributeById(id) {
    return this.tributes.find(t => t.id === id);
  }

  getClockSectorByHour(hour) {
    const h = (hour % 12 === 0) ? 12 : (hour % 12);
    return CLOCK_SECTORS.find(s => s.hour === h) || CLOCK_SECTORS[0];
  }

  /**
   * Main Simulation Hourly Progression
   */
  tick() {
    const alive = this.getAliveTributes();
    if (alive.length <= 1) {
      this.triggerVictory(alive[0] || null);
      return;
    }

    this.hour++;
    if (this.hour >= 24) {
      this.hour = 0;
      this.day++;
      this.dayFallenTributes = [];
      if (this.onDaybreak) this.onDaybreak(this.day);
    }

    // Passive credit growth
    this.credits += 5;

    // Clock Sector calculation: 12-hour cycle
    const currentClockHour = (this.hour % 12 === 0) ? 12 : (this.hour % 12);
    this.activeClockSector = currentClockHour;
    const sector = this.getClockSectorByHour(currentClockHour);

    // Nightfall broadcast at 20:00
    if (this.hour === 20) {
      if (this.onNightfall) this.onNightfall(this.day, [...this.dayFallenTributes]);
    }

    // Trigger Clock Trap for the active sector!
    this.triggerClockSectorTrap(sector);

    // Dynamic events (skirmishes, survival, moves)
    this.generateHourlyEvents();

    if (this.onTick) {
      this.onTick({
        day: this.day,
        hour: this.hour,
        isNight: this.isNightTime(),
        aliveCount: alive.length,
        credits: this.credits,
        activeSector: sector
      });
    }

    const remaining = this.getAliveTributes();
    if (remaining.length <= 1) {
      this.triggerVictory(remaining[0] || null);
    }
  }

  isNightTime() {
    return this.hour >= 20 || this.hour < 6;
  }

  getFormattedTime() {
    const h = String(this.hour).padStart(2, '0');
    return `${h}:00`;
  }

  /**
   * Triggers the authentic trap in the designated clock sector
   */
  triggerClockSectorTrap(sector) {
    this.addLog(
      'hazard',
      `⏰ CLOCK STRIKE [${sector.hourLabel}]: ${sector.icon} ${sector.name.toUpperCase()} ACTIVATED in Sector ${sector.hour}!`
    );

    // Trigger visual 3D particle effect
    if (this.onSectorTrapTriggered) {
      this.onSectorTrapTriggered(sector);
    }

    // Check if any tributes are inside or near this sector
    const alive = this.getAliveTributes();
    const victims = alive.filter(t => t.sector === sector.hour);

    if (victims.length > 0) {
      victims.forEach(v => {
        const dmg = Math.floor(30 + Math.random() * 40);
        v.health = Math.max(0, v.health - dmg);

        // Forced retreat across spoke bridge towards the beach or adjacent sector
        v.sector = ((v.sector % 12) + 1);

        if (v.health <= 0) {
          this.eliminateTribute(v, null);
          this.addLog(
            'fallen',
            `💀 TRAP CASUALTY: ${v.name} (District ${v.district}) was eliminated by the ${sector.name}!`
          );
        } else {
          v.status = 'injured';
          this.addLog(
            'hazard',
            `⚠️ ${v.name} took ${dmg} DMG from ${sector.name} and fled across the stone spoke bridge! [HP: ${v.health}%]`
          );
        }
      });
    }
  }

  /**
   * Allows manual triggering of any sector trap
   */
  forceTriggerSector(sectorHour) {
    const sector = CLOCK_SECTORS.find(s => s.hour === sectorHour);
    if (!sector) return;
    this.triggerClockSectorTrap(sector);
  }

  generateHourlyEvents() {
    const alive = this.getAliveTributes();
    if (alive.length <= 1) return;

    const subject = alive[Math.floor(Math.random() * alive.length)];
    const roll = Math.random();

    if (roll < 0.45 && alive.length > 1) {
      const opponents = alive.filter(t => t.id !== subject.id);
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      this.resolveCombat(subject, opponent);
    } else if (roll < 0.8) {
      this.resolveSurvivalEvent(subject);
    } else {
      this.resolveMovementEvent(subject);
    }
  }

  resolveCombat(attacker, defender) {
    if (defender.stealth > 82 && Math.random() < 0.55) {
      this.addLog(
        'combat',
        `${defender.name} (D${defender.district}) melted into the dense bamboo and evaded ${attacker.name}.`
      );
      return;
    }

    const weaponBonusA = attacker.inventory.length * 6;
    const weaponBonusD = defender.inventory.length * 6;
    const powerA = attacker.strength * 0.7 + weaponBonusA + Math.random() * 30;
    const powerD = defender.strength * 0.7 + weaponBonusD + Math.random() * 30;

    this.credits += 15; // Viewer boost

    if (powerA >= powerD) {
      const dmg = Math.floor(25 + Math.random() * 45);
      defender.health = Math.max(0, defender.health - dmg);

      if (defender.health <= 0) {
        this.eliminateTribute(defender, attacker);
        this.addLog(
          'combat',
          `⚔️ FATAL DUEL: ${attacker.name} (D${attacker.district}) slew ${defender.name} (D${defender.district}) on the spoke rocks!`
        );
      } else {
        defender.status = 'injured';
        this.addLog(
          'combat',
          `⚔️ CLASH: ${attacker.name} slashed ${defender.name} with ${attacker.inventory[0] || 'bare hands'} [-${dmg} HP].`
        );
      }
    } else {
      const counter = Math.floor(20 + Math.random() * 40);
      attacker.health = Math.max(0, attacker.health - counter);

      if (attacker.health <= 0) {
        this.eliminateTribute(attacker, defender);
        this.addLog(
          'combat',
          `⚔️ COUNTER-KILL: ${defender.name} parried and drove a fatal strike into ${attacker.name}!`
        );
      } else {
        attacker.status = 'injured';
        this.addLog(
          'combat',
          `⚔️ REPELLED: ${defender.name} successfully countered ${attacker.name}'s assault [-${counter} HP]!`
        );
      }
    }
  }

  resolveSurvivalEvent(tribute) {
    const events = [
      {
        text: `${tribute.name} tapped a spile into a jungle tree and gathered fresh drinking water.`,
        effect: () => {
          tribute.health = Math.min(100, tribute.health + 12);
          if (tribute.health > 40) tribute.status = 'alive';
        }
      },
      {
        text: `${tribute.name} collected edible oysters along the saltwater spoke reef.`,
        effect: () => {
          tribute.health = Math.min(100, tribute.health + 10);
        }
      },
      {
        text: `⚠️ ${tribute.name} spotted forcefield perimeter shimmer and steered clear of the sky dome!`,
        effect: () => {}
      },
      {
        text: `${tribute.name} applied healing saltwater to burns, relieving agonizing blisters.`,
        effect: () => {
          tribute.health = Math.min(100, tribute.health + 15);
          if (tribute.health > 40) tribute.status = 'alive';
        }
      }
    ];

    const pick = events[Math.floor(Math.random() * events.length)];
    pick.effect();
    this.addLog('survival', pick.text);
  }

  resolveMovementEvent(tribute) {
    const oldSector = tribute.sector;
    const newSector = Math.floor(1 + Math.random() * 12);
    tribute.sector = newSector;

    const angle = (newSector / 12) * Math.PI * 2;
    const dist = 18 + Math.random() * 26;
    tribute.coordinates = {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist
    };

    this.addLog(
      'survival',
      `📡 SENSOR BLIP: ${tribute.name} traversed spoke to Sector ${newSector} (${this.getClockSectorByHour(newSector).name}).`
    );
  }

  eliminateTribute(victim, killer = null) {
    victim.health = 0;
    victim.status = 'deceased';
    if (killer) killer.kills = (killer.kills || 0) + 1;

    this.dayFallenTributes.push(victim);
    this.allFallenTributes.push(victim);

    if (window.capitolAudio) {
      window.capitolAudio.playCannon();
    }

    if (this.onTributeFell) {
      this.onTributeFell(victim, killer);
    }
  }

  deployHazard(type, targetTributeId = null) {
    const costs = {
      mutts: 150,
      fire: 200,
      jackers: 100,
      fog: 120,
      wave: 180,
      lightning: 160
    };

    const cost = costs[type] || 120;
    if (this.credits < cost) return false;

    this.credits -= cost;
    if (window.capitolAudio) window.capitolAudio.playSiren();

    const alive = this.getAliveTributes();
    if (alive.length === 0) return true;

    if (type === 'lightning') {
      this.forceTriggerSector(12);
    } else if (type === 'fog') {
      this.forceTriggerSector(2);
    } else if (type === 'mutts') {
      this.forceTriggerSector(3);
    } else if (type === 'wave') {
      this.forceTriggerSector(10);
    } else if (type === 'jackers') {
      this.forceTriggerSector(11);
    } else {
      // General perimeter strike
      this.addLog('hazard', '⚠️ GAMEMAKER STRIKE: Full-perimeter forcefield vibration unleashed!');
      alive.forEach(t => {
        if (Math.random() < 0.4) {
          t.health = Math.max(0, t.health - 25);
          if (t.health <= 0) this.eliminateTribute(t, null);
        }
      });
    }

    return true;
  }

  sendSponsorGift(type, tributeId) {
    const costs = { medkit: 80, food: 50, weapon: 120, surprise: 90 };
    const cost = costs[type] || 50;
    if (this.credits < cost) return false;

    let tribute = this.getTributeById(tributeId);
    if (!tribute || tribute.status === 'deceased') {
      const alive = this.getAliveTributes();
      if (alive.length === 0) return false;
      tribute = alive[Math.floor(Math.random() * alive.length)];
    }

    this.credits -= cost;
    if (window.capitolAudio) window.capitolAudio.playParachuteDrop();

    if (type === 'medkit') {
      tribute.health = Math.min(100, tribute.health + 50);
      if (tribute.health > 40) tribute.status = 'alive';
      tribute.inventory.push('Capitol Burn Ointment');
      this.addLog('sponsor', `🪂 SILVER PARACHUTE: Medicine & burn ointment delivered to ${tribute.name} (+50 HP)!`);
    } else if (type === 'food') {
      tribute.health = Math.min(100, tribute.health + 25);
      tribute.inventory.push('Capitol Bread Rolls');
      this.addLog('sponsor', `🪂 SILVER PARACHUTE: Fresh bread from District 3 dropped for ${tribute.name}!`);
    } else if (type === 'weapon') {
      tribute.strength = Math.min(100, tribute.strength + 15);
      tribute.inventory.push('Titanium Trident Tip');
      this.addLog('sponsor', `🪂 SILVER PARACHUTE: Advanced Capitol weapon parachuted to ${tribute.name}!`);
    } else if (type === 'surprise') {
      tribute.inventory.push('Spile & Wire Spool');
      tribute.health = Math.min(100, tribute.health + 30);
      this.addLog('sponsor', `🪂 SILVER PARACHUTE: Golden spile & survival bundle air-dropped to ${tribute.name}!`);
    }

    return true;
  }

  spinCornucopia() {
    this.addLog(
      'hazard',
      '🔄 ARENA MECHANISM: The central Cornucopia island spins violently to disorient tributes and shift sector alignments!'
    );
    if (window.capitolAudio) window.capitolAudio.playSiren();

    const alive = this.getAliveTributes();
    alive.forEach(t => {
      t.sector = Math.floor(1 + Math.random() * 12);
    });
  }

  addLog(tag, text) {
    const entry = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      time: this.getFormattedTime(),
      tag,
      text
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) this.logs.pop();
    if (this.onLog) this.onLog(entry);
  }

  triggerVictory(victor) {
    if (this.timerId) clearTimeout(this.timerId);
    this.isPaused = true;
    if (window.capitolAudio) window.capitolAudio.playVictory();

    if (this.onVictory) {
      this.onVictory(victor, {
        day: this.day,
        totalTributes: 24,
        fallenCount: this.allFallenTributes.length,
        kills: victor ? victor.kills : 0
      });
    }
  }
}
