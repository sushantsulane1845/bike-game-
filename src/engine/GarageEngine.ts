import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LiveryId, UpgradeLevels } from '../types/game';
import { BikeRig, buildMotocrossBike } from './bikeBuilder';
import { detectSoftwareWebGL } from './MotocrossEngine';
import { createContactShadowTexture, createSandstoneCliffTexture } from './textures';

/**
 * Interactive 3D Garage & Hero Turntable Engine:
 * Renders the composite motocross bike on a sculpted sandstone plinth
 * with smooth OrbitControls, studio PMREM reflections, and on-demand rendering.
 */
export class GarageEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private bike: BikeRig;
  private plinthMat: THREE.MeshStandardMaterial;
  private plinthTex: THREE.CanvasTexture;
  private shadowTex: THREE.CanvasTexture;
  private isSoftwareGl: boolean;

  private active = true;
  private frameId = 0;
  private renderBusy = false;
  private renderDirty = false;
  private targetAngle = -0.65;

  constructor(
    container: HTMLElement,
    initialLivery: LiveryId,
    initialUpgrades: UpgradeLevels
  ) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || 640;
    const h = container.clientHeight || 460;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#17120F');
    this.scene.fog = new THREE.FogExp2('#17120F', 0.045);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(2.8, 1.55, 2.85);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.72, 0);
    this.controls.enablePan = false;
    this.controls.minDistance = 2.1;
    this.controls.maxDistance = 5.4;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = false;
    this.controls.addEventListener('change', this.requestRender);

    // Sunset Studio 3-Point Rig
    const hemi = new THREE.HemisphereLight('#FDBA74', '#2A1610', 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFE4B8', 2.6);
    key.position.set(5, 7, 4);
    key.castShadow = !this.isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    const d = 3.5;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#E85D04', 2.0);
    rim.position.set(-4.5, 3.0, -4.0);
    this.scene.add(rim);

    // Sculpted Sandstone Turntable Pad
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.plinthTex = createSandstoneCliffTexture('#472417', maxAniso);
    this.plinthTex.repeat.set(3, 3);
    this.plinthMat = new THREE.MeshStandardMaterial({
      map: this.plinthTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    const plinthGeo = new THREE.CylinderGeometry(2.15, 2.35, 0.22, 42);
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.y = -0.11;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    // Outer burnt-orange trim ring
    const ringGeo = new THREE.TorusGeometry(2.18, 0.025, 10, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#E85D04',
      emissive: '#E85D04',
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.005;
    this.scene.add(ring);

    // Composite Bike Rig
    this.bike = buildMotocrossBike(initialLivery, initialUpgrades);
    this.bike.root.rotation.y = this.targetAngle;
    this.scene.add(this.bike.root);

    // Contact Shadow beneath bike
    this.shadowTex = createContactShadowTexture();
    const sGeo = new THREE.PlaneGeometry(1.75, 2.65);
    sGeo.rotateX(-Math.PI / 2);
    const sMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const shadowPlane = new THREE.Mesh(sGeo, sMat);
    shadowPlane.position.y = 0.015;
    shadowPlane.rotation.y = this.targetAngle;
    this.scene.add(shadowPlane);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.controls.update();
    this.requestRender();
  }

  public setCustomization(liveryId: LiveryId, upgrades: UpgradeLevels): void {
    this.bike.applyCustomization(liveryId, upgrades);
    this.requestRender();
  }

  public setCameraPreset(preset: 'three-quarter' | 'profile' | 'front'): void {
    if (preset === 'three-quarter') {
      this.camera.position.set(2.8, 1.55, 2.85);
    } else if (preset === 'profile') {
      this.camera.position.set(3.45, 0.95, 0.05);
    } else {
      this.camera.position.set(0.25, 1.25, -3.15);
    }
    this.controls.update();
    this.requestRender();
  }

  private requestRender = (): void => {
    if (!this.active) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (!this.active) return;
      this.renderDirty = false;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty) this.requestRender();
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  };

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
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 460;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.requestRender();
  };

  public dispose(): void {
    this.active = false;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.dispose();
    this.bike.dispose();
    this.plinthTex.dispose();
    this.plinthMat.dispose();
    this.shadowTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
