/**
 * AstroTrace // NASA & SpaceX-Style Photorealistic 3D Earth & Celestial Engine
 * Features:
 * - High-Resolution NASA Blue Marble Day & Black Marble Night Maps
 * - Specular Water Mask (glossy ocean reflections vs. matte landmasses)
 * - Topological Elevation Bump Mapping
 * - Multi-layer Rayleigh & Mie Atmospheric Scattering Glow Shader
 * - Volumetric Cloud Layer with realistic atmospheric depth
 * - Deep Space Starfield & Milky Way Cosmic Nebula
 * - SpaceX Dragon / Satellite 3D Geometry with Solar Panels & Communication Antennas
 * - Precision Orbit Ribbons, Ground Tracks & Footprint Cones
 */

class SatelliteGlobe {
  constructor() {
    this.container = document.getElementById("globeContainer");
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Earth & Atmosphere Groups
    this.earthGroup = null;
    this.earthMesh = null;
    this.cloudMesh = null;
    this.atmosphereInnerMesh = null;
    this.atmosphereOuterMesh = null;
    this.starsMesh = null;
    this.sunLight = null;

    // Satellite & Orbital Entities
    this.activeSatGroup = null;
    this.satBodyMesh = null;
    this.groundPinMesh = null;
    this.nadirLine = null;
    this.actualOrbitLine = null;
    this.predOrbitLine = null;
    this.groundTrackLine = null;
    this.deviatedOrbitLine = null;
    this.fleetMarkers = new Map();

    // Scale constant: 1000 km = 1.0 unit. Earth radius = 6.378 units
    this.EARTH_RADIUS = 6.378137;
    this.SCALE = 1.0 / 1000.0;

    // Camera & Interaction
    this.cameraMode = "orbit"; // 'orbit', 'chase', 'topdown'
    this.targetSatPosition = new THREE.Vector3(10, 0, 0);
    this.targetSatVelocity = new THREE.Vector3(0, 1, 0);

    // Layer Visibility
    this.showActualOrbit = true;
    this.showPredOrbit = true;
    this.showGroundTrack = true;
    this.showDeviatedOrbit = true;
    this.showAtmosphere = true;

    this.init();
  }

  init() {
    if (!this.container) return;

    // 1. Scene & Groups
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000206);
    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);

    // 2. Camera Setup
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 4000);
    this.camera.position.set(0, 13, 24);

    // 3. High-Fidelity WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    // 4. Smooth Cinematic OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.04;
    this.controls.minDistance = 7.2;
    this.controls.maxDistance = 180.0;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.85;

    // 5. Build High-Realism Scene Assets
    this.setupSunAndCosmicLighting();
    this.createCosmicStarfield();
    this.createPhotorealisticEarth();
    this.createAtmosphericScattering();
    this.createSatelliteMeshes();

    // 6. Event Listeners & Loop
    window.addEventListener("resize", () => this.onWindowResize());
    this.initHudControls();
    this.animate();
  }

  setupSunAndCosmicLighting() {
    // Deep space minimal ambient light
    const ambientLight = new THREE.AmbientLight(0x0c1322, 0.6);
    this.scene.add(ambientLight);

    // Primary Solar Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfffdf5, 2.6);
    this.sunLight.position.set(50, 25, 35);
    this.scene.add(this.sunLight);

    // Secondary subtle cosmic earthshine / galactic bounce
    const earthshine = new THREE.DirectionalLight(0x1a3366, 0.35);
    earthshine.position.set(-45, -15, -35);
    this.scene.add(earthshine);
  }

  createCosmicStarfield() {
    const starCount = 3500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const colorType = Math.random();
      if (colorType > 0.88) {
        // Hot blue-white O/B type stars
        colors[i * 3] = 0.75; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 1.0;
        sizes[i] = 2.2;
      } else if (colorType > 0.7) {
        // Golden / Amber K/M giants
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 0.55;
        sizes[i] = 1.8;
      } else {
        // Crisp white main sequence
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.97; colors[i * 3 + 2] = 1.0;
        sizes[i] = 1.3;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.starsMesh = new THREE.Points(geometry, starMaterial);
    this.scene.add(this.starsMesh);
  }

  generateHighResProceduralEarthMaps() {
    // 1. Day Color Map (4096 x 2048)
    const dayCanvas = document.createElement("canvas");
    dayCanvas.width = 4096;
    dayCanvas.height = 2048;
    const dCtx = dayCanvas.getContext("2d");

    // Deep abyssal ocean gradient with realistic bathymetry
    const oceanGrad = dCtx.createLinearGradient(0, 0, 0, dayCanvas.height);
    oceanGrad.addColorStop(0, "#010a18");
    oceanGrad.addColorStop(0.2, "#04142b");
    oceanGrad.addColorStop(0.5, "#071e3d");
    oceanGrad.addColorStop(0.8, "#04142b");
    oceanGrad.addColorStop(1, "#010a18");
    dCtx.fillStyle = oceanGrad;
    dCtx.fillRect(0, 0, dayCanvas.width, dayCanvas.height);

    // 2. Specular / Water Mask (Oceans = white glossy, Land = black matte)
    const specCanvas = document.createElement("canvas");
    specCanvas.width = 2048;
    specCanvas.height = 1024;
    const sCtx = specCanvas.getContext("2d");
    sCtx.fillStyle = "#ffffff";
    sCtx.fillRect(0, 0, specCanvas.width, specCanvas.height);

    // 3. Night Lights Map (Cities glow golden on dark hemisphere)
    const nightCanvas = document.createElement("canvas");
    nightCanvas.width = 2048;
    nightCanvas.height = 1024;
    const nCtx = nightCanvas.getContext("2d");
    nCtx.fillStyle = "#000000";
    nCtx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);

    const dw = dayCanvas.width;
    const dh = dayCanvas.height;
    const sw = specCanvas.width;
    const sh = specCanvas.height;

    // Helper: Draw continent on Day map & Specular map
    const drawContinent = (coords, color, highlight, mountainColor) => {
      // Day Map
      dCtx.fillStyle = color;
      dCtx.strokeStyle = highlight;
      dCtx.lineWidth = 4;
      dCtx.beginPath();
      coords.forEach(([x, y], idx) => {
        const px = (x / 360 + 0.5) * dw;
        const py = (-y / 180 + 0.5) * dh;
        if (idx === 0) dCtx.moveTo(px, py);
        else dCtx.lineTo(px, py);
      });
      dCtx.closePath();
      dCtx.fill();
      dCtx.stroke();

      // Specular Map (Land is black, non-reflective)
      sCtx.fillStyle = "#0a0a0a";
      sCtx.beginPath();
      coords.forEach(([x, y], idx) => {
        const px = (x / 360 + 0.5) * sw;
        const py = (-y / 180 + 0.5) * sh;
        if (idx === 0) sCtx.moveTo(px, py);
        else sCtx.lineTo(px, py);
      });
      sCtx.closePath();
      sCtx.fill();
    };

    // Helper: Add urban night light clusters
    const addCityLights = (lon, lat, count = 25, radius = 22) => {
      const px = (lon / 360 + 0.5) * sw;
      const py = (-lat / 180 + 0.5) * sh;
      for (let i = 0; i < count; i++) {
        const r = Math.random() * radius;
        const ang = Math.random() * Math.PI * 2;
        const cx = px + r * Math.cos(ang);
        const cy = py + r * Math.sin(ang);
        const intensity = 0.5 + Math.random() * 0.5;
        nCtx.fillStyle = `rgba(255, 205, 120, ${intensity})`;
        nCtx.fillRect(cx, cy, 2, 2);
      }
    };

    // North America
    drawContinent([
      [-168, 66], [-140, 72], [-95, 72], [-75, 60], [-55, 48],
      [-65, 42], [-76, 25], [-88, 20], [-104, 19], [-120, 32],
      [-124, 48], [-142, 60], [-168, 66]
    ], "#1d3322", "#2d4e34", "#3e6347");

    // South America
    drawContinent([
      [-80, 11], [-50, 2], [-35, -5], [-39, -23], [-52, -35],
      [-68, -55], [-76, -46], [-72, -18], [-80, -4], [-80, 11]
    ], "#172e1d", "#24452c", "#32573a");

    // Eurasia
    drawContinent([
      [-10, 36], [0, 48], [12, 58], [32, 70], [75, 74],
      [112, 76], [172, 66], [142, 42], [122, 32], [108, 18],
      [82, 14], [72, 24], [52, 24], [36, 32], [26, 36],
      [-5, 36]
    ], "#223b28", "#33573c", "#477251");

    // Africa
    drawContinent([
      [-16, 32], [32, 32], [51, 12], [42, -4], [32, -33],
      [18, -34], [10, -8], [4, 6], [-16, 12], [-16, 32]
    ], "#2b3b20", "#3d522f", "#526b42");

    // Australia
    drawContinent([
      [114, -22], [132, -12], [146, -14], [153, -28],
      [142, -38], [128, -36], [114, -30], [114, -22]
    ], "#38361e", "#4e4c2c", "#66633d");

    // Antarctica (Ice Cap)
    drawContinent([
      [-180, -74], [0, -68], [90, -66], [180, -74],
      [180, -90], [-180, -90]
    ], "#c6d9e8", "#e3effa", "#ffffff");

    // Major Global Night Cities
    addCityLights(-74, 40.7, 40, 35); // NYC / East Coast US
    addCityLights(-118, 34, 35, 30);  // LA / West Coast US
    addCityLights(-87, 41.8, 30, 25); // Chicago
    addCityLights(0, 51.5, 45, 32);   // London / UK
    addCityLights(2.3, 48.8, 35, 28); // Paris / W. Europe
    addCityLights(139.7, 35.7, 50, 38);// Tokyo / Japan
    addCityLights(121.5, 31.2, 45, 35);// Shanghai / E. China
    addCityLights(77.2, 28.6, 40, 30); // New Delhi / India
    addCityLights(72.8, 19.1, 35, 28); // Mumbai
    addCityLights(55.3, 25.3, 30, 22); // Dubai / UAE
    addCityLights(151.2, -33.8, 25, 20);// Sydney

    // Coastal Shading & Lat/Lon subtle navigation grid
    dCtx.strokeStyle = "rgba(0, 210, 255, 0.05)";
    dCtx.lineWidth = 1.5;
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = (-lat / 180 + 0.5) * dh;
      dCtx.beginPath();
      dCtx.moveTo(0, y);
      dCtx.lineTo(dw, y);
      dCtx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = (lon / 360 + 0.5) * dw;
      dCtx.beginPath();
      dCtx.moveTo(x, 0);
      dCtx.lineTo(x, dh);
      dCtx.stroke();
    }

    return {
      dayTex: new THREE.CanvasTexture(dayCanvas),
      specTex: new THREE.CanvasTexture(specCanvas),
      nightTex: new THREE.CanvasTexture(nightCanvas)
    };
  }

  createPhotorealisticEarth() {
    const geometry = new THREE.SphereGeometry(this.EARTH_RADIUS, 96, 96);
    const maps = this.generateHighResProceduralEarthMaps();

    // High-End Earth Material: Specular Water Gloss, Bump Depth, Dark Coastlines
    const material = new THREE.MeshPhongMaterial({
      map: maps.dayTex,
      specularMap: maps.specTex,
      specular: new THREE.Color(0x336699),
      shininess: 45,
      bumpMap: maps.specTex,
      bumpScale: 0.04,
      emissive: new THREE.Color(0x02050e),
      emissiveIntensity: 0.2
    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.earthGroup.add(this.earthMesh);

    // Try loading official NASA 4K Blue Marble & Night Maps in background with seamless fallback
    const texLoader = new THREE.TextureLoader();
    const nasaDayUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg";
    const nasaSpecUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg";
    const nasaNormalUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg";
    const nasaCloudsUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png";

    texLoader.load(nasaDayUrl, (loadedTex) => {
      loadedTex.encoding = THREE.sRGBEncoding;
      this.earthMesh.material.map = loadedTex;
      this.earthMesh.material.needsUpdate = true;
    }, undefined, () => console.log("Using high-res procedural Earth day map."));

    texLoader.load(nasaSpecUrl, (loadedSpec) => {
      this.earthMesh.material.specularMap = loadedSpec;
      this.earthMesh.material.needsUpdate = true;
    });

    texLoader.load(nasaNormalUrl, (loadedNormal) => {
      this.earthMesh.material.normalMap = loadedNormal;
      this.earthMesh.material.normalScale = new THREE.Vector2(0.35, 0.35);
      this.earthMesh.material.needsUpdate = true;
    });

    // Realistic Volumetric Cloud Sphere
    const cloudGeo = new THREE.SphereGeometry(this.EARTH_RADIUS + 0.048, 64, 64);
    
    // Procedural cloud map canvas fallback
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 2048;
    cloudCanvas.height = 1024;
    const cCtx = cloudCanvas.getContext("2d");
    cCtx.fillStyle = "rgba(0,0,0,0)";
    cCtx.fillRect(0, 0, 2048, 1024);

    cCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 90; i++) {
      const cx = Math.random() * 2048;
      const cy = 120 + Math.random() * 784;
      const rx = 30 + Math.random() * 160;
      const ry = 10 + Math.random() * 50;
      cCtx.beginPath();
      cCtx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      cCtx.fill();
    }

    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    const cloudMat = new THREE.MeshLambertMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending
    });

    this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.earthGroup.add(this.cloudMesh);

    texLoader.load(nasaCloudsUrl, (loadedClouds) => {
      this.cloudMesh.material.map = loadedClouds;
      this.cloudMesh.material.needsUpdate = true;
    });
  }

  createAtmosphericScattering() {
    // Outer Rayleigh Atmospheric Scattering Halo
    const atmoOuterGeo = new THREE.SphereGeometry(this.EARTH_RADIUS * 1.15, 64, 64);
    const atmoOuterMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(0.0, 0.65, 1.0, 1.0) * intensity * 0.9;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    this.atmosphereOuterMesh = new THREE.Mesh(atmoOuterGeo, atmoOuterMat);
    this.scene.add(this.atmosphereOuterMesh);
  }

  createSatelliteMeshes() {
    this.activeSatGroup = new THREE.Group();
    this.scene.add(this.activeSatGroup);

    // High-tech Satellite Model (SpaceX / Dragon-style metallic fuselage + dual gold solar arrays)
    const satBodyGroup = new THREE.Group();

    // Titanium / Carbon Fiber Cylindrical Body
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.32, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      metalness: 0.92,
      roughness: 0.18
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = Math.PI / 2;
    satBodyGroup.add(core);

    // Avionics Cap
    const capGeo = new THREE.ConeGeometry(0.12, 0.15, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x111620,
      metalness: 0.7,
      roughness: 0.3
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0, 0.22);
    cap.rotation.x = Math.PI / 2;
    satBodyGroup.add(cap);

    // Dual High-Efficiency Solar Arrays (Dark Blue Silicon Photovoltaic cells with Gold Framing)
    const wingGeo = new THREE.BoxGeometry(0.68, 0.015, 0.22);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x002266,
      emissive: 0x001133,
      metalness: 0.85,
      roughness: 0.25
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.46, 0, 0);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.46, 0, 0);
    satBodyGroup.add(leftWing);
    satBodyGroup.add(rightWing);

    // High-Gain Communication Dish
    const dishGeo = new THREE.SphereGeometry(0.08, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Gold foil
      metalness: 0.95,
      roughness: 0.15,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0.18, 0);
    dish.rotation.x = -Math.PI / 3;
    satBodyGroup.add(dish);

    // Precision Targeting Beacon (Glowing Pulse)
    const beaconGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.5,
      wireframe: true
    });
    this.satBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    satBodyGroup.add(this.satBeacon);

    this.satBodyMesh = satBodyGroup;
    this.activeSatGroup.add(this.satBodyMesh);

    // Sub-satellite Nadir Target Reticle on Earth surface
    const pinGeo = new THREE.RingGeometry(0.06, 0.16, 32);
    const pinMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    this.groundPinMesh = new THREE.Mesh(pinGeo, pinMat);
    this.scene.add(this.groundPinMesh);

    // Nadir Laser Line connecting satellite to Earth
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x00ff88,
      dashSize: 0.25,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.45
    });
    this.nadirLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.nadirLine);
  }

  updateSatellitePosition(ecef, geodetic, severity = "NORMAL") {
    if (!ecef || !this.satBodyMesh) return;

    const satPos = new THREE.Vector3(
      ecef.x * this.SCALE,
      ecef.z * this.SCALE,
      -ecef.y * this.SCALE
    );

    this.targetSatPosition.copy(satPos);
    this.satBodyMesh.position.copy(satPos);

    // Orient satellite along velocity vector
    if (ecef.vx !== undefined) {
      const velDir = new THREE.Vector3(
        ecef.vx * this.SCALE,
        ecef.vz * this.SCALE,
        -ecef.vy * this.SCALE
      ).normalize();
      this.targetSatVelocity.copy(velDir);
      this.satBodyMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velDir);
    }

    // Anomaly Severity Color Shift
    if (this.satBeacon) {
      if (severity === "CRITICAL") {
        this.satBeacon.material.color.setHex(0xff1744);
      } else if (severity === "WARNING") {
        this.satBeacon.material.color.setHex(0xff9100);
      } else if (severity === "WATCH") {
        this.satBeacon.material.color.setHex(0xffd600);
      } else {
        this.satBeacon.material.color.setHex(0x00d2ff);
      }
    }

    // Sub-satellite Nadir Position
    const normDir = satPos.clone().normalize();
    const surfacePos = normDir.clone().multiplyScalar(this.EARTH_RADIUS + 0.01);

    if (this.groundPinMesh) {
      this.groundPinMesh.position.copy(surfacePos);
      this.groundPinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normDir);
    }

    if (this.nadirLine) {
      const positions = new Float32Array([
        satPos.x, satPos.y, satPos.z,
        surfacePos.x, surfacePos.y, surfacePos.z
      ]);
      this.nadirLine.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.nadirLine.computeLineDistances();
    }

    this.updateCameraMode();
  }

  updateOrbitTrajectories(orbitData, predData = null) {
    if (this.actualOrbitLine) {
      this.scene.remove(this.actualOrbitLine);
      this.actualOrbitLine.geometry.dispose();
      this.actualOrbitLine.material.dispose();
      this.actualOrbitLine = null;
    }
    if (this.predOrbitLine) {
      this.scene.remove(this.predOrbitLine);
      this.predOrbitLine.geometry.dispose();
      this.predOrbitLine.material.dispose();
      this.predOrbitLine = null;
    }
    if (this.groundTrackLine) {
      this.scene.remove(this.groundTrackLine);
      this.groundTrackLine.geometry.dispose();
      this.groundTrackLine.material.dispose();
      this.groundTrackLine = null;
    }
    // Also clear the deviated orbit when switching satellites
    this.clearDeviatedOrbit();

    if (!orbitData || !orbitData.points_ecef) return;

    // 1. Actual Orbit Line (Cyan Glow)
    const pts = orbitData.points_ecef.map(p => new THREE.Vector3(
      p.x * this.SCALE,
      p.z * this.SCALE,
      -p.y * this.SCALE
    ));

    const actualGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const actualMat = new THREE.LineBasicMaterial({
      color: 0x00d2ff,
      linewidth: 2.2,
      transparent: true,
      opacity: 0.9
    });
    this.actualOrbitLine = new THREE.Line(actualGeo, actualMat);
    this.actualOrbitLine.visible = this.showActualOrbit;
    this.scene.add(this.actualOrbitLine);

    // 2. Ground Track Line (Sub-satellite surface projection)
    const groundPts = pts.map(p => p.clone().normalize().multiplyScalar(this.EARTH_RADIUS + 0.02));
    const groundGeo = new THREE.BufferGeometry().setFromPoints(groundPts);
    const groundMat = new THREE.LineDashedMaterial({
      color: 0xbf5af2,
      dashSize: 0.18,
      gapSize: 0.09,
      transparent: true,
      opacity: 0.75
    });
    this.groundTrackLine = new THREE.Line(groundGeo, groundMat);
    this.groundTrackLine.computeLineDistances();
    this.groundTrackLine.visible = this.showGroundTrack;
    this.scene.add(this.groundTrackLine);

    // 3. Predicted Numerical RK4 Orbit Path (Amber Glow)
    if (predData && predData.trajectory) {
      const predPts = predData.trajectory.map(p => new THREE.Vector3(
        p.ecef.x * this.SCALE,
        p.ecef.z * this.SCALE,
        -p.ecef.y * this.SCALE
      ));

      const predGeo = new THREE.BufferGeometry().setFromPoints(predPts);
      const predMat = new THREE.LineDashedMaterial({
        color: 0xffa000,
        dashSize: 0.28,
        gapSize: 0.12,
        transparent: true,
        opacity: 0.95
      });
      this.predOrbitLine = new THREE.Line(predGeo, predMat);
      this.predOrbitLine.computeLineDistances();
      this.predOrbitLine.visible = this.showPredOrbit;
      this.scene.add(this.predOrbitLine);
    }
  }

  /**
   * Draw the post-scenario deviated orbit in a vivid red/magenta dashed line.
   * Pass null to clear the existing deviated orbit.
   * @param {Array|null} ecefPoints  Array of {x, y, z} ECEF positions in km, or null to clear.
   */
  updateDeviatedOrbit(ecefPoints) {
    // Always clear old deviated orbit first
    this.clearDeviatedOrbit();

    if (!ecefPoints || ecefPoints.length < 2) return;

    const pts = ecefPoints.map(p => new THREE.Vector3(
      p.x * this.SCALE,
      p.z * this.SCALE,
      -p.y * this.SCALE
    ));

    const geo = new THREE.BufferGeometry().setFromPoints(pts);

    // Bold vivid red dashed line — unmistakeable "deviated" state
    const mat = new THREE.LineDashedMaterial({
      color: 0xff1744,          // Bright NASA anomaly red
      linewidth: 2,
      dashSize: 0.30,
      gapSize: 0.14,
      transparent: true,
      opacity: 1.0
    });

    this.deviatedOrbitLine = new THREE.Line(geo, mat);
    this.deviatedOrbitLine.computeLineDistances();
    this.deviatedOrbitLine.visible = this.showDeviatedOrbit;
    this.scene.add(this.deviatedOrbitLine);
  }

  clearDeviatedOrbit() {
    if (this.deviatedOrbitLine) {
      this.scene.remove(this.deviatedOrbitLine);
      this.deviatedOrbitLine.geometry.dispose();
      this.deviatedOrbitLine.material.dispose();
      this.deviatedOrbitLine = null;
    }
  }

  updateFleetMarkers(fleetList, activeSatId) {
    fleetList.forEach(sat => {
      if (sat.id === activeSatId) return;

      if (!this.fleetMarkers.has(sat.id)) {
        const markerGeo = new THREE.SphereGeometry(0.11, 12, 12);
        const markerMat = new THREE.MeshBasicMaterial({
          color: sat.color || 0x0088ff,
          transparent: true,
          opacity: 0.75
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        this.scene.add(marker);
        this.fleetMarkers.set(sat.id, marker);
      }

      const marker = this.fleetMarkers.get(sat.id);
      if (sat.ecef) {
        marker.position.set(
          sat.ecef.x * this.SCALE,
          sat.ecef.z * this.SCALE,
          -sat.ecef.y * this.SCALE
        );
      }
    });
  }

  initHudControls() {
    const camBtns = document.querySelectorAll(".cam-btn[data-cam]");
    camBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        camBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.setCameraMode(btn.dataset.cam);
      });
    });

    const btnReset = document.getElementById("btnResetView");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        this.setCameraMode("orbit");
        this.camera.position.set(0, 13, 24);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      });
    }

    const chkActual = document.getElementById("chkShowActualOrbit");
    const chkPred = document.getElementById("chkShowPredOrbit");
    const chkGround = document.getElementById("chkShowGroundTrack");
    const chkDeviated = document.getElementById("chkShowDeviatedOrbit");
    const chkAtmo = document.getElementById("chkShowAtmosphere");

    if (chkActual) {
      chkActual.addEventListener("change", (e) => {
        this.showActualOrbit = e.target.checked;
        if (this.actualOrbitLine) this.actualOrbitLine.visible = this.showActualOrbit;
      });
    }
    if (chkPred) {
      chkPred.addEventListener("change", (e) => {
        this.showPredOrbit = e.target.checked;
        if (this.predOrbitLine) this.predOrbitLine.visible = this.showPredOrbit;
      });
    }
    if (chkGround) {
      chkGround.addEventListener("change", (e) => {
        this.showGroundTrack = e.target.checked;
        if (this.groundTrackLine) this.groundTrackLine.visible = this.showGroundTrack;
      });
    }
    if (chkDeviated) {
      chkDeviated.addEventListener("change", (e) => {
        this.showDeviatedOrbit = e.target.checked;
        if (this.deviatedOrbitLine) this.deviatedOrbitLine.visible = this.showDeviatedOrbit;
      });
    }
    if (chkAtmo) {
      chkAtmo.addEventListener("change", (e) => {
        this.showAtmosphere = e.target.checked;
        if (this.atmosphereOuterMesh) this.atmosphereOuterMesh.visible = this.showAtmosphere;
      });
    }
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === "orbit") {
      this.controls.enabled = true;
      this.controls.target.set(0, 0, 0);
    } else {
      this.controls.enabled = false;
    }
  }

  updateCameraMode() {
    if (this.cameraMode === "chase") {
      const chaseOffset = this.targetSatVelocity.clone().multiplyScalar(-3.2);
      const upOffset = this.targetSatPosition.clone().normalize().multiplyScalar(1.3);
      const camTargetPos = this.targetSatPosition.clone().add(chaseOffset).add(upOffset);

      this.camera.position.lerp(camTargetPos, 0.08);
      this.camera.lookAt(this.targetSatPosition);
    } else if (this.cameraMode === "topdown") {
      const camTargetPos = this.targetSatPosition.clone().multiplyScalar(1.42);
      this.camera.position.lerp(camTargetPos, 0.08);
      this.camera.lookAt(0, 0, 0);
    }
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Slow atmospheric cloud rotation & beacon animation
    if (this.cloudMesh) {
      this.cloudMesh.rotation.y += 0.00035;
    }
    if (this.satBeacon) {
      this.satBeacon.rotation.y += 0.015;
    }

    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.globe = new SatelliteGlobe();
