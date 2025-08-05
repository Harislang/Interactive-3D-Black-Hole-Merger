// ============================================
// Black Hole Merger Simulation - Main Script
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ===== Core Components =====
let scene, camera, renderer, composer, controls, clock;
let lensingPass, wavePass, bloomPass;
let starField, mergerFlare;
let container;

// ===== Simulation State =====
const sim = {
    paused: false,
    timeScale: 1.0,
    phase: 'INSPIRAL', // INSPIRAL, MERGER, RINGDOWN
    phaseTime: 0,
    progress: 0,
    config: {
        massRatio: 0.8,
        initialSeparation: 50,
    },
    bh1: null,
    bh2: null,
    mergedBh: null,
    // Visual toggles
    lensingEnabled: true,
    wavesEnabled: true,
    disksEnabled: true,
};

// ===== Physics Constants =====
const G = 400; // Artistic gravitational constant
const STAR_COUNT = 70000;
const DISK_PARTICLE_COUNT = 20000;
const MERGER_FLARE_PARTICLES = 5000;
const C = 30; // Speed of light for gravitational wave radiation calculation

// ===== Black Hole Class =====
class BlackHole {
    constructor(mass, position, velocity, color1, color2) {
        this.mass = mass;
        this.pos = position;
        this.vel = velocity;
        // Schwarzschild radius: Rs = 2GM/c^2. We use an artistic scaling.
        this.radius = Math.pow(this.mass, 0.7) * 0.8;
        
        this.mesh = this.createMesh(color1);
        this.disk = this.createDisk(color2);
        this.mesh.scale.setScalar(this.radius);
        scene.add(this.mesh, this.disk);
    }

    createMesh(color) {
        const group = new THREE.Group();
        
        // Event horizon (black sphere)
        const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const bhMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), bhMat);
        
        // Photon sphere glow
        const photonMat = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(color) },
                viewVector: { value: new THREE.Vector3() }
            },
            vertexShader: `
                varying float intensity;
                uniform vec3 viewVector;
                void main() {
                    vec3 actual_normal = normalize(normalMatrix * normal);
                    intensity = pow(0.7 - dot(viewVector, actual_normal), 2.0);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float intensity;
                uniform vec3 glowColor;
                void main() {
                    gl_FragColor = vec4(glowColor, 1.0) * intensity;
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
        });
        const photonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 64), photonMat);
        bhMesh.add(photonMesh);
        group.add(bhMesh);
        return group;
    }

    createDisk() {
        const positions = new Float32Array(DISK_PARTICLE_COUNT * 3);
        const colors = new Float32Array(DISK_PARTICLE_COUNT * 3);
        const life = new Float32Array(DISK_PARTICLE_COUNT);
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(life, 1));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        points.userData.particles = [];
        for(let i = 0; i < DISK_PARTICLE_COUNT; i++) {
            points.userData.particles.push({
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 0,
                baseRadius: 0,
                angle: 0
            });
        }
        return points;
    }

    update(dt) {
        this.pos.add(this.vel.clone().multiplyScalar(dt));
        this.mesh.position.copy(this.pos);
        this.disk.position.copy(this.pos);
    }

    setVisible(visible) {
        this.mesh.visible = visible;
        this.disk.visible = sim.disksEnabled ? visible : false;
    }
}

// ===== Initialization =====
init();

function init() {
    // Hide loading screen after a delay
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }, 1500);

    // Setup container
    container = document.getElementById('canvas-container');
    
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000005, 0.005);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 70, 140);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: 'high-performance',
        alpha: false 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 600;
    controls.minDistance = 20;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;

    // Create scene elements
    createStarField();
    createMergerFlare();
    setupPostProcessing();
    setupUI();

    // Start simulation
    resetSimulation();
    animate();
}

// ===== Scene Creation =====
function createStarField() {
    const vertices = [];
    const colors = [];
    
    for (let i = 0; i < STAR_COUNT; i++) {
        const r = THREE.MathUtils.randFloat(1000, 3000);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        
        vertices.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        
        // Add color variation
        const intensity = Math.random() * 0.5 + 0.5;
        colors.push(intensity, intensity, intensity * 0.9);
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const mat = new THREE.PointsMaterial({ 
        size: 1.8, 
        vertexColors: true,
        transparent: true, 
        opacity: 0.7, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false 
    });
    
    starField = new THREE.Points(geo, mat);
    scene.add(starField);
}

function createMergerFlare() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MERGER_FLARE_PARTICLES * 3), 3));
    
    const mat = new THREE.PointsMaterial({
        color: 0xfff0b3,
        size: 0.3,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0
    });
    
    mergerFlare = new THREE.Points(geo, mat);
    mergerFlare.userData.particles = [];
    
    for(let i = 0; i < MERGER_FLARE_PARTICLES; i++) {
        mergerFlare.userData.particles.push({
            vel: new THREE.Vector3(),
            life: 0
        });
    }
    
    scene.add(mergerFlare);
}

// ===== Post-Processing Setup =====
function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Gravitational waves shader
    wavePass = new ShaderPass(GravitationalWaveShader());
    composer.addPass(wavePass);

    // Gravitational lensing shader
    lensingPass = new ShaderPass(LensingShader());
    composer.addPass(lensingPass);

    // Bloom effect
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0,  // strength
        0.5,  // radius
        0.4   // threshold
    );
    composer.addPass(bloomPass);
}

// ===== Shaders =====
function LensingShader() {
    return {
        uniforms: {
            tDiffuse: { value: null },
            resolution: { value: new THREE.Vector2() },
            bhPos1: { value: new THREE.Vector2(0.5, 0.5) },
            bhPos2: { value: new THREE.Vector2(0.5, 0.5) },
            bhRadius1: { value: 0.0 },
            bhRadius2: { value: 0.0 },
            mass1: { value: 0.0 },
            mass2: { value: 0.0 },
            enabled: { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            uniform vec2 bhPos1;
            uniform vec2 bhPos2;
            uniform float bhRadius1;
            uniform float bhRadius2;
            uniform float mass1;
            uniform float mass2;
            uniform float enabled;
            varying vec2 vUv;
            
            void main() {
                if (enabled < 0.5) {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                    return;
                }
                
                vec2 aspectUv = vUv * vec2(resolution.x / resolution.y, 1.0);
                vec2 aspectBh1 = bhPos1 * vec2(resolution.x / resolution.y, 1.0);
                vec2 aspectBh2 = bhPos2 * vec2(resolution.x / resolution.y, 1.0);
                
                vec2 to1 = aspectBh1 - aspectUv;
                vec2 to2 = aspectBh2 - aspectUv;
                float dist1 = length(to1);
                float dist2 = length(to2);

                float pull1 = (mass1 / 10.0) * bhRadius1 * bhRadius1 / max(dist1, 0.01);
                float pull2 = (mass2 / 10.0) * bhRadius2 * bhRadius2 / max(dist2, 0.01);
                
                vec2 offset = vec2(0.0);
                if (dist1 > 0.001) offset += normalize(to1) * pull1;
                if (dist2 > 0.001) offset += normalize(to2) * pull2;
                offset.x /= resolution.x / resolution.y;

                vec4 color = texture2D(tDiffuse, vUv + offset);
                
                // Event horizon effect
                if (dist1 < bhRadius1) color = vec4(0.0, 0.0, 0.0, 1.0);
                if (dist2 < bhRadius2) color = vec4(0.0, 0.0, 0.0, 1.0);
                
                gl_FragColor = color;
            }
        `
    };
}

function GravitationalWaveShader() {
    return {
        uniforms: {
            tDiffuse: { value: null },
            time: { value: 0.0 },
            origin: { value: new THREE.Vector2(0.5, 0.5) },
            amplitude: { value: 0.0 },
            frequency: { value: 30.0 },
            enabled: { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform vec2 origin;
            uniform float amplitude;
            uniform float frequency;
            uniform float enabled;
            varying vec2 vUv;

            void main() {
                if (enabled < 0.5 || amplitude < 0.001) {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                    return;
                }
                
                vec2 d = vUv - origin;
                float dist = length(d);
                float angle = atan(d.y, d.x);
                
                // Quadrupole wave pattern
                float quadrupole = cos(angle * 2.0);
                float wave = sin(dist * frequency - time * 15.0) * amplitude * 
                           smoothstep(0.0, 0.8, dist) * quadrupole;
                
                vec2 offset = normalize(d) * wave;
                gl_FragColor = texture2D(tDiffuse, vUv + offset);
            }
        `
    };
}

// ===== UI Setup =====
function setupUI() {
    // Control elements
    const massRatioSlider = document.getElementById('massRatioSlider');
    const massRatioValue = document.getElementById('massRatioValue');
    const separationSlider = document.getElementById('separationSlider');
    const separationValue = document.getElementById('separationValue');
    const timeScaleSlider = document.getElementById('timeScaleSlider');
    const timeScaleValue = document.getElementById('timeScaleValue');
    const resetBtn = document.getElementById('resetBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const toggleControlsBtn = document.getElementById('toggleControlsBtn');
    const controlsContainer = document.getElementById('controlsContainer');
    const minimizeIcon = document.getElementById('minimizeIcon');
    const maximizeIcon = document.getElementById('maximizeIcon');
    
    // Visual toggles
    const lensingToggle = document.getElementById('lensingToggle');
    const wavesToggle = document.getElementById('wavesToggle');
    const disksToggle = document.getElementById('disksToggle');
    
    // Info modal
    const infoBtn = document.getElementById('infoBtn');
    const infoModal = document.getElementById('infoModal');
    const closeInfoBtn = document.getElementById('closeInfoBtn');

    // Slider event listeners
    massRatioSlider.addEventListener('input', e => {
        sim.config.massRatio = parseFloat(e.target.value);
        massRatioValue.textContent = sim.config.massRatio.toFixed(2);
    });
    
    separationSlider.addEventListener('input', e => {
        sim.config.initialSeparation = parseFloat(e.target.value);
        separationValue.textContent = sim.config.initialSeparation.toFixed(0);
    });
    
    timeScaleSlider.addEventListener('input', e => {
        sim.timeScale = parseFloat(e.target.value);
        timeScaleValue.textContent = `${sim.timeScale.toFixed(1)}x`;
    });

    // Button event listeners
    resetBtn.addEventListener('click', resetSimulation);
    
    playPauseBtn.addEventListener('click', () => {
        sim.paused = !sim.paused;
        playIcon.classList.toggle('hidden', !sim.paused);
        pauseIcon.classList.toggle('hidden', sim.paused);
        playPauseBtn.title = sim.paused ? 'Play' : 'Pause';
    });

    toggleControlsBtn.addEventListener('click', () => {
        const isCollapsed = controlsContainer.classList.toggle('collapsed');
        minimizeIcon.classList.toggle('hidden', isCollapsed);
        maximizeIcon.classList.toggle('hidden', !isCollapsed);
        toggleControlsBtn.title = isCollapsed ? 'Maximize' : 'Minimize';
    });
    
    // Visual toggle listeners
    lensingToggle.addEventListener('change', e => {
        sim.lensingEnabled = e.target.checked;
        lensingPass.uniforms.enabled.value = e.target.checked ? 1.0 : 0.0;
    });
    
    wavesToggle.addEventListener('change', e => {
        sim.wavesEnabled = e.target.checked;
        wavePass.uniforms.enabled.value = e.target.checked ? 1.0 : 0.0;
    });
    
    disksToggle.addEventListener('change', e => {
        sim.disksEnabled = e.target.checked;
        if (sim.bh1) sim.bh1.disk.visible = e.target.checked;
        if (sim.bh2) sim.bh2.disk.visible = e.target.checked;
        if (sim.mergedBh) sim.mergedBh.disk.visible = e.target.checked;
    });
    
    // Info modal listeners
    infoBtn.addEventListener('click', () => {
        infoModal.classList.add('show');
    });
    
    closeInfoBtn.addEventListener('click', () => {
        infoModal.classList.remove('show');
    });
    
    infoModal.addEventListener('click', e => {
        if (e.target === infoModal) {
            infoModal.classList.remove('show');
        }
    });
}

// ===== Simulation Logic =====
function resetSimulation() {
    // Clean up old objects
    if (sim.bh1) {
        scene.remove(sim.bh1.mesh, sim.bh1.disk);
    }
    if (sim.bh2) {
        scene.remove(sim.bh2.mesh, sim.bh2.disk);
    }
    if (sim.mergedBh) {
        scene.remove(sim.mergedBh.mesh, sim.mergedBh.disk);
    }

    // Reset simulation state
    sim.phase = 'INSPIRAL';
    sim.phaseTime = 0;
    sim.progress = 0;

    // Calculate initial conditions
    const m1 = 12;
    const m2 = m1 * sim.config.massRatio;
    const totalMass = m1 + m2;
    const sep = sim.config.initialSeparation;

    // Position black holes at center of mass
    const pos1 = new THREE.Vector3(sep * (m2 / totalMass), 0, 0);
    const pos2 = new THREE.Vector3(-sep * (m1 / totalMass), 0, 0);
    
    // Calculate orbital velocities
    const orbitalVel = Math.sqrt(G * totalMass / sep);
    const vel1 = new THREE.Vector3(0, 0, orbitalVel * (m2 / totalMass));
    const vel2 = new THREE.Vector3(0, 0, -orbitalVel * (m1 / totalMass));

    // Create black holes
    sim.bh1 = new BlackHole(m1, pos1, vel1, 0xffcc33, 0xff8800);
    sim.bh2 = new BlackHole(m2, pos2, vel2, 0x66aaff, 0x0055ff);
    sim.mergedBh = new BlackHole(1, new THREE.Vector3(), new THREE.Vector3(), 0xffaaff, 0xcc88ff);
    sim.mergedBh.setVisible(false);

    // Initialize disks
    initDisk(sim.bh1);
    initDisk(sim.bh2);

    // Reset wave amplitude
    wavePass.uniforms.amplitude.value = 0;
    
    // Update UI
    updateStatusUI();
    updateSystemInfo();
}

function initDisk(bh) {
    const particles = bh.disk.userData.particles;
    const positions = bh.disk.geometry.attributes.position.array;
    const colors = bh.disk.geometry.attributes.color.array;
    const lifeAttr = bh.disk.geometry.attributes.life.array;
    const color1 = new THREE.Color(bh.mesh.children[0].children[0].material.uniforms.glowColor.value);
    const color2 = color1.clone().lerp(new THREE.Color(0x000000), 0.5);

    for(let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const r = bh.radius * 2.5 + Math.random() * bh.radius * 8;
        p.baseRadius = r;
        p.angle = Math.random() * Math.PI * 2;
        p.life = 1;
        
        const i3 = i * 3;
        positions[i3] = Math.cos(p.angle) * r;
        positions[i3 + 1] = (Math.random() - 0.5) * bh.radius * 0.2 * 
                            (1 - (r - bh.radius * 2.5) / (bh.radius * 8));
        positions[i3 + 2] = Math.sin(p.angle) * r;
        
        const mix = Math.pow((r - bh.radius * 2.5) / (bh.radius * 8), 0.5);
        const c = color1.clone().lerp(color2, mix);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
        lifeAttr[i] = p.life;
    }
    
    bh.disk.geometry.attributes.position.needsUpdate = true;
    bh.disk.geometry.attributes.color.needsUpdate = true;
    bh.disk.geometry.attributes.life.needsUpdate = true;
}

function updatePhysics(dt) {
    if (sim.phase !== 'INSPIRAL') return;

    const dPos = new THREE.Vector3().subVectors(sim.bh2.pos, sim.bh1.pos);
    const rSq = dPos.lengthSq();
    const r = Math.sqrt(rSq);
    
    const mergerDist = (sim.bh1.radius + sim.bh2.radius) * 1.2;
    if (r < mergerDist) {
        triggerMerger();
        return;
    }

    // Gravitational force
    const forceMag = G * sim.bh1.mass * sim.bh2.mass / rSq;
    const forceVec = dPos.normalize().multiplyScalar(forceMag);
    
    // Update velocities
    sim.bh1.vel.add(forceVec.clone().multiplyScalar(dt / sim.bh1.mass));
    sim.bh2.vel.add(forceVec.clone().multiplyScalar(-dt / sim.bh2.mass));

    // Gravitational wave energy loss (simplified Peters-Mathews formula)
    const energyLossFactor = (32/5) * (Math.pow(G, 4) / Math.pow(C, 5)) * 
                             (sim.bh1.mass * sim.bh2.mass * (sim.bh1.mass + sim.bh2.mass)) / 
                             Math.pow(r, 4);
    
    // Apply energy loss
    sim.bh1.vel.multiplyScalar(1.0 - energyLossFactor * dt * 0.001);
    sim.bh2.vel.multiplyScalar(1.0 - energyLossFactor * dt * 0.001);
    
    // Update positions
    sim.bh1.update(dt);
    sim.bh2.update(dt);

    // Update progress
    sim.progress = 1.0 - (r - mergerDist) / (sim.config.initialSeparation - mergerDist);
    
    // Generate gravitational waves during inspiral
    const waveAmplitude = Math.min(0.02, 0.001 * Math.pow(sim.config.initialSeparation / r, 2));
    wavePass.uniforms.amplitude.value = waveAmplitude;
}

function triggerMerger() {
    sim.phase = 'MERGER';
    sim.phaseTime = 0;

    // Conservation of momentum
    const p1 = sim.bh1.vel.clone().multiplyScalar(sim.bh1.mass);
    const p2 = sim.bh2.vel.clone().multiplyScalar(sim.bh2.mass);
    const finalMomentum = p1.add(p2);
    
    // Center of mass
    const com1 = sim.bh1.pos.clone().multiplyScalar(sim.bh1.mass);
    const com2 = sim.bh2.pos.clone().multiplyScalar(sim.bh2.mass);
    const finalCoM = com1.add(com2);

    // Mass-energy conversion (5% mass lost to gravitational waves)
    const initialTotalMass = sim.bh1.mass + sim.bh2.mass;
    const massLoss = 0.05;
    sim.mergedBh.mass = initialTotalMass * (1 - massLoss);
    sim.mergedBh.radius = Math.pow(sim.mergedBh.mass, 0.7) * 0.8;
    
    finalCoM.divideScalar(initialTotalMass);
    finalMomentum.divideScalar(sim.mergedBh.mass);
    
    // Set merged black hole properties
    sim.mergedBh.pos.copy(finalCoM);
    sim.mergedBh.vel.copy(finalMomentum);
    
    // Hide original black holes
    sim.bh1.setVisible(false);
    sim.bh2.setVisible(false);
    
    // Show merged black hole
    sim.mergedBh.setVisible(true);
    sim.mergedBh.mesh.scale.setScalar(0.1); // Start small and grow
    initDisk(sim.mergedBh);

    // Trigger visual effects
    bloomPass.strength = 3.5;
    wavePass.uniforms.amplitude.value = 0.05;
    wavePass.uniforms.frequency.value = 60.0;
    triggerFlare(finalCoM);

    sim.progress = 0.9;
    updateStatusUI();
    updateSystemInfo();
}

function triggerFlare(position) {
    mergerFlare.position.copy(position);
    mergerFlare.material.opacity = 1.0;
    const particles = mergerFlare.userData.particles;
    const positions = mergerFlare.geometry.attributes.position.array;
    
    for(let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vel.set(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(Math.random() * 80);
        p.life = 1.0;
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
    }
    
    mergerFlare.geometry.attributes.position.needsUpdate = true;
}

function updateMerger(dt) {
    sim.phaseTime += dt;
    
    // Grow the merged black hole
    const scale = THREE.MathUtils.lerp(0.1, sim.mergedBh.radius, Math.min(1, sim.phaseTime * 2));
    sim.mergedBh.mesh.scale.setScalar(scale);

    // Update flare particles
    if (mergerFlare.material.opacity > 0) {
        mergerFlare.material.opacity -= dt * 0.8;
        const positions = mergerFlare.geometry.attributes.position.array;
        const particles = mergerFlare.userData.particles;
        
        for(let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const i3 = i * 3;
            positions[i3] += p.vel.x * dt;
            positions[i3 + 1] += p.vel.y * dt;
            positions[i3 + 2] += p.vel.z * dt;
        }
        
        mergerFlare.geometry.attributes.position.needsUpdate = true;
    }

    // Transition to ringdown
    if (sim.phaseTime > 1.5) {
        sim.phase = 'RINGDOWN';
        sim.phaseTime = 0;
        sim.progress = 0.95;
        updateStatusUI();
    }
}

function updateRingdown(dt) {
    sim.phaseTime += dt;
    
    // Decay bloom effect
    if (bloomPass.strength > 1.0) {
        bloomPass.strength -= 1.5 * dt;
    }
    
    // Ringdown gravitational waves (decaying amplitude and frequency)
    if (wavePass.uniforms.amplitude.value > 0) {
        wavePass.uniforms.amplitude.value *= (1 - 1.5 * dt);
        wavePass.uniforms.frequency.value *= (1 - 1.0 * dt);
    }
    
    // Update merged black hole
    sim.mergedBh.update(dt);
    updateDisk(sim.mergedBh, dt);
    
    // Update progress
    sim.progress = Math.min(1.0, 0.95 + sim.phaseTime * 0.05);
}

function updateDisk(bh, dt, otherBh = null) {
    if (!sim.disksEnabled) return;
    
    const particles = bh.disk.userData.particles;
    const positions = bh.disk.geometry.attributes.position.array;
    const lifeAttr = bh.disk.geometry.attributes.life.array;

    for(let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life <= 0) continue;

        const i3 = i * 3;
        const currentPos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        const r = currentPos.length();
        
        // Keplerian orbital velocity
        const orbitalSpeed = Math.sqrt(G * bh.mass / Math.max(0.1, r));
        const tangent = new THREE.Vector3(-currentPos.z, 0, currentPos.x).normalize();
        p.vel = tangent.multiplyScalar(orbitalSpeed);
        
        // Gravitational pull from black hole
        const pull = currentPos.clone().normalize().multiplyScalar(-G * bh.mass / Math.max(0.1, r * r));
        p.vel.add(pull.multiplyScalar(dt));

        // Tidal forces from other black hole
        if(otherBh) {
            const toOther = new THREE.Vector3().subVectors(otherBh.pos, bh.pos.clone().add(currentPos));
            const tidalForce = G * otherBh.mass / toOther.lengthSq();
            p.vel.add(toOther.normalize().multiplyScalar(tidalForce * dt));
        }

        // Update position
        positions[i3] += p.vel.x * dt;
        positions[i3 + 1] += p.vel.y * dt;
        positions[i3 + 2] += p.vel.z * dt;

        // Check if particle falls into black hole
        if (r < bh.radius * 1.5) {
            p.life = 0;
            positions[i3] = 1e6; // Move far away to hide
        }
        
        lifeAttr[i] = p.life;
    }
    
    bh.disk.geometry.attributes.position.needsUpdate = true;
    bh.disk.geometry.attributes.life.needsUpdate = true;
}

function updateLensing() {
    if (!sim.lensingEnabled) return;
    
    const project = (bh, targetPos) => {
        const p = bh.pos.clone();
        const vector = p.project(camera);
        targetPos.set((vector.x + 1) / 2, (vector.y + 1) / 2);
        
        // Calculate screen radius of black hole
        const edgePointWorld = bh.mesh.localToWorld(new THREE.Vector3(1, 0, 0));
        const edgePointNDC = edgePointWorld.project(camera);
        return new THREE.Vector2(edgePointNDC.x, edgePointNDC.y)
               .distanceTo(new THREE.Vector2(vector.x, vector.y));
    }
    
    lensingPass.uniforms.resolution.value.set(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio
    );
    
    if (sim.phase === 'INSPIRAL') {
        lensingPass.uniforms.bhRadius1.value = project(sim.bh1, lensingPass.uniforms.bhPos1.value);
        lensingPass.uniforms.bhRadius2.value = project(sim.bh2, lensingPass.uniforms.bhPos2.value);
        lensingPass.uniforms.mass1.value = sim.bh1.mass;
        lensingPass.uniforms.mass2.value = sim.bh2.mass;
    } else {
        lensingPass.uniforms.bhRadius1.value = project(sim.mergedBh, lensingPass.uniforms.bhPos1.value);
        lensingPass.uniforms.bhRadius2.value = 0;
        lensingPass.uniforms.mass1.value = sim.mergedBh.mass;
        lensingPass.uniforms.mass2.value = 0;
    }
}

function updateStatusUI() {
    const textEl = document.getElementById('statusText');
    const progressEl = document.getElementById('progressBar');
    const container = document.getElementById('controlsContainer');
    
    // Update phase text
    if (sim.phase === 'INSPIRAL') {
        textEl.textContent = 'Inspiral';
        container.classList.remove('phase-merger', 'phase-ringdown');
        container.classList.add('phase-inspiral');
    } else if (sim.phase === 'MERGER') {
        textEl.textContent = 'MERGER!';
        container.classList.remove('phase-inspiral', 'phase-ringdown');
        container.classList.add('phase-merger');
    } else if (sim.phase === 'RINGDOWN') {
        textEl.textContent = 'Ringdown';
        container.classList.remove('phase-inspiral', 'phase-merger');
        container.classList.add('phase-ringdown');
    }
    
    // Update progress bar
    progressEl.style.width = `${sim.progress * 100}%`;
}

function updateSystemInfo() {
    const totalMassEl = document.getElementById('totalMassDisplay');
    const orbitalPeriodEl = document.getElementById('orbitalPeriodDisplay');
    const separationEl = document.getElementById('separationDisplay');
    
    if (sim.phase === 'INSPIRAL' && sim.bh1 && sim.bh2) {
        const totalMass = sim.bh1.mass + sim.bh2.mass;
        const sep = sim.bh1.pos.distanceTo(sim.bh2.pos);
        const period = 2 * Math.PI * Math.sqrt(Math.pow(sep, 3) / (G * totalMass));
        
        totalMassEl.textContent = `${totalMass.toFixed(1)} M☉`;
        orbitalPeriodEl.textContent = `${period.toFixed(1)} s`;
        separationEl.textContent = `${sep.toFixed(1)} Rs`;
    } else if (sim.mergedBh) {
        totalMassEl.textContent = `${sim.mergedBh.mass.toFixed(1)} M☉`;
        orbitalPeriodEl.textContent = '—';
        separationEl.textContent = 'Merged';
    }
}

// ===== Animation Loop =====
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.016, clock.getDelta()) * sim.timeScale;

    if (sim.paused || !dt) {
        controls.update();
        return;
    }
    
    // Update simulation based on phase
    if (sim.phase === 'INSPIRAL') {
        updatePhysics(dt);
        updateDisk(sim.bh1, dt, sim.bh2);
        updateDisk(sim.bh2, dt, sim.bh1);
    } else if (sim.phase === 'MERGER') {
        updateMerger(dt);
        sim.mergedBh.update(dt);
        updateDisk(sim.mergedBh, dt);
    } else if (sim.phase === 'RINGDOWN') {
        updateRingdown(dt);
    }
    
    // Update camera-dependent effects
    const viewVector = camera.position.clone().normalize();
    if (sim.bh1 && sim.bh1.mesh.visible) {
        sim.bh1.mesh.children[0].children[0].material.uniforms.viewVector.value = viewVector;
    }
    if (sim.bh2 && sim.bh2.mesh.visible) {
        sim.bh2.mesh.children[0].children[0].material.uniforms.viewVector.value = viewVector;
    }
    if (sim.mergedBh && sim.mergedBh.mesh.visible) {
        sim.mergedBh.mesh.children[0].children[0].material.uniforms.viewVector.value = viewVector;
    }

    // Update shaders
    updateLensing();
    wavePass.uniforms.time.value += dt;
    
    // Update wave origin position
    if(sim.phase === 'INSPIRAL' && sim.bh1 && sim.bh2) {
        const com = sim.bh1.pos.clone().multiplyScalar(sim.bh1.mass)
                   .add(sim.bh2.pos.clone().multiplyScalar(sim.bh2.mass))
                   .divideScalar(sim.bh1.mass + sim.bh2.mass);
        const screenPos = com.project(camera);
        wavePass.uniforms.origin.value.set((screenPos.x + 1) / 2, (screenPos.y + 1) / 2);
    } else if (sim.mergedBh) {
        const screenPos = sim.mergedBh.pos.clone().project(camera);
        wavePass.uniforms.origin.value.set((screenPos.x + 1) / 2, (screenPos.y + 1) / 2);
    }
    
    // Update UI
    updateStatusUI();
    updateSystemInfo();
    
    // Update starfield rotation (slow drift)
    if (starField) {
        starField.rotation.y += dt * 0.01;
    }
    
    // Update controls and render
    controls.update();
    composer.render();
}

// ===== Window Resize Handler =====
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update resolution uniforms
    lensingPass.uniforms.resolution.value.set(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio
    );
});

// ===== Keyboard Controls =====
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            document.getElementById('playPauseBtn').click();
            break;
        case 'r':
            document.getElementById('resetBtn').click();
            break;
        case 'l':
            document.getElementById('lensingToggle').click();
            break;
        case 'w':
            document.getElementById('wavesToggle').click();
            break;
        case 'd':
            document.getElementById('disksToggle').click();
            break;
        case 'i':
            document.getElementById('infoBtn').click();
            break;
        case 'escape':
            document.getElementById('infoModal').classList.remove('show');
            break;
    }
});

// ===== Performance Monitor (Optional) =====
if (window.location.hash === '#debug') {
    import('https://cdn.jsdelivr.net/npm/stats.js@0.17.0/build/stats.min.js').then(() => {
        const stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
        const animateWithStats = () => {
            stats.begin();
            animate();
            stats.end();
        };
        requestAnimationFrame(animateWithStats);
    });
}

// Export for debugging
window.sim = sim;