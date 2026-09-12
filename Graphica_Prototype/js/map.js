/**
 * 75th QUARTER QUELL CLOCK ARENA 3D ENGINE (Three.js)
 * Implements the clock-face arena with 12 spoke bridges, central volcanic Cornucopia,
 * 12 clock sectors, click-to-zoom camera controller, and authentic sector hazard effects.
 */

class TacticalArenaMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.arenaGroup = null;
    this.tributePinsGroup = null;
    this.hazardGroup = null;
    this.sectorMeshes = [];

    // Camera Zoom & Animation state
    this.defaultCamPos = new THREE.Vector3(0, 105, 115);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);
    this.currentCamPos = this.defaultCamPos.clone();
    this.currentTarget = this.defaultTarget.clone();
    this.targetCamPos = this.defaultCamPos.clone();
    this.targetLookAt = this.defaultTarget.clone();
    this.isZoomed = false;
    this.selectedSector = null;

    // Mouse Gyro Parallax
    this.baseRotation = { x: 0.55, y: 0 };
    this.targetRotation = { x: 0.55, y: 0 };
    this.currentRotation = { x: 0.55, y: 0 };
    this.mouseVector = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    // Tribute pins dictionary
    this.pins = new Map();
    this.activeDisasters = [];

    this.init();
  }

  init() {
    if (!this.container) return;

    const width = this.container.clientWidth || 700;
    const height = this.container.clientHeight || 400;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060910, 0.005);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1200);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultTarget);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x405570, 1.4);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4d0, 1.8);
    sunLight.position.set(60, 120, 50);
    this.scene.add(sunLight);

    const cyanRim = new THREE.PointLight(0x00f2fe, 1.5, 200);
    cyanRim.position.set(0, 45, 0);
    this.scene.add(cyanRim);

    // 5. Main Arena Hierarchy
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);

    this.tributePinsGroup = new THREE.Group();
    this.arenaGroup.add(this.tributePinsGroup);

    this.hazardGroup = new THREE.Group();
    this.arenaGroup.add(this.hazardGroup);

    // 6. Build 75th Clock Arena Geometry
    this.buildClockArena();

    // 7. Event listeners
    this.setupInteractions();

    window.addEventListener('resize', () => this.onResize());
    new ResizeObserver(() => this.onResize()).observe(this.container);

    this.animate();
  }

  /**
   * Constructs the authentic 75th Hunger Games Clock Arena:
   * - Saltwater circular sea
   * - 12 spokes radiating to sand beach
   * - Volcanic Cornucopia rock island with sharp angular monolith
   * - 12 jungle clock sectors
   * - Massive Lightning Tree at 12 o'clock
   */
  buildClockArena() {
    const arenaRadius = 60;
    const beachInnerRadius = 24;
    const beachOuterRadius = 30;
    const cornucopiaIslandRadius = 7.5;

    // 1. Saltwater Inner Sea (Water lagoon)
    const seaGeom = new THREE.CircleGeometry(beachOuterRadius, 64);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x005577,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const seaMesh = new THREE.Mesh(seaGeom, seaMat);
    seaMesh.rotation.x = -Math.PI / 2;
    seaMesh.position.y = 0.1;
    this.arenaGroup.add(seaMesh);

    // Subtle water ripples ring
    const rippleGeom = new THREE.RingGeometry(cornucopiaIslandRadius + 1, beachInnerRadius - 1, 48);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const rippleMesh = new THREE.Mesh(rippleGeom, rippleMat);
    rippleMesh.rotation.x = -Math.PI / 2;
    rippleMesh.position.y = 0.2;
    this.arenaGroup.add(rippleMesh);

    // 2. White Sand Beach Rim (Ring from radius 24 to 30)
    const beachGeom = new THREE.RingGeometry(beachInnerRadius, beachOuterRadius, 64);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xe5dfc5,
      roughness: 0.9,
      metalness: 0.05
    });
    const beachMesh = new THREE.Mesh(beachGeom, beachMat);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.position.y = 0.25;
    this.arenaGroup.add(beachMesh);

    // 3. Central Volcanic Cornucopia Island
    const islandGeom = new THREE.CylinderGeometry(cornucopiaIslandRadius - 0.5, cornucopiaIslandRadius + 0.8, 1.8, 32);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d, // Dark volcanic basalt
      roughness: 0.9,
      metalness: 0.3
    });
    const islandMesh = new THREE.Mesh(islandGeom, islandMat);
    islandMesh.position.y = 0.8;
    islandMesh.userData = { isCornucopia: true };
    this.arenaGroup.add(islandMesh);

    // 4. Angular Geometric Cornucopia Monolith (Matching Reference Image 2)
    this.buildFacetedCornucopia();

    // 5. 12 Radial Spokes / Land Bridges from Cornucopia to Beach (Matching Image 4)
    this.buildSpokes(cornucopiaIslandRadius, beachInnerRadius + 1);

    // 6. 24 Tribute Launch Pedestals in Saltwater Sea
    this.buildLaunchPedestals(beachInnerRadius - 6);

    // 7. 12 Clock Jungle Sectors (Ring from 30 to 60)
    this.buildClockSectors(beachOuterRadius, arenaRadius);

    // 8. Lightning Tree in Sector 12 (Matching Reference Image 3)
    this.buildLightningTree();

    // 9. Forcefield Dome Rim
    this.buildForcefieldDome(arenaRadius);
  }

  /**
   * Faceted geometric dark metallic Cornucopia (Reference Image 2)
   */
  buildFacetedCornucopia() {
    const group = new THREE.Group();
    group.position.set(0, 1.5, 0);

    const hornMat = new THREE.MeshStandardMaterial({
      color: 0x3d434d,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x111620,
      flatShading: true
    });

    // Angular shards forming the iconic horn
    const shardGeom1 = new THREE.ConeGeometry(2.4, 7.5, 4);
    const shard1 = new THREE.Mesh(shardGeom1, hornMat);
    shard1.rotation.set(Math.PI / 3.5, 0, -Math.PI / 6);
    shard1.position.set(1.5, 3.2, 0);
    group.add(shard1);

    const shardGeom2 = new THREE.ConeGeometry(2.0, 6.0, 4);
    const shard2 = new THREE.Mesh(shardGeom2, hornMat);
    shard2.rotation.set(Math.PI / 4, Math.PI / 4, -Math.PI / 4);
    shard2.position.set(-1.2, 2.5, 0.8);
    group.add(shard2);

    const shardGeom3 = new THREE.ConeGeometry(1.8, 5.0, 4);
    const shard3 = new THREE.Mesh(shardGeom3, hornMat);
    shard3.rotation.set(Math.PI / 3, -Math.PI / 4, Math.PI / 5);
    shard3.position.set(0, 2.8, -1.5);
    group.add(shard3);

    // Supply crates around base
    const crateGeom = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const crate = new THREE.Mesh(crateGeom, crateMat);
      crate.position.set(Math.cos(angle) * 4.2, 0.4, Math.sin(angle) * 4.2);
      group.add(crate);
    }

    group.userData = { isCornucopia: true };
    this.arenaGroup.add(group);
  }

  /**
   * 12 Stone/Rock Spokes (Spanning from Cornucopia to Beach)
   */
  buildSpokes(innerR, outerR) {
    const spokeWidth = 1.0;
    const length = outerR - innerR;
    const spokeGeom = new THREE.BoxGeometry(spokeWidth, 0.5, length);
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x272c35,
      roughness: 0.95,
      metalness: 0.2
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeom, spokeMat);

      const midR = innerR + length / 2;
      spoke.position.x = Math.sin(angle) * midR;
      spoke.position.z = -Math.cos(angle) * midR;
      spoke.position.y = 0.35;
      spoke.rotation.y = -angle;

      this.arenaGroup.add(spoke);
    }
  }

  /**
   * 24 Tribute Launch Pedestals floating in the saltwater
   */
  buildLaunchPedestals(radius) {
    const pedGeom = new THREE.CylinderGeometry(0.75, 0.85, 0.4, 12);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const ped = new THREE.Mesh(pedGeom, pedMat);
      ped.position.x = Math.sin(angle) * radius;
      ped.position.z = -Math.cos(angle) * radius;
      ped.position.y = 0.3;
      this.arenaGroup.add(ped);
    }
  }

  /**
   * Builds the 12 Clock Sectors with lush tropical jungle canopy and hour glyphs
   */
  buildClockSectors(innerR, outerR) {
    const sectorAngle = (Math.PI * 2) / 12;

    CLOCK_SECTORS.forEach((sec, idx) => {
      // Wedge shape for sector
      const shape = new THREE.Shape();
      const startAngle = idx * sectorAngle - Math.PI / 2 - sectorAngle / 2;
      const endAngle = startAngle + sectorAngle;

      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const theta = startAngle + (s / segments) * sectorAngle;
        const x = Math.cos(theta) * outerR;
        const y = Math.sin(theta) * outerR;
        if (s === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      for (let s = segments; s >= 0; s--) {
        const theta = startAngle + (s / segments) * sectorAngle;
        const x = Math.cos(theta) * innerR;
        const y = Math.sin(theta) * innerR;
        shape.lineTo(x, y);
      }
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);

      // Tropical foliage color with subtle sector styling
      let sectorColor = 0x14532d; // Lush jungle green
      if (sec.trapType === 'blood_rain') sectorColor = 0x3b1820; // Crimson tinted
      else if (sec.trapType === 'poison_fog') sectorColor = 0x1e3a2f; // Murky toxic
      else if (sec.trapType === 'darkness') sectorColor = 0x080c10; // Pitch black
      else if (sec.trapType === 'quicksand') sectorColor = 0x45311e; // Muddy silt
      else if (sec.trapType === 'lightning') sectorColor = 0x166534; // Deep banyan

      const mat = new THREE.MeshStandardMaterial({
        color: sectorColor,
        roughness: 0.85,
        metalness: 0.15,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.2;
      mesh.userData = { isSector: true, sectorData: sec };
      this.arenaGroup.add(mesh);
      this.sectorMeshes.push(mesh);

      // Sector Divider Radial Line
      const divGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(startAngle) * innerR, 0.35, Math.sin(startAngle) * innerR),
        new THREE.Vector3(Math.cos(startAngle) * outerR, 0.35, Math.sin(startAngle) * outerR)
      ]);
      const divMat = new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.5 });
      const divider = new THREE.Line(divGeom, divMat);
      this.arenaGroup.add(divider);

      // Procedural 3D Canopy Trees scattered in the sector
      this.populateSectorJungle(startAngle, endAngle, innerR + 3, outerR - 4);

      // Floating Clock Hour Number Beacon
      const midTheta = (startAngle + endAngle) / 2;
      const glyphX = Math.cos(midTheta) * (outerR - 4);
      const glyphZ = Math.sin(midTheta) * (outerR - 4);

      const glyphMarker = this.createClockMarker(sec.hour, glyphX, glyphZ);
      glyphMarker.userData = { isSectorMarker: true, sectorData: sec };
      this.arenaGroup.add(glyphMarker);
    });
  }

  /**
   * Scattered 3D jungle trees in each sector
   */
  populateSectorJungle(startAngle, endAngle, minR, maxR) {
    const treeCount = 12;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x291d12, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    for (let t = 0; t < treeCount; t++) {
      const angle = startAngle + Math.random() * (endAngle - startAngle);
      const r = minR + Math.random() * (maxR - minR);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const group = new THREE.Group();
      group.position.set(x, 0.2, z);

      // Trunk
      const trunkH = 2.5 + Math.random() * 1.5;
      const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6);
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = trunkH / 2;
      group.add(trunk);

      // Canopy dome
      const canopyR = 1.4 + Math.random() * 0.8;
      const canopyGeom = new THREE.SphereGeometry(canopyR, 6, 5);
      const canopy = new THREE.Mesh(canopyGeom, leafMat);
      canopy.position.y = trunkH + canopyR * 0.6;
      group.add(canopy);

      this.arenaGroup.add(group);
    }
  }

  /**
   * Giant Lightning Tree at 12 o'clock (Reference Image 3)
   */
  buildLightningTree() {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(0, 0.2, -44); // 12 o'clock outer zone

    const banyanMat = new THREE.MeshStandardMaterial({
      color: 0x1a2118,
      roughness: 0.95,
      metalness: 0.1
    });

    // Massive main trunk
    const trunkGeom = new THREE.CylinderGeometry(2.0, 3.5, 12, 10);
    const trunk = new THREE.Mesh(trunkGeom, banyanMat);
    trunk.position.y = 6;
    treeGroup.add(trunk);

    // Hanging banyan root vines
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rootGeom = new THREE.CylinderGeometry(0.2, 0.35, 10, 5);
      const root = new THREE.Mesh(rootGeom, banyanMat);
      root.position.set(Math.cos(angle) * 3.2, 5, Math.sin(angle) * 3.2);
      treeGroup.add(root);
    }

    // Huge sprawling banyan crown canopy
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x0f4220,
      roughness: 0.85
    });
    const crownGeom = new THREE.SphereGeometry(6.5, 12, 8);
    const crown = new THREE.Mesh(crownGeom, crownMat);
    crown.position.y = 13;
    treeGroup.add(crown);

    // Lightning Rod tip with glowing pulse
    const rodGeom = new THREE.CylinderGeometry(0.1, 0.3, 4, 6);
    const rodMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const rod = new THREE.Mesh(rodGeom, rodMat);
    rod.position.y = 18;
    treeGroup.add(rod);

    treeGroup.userData = { isLightningTree: true };
    this.arenaGroup.add(treeGroup);
  }

  /**
   * Floating sci-fi clock hour marker
   */
  createClockMarker(hour, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 4, z);

    const diamondGeom = new THREE.OctahedronGeometry(1.2, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      emissive: 0xd4af37,
      emissiveIntensity: 0.6,
      metalness: 0.8
    });
    const diamond = new THREE.Mesh(diamondGeom, diamondMat);
    group.add(diamond);

    // Light beam down to ground
    const beamGeom = new THREE.CylinderGeometry(0.08, 0.08, 4, 6);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.4 });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = -2;
    group.add(beam);

    return group;
  }

  /**
   * Forcefield Sky Dome
   */
  buildForcefieldDome(radius) {
    const domeGeom = new THREE.SphereGeometry(radius + 1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    this.arenaGroup.add(dome);
  }

  /**
   * Smoothly zooms camera into a specific clock sector or resets view
   */
  zoomToSector(sectorData) {
    this.selectedSector = sectorData;
    this.isZoomed = true;

    // Calculate destination camera position and lookAt target
    const targetX = sectorData.target.x;
    const targetZ = sectorData.target.z;

    this.targetLookAt.set(targetX, 2, targetZ);
    this.targetCamPos.set(
      targetX + sectorData.cameraOffset.x * 0.5,
      28,
      targetZ + sectorData.cameraOffset.z * 0.5
    );

    // Update UI Sector Card
    if (window.capitolApp) {
      window.capitolApp.showSectorDetailHUD(sectorData);
    }
  }

  /**
   * Smoothly zooms camera to the central Cornucopia island
   */
  zoomToCornucopia() {
    this.isZoomed = true;
    this.selectedSector = { name: 'The Cornucopia Island', hourLabel: 'Center', icon: '🌽' };
    this.targetLookAt.set(0, 2, 0);
    this.targetCamPos.set(0, 22, 28);

    if (window.capitolApp) {
      window.capitolApp.showCornucopiaDetailHUD();
    }
  }

  /**
   * Smoothly resets camera to full orbital arena view
   */
  resetZoom() {
    this.isZoomed = false;
    this.selectedSector = null;
    this.targetCamPos.copy(this.defaultCamPos);
    this.targetLookAt.copy(this.defaultTarget);

    if (window.capitolApp) {
      window.capitolApp.hideSectorDetailHUD();
    }
  }

  /**
   * Updates 3D tribute pins
   */
  updateTributePins(tributes) {
    tributes.forEach(tribute => {
      let pinData = this.pins.get(tribute.id);

      if (!pinData) {
        const group = new THREE.Group();

        const beamGeom = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.6 });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.y = 3;
        group.add(beam);

        const headGeom = new THREE.OctahedronGeometry(1.0, 0);
        const headMat = new THREE.MeshStandardMaterial({
          color: 0x00f2fe,
          emissive: 0x00f2fe,
          emissiveIntensity: 0.8,
          metalness: 0.6
        });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 6.2;
        group.add(head);

        const ringGeom = new THREE.RingGeometry(0.8, 1.2, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.3;
        group.add(ring);

        group.userData = { tributeId: tribute.id, isPin: true };
        this.tributePinsGroup.add(group);

        pinData = { group, head, beam, ring, tributeId: tribute.id };
        this.pins.set(tribute.id, pinData);
      }

      const posX = tribute.coordinates ? tribute.coordinates.x : 0;
      const posZ = tribute.coordinates ? tribute.coordinates.y : 0;
      pinData.group.position.x = posX;
      pinData.group.position.z = posZ;

      if (tribute.status === 'deceased') {
        pinData.head.material.color.setHex(0xff0055);
        pinData.head.material.emissive.setHex(0xff0055);
        pinData.beam.material.color.setHex(0xff0055);
        pinData.ring.material.color.setHex(0xff0055);
      } else if (tribute.status === 'injured' || tribute.health < 40) {
        pinData.head.material.color.setHex(0xffaa00);
        pinData.head.material.emissive.setHex(0xffaa00);
        pinData.beam.material.color.setHex(0xffaa00);
        pinData.ring.material.color.setHex(0xffaa00);
      } else {
        pinData.head.material.color.setHex(0x00f2fe);
        pinData.head.material.emissive.setHex(0x00f2fe);
        pinData.beam.material.color.setHex(0x00f2fe);
        pinData.ring.material.color.setHex(0x00f2fe);
      }
    });
  }

  selectTributePin(tributeId) {
    this.pins.forEach((pin, id) => {
      if (id === tributeId) {
        pin.ring.material.color.setHex(0xffd700);
        pin.head.scale.set(1.5, 1.5, 1.5);
      } else {
        pin.head.scale.set(1.0, 1.0, 1.0);
      }
    });
  }

  /**
   * Spawns particle effects for the 12 Clock Traps
   */
  triggerDisasterEffect(trapType, targetPos = { x: 0, z: 0 }) {
    if (trapType === 'lightning') this.createLightningStrike();
    else if (trapType === 'blood_rain') this.createBloodRain();
    else if (trapType === 'poison_fog' || trapType === 'fog') this.createPoisonFog();
    else if (trapType === 'monkeys' || trapType === 'mutts') this.createMonkeyMutts();
    else if (trapType === 'jabberjays') this.createJabberjays();
    else if (trapType === 'darkness') this.createTotalDarkness();
    else if (trapType === 'wave') this.createGiantSaltwaterWave();
    else if (trapType === 'insects' || trapType === 'jackers') this.createInsectsSwarm();
    else if (trapType === 'parachute') this.createParachute(targetPos);
  }

  createLightningStrike() {
    const group = new THREE.Group();
    const boltPoints = [
      new THREE.Vector3(0, 50, -44),
      new THREE.Vector3(2, 38, -43),
      new THREE.Vector3(-1, 26, -45),
      new THREE.Vector3(1, 16, -44),
      new THREE.Vector3(0, 12, -44)
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(boltPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    const bolt = new THREE.Line(lineGeom, lineMat);
    group.add(bolt);

    const flashLight = new THREE.PointLight(0x00f2fe, 5.0, 100);
    flashLight.position.set(0, 15, -44);
    group.add(flashLight);

    this.hazardGroup.add(group);
    this.activeDisasters.push({
      obj: group,
      lifetime: 35,
      update: (obj) => {
        flashLight.intensity = Math.random() * 6;
      }
    });
  }

  createBloodRain() {
    const count = 350;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 10 + Math.random() * 25;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = -35 + Math.random() * 20;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaa0022, size: 1.2, transparent: true, opacity: 0.85 });
    const rain = new THREE.Points(geom, mat);
    this.hazardGroup.add(rain);

    this.activeDisasters.push({
      obj: rain,
      lifetime: 140,
      update: (obj) => {
        const arr = obj.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          arr[i * 3 + 1] -= 0.8;
          if (arr[i * 3 + 1] < 0.5) arr[i * 3 + 1] = 30;
        }
        obj.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  createPoisonFog() {
    const geom = new THREE.TorusGeometry(38, 8, 12, 36);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff77, wireframe: true, transparent: true, opacity: 0.4 });
    const fog = new THREE.Mesh(geom, mat);
    fog.rotation.x = Math.PI / 2;
    fog.position.set(25, 2, -15);
    this.hazardGroup.add(fog);

    this.activeDisasters.push({
      obj: fog,
      lifetime: 160,
      update: (obj) => {
        obj.rotation.z += 0.01;
        obj.scale.x = Math.max(0.6, obj.scale.x - 0.002);
      }
    });
  }

  createMonkeyMutts() {
    const pack = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const geom = new THREE.SphereGeometry(0.8, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const m = new THREE.Mesh(geom, mat);
      m.position.set(32 + (Math.random() - 0.5) * 12, 1.5, (Math.random() - 0.5) * 12);
      pack.add(m);
    }
    this.hazardGroup.add(pack);

    this.activeDisasters.push({
      obj: pack,
      lifetime: 160,
      update: (obj) => {
        obj.children.forEach(c => {
          c.position.x += (Math.random() - 0.5) * 0.4;
          c.position.z += (Math.random() - 0.5) * 0.4;
        });
      }
    });
  }

  createJabberjays() {
    const group = new THREE.Group();
    const ringGeom = new THREE.RingGeometry(4, 12, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(30, 4, 18);
    group.add(ring);
    this.hazardGroup.add(group);

    this.activeDisasters.push({
      obj: group,
      lifetime: 150,
      update: (obj) => {
        ring.scale.x += 0.02;
        ring.scale.y += 0.02;
      }
    });
  }

  createTotalDarkness() {
    const geom = new THREE.SphereGeometry(14, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x020305, transparent: true, opacity: 0.85 });
    const sphere = new THREE.Mesh(geom, mat);
    sphere.position.set(18, 5, 30);
    this.hazardGroup.add(sphere);

    this.activeDisasters.push({
      obj: sphere,
      lifetime: 140,
      update: () => {}
    });
  }

  createGiantSaltwaterWave() {
    const waveGeom = new THREE.CylinderGeometry(28, 28, 8, 24, 1, true, (3 * Math.PI) / 2, Math.PI / 6);
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0x00eeff,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const wave = new THREE.Mesh(waveGeom, waveMat);
    wave.position.y = 4;
    this.hazardGroup.add(wave);

    this.activeDisasters.push({
      obj: wave,
      lifetime: 140,
      update: (obj) => {
        obj.scale.x = Math.max(0.3, obj.scale.x - 0.007);
        obj.scale.z = Math.max(0.3, obj.scale.z - 0.007);
        obj.position.y = Math.max(1, obj.position.y - 0.03);
      }
    });
  }

  createInsectsSwarm() {
    const count = 180;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -20 + (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = 2 + Math.random() * 8;
      pos[i * 3 + 2] = -30 + (Math.random() - 0.5) * 14;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.9, transparent: true, opacity: 0.9 });
    const bugs = new THREE.Points(geom, mat);
    this.hazardGroup.add(bugs);

    this.activeDisasters.push({
      obj: bugs,
      lifetime: 140,
      update: (obj) => {
        const arr = obj.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          arr[i * 3] += (Math.random() - 0.5) * 0.5;
          arr[i * 3 + 1] += (Math.random() - 0.5) * 0.4;
          arr[i * 3 + 2] += (Math.random() - 0.5) * 0.5;
        }
        obj.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  createParachute(targetPos) {
    const group = new THREE.Group();
    group.position.set(targetPos.x, 32, targetPos.z);

    const canopyGeom = new THREE.SphereGeometry(2.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    group.add(canopy);

    const boxGeom = new THREE.BoxGeometry(1, 0.8, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
    const box = new THREE.Mesh(boxGeom, boxMat);
    box.position.y = -2.5;
    group.add(box);

    this.hazardGroup.add(group);
    this.activeDisasters.push({
      obj: group,
      lifetime: 120,
      update: (obj) => {
        if (obj.position.y > 1.5) {
          obj.position.y -= 0.35;
          obj.rotation.y += 0.04;
        }
      }
    });
  }

  /**
   * Click-to-Zoom and Raycasting Interactions
   */
  setupInteractions() {
    const canvas = this.renderer.domElement;

    // Mouse movement parallax (only active when not zoomed in)
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.mouseVector.x = x;
      this.mouseVector.y = y;

      if (!this.isZoomed) {
        this.targetRotation.x = this.baseRotation.x - y * 0.2;
        this.targetRotation.y = x * 0.3;
      }

      const coordEl = document.getElementById('map-cursor-coords');
      if (coordEl) {
        coordEl.innerText = `LAT: ${(39.814 + y * 0.04).toFixed(3)}° | LNG: ${(104.990 + x * 0.04).toFixed(3)}°`;
      }
    });

    // Raycaster Click Handler: Clicking any sector zooms in!
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVector, this.camera);

      // Check tribute pins first
      const pinHits = this.raycaster.intersectObjects(this.tributePinsGroup.children, true);
      if (pinHits.length > 0) {
        let root = pinHits[0].object;
        while (root.parent && root.parent !== this.tributePinsGroup) root = root.parent;
        if (root.userData && root.userData.tributeId && window.capitolApp) {
          window.capitolApp.selectTribute(root.userData.tributeId);
          return;
        }
      }

      // Check sectors or Cornucopia
      const hits = this.raycaster.intersectObjects(this.arenaGroup.children, true);
      for (let hit of hits) {
        let obj = hit.object;
        while (obj && obj !== this.arenaGroup) {
          if (obj.userData && obj.userData.isCornucopia) {
            this.zoomToCornucopia();
            return;
          }
          if (obj.userData && obj.userData.sectorData) {
            this.zoomToSector(obj.userData.sectorData);
            return;
          }
          obj = obj.parent;
        }
      }
    });

    // Recenter button
    const recenterBtn = document.getElementById('btn-center-map');
    if (recenterBtn) {
      recenterBtn.addEventListener('click', () => this.resetZoom());
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Camera Lerping for smooth Zoom-to-Sector transition
    this.currentCamPos.lerp(this.targetCamPos, 0.08);
    this.currentTarget.lerp(this.targetLookAt, 0.08);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentTarget);

    // Parallax rotation (dampened when zoomed)
    if (!this.isZoomed) {
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.06;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.06;
      this.arenaGroup.rotation.x = this.currentRotation.x;
      this.arenaGroup.rotation.y = this.currentRotation.y;
    } else {
      this.arenaGroup.rotation.x *= 0.95;
      this.arenaGroup.rotation.y *= 0.95;
    }

    // Pin bobbing animation
    const time = performance.now() * 0.003;
    this.pins.forEach(pin => {
      pin.head.rotation.y += 0.02;
      pin.head.position.y = 6.2 + Math.sin(time + pin.group.position.x) * 0.5;
    });

    // Active disasters
    for (let i = this.activeDisasters.length - 1; i >= 0; i--) {
      const d = this.activeDisasters[i];
      d.lifetime--;
      d.update(d.obj);
      if (d.lifetime <= 0) {
        this.hazardGroup.remove(d.obj);
        this.activeDisasters.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
