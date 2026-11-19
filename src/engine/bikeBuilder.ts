import * as THREE from 'three';
import { LIVERIES } from '../data/campaign';
import { LiveryId, UpgradeLevels } from '../types/game';

export interface BikeRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  frontForkAssembly: THREE.Group;
  frontForkLower: THREE.Group;
  rearSwingarm: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  riderGroup: THREE.Group;
  exhaustFlame: THREE.Mesh;
  applyCustomization: (liveryId: LiveryId, upgrades: UpgradeLevels) => void;
  dispose: () => void;
}

function createKnobbyWheel(
  outerRadius: number,
  tireWidth: number,
  tireMat: THREE.Material,
  rimMat: THREE.Material,
  metalMat: THREE.Material
): THREE.Group {
  const wheel = new THREE.Group();

  // Tire carcass torus
  const tubeRadius = tireWidth * 0.5;
  const torusRadius = outerRadius - tubeRadius;
  const tireGeo = new THREE.TorusGeometry(torusRadius, tubeRadius, 12, 28);
  tireGeo.rotateY(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  wheel.add(tireMesh);

  // Knobby off-road tread lugs arrayed around tire
  const lugCount = 22;
  const lugGeo = new THREE.BoxGeometry(tireWidth * 0.82, 0.045, 0.055);
  const lugs = new THREE.InstancedMesh(lugGeo, tireMat, lugCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < lugCount; i++) {
    const angle = (i / lugCount) * Math.PI * 2;
    const r = outerRadius - 0.008;
    dummy.position.set(
      (i % 2 === 0 ? 1 : -1) * tireWidth * 0.14,
      Math.cos(angle) * r,
      Math.sin(angle) * r
    );
    dummy.rotation.set(angle, 0, 0);
    dummy.updateMatrix();
    lugs.setMatrixAt(i, dummy.matrix);
  }
  lugs.instanceMatrix.needsUpdate = true;
  lugs.computeBoundingSphere();
  wheel.add(lugs);

  // Anodized alloy rim
  const rimGeo = new THREE.TorusGeometry(torusRadius * 0.72, 0.032, 10, 26);
  rimGeo.rotateY(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rimMesh);

  // Hub & brake disc rotor
  const hubGeo = new THREE.CylinderGeometry(0.065, 0.065, tireWidth * 0.75, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, metalMat);
  wheel.add(hub);

  const rotorGeo = new THREE.CylinderGeometry(torusRadius * 0.44, torusRadius * 0.44, 0.014, 18);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(rotorGeo, metalMat);
  rotor.position.x = -tireWidth * 0.42;
  wheel.add(rotor);

  // Crossed spokes (InstancedMesh)
  const spokeCount = 16;
  const spokeGeo = new THREE.CylinderGeometry(0.007, 0.007, torusRadius * 1.4, 6);
  const spokes = new THREE.InstancedMesh(spokeGeo, metalMat, spokeCount);
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI;
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(angle, 0, (i % 2 === 0 ? 1 : -1) * 0.08);
    dummy.updateMatrix();
    spokes.setMatrixAt(i, dummy.matrix);
  }
  spokes.instanceMatrix.needsUpdate = true;
  spokes.computeBoundingSphere();
  wheel.add(spokes);

  return wheel;
}

export function buildMotocrossBike(
  initialLivery: LiveryId,
  initialUpgrades: UpgradeLevels
): BikeRig {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  // Curated PBR materials with distinct roughness & metalness contrast
  const primaryPaintMat = new THREE.MeshPhysicalMaterial({
    color: '#E85D04',
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
  const secondaryDarkMat = new THREE.MeshStandardMaterial({
    color: '#1C1613',
    roughness: 0.58,
    metalness: 0.12,
  });
  const forkGoldMat = new THREE.MeshPhysicalMaterial({
    color: '#D97706',
    roughness: 0.18,
    metalness: 0.92,
    anisotropy: 0.7,
  });
  const brushedAluMat = new THREE.MeshStandardMaterial({
    color: '#C7C1BA',
    roughness: 0.28,
    metalness: 0.88,
  });
  const titaniumExhaustMat = new THREE.MeshStandardMaterial({
    color: '#9F8C7C',
    roughness: 0.24,
    metalness: 0.92,
  });
  const knobbyTireMat = new THREE.MeshStandardMaterial({
    color: '#1A1817',
    roughness: 0.88,
    metalness: 0.04,
  });
  const seatGripperMat = new THREE.MeshStandardMaterial({
    color: '#231D1A',
    roughness: 0.82,
    metalness: 0.05,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: '#FFF4D6',
    emissive: '#F59E0B',
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#FF7A1A',
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const riderSuitMat = new THREE.MeshStandardMaterial({
    color: '#241F1C',
    roughness: 0.72,
    metalness: 0.08,
  });
  const riderVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#120E0C',
    roughness: 0.08,
    metalness: 0.85,
    clearcoat: 1.0,
  });

  disposables.push(
    primaryPaintMat,
    secondaryDarkMat,
    forkGoldMat,
    brushedAluMat,
    titaniumExhaustMat,
    knobbyTireMat,
    seatGripperMat,
    ledMat,
    flameMat,
    riderSuitMat,
    riderVisorMat
  );

  // Wheels — grounded bottom-center at y = 0 (wheel center at y = radius)
  const frontRadius = 0.41;
  const rearRadius = 0.39;
  const frontWheel = createKnobbyWheel(frontRadius, 0.14, knobbyTireMat, secondaryDarkMat, brushedAluMat);
  frontWheel.position.set(0, frontRadius, -0.78);
  root.add(frontWheel);

  const rearWheel = createKnobbyWheel(rearRadius, 0.18, knobbyTireMat, secondaryDarkMat, brushedAluMat);
  rearWheel.position.set(0, rearRadius, 0.74);
  root.add(rearWheel);

  // Chassis group (pivoted around center of mass, suspended above wheels)
  const chassisGroup = new THREE.Group();
  chassisGroup.position.set(0, 0.72, 0);
  root.add(chassisGroup);

  // 1. Aluminum Perimeter Frame + Crankcase Engine Block
  const frameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.36, -0.44),
    new THREE.Vector3(0, 0.24, -0.15),
    new THREE.Vector3(0, -0.04, 0.12),
    new THREE.Vector3(0, 0.16, 0.42),
  ]);
  const frameGeo = new THREE.TubeGeometry(frameCurve, 18, 0.036, 8, false);
  for (const side of [-1, 1]) {
    const spar = new THREE.Mesh(frameGeo, brushedAluMat);
    spar.position.x = side * 0.12;
    spar.castShadow = true;
    chassisGroup.add(spar);
  }
  disposables.push(frameGeo);

  const engineBlockGeo = new THREE.BoxGeometry(0.26, 0.32, 0.36);
  const engineBlock = new THREE.Mesh(engineBlockGeo, brushedAluMat);
  engineBlock.position.set(0, -0.12, 0.04);
  engineBlock.castShadow = true;
  chassisGroup.add(engineBlock);
  disposables.push(engineBlockGeo);

  // Skid plate under engine
  const skidGeo = new THREE.BoxGeometry(0.22, 0.04, 0.42);
  const skid = new THREE.Mesh(skidGeo, secondaryDarkMat);
  skid.position.set(0, -0.30, 0.01);
  skid.rotation.x = -0.18;
  chassisGroup.add(skid);
  disposables.push(skidGeo);

  // 2. Sculpted Fuel Tank + Radiator Shrouds (ExtrudeGeometry with bevels)
  const tankShape = new THREE.Shape();
  tankShape.moveTo(-0.34, 0.02);
  tankShape.lineTo(-0.18, 0.22);
  tankShape.lineTo(0.14, 0.16);
  tankShape.lineTo(0.22, -0.02);
  tankShape.lineTo(-0.24, -0.06);
  tankShape.closePath();

  const tankGeo = new THREE.ExtrudeGeometry(tankShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  tankGeo.rotateY(Math.PI / 2);
  tankGeo.translate(-0.11, 0.22, -0.16);
  const tank = new THREE.Mesh(tankGeo, primaryPaintMat);
  tank.castShadow = true;
  chassisGroup.add(tank);
  disposables.push(tankGeo);

  // Twin Radiator Shrouds
  const shroudGeo = new THREE.BoxGeometry(0.045, 0.26, 0.36);
  for (const side of [-1, 1]) {
    const shroud = new THREE.Mesh(shroudGeo, primaryPaintMat);
    shroud.position.set(side * 0.175, 0.19, -0.26);
    shroud.rotation.y = side * -0.16;
    shroud.rotation.x = -0.22;
    shroud.castShadow = true;
    chassisGroup.add(shroud);
  }
  disposables.push(shroudGeo);

  // 3. Stepped MX Gripper Saddle + High-Tail Rear Fender
  const seatGeo = new THREE.BoxGeometry(0.20, 0.09, 0.64);
  const seat = new THREE.Mesh(seatGeo, seatGripperMat);
  seat.position.set(0, 0.24, 0.28);
  seat.rotation.x = -0.08;
  seat.castShadow = true;
  chassisGroup.add(seat);
  disposables.push(seatGeo);

  const rearFenderGeo = new THREE.BoxGeometry(0.19, 0.045, 0.56);
  const rearFender = new THREE.Mesh(rearFenderGeo, primaryPaintMat);
  rearFender.position.set(0, 0.25, 0.72);
  rearFender.rotation.x = 0.22;
  rearFender.castShadow = true;
  chassisGroup.add(rearFender);
  disposables.push(rearFenderGeo);

  // Side number plates
  const sidePlateGeo = new THREE.BoxGeometry(0.28, 0.14, 0.36);
  const sidePlate = new THREE.Mesh(sidePlateGeo, secondaryDarkMat);
  sidePlate.position.set(0, 0.15, 0.52);
  chassisGroup.add(sidePlate);
  disposables.push(sidePlateGeo);

  // 4. Swept Titanium Exhaust Header & Cone Muffler
  const exhaustCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.09, -0.06, -0.14),
    new THREE.Vector3(0.18, -0.12, -0.02),
    new THREE.Vector3(0.16, 0.04, 0.28),
    new THREE.Vector3(0.14, 0.18, 0.62),
  ]);
  const headerGeo = new THREE.TubeGeometry(exhaustCurve, 22, 0.028, 10, false);
  const header = new THREE.Mesh(headerGeo, titaniumExhaustMat);
  header.castShadow = true;
  chassisGroup.add(header);
  disposables.push(headerGeo);

  const mufflerGeo = new THREE.CylinderGeometry(0.042, 0.054, 0.36, 12);
  mufflerGeo.rotateX(Math.PI / 2 - 0.24);
  const muffler = new THREE.Mesh(mufflerGeo, titaniumExhaustMat);
  muffler.position.set(0.14, 0.21, 0.76);
  muffler.castShadow = true;
  chassisGroup.add(muffler);
  disposables.push(mufflerGeo);

  // Nitro exhaust flame cone
  const flameGeo = new THREE.ConeGeometry(0.075, 0.42, 10);
  flameGeo.rotateX(Math.PI / 2);
  const exhaustFlame = new THREE.Mesh(flameGeo, flameMat);
  exhaustFlame.position.set(0.14, 0.25, 1.08);
  chassisGroup.add(exhaustFlame);
  disposables.push(flameGeo);

  // 5. Articulated Rear Swingarm & Coilover Monoshock
  const rearSwingarm = new THREE.Group();
  rearSwingarm.position.set(0, -0.14, 0.18);
  chassisGroup.add(rearSwingarm);

  const swingarmArmGeo = new THREE.BoxGeometry(0.055, 0.075, 0.58);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(swingarmArmGeo, brushedAluMat);
    arm.position.set(side * 0.115, -0.08, 0.28);
    arm.rotation.x = 0.26;
    arm.castShadow = true;
    rearSwingarm.add(arm);
  }
  disposables.push(swingarmArmGeo);

  const shockGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.34, 10);
  const shock = new THREE.Mesh(shockGeo, primaryPaintMat);
  shock.position.set(0, 0.08, 0.16);
  shock.rotation.x = -0.35;
  rearSwingarm.add(shock);
  disposables.push(shockGeo);

  // 6. Front USD Telescopic Forks, Handlebars, Number Plate & High-Mount Fender
  const frontForkAssembly = new THREE.Group();
  frontForkAssembly.position.set(0, 0.36, -0.44);
  frontForkAssembly.rotation.x = 0.42; // Aggressive 24 deg motocross rake
  chassisGroup.add(frontForkAssembly);

  const upperForkGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.52, 12);
  const lowerForkGeo = new THREE.CylinderGeometry(0.025, 0.024, 0.48, 12);
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(upperForkGeo, forkGoldMat);
    upper.position.set(side * 0.11, -0.14, 0);
    upper.castShadow = true;
    frontForkAssembly.add(upper);
  }
  disposables.push(upperForkGeo);

  const frontForkLower = new THREE.Group();
  frontForkLower.position.set(0, -0.40, 0);
  frontForkAssembly.add(frontForkLower);
  for (const side of [-1, 1]) {
    const lower = new THREE.Mesh(lowerForkGeo, brushedAluMat);
    lower.position.set(side * 0.11, -0.16, 0);
    lower.castShadow = true;
    frontForkLower.add(lower);
  }
  disposables.push(lowerForkGeo);

  // High-mount front fender
  const frontFenderGeo = new THREE.BoxGeometry(0.18, 0.036, 0.44);
  const frontFender = new THREE.Mesh(frontFenderGeo, primaryPaintMat);
  frontFender.position.set(0, -0.16, -0.22);
  frontFender.rotation.x = -0.36;
  frontFender.castShadow = true;
  frontForkAssembly.add(frontFender);
  disposables.push(frontFenderGeo);

  // Front Number Plate + LED Trail Light Bar
  const plateGeo = new THREE.BoxGeometry(0.22, 0.24, 0.045);
  const plate = new THREE.Mesh(plateGeo, secondaryDarkMat);
  plate.position.set(0, 0.04, -0.07);
  frontForkAssembly.add(plate);
  disposables.push(plateGeo);

  const ledGeo = new THREE.BoxGeometry(0.16, 0.045, 0.035);
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0, 0.07, -0.09);
  frontForkAssembly.add(led);
  disposables.push(ledGeo);

  // Tapered Motocross Handlebars + Handguards
  const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.78, 10);
  barGeo.rotateZ(Math.PI / 2);
  const bar = new THREE.Mesh(barGeo, brushedAluMat);
  bar.position.set(0, 0.18, 0.02);
  frontForkAssembly.add(bar);
  disposables.push(barGeo);

  const gripGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.14, 10);
  gripGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(gripGeo, knobbyTireMat);
    grip.position.set(side * 0.34, 0.18, 0.02);
    frontForkAssembly.add(grip);

    const guardGeo = new THREE.BoxGeometry(0.11, 0.06, 0.04);
    const guard = new THREE.Mesh(guardGeo, primaryPaintMat);
    guard.position.set(side * 0.36, 0.18, -0.03);
    frontForkAssembly.add(guard);
    disposables.push(guardGeo);
  }
  disposables.push(gripGeo);

  // 7. Dynamic Motocross Rider Silhouette (Leans & tucks with bike)
  const riderGroup = new THREE.Group();
  riderGroup.position.set(0, 0.28, 0.16);
  chassisGroup.add(riderGroup);

  const torsoGeo = new THREE.CapsuleGeometry(0.14, 0.32, 6, 12);
  const torso = new THREE.Mesh(torsoGeo, riderSuitMat);
  torso.position.set(0, 0.28, -0.05);
  torso.rotation.x = -0.45;
  torso.castShadow = true;
  riderGroup.add(torso);
  disposables.push(torsoGeo);

  // Jersey chest accent stripe
  const chestPlateGeo = new THREE.BoxGeometry(0.24, 0.26, 0.16);
  const chestPlate = new THREE.Mesh(chestPlateGeo, primaryPaintMat);
  chestPlate.position.set(0, 0.30, -0.07);
  chestPlate.rotation.x = -0.45;
  riderGroup.add(chestPlate);
  disposables.push(chestPlateGeo);

  // Helmet + MX Peak Visor
  const helmetGeo = new THREE.SphereGeometry(0.145, 16, 14);
  const helmet = new THREE.Mesh(helmetGeo, primaryPaintMat);
  helmet.position.set(0, 0.56, -0.18);
  helmet.castShadow = true;
  riderGroup.add(helmet);
  disposables.push(helmetGeo);

  const gogglesGeo = new THREE.BoxGeometry(0.20, 0.07, 0.12);
  const goggles = new THREE.Mesh(gogglesGeo, riderVisorMat);
  goggles.position.set(0, 0.55, -0.27);
  riderGroup.add(goggles);
  disposables.push(gogglesGeo);

  const peakGeo = new THREE.BoxGeometry(0.18, 0.025, 0.16);
  const peak = new THREE.Mesh(peakGeo, secondaryDarkMat);
  peak.position.set(0, 0.65, -0.28);
  peak.rotation.x = 0.22;
  riderGroup.add(peak);
  disposables.push(peakGeo);

  // Rider arms & legs gripping the chassis
  const armGeo = new THREE.CapsuleGeometry(0.048, 0.38, 4, 8);
  const legGeo = new THREE.CapsuleGeometry(0.065, 0.42, 4, 8);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, riderSuitMat);
    arm.position.set(side * 0.22, 0.31, -0.24);
    arm.rotation.x = -1.12;
    arm.rotation.z = side * -0.26;
    riderGroup.add(arm);

    const leg = new THREE.Mesh(legGeo, riderSuitMat);
    leg.position.set(side * 0.16, -0.04, 0.06);
    leg.rotation.x = 0.42;
    leg.rotation.z = side * 0.12;
    riderGroup.add(leg);
  }
  disposables.push(armGeo, legGeo);

  const applyCustomization = (liveryId: LiveryId, upgrades: UpgradeLevels) => {
    const livery = LIVERIES.find((l) => l.id === liveryId) ?? LIVERIES[0];
    primaryPaintMat.color.set(livery.primaryHex);
    secondaryDarkMat.color.set(livery.secondaryHex);
    forkGoldMat.color.set(livery.forkHex);

    // Subtle visual upgrades: higher suspension boosts fork gold saturation; higher engine darkens/blues exhaust
    forkGoldMat.metalness = 0.85 + upgrades.suspension * 0.025;
    titaniumExhaustMat.color.set(
      upgrades.engine >= 4 ? '#8A9BB8' : upgrades.engine >= 2 ? '#A6907C' : '#8D7D72'
    );
  };

  applyCustomization(initialLivery, initialUpgrades);

  return {
    root,
    chassisGroup,
    frontForkAssembly,
    frontForkLower,
    rearSwingarm,
    frontWheel,
    rearWheel,
    riderGroup,
    exhaustFlame,
    applyCustomization,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
        }
      });
    },
  };
}
