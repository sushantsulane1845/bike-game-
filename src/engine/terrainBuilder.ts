import * as THREE from 'three';
import { StageDefinition } from '../types/game';
import {
  createCheckerBannerTexture,
  createDesertDirtTexture,
  createRampPlankTexture,
  createSandstoneCliffTexture,
  createSunsetSkyTexture,
} from './textures';

export interface SplineSample {
  progress: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

export interface RampInstance {
  startS: number;
  endS: number;
  centerS: number;
  halfWidth: number;
  height: number;
  length: number;
  hasBoostPad: boolean;
  label: string;
}

export interface SurfaceQuery {
  groundY: number;
  trackProgress: number;
  lateralOffset: number;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  onTrack: boolean;
  onRamp: boolean;
  rampSlopeAngle: number;
  onBoostPad: boolean;
}

export interface BuiltStageWorld {
  group: THREE.Group;
  totalLength: number;
  samples: SplineSample[];
  checkpointsProgress: number[];
  evaluateSurface: (x: number, z: number, hintProgress?: number) => SurfaceQuery;
  getTransformAtProgress: (progress: number) => {
    position: THREE.Vector3;
    tangent: THREE.Vector3;
    right: THREE.Vector3;
  };
  dispose: () => void;
}

const _tmpVec = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function pseudoNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.032 + z * 0.018) * 1.6 +
    Math.cos(x * 0.075 - z * 0.062) * 0.75 +
    Math.sin(x * 0.14 + z * 0.11) * 0.3
  );
}

export function buildStageWorld(
  stage: StageDefinition,
  maxAnisotropy: number
): BuiltStageWorld {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const curvePoints = stage.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.45);
  const totalLength = curve.getLength();

  const sampleCount = 420;
  const samples: SplineSample[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, _up).normalize();
    samples.push({ progress: t, point, tangent, right });
  }

  // Sky Dome
  const skyTex = createSunsetSkyTexture(stage.skyTopHex, stage.skyHorizonHex);
  const skyGeo = new THREE.SphereGeometry(950, 28, 18);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);
  disposables.push(skyTex, skyGeo, skyMat);

  // Textures & Materials
  const dirtTex = createDesertDirtTexture(stage.trailDirtColor, maxAnisotropy);
  dirtTex.repeat.set(2, Math.round(totalLength / 14));
  const cliffTex = createSandstoneCliffTexture(stage.canyonWallColor, maxAnisotropy);
  cliffTex.repeat.set(16, 4);
  const rampTex = createRampPlankTexture(maxAnisotropy);
  const bannerTex = createCheckerBannerTexture(maxAnisotropy);

  const trackMat = new THREE.MeshStandardMaterial({
    map: dirtTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const canyonMat = new THREE.MeshStandardMaterial({
    map: cliffTex,
    roughness: 0.95,
    metalness: 0.02,
    vertexColors: true,
  });
  const rampMat = new THREE.MeshStandardMaterial({
    map: rampTex,
    roughness: 0.78,
    metalness: 0.05,
  });
  const boostMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    emissive: '#E85D04',
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.4,
  });
  const postMat = new THREE.MeshStandardMaterial({
    color: '#231A15',
    roughness: 0.55,
    metalness: 0.45,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    roughness: 0.5,
    metalness: 0.05,
  });

  disposables.push(
    dirtTex,
    cliffTex,
    rampTex,
    bannerTex,
    trackMat,
    canyonMat,
    rampMat,
    boostMat,
    postMat,
    bannerMat
  );

  // Build Continuous Sculpted Track Ribbon + Banked Berms
  const halfTrack = stage.trackWidth * 0.5;
  const crossProfile = [
    { offset: -halfTrack * 1.45, yLift: 1.6 },
    { offset: -halfTrack * 1.0, yLift: 0.55 },
    { offset: -halfTrack * 0.45, yLift: -0.04 },
    { offset: 0, yLift: 0.0 },
    { offset: halfTrack * 0.45, yLift: -0.04 },
    { offset: halfTrack * 1.0, yLift: 0.55 },
    { offset: halfTrack * 1.45, yLift: 1.6 },
  ];

  const cols = crossProfile.length;
  const rows = samples.length;
  const trackPositions = new Float32Array(rows * cols * 3);
  const trackUvs = new Float32Array(rows * cols * 2);
  const trackIndices: number[] = [];

  for (let r = 0; r < rows; r++) {
    const s = samples[r];
    // Add subtle whoop ripples in middle sections of stage 2 & 3
    const whoop =
      stage.index > 0 && s.progress > 0.22 && s.progress < 0.27
        ? Math.sin((s.progress - 0.22) * Math.PI * 32) * 0.35
        : 0;

    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const prof = crossProfile[c];
      const vx = s.point.x + s.right.x * prof.offset;
      const vz = s.point.z + s.right.z * prof.offset;
      const vy = s.point.y + prof.yLift + (c >= 2 && c <= 4 ? whoop : 0);

      trackPositions[idx * 3] = vx;
      trackPositions[idx * 3 + 1] = vy;
      trackPositions[idx * 3 + 2] = vz;

      trackUvs[idx * 2] = c / (cols - 1);
      trackUvs[idx * 2 + 1] = s.progress * (totalLength / 14);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      trackIndices.push(a, d, b, b, d, e);
    }
  }

  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(trackPositions, 3));
  trackGeo.setAttribute('uv', new THREE.BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);
  trackGeo.computeVertexNormals();
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  group.add(trackMesh);
  disposables.push(trackGeo);

  // Build Surrounding Canyon Walls & Distant Mesas (Left & Right Flanks extending to horizon)
  const canyonOffsets = [-220, -110, -52, -halfTrack * 1.42, halfTrack * 1.42, 52, 110, 220];
  const wallHeights = [46, 34, 18, 1.3, 1.3, 19, 36, 48];
  const buildFlank = (isLeft: boolean) => {
    const flankCols = 4;
    const pos = new Float32Array(rows * flankCols * 3);
    const uv = new Float32Array(rows * flankCols * 2);
    const colAttr = new Float32Array(rows * flankCols * 3);
    const indices: number[] = [];

    const startCol = isLeft ? 0 : 4;
    for (let r = 0; r < rows; r++) {
      const s = samples[r];
      for (let lc = 0; lc < flankCols; lc++) {
        const globalC = startCol + lc;
        const offset = canyonOffsets[globalC];
        const baseWall = wallHeights[globalC];
        const vx = s.point.x + s.right.x * offset;
        const vz = s.point.z + s.right.z * offset;
        const n = pseudoNoise(vx, vz);
        const edgeJitter = lc === (isLeft ? 3 : 0) ? 0 : Math.abs(n) * 4.5 + (Math.sin(r * 0.25 + lc) * 3.5);
        const vy = s.point.y + baseWall + edgeJitter - 0.15;

        const idx = r * flankCols + lc;
        pos[idx * 3] = vx;
        pos[idx * 3 + 1] = vy;
        pos[idx * 3 + 2] = vz;
        uv[idx * 2] = lc * 2;
        uv[idx * 2 + 1] = s.progress * 28;

        // Subtle strata vertex tinting
        const shade = lc === (isLeft ? 3 : 0) ? 0.85 : 0.72 + (vy % 12) * 0.025;
        colAttr[idx * 3] = shade;
        colAttr[idx * 3 + 1] = shade * 0.92;
        colAttr[idx * 3 + 2] = shade * 0.85;
      }
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let lc = 0; lc < flankCols - 1; lc++) {
        const a = r * flankCols + lc;
        const b = a + 1;
        const d = (r + 1) * flankCols + lc;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colAttr, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, canyonMat);
    mesh.receiveShadow = true;
    group.add(mesh);
    disposables.push(geo);
  };
  buildFlank(true);
  buildFlank(false);

  // Build Stunt Kicker Ramps along the spline
  const rampInstances: RampInstance[] = [];
  for (const rSpec of stage.ramps) {
    const halfLenS = (rSpec.length * 0.5) / totalLength;
    const startS = Math.max(0.02, rSpec.progress - halfLenS);
    const endS = Math.min(0.95, rSpec.progress + halfLenS);
    rampInstances.push({
      startS,
      endS,
      centerS: rSpec.progress,
      halfWidth: rSpec.width * 0.5,
      height: rSpec.height,
      length: rSpec.length,
      hasBoostPad: Boolean(rSpec.hasBoostPad),
      label: rSpec.label,
    });

    const pCenter = curve.getPointAt(rSpec.progress);
    const tangent = curve.getTangentAt(rSpec.progress).normalize();

    // Wedge ExtrudeGeometry in local space (length along -Z, height +Y, width along X)
    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(-rSpec.length * 0.5, 0);
    wedgeShape.lineTo(rSpec.length * 0.5, rSpec.height);
    wedgeShape.lineTo(rSpec.length * 0.5, 0);
    wedgeShape.closePath();

    const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, {
      depth: rSpec.width,
      bevelEnabled: false,
    });
    // Orient shape: shape X -> -Z forward, shape Y -> +Y up, extrude depth Z -> X width
    wedgeGeo.rotateY(Math.PI / 2);
    wedgeGeo.translate(-rSpec.width * 0.5, -0.08, 0);

    const rampMesh = new THREE.Mesh(wedgeGeo, rampMat);
    rampMesh.position.copy(pCenter);
    const yaw = Math.atan2(-tangent.x, -tangent.z);
    rampMesh.rotation.y = yaw;
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    group.add(rampMesh);
    disposables.push(wedgeGeo);

    // Optional Glowing Boost Strip along ramp approach
    if (rSpec.hasBoostPad) {
      const stripGeo = new THREE.BoxGeometry(rSpec.width * 0.42, 0.14, rSpec.length * 0.62);
      const stripMesh = new THREE.Mesh(stripGeo, boostMat);
      const slopeAngle = Math.atan2(rSpec.height, rSpec.length);
      stripMesh.position.set(0, rSpec.height * 0.38, 0.4);
      stripMesh.rotation.x = slopeAngle;
      rampMesh.add(stripMesh);
      disposables.push(stripGeo);
    }
  }

  // Checkpoint Arches & Finish Gantry
  const checkpointsProgress = [0.25, 0.50, 0.75, 0.985];
  const archPostGeo = new THREE.CylinderGeometry(0.24, 0.28, 7.5, 10);
  const archCrossGeo = new THREE.BoxGeometry(stage.trackWidth * 0.95, 1.4, 0.65);
  disposables.push(archPostGeo, archCrossGeo);

  checkpointsProgress.forEach((cp, idx) => {
    const isFinish = idx === checkpointsProgress.length - 1;
    const pt = curve.getPointAt(cp);
    const tan = curve.getTangentAt(cp).normalize();
    const archGroup = new THREE.Group();
    archGroup.position.copy(pt);
    archGroup.rotation.y = Math.atan2(-tan.x, -tan.z);

    const halfSpan = stage.trackWidth * 0.46;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(archPostGeo, postMat);
      post.position.set(side * halfSpan, 3.75, 0);
      post.castShadow = true;
      archGroup.add(post);
    }

    const cross = new THREE.Mesh(archCrossGeo, isFinish ? bannerMat : boostMat);
    cross.position.set(0, 7.2, 0);
    cross.castShadow = true;
    archGroup.add(cross);
    group.add(archGroup);
  });

  // Instanced Desert Props along Canyon Shoulders (Boulders, Saguaros, Scrub)
  const rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#9B4828',
    roughness: 0.92,
    metalness: 0.03,
  });
  const rockCount = 140;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;

  const cactusGeo = new THREE.CapsuleGeometry(0.32, 3.4, 5, 8);
  const cactusMat = new THREE.MeshStandardMaterial({
    color: '#4D6B3C',
    roughness: 0.85,
    metalness: 0.02,
  });
  const cactusCount = 75;
  const cactusInst = new THREE.InstancedMesh(cactusGeo, cactusMat, cactusCount);
  cactusInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();

  for (let i = 0; i < rockCount; i++) {
    const sIdx = Math.floor(((i + 0.5) / rockCount) * (samples.length - 1));
    const s = samples[sIdx];
    const side = i % 2 === 0 ? 1 : -1;
    const dist = halfTrack * 1.55 + Math.random() * 28;
    const rx = s.point.x + s.right.x * side * dist;
    const rz = s.point.z + s.right.z * side * dist;
    const scale = 0.85 + Math.random() * 1.4;
    dummy.position.set(rx, s.point.y + scale * 0.45, rz);
    dummy.rotation.set(Math.random() * 1.2, Math.random() * Math.PI * 2, Math.random() * 1.2);
    dummy.scale.set(scale * (0.9 + Math.random() * 0.4), scale * 0.75, scale);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);

    const tint = 0.82 + Math.random() * 0.32;
    colorTmp.setRGB(tint, tint * 0.88, tint * 0.78);
    rockInst.setColorAt(i, colorTmp);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  for (let i = 0; i < cactusCount; i++) {
    const sIdx = Math.floor(((i + 0.3) / cactusCount) * (samples.length - 1));
    const s = samples[sIdx];
    const side = i % 2 === 0 ? -1 : 1;
    const dist = halfTrack * 1.48 + 4 + Math.random() * 24;
    const cx = s.point.x + s.right.x * side * dist;
    const cz = s.point.z + s.right.z * side * dist;
    const scale = 0.85 + Math.random() * 0.32; // +/-15% natural variation
    dummy.position.set(cx, s.point.y + 1.9 * scale, cz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.08);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    cactusInst.setMatrixAt(i, dummy.matrix);

    const gTint = 0.85 + Math.random() * 0.3;
    colorTmp.setRGB(gTint * 0.9, gTint, gTint * 0.85);
    cactusInst.setColorAt(i, colorTmp);
  }
  cactusInst.instanceMatrix.needsUpdate = true;
  if (cactusInst.instanceColor) cactusInst.instanceColor.needsUpdate = true;
  cactusInst.computeBoundingSphere();
  group.add(cactusInst);

  disposables.push(rockGeo, rockMat, cactusGeo, cactusMat);

  // Surface Evaluation Query
  const evaluateSurface = (x: number, z: number, hintProgress?: number): SurfaceQuery => {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    let startIdx = 0;
    let endIdx = samples.length - 1;
    if (hintProgress !== undefined) {
      const centerIdx = Math.round(THREE.MathUtils.clamp(hintProgress, 0, 1) * (samples.length - 1));
      startIdx = Math.max(0, centerIdx - 32);
      endIdx = Math.min(samples.length - 1, centerIdx + 32);
    }

    for (let i = startIdx; i <= endIdx; i++) {
      const p = samples[i].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }

    // Fallback global scan if far from hint
    if (hintProgress !== undefined && bestDistSq > 45 * 45) {
      for (let i = 0; i < samples.length; i++) {
        const p = samples[i].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const s = samples[bestIdx];
    _tmpVec.set(x - s.point.x, 0, z - s.point.z);
    const lateralOffset = _tmpVec.dot(s.right);
    const absLat = Math.abs(lateralOffset);

    // Match crossProfile berm height
    let groundY = s.point.y;
    const whoop =
      stage.index > 0 && s.progress > 0.22 && s.progress < 0.27
        ? Math.sin((s.progress - 0.22) * Math.PI * 32) * 0.35
        : 0;

    if (absLat <= halfTrack * 0.45) {
      groundY += whoop;
    } else if (absLat <= halfTrack) {
      const t = (absLat - halfTrack * 0.45) / (halfTrack * 0.55);
      groundY += THREE.MathUtils.lerp(0, 0.55, t);
    } else if (absLat <= halfTrack * 1.45) {
      const t = (absLat - halfTrack) / (halfTrack * 0.45);
      groundY += THREE.MathUtils.lerp(0.55, 1.6, t);
    } else {
      groundY += 1.6 + (absLat - halfTrack * 1.45) * 0.4;
    }

    // Check if on any ramp
    let onRamp = false;
    let rampSlopeAngle = 0;
    let onBoostPad = false;

    for (const ramp of rampInstances) {
      if (
        s.progress >= ramp.startS &&
        s.progress <= ramp.endS &&
        absLat <= ramp.halfWidth + 0.4
      ) {
        const rampProgress = (s.progress - ramp.startS) / (ramp.endS - ramp.startS);
        const rampY = s.point.y + rampProgress * ramp.height;
        if (rampY > groundY) {
          groundY = rampY;
          onRamp = true;
          rampSlopeAngle = Math.atan2(ramp.height, ramp.length);
          if (ramp.hasBoostPad && absLat <= ramp.halfWidth * 0.52) {
            onBoostPad = true;
          }
        }
      }
    }

    return {
      groundY,
      trackProgress: s.progress,
      lateralOffset,
      tangent: s.tangent,
      right: s.right,
      onTrack: absLat <= halfTrack * 1.15,
      onRamp,
      rampSlopeAngle,
      onBoostPad,
    };
  };

  const getTransformAtProgress = (progress: number) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const position = curve.getPointAt(p);
    const tangent = curve.getTangentAt(p).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, _up).normalize();
    return { position, tangent, right };
  };

  return {
    group,
    totalLength,
    samples,
    checkpointsProgress,
    evaluateSurface,
    getTransformAtProgress,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
