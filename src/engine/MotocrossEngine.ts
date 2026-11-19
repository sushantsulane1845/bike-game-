import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraMode,
  LiveryId,
  RideInputState,
  StageDefinition,
  TelemetryFrame,
  UpgradeLevels,
} from '../types/game';
import { MotocrossAudioSynth } from './audioSynth';
import { BikeRig, buildMotocrossBike } from './bikeBuilder';
import { BuiltStageWorld, buildStageWorld } from './terrainBuilder';
import { createContactShadowTexture } from './textures';

export interface EngineCallbacks {
  onTelemetry: (frame: TelemetryFrame) => void;
  onStageFinish: (stats: {
    elapsedSec: number;
    stuntScore: number;
    topSpeedKmh: number;
    maxAirtimeSec: number;
  }) => void;
}

// Pre-allocated zero-GC scratch helpers
const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dummy = new THREE.Object3D();

interface DustParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  scale: number;
}

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class MotocrossEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private isSoftwareGl: boolean;

  private bike: BikeRig;
  private contactShadow: THREE.Mesh;
  private contactShadowTex: THREE.CanvasTexture;
  private world: BuiltStageWorld | null = null;
  private stage: StageDefinition;

  private dustMesh: THREE.InstancedMesh;
  private dustGeo: THREE.IcosahedronGeometry;
  private dustMat: THREE.MeshStandardMaterial;
  private dustPool: DustParticle[] = [];
  private dustCursor = 0;

  private audio = new MotocrossAudioSynth();
  private callbacks: EngineCallbacks;
  private input: RideInputState = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    nitro: false,
    jumpWhip: false,
    pitchBack: false,
    pitchForward: false,
  };

  private upgrades: UpgradeLevels;
  private cameraMode: CameraMode = 'chase';
  private paused = false;
  private finished = false;
  private active = true;
  private frameId = 0;
  private lastTimeMs = 0;
  private hudEmitAccum = 0;

  // Physics state
  private pos = new THREE.Vector3(0, 0, 0);
  private vel = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private speed = 0; // m/s
  private verticalVel = 0;
  private isAirborne = false;
  private airtimeSec = 0;
  private lastAirtimeSec = 0;
  private maxAirtimeSec = 0;
  private topSpeedKmh = 0;
  private nitro = 1.0;
  private leanAngle = 0;
  private bikePitch = 0; // terrain pitch or mid-air stunt flip
  private airFlipAccum = 0;
  private airSpinAccum = 0;
  private whipAngle = 0;
  private suspensionComp = 0;
  private wheelAngle = 0;

  private trackProgress = 0;
  private lastCheckpointIdx = -1;
  private checkpointPos = new THREE.Vector3();
  private checkpointYaw = 0;
  private elapsedSec = 0;
  private stuntScore = 0;
  private comboMultiplier = 1;
  private activeStuntLabel = '';
  private stuntBannerTimer = 0;

  constructor(
    container: HTMLElement,
    initialStage: StageDefinition,
    initialLivery: LiveryId,
    initialUpgrades: UpgradeLevels,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.stage = initialStage;
    this.upgrades = { ...initialUpgrades };
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initialStage.fogHex);
    this.scene.fog = new THREE.FogExp2(initialStage.fogHex, initialStage.fogDensity);

    // Mandatory Studio PMREM Environment Reflection on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 1100);

    // 3-Point Sunset Desert Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#FDBA74', '#4A2215', 0.85);
    this.scene.add(hemiLight);

    this.keyLight = new THREE.DirectionalLight('#FFD6A5', 2.4);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 90;
    const d = 28;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight('#F97316', 1.1);
    rimLight.position.set(-40, 22, 35);
    this.scene.add(rimLight);

    // Composite Bike Rig
    this.bike = buildMotocrossBike(initialLivery, initialUpgrades);
    this.scene.add(this.bike.root);

    // Contact Shadow Grounding Plane beneath bike
    this.contactShadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.7, 2.7);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.contactShadow);

    // Pooled Desert Dust Roost System (zero GC in loop)
    const dustCount = 72;
    this.dustGeo = new THREE.IcosahedronGeometry(0.32, 0);
    this.dustMat = new THREE.MeshStandardMaterial({
      color: '#D97B4A',
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.dustMesh = new THREE.InstancedMesh(this.dustGeo, this.dustMat, dustCount);
    this.dustMesh.frustumCulled = false;
    for (let i = 0; i < dustCount; i++) {
      this.dustPool.push({
        active: false,
        pos: new THREE.Vector3(0, -500, 0),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.65,
        scale: 0.01,
      });
      _dummy.position.set(0, -500, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustMesh);

    this.loadStage(initialStage);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.lastTimeMs = performance.now();
    this.scheduleNextTick();
  }

  public loadStage(stage: StageDefinition): void {
    this.stage = stage;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.world = buildStageWorld(stage, maxAniso);
    this.scene.add(this.world.group);
    this.scene.background = new THREE.Color(stage.fogHex);
    this.scene.fog = new THREE.FogExp2(stage.fogHex, stage.fogDensity);

    this.resetRun();
  }

  public resetRun(): void {
    if (!this.world) return;
    const start = this.world.getTransformAtProgress(0.01);
    this.pos.copy(start.position);
    this.vel.set(0, 0, 0);
    this.yaw = Math.atan2(-start.tangent.x, -start.tangent.z);
    this.checkpointPos.copy(start.position);
    this.checkpointYaw = this.yaw;

    this.speed = 0;
    this.verticalVel = 0;
    this.isAirborne = false;
    this.airtimeSec = 0;
    this.lastAirtimeSec = 0;
    this.maxAirtimeSec = 0;
    this.topSpeedKmh = 0;
    this.nitro = 1.0;
    this.leanAngle = 0;
    this.bikePitch = 0;
    this.airFlipAccum = 0;
    this.airSpinAccum = 0;
    this.whipAngle = 0;
    this.suspensionComp = 0;

    this.trackProgress = 0.01;
    this.lastCheckpointIdx = -1;
    this.elapsedSec = 0;
    this.stuntScore = 0;
    this.comboMultiplier = 1;
    this.activeStuntLabel = '';
    this.stuntBannerTimer = 0;
    this.finished = false;
    this.paused = false;

    // Snap camera immediately on reset
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.camera.position.copy(this.pos).addScaledVector(_forward, -7.2).add(new THREE.Vector3(0, 3.2, 0));
    this.camera.lookAt(this.pos.x, this.pos.y + 1.1, this.pos.z);
  }

  public resetToCheckpoint(): void {
    this.pos.copy(this.checkpointPos);
    this.yaw = this.checkpointYaw;
    this.speed = 0;
    this.verticalVel = 0;
    this.isAirborne = false;
    this.airtimeSec = 0;
    this.airFlipAccum = 0;
    this.airSpinAccum = 0;
    this.bikePitch = 0;
    this.leanAngle = 0;
    this.whipAngle = 0;
  }

  public setCustomization(liveryId: LiveryId, upgrades: UpgradeLevels): void {
    this.upgrades = { ...upgrades };
    this.bike.applyCustomization(liveryId, upgrades);
  }

  public setInput(partial: Partial<RideInputState>): void {
    Object.assign(this.input, partial);
    if (
      partial.throttle ||
      partial.nitro ||
      partial.jumpWhip ||
      partial.left ||
      partial.right
    ) {
      this.audio.init();
    }
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  public initAudio(): void {
    this.audio.init();
  }

  private spawnDust(worldX: number, worldY: number, worldZ: number, burst = false): void {
    const count = burst ? 6 : 1;
    for (let k = 0; k < count; k++) {
      const p = this.dustPool[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % this.dustPool.length;
      p.active = true;
      p.age = 0;
      p.maxAge = burst ? 0.55 + Math.random() * 0.3 : 0.42 + Math.random() * 0.25;
      p.scale = burst ? 0.8 + Math.random() * 0.7 : 0.45 + Math.random() * 0.4;
      p.pos.set(
        worldX + (Math.random() - 0.5) * 0.5,
        worldY + 0.16,
        worldZ + (Math.random() - 0.5) * 0.5
      );
      p.vel.set(
        (Math.random() - 0.5) * (burst ? 4.5 : 1.8),
        0.9 + Math.random() * (burst ? 2.8 : 1.4),
        (Math.random() - 0.5) * (burst ? 4.5 : 1.8)
      );
    }
  }

  private updateDust(dt: number): void {
    for (let i = 0; i < this.dustPool.length; i++) {
      const p = this.dustPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _dummy.position.set(0, -500, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.95);
      const lifeRatio = 1 - p.age / p.maxAge;
      const curScale = p.scale * (0.4 + (1 - lifeRatio) * 1.4) * lifeRatio;
      _dummy.position.copy(p.pos);
      _dummy.rotation.set(p.age * 2, p.age * 1.5, 0);
      _dummy.scale.setScalar(Math.max(0.01, curScale));
      _dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
  }

  private stepPhysics(dt: number): void {
    if (!this.world || this.paused || this.finished) {
      this.audio.update(0.15, 0, false, false, false);
      return;
    }

    this.elapsedSec += dt;
    if (this.stuntBannerTimer > 0) {
      this.stuntBannerTimer = Math.max(0, this.stuntBannerTimer - dt);
      if (this.stuntBannerTimer === 0) {
        this.activeStuntLabel = '';
      }
    }

    // Upgrade performance multipliers
    const engineMult = 1 + (this.upgrades.engine - 1) * 0.085;
    const suspMult = 1 + (this.upgrades.suspension - 1) * 0.09;
    const tireMult = 1 + (this.upgrades.tires - 1) * 0.09;
    const nitroCapMult = 1 + (this.upgrades.nitro - 1) * 0.14;

    const maxBaseSpeed = 37 * engineMult; // ~133 km/h base -> ~178 km/h max
    const isBoosting = this.input.nitro && this.nitro > 0.04 && this.speed > 5;
    const targetMaxSpeed = isBoosting ? maxBaseSpeed * 1.28 : maxBaseSpeed;

    if (isBoosting) {
      this.nitro = Math.max(0, this.nitro - dt * (0.34 / nitroCapMult));
    } else {
      this.nitro = Math.min(1.0, this.nitro + dt * (0.08 * nitroCapMult));
    }

    // Longitudinal acceleration & braking
    if (!this.isAirborne) {
      if (this.input.throttle) {
        const accel = (isBoosting ? 38 : 22) * engineMult;
        this.speed = Math.min(targetMaxSpeed, this.speed + accel * dt);
      } else if (this.input.brake) {
        this.speed = Math.max(-6, this.speed - 28 * dt);
      } else {
        this.speed = THREE.MathUtils.damp(this.speed, 0, 1.3, dt);
      }
    } else {
      // Minimal air drag
      this.speed = THREE.MathUtils.damp(this.speed, 0, 0.15, dt);
    }

    // Steering & lean carving
    const steerInput = (this.input.left ? 1 : 0) - (this.input.right ? 1 : 0);
    if (!this.isAirborne) {
      const steerAuth = (1.95 * tireMult) * Math.min(1, Math.abs(this.speed) / 9);
      this.yaw += steerInput * steerAuth * dt;
      const targetLean = steerInput * 0.44 * Math.min(1, Math.abs(this.speed) / 14);
      this.leanAngle = THREE.MathUtils.damp(this.leanAngle, targetLean, 9, dt);
      this.whipAngle = THREE.MathUtils.damp(this.whipAngle, 0, 10, dt);
    } else {
      // Mid-air stunt controls: Q/E pitch flip, A/D + Space whip/spin!
      const pitchCmd = (this.input.pitchBack ? 1 : 0) - (this.input.pitchForward ? 1 : 0);
      if (pitchCmd !== 0) {
        const flipRate = 4.6;
        this.bikePitch += pitchCmd * flipRate * dt;
        this.airFlipAccum += Math.abs(pitchCmd * flipRate * dt);
      }
      if (this.input.jumpWhip || steerInput !== 0) {
        const targetWhip = steerInput * 0.72;
        this.whipAngle = THREE.MathUtils.damp(this.whipAngle, targetWhip, 7, dt);
        if (this.input.jumpWhip && steerInput !== 0) {
          const spinDelta = steerInput * 4.2 * dt;
          this.yaw += spinDelta;
          this.airSpinAccum += Math.abs(spinDelta);
        }
      }
      this.leanAngle = THREE.MathUtils.damp(this.leanAngle, steerInput * 0.32, 4, dt);
    }

    // Horizontal motion
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.pos.addScaledVector(_forward, this.speed * dt);

    // Evaluate ground & canyon boundaries
    const surf = this.world.evaluateSurface(this.pos.x, this.pos.z, this.trackProgress);
    this.trackProgress = surf.trackProgress;

    // Soft canyon wall containment (smoothly steer back onto trail if riding up steep canyon wall)
    const wallLimit = this.stage.trackWidth * 0.85;
    if (Math.abs(surf.lateralOffset) > wallLimit) {
      const sign = Math.sign(surf.lateralOffset);
      const excess = Math.abs(surf.lateralOffset) - wallLimit;
      this.pos.addScaledVector(surf.right, -sign * excess * 0.75);
      this.speed *= 0.94;
      // Gently nudge heading back along trail tangent
      const trailYaw = Math.atan2(-surf.tangent.x, -surf.tangent.z);
      let diff = trailYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * 0.14;
    }

    // Boost pad surge
    if (surf.onBoostPad && !this.isAirborne) {
      this.nitro = Math.min(1, this.nitro + 0.35 * dt);
      this.speed = Math.min(maxBaseSpeed * 1.32, this.speed + 24 * dt);
    }

    // Vertical & Ramp Launch Physics
    const wasAirborne = this.isAirborne;
    if (!this.isAirborne) {
      // Launch off ramp lip or jump pop with Space
      if (surf.onRamp) {
        const rampClimbVel = Math.tan(surf.rampSlopeAngle) * this.speed;
        const popBonus = this.input.jumpWhip ? 3.8 * suspMult : 0;
        this.verticalVel = Math.max(this.verticalVel, rampClimbVel + popBonus);
      } else if (this.input.jumpWhip && this.speed > 10) {
        this.verticalVel = 5.4 * suspMult;
        this.isAirborne = true;
      }

      if (this.pos.y > surf.groundY + 0.35 && this.verticalVel > 2.2) {
        this.isAirborne = true;
      } else {
        // Track terrain slope & check crest launch
        const prevY = this.pos.y;
        const dropRate = (prevY - surf.groundY) / Math.max(dt, 0.001);
        if (dropRate > 9.5 && this.speed > 18) {
          this.isAirborne = true;
          this.verticalVel = Math.max(0, (this.pos.y - surf.groundY) * 1.2);
        } else {
          this.pos.y = THREE.MathUtils.damp(this.pos.y, surf.groundY, 22, dt);
          const slopePitch = surf.onRamp ? surf.rampSlopeAngle : THREE.MathUtils.clamp((surf.groundY - prevY) * 2.2, -0.45, 0.45);
          this.bikePitch = THREE.MathUtils.damp(this.bikePitch, slopePitch, 10, dt);
        }
      }
    }

    if (this.isAirborne) {
      this.airtimeSec += dt;
      this.verticalVel -= 20.5 * dt; // Crisp motocross gravity
      this.pos.y += this.verticalVel * dt;

      if (this.pos.y <= surf.groundY) {
        // Touchdown!
        this.pos.y = surf.groundY;
        const impact = Math.min(1, Math.abs(this.verticalVel) / 18);
        this.suspensionComp = impact * 0.95;
        this.isAirborne = false;
        this.lastAirtimeSec = this.airtimeSec;
        this.maxAirtimeSec = Math.max(this.maxAirtimeSec, this.airtimeSec);

        // Evaluate Stunts on Landing
        const normPitch = Math.abs(((this.bikePitch % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        const cleanAngle = normPitch < 0.85;
        const fullFlips = Math.floor(this.airFlipAccum / (Math.PI * 1.65));
        const fullSpins = Math.floor(this.airSpinAccum / (Math.PI * 1.65));

        let earned = 0;
        const tags: string[] = [];
        if (this.airtimeSec > 0.65) {
          earned += Math.round(this.airtimeSec * 180);
          tags.push(`Air ${this.airtimeSec.toFixed(1)}s`);
        }
        if (fullFlips > 0 && cleanAngle) {
          earned += fullFlips * 550;
          tags.push(fullFlips > 1 ? `Double Backflip` : `Backflip`);
        }
        if (fullSpins > 0) {
          earned += fullSpins * 420;
          tags.push(`360 Spin`);
        }
        if (Math.abs(this.whipAngle) > 0.35 && this.airtimeSec > 0.5) {
          earned += 260;
          tags.push(`Table Whip`);
        }

        if (earned > 0 && cleanAngle) {
          const total = earned * this.comboMultiplier;
          this.stuntScore += total;
          this.comboMultiplier = Math.min(4, this.comboMultiplier + 1);
          this.nitro = Math.min(1, this.nitro + 0.25);
          this.activeStuntLabel = `${tags.join(' + ')} · +${total}`;
          this.stuntBannerTimer = 2.4;
          this.audio.playStuntChime(this.comboMultiplier);
        } else if (!cleanAngle && this.airtimeSec > 0.7) {
          this.comboMultiplier = 1;
          this.speed *= 0.62;
          this.activeStuntLabel = `Hard Landing · Speed Scrub`;
          this.stuntBannerTimer = 1.8;
        }

        this.airtimeSec = 0;
        this.airFlipAccum = 0;
        this.airSpinAccum = 0;
        this.bikePitch = 0;
        this.verticalVel = 0;

        this.audio.playLandingThud(impact);
        this.spawnDust(this.pos.x, this.pos.y, this.pos.z, true);
      }
    } else if (wasAirborne) {
      this.airtimeSec = 0;
    }

    // Suspension rebound & dust roost when riding hard on dirt
    this.suspensionComp = THREE.MathUtils.damp(this.suspensionComp, 0, 11 * suspMult, dt);
    if (!this.isAirborne && this.speed > 7 && (this.input.throttle || Math.abs(this.leanAngle) > 0.18)) {
      if (Math.random() < 0.55) {
        const rearX = this.pos.x - _forward.x * 0.8;
        const rearZ = this.pos.z - _forward.z * 0.8;
        this.spawnDust(rearX, this.pos.y, rearZ, false);
      }
    }

    // Track speed & checkpoints
    const speedKmh = Math.abs(this.speed) * 3.6;
    if (speedKmh > this.topSpeedKmh) {
      this.topSpeedKmh = speedKmh;
    }

    const cps = this.world.checkpointsProgress;
    for (let i = 0; i < cps.length; i++) {
      if (i > this.lastCheckpointIdx && this.trackProgress >= cps[i]) {
        this.lastCheckpointIdx = i;
        this.checkpointPos.copy(this.pos);
        this.checkpointYaw = this.yaw;

        if (i === cps.length - 1) {
          // Crossed Finish Gantry!
          this.finished = true;
          this.audio.playStuntChime(4);
          this.callbacks.onStageFinish({
            elapsedSec: this.elapsedSec,
            stuntScore: this.stuntScore,
            topSpeedKmh: Math.round(this.topSpeedKmh),
            maxAirtimeSec: Number(this.maxAirtimeSec.toFixed(2)),
          });
        } else {
          this.audio.playStuntChime(2);
          this.activeStuntLabel = `Sector ${i + 1} Cleared`;
          this.stuntBannerTimer = 1.6;
        }
      }
    }

    // Update Bike Visual Transforms & Articulation
    this.bike.root.position.copy(this.pos);
    this.bike.root.rotation.order = 'YXZ';
    this.bike.root.rotation.y = this.yaw + this.whipAngle;
    this.bike.root.rotation.z = this.leanAngle;
    this.bike.root.rotation.x = this.bikePitch;

    // Suspension compression on forks & chassis
    this.bike.chassisGroup.position.y = 0.72 - this.suspensionComp * 0.16;
    this.bike.frontForkLower.position.y = -0.40 + this.suspensionComp * 0.14;
    this.bike.frontForkAssembly.rotation.y = steerInput * 0.28;
    this.bike.riderGroup.rotation.z = steerInput * 0.16;
    this.bike.riderGroup.rotation.x = this.isAirborne ? -0.18 : (this.input.throttle ? -0.12 : 0.05);

    // Wheel rotation
    this.wheelAngle -= (this.speed / 0.4) * dt;
    this.bike.frontWheel.rotation.x = this.wheelAngle;
    this.bike.rearWheel.rotation.x = this.wheelAngle;

    // Nitro exhaust flame glow
    const flameMat = this.bike.exhaustFlame.material as THREE.MeshBasicMaterial;
    flameMat.opacity = isBoosting ? 0.75 + Math.random() * 0.25 : 0;
    this.bike.exhaustFlame.scale.setScalar(isBoosting ? 0.9 + Math.random() * 0.3 : 0.01);

    // Grounded Contact Shadow directly on surface below bike
    const heightAboveGround = Math.max(0, this.pos.y - surf.groundY);
    this.contactShadow.position.set(this.pos.x, surf.groundY + 0.04, this.pos.z);
    this.contactShadow.rotation.y = this.yaw;
    const shadowScale = THREE.MathUtils.clamp(1 + heightAboveGround * 0.12, 1, 2.2);
    this.contactShadow.scale.setScalar(shadowScale);
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
      0.58 - heightAboveGround * 0.09,
      0.08,
      0.58
    );

    // Follow Key Light Shadow Frustum with bike
    this.keyLight.position.set(this.pos.x + 28, this.pos.y + 32, this.pos.z + 22);
    this.keyLight.target.position.copy(this.pos);
    this.keyLight.target.updateMatrixWorld();

    // Update audio synth
    const gear = Math.min(6, Math.max(1, Math.floor((speedKmh / 160) * 6) + 1));
    const rpm = ((speedKmh % 28) / 28) * 0.65 + (this.input.throttle ? 0.32 : 0.12);
    this.audio.update(rpm, Math.min(1, speedKmh / 150), this.isAirborne, isBoosting, true);

    // Update Camera with smooth exponential damping & FOV surge
    const targetFov = isBoosting ? 72 : this.isAirborne ? 67 : 62 + Math.min(5, speedKmh / 35);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraMode === 'chase') {
      _camOffset.set(0, 2.75, 6.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      _desiredCamPos.copy(this.pos).add(_camOffset);
      // Prevent camera dipping below terrain
      const camSurf = this.world.evaluateSurface(_desiredCamPos.x, _desiredCamPos.z, this.trackProgress);
      _desiredCamPos.y = Math.max(_desiredCamPos.y, camSurf.groundY + 1.5);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 8.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 7.0, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 8.5, dt);
      _camTarget.copy(this.pos).addScaledVector(_forward, 5.5);
      _camTarget.y += 1.25;
      this.camera.lookAt(_camTarget);
    } else if (this.cameraMode === 'heli') {
      _camOffset.set(7.5, 9.5, 11.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw * 0.5);
      _desiredCamPos.copy(this.pos).add(_camOffset);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 5.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 5.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 5.5, dt);
      _camTarget.copy(this.pos).addScaledVector(_forward, 3.5);
      this.camera.lookAt(_camTarget);
    } else {
      // Helmet FPV
      _desiredCamPos.copy(this.pos).add(new THREE.Vector3(0, 1.58, 0)).addScaledVector(_forward, 0.28);
      this.camera.position.copy(_desiredCamPos);
      _camTarget.copy(_desiredCamPos).addScaledVector(_forward, 14);
      _camTarget.y += Math.sin(this.bikePitch) * 6 - 0.8;
      this.camera.lookAt(_camTarget);
    }

    this.updateDust(dt);

    // Emit HUD telemetry at ~20Hz so React stays ultra-fast
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.callbacks.onTelemetry({
        speedKmh: Math.round(speedKmh),
        rpm: THREE.MathUtils.clamp(rpm, 0.1, 1),
        gear,
        nitro: this.nitro,
        isAirborne: this.isAirborne,
        airtimeSec: Number(this.airtimeSec.toFixed(2)),
        lastAirtimeSec: Number(this.lastAirtimeSec.toFixed(2)),
        suspensionLoad: Number(this.suspensionComp.toFixed(2)),
        leanDeg: Math.round(THREE.MathUtils.radToDeg(this.leanAngle)),
        pitchDeg: Math.round(THREE.MathUtils.radToDeg(this.bikePitch)),
        progress: this.trackProgress,
        elapsedSec: this.elapsedSec,
        stuntScore: this.stuntScore,
        comboMultiplier: this.comboMultiplier,
        activeStuntLabel: this.activeStuntLabel,
        topSpeedKmh: Math.round(this.topSpeedKmh),
        maxAirtimeSec: Number(this.maxAirtimeSec.toFixed(2)),
        checkpointsPassed: Math.max(0, this.lastCheckpointIdx + 1),
        totalCheckpoints: cps.length,
        isFinished: this.finished,
        isPaused: this.paused,
      });
    }
  }

  private tick = (): void => {
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimeMs) / 1000));
    this.lastTimeMs = now;

    this.stepPhysics(dt);
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private scheduleNextTick(): void {
    if (!this.active) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.active) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handleResize = (): void => {
    if (!this.active) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose(): void {
    this.active = false;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.audio.dispose();
    this.bike.dispose();
    this.world?.dispose();
    this.contactShadowTex.dispose();
    this.contactShadow.geometry.dispose();
    (this.contactShadow.material as THREE.Material).dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
