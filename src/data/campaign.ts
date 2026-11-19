import { LiveryOption, StageDefinition, UpgradeKey } from '../types/game';

export const LIVERIES: LiveryOption[] = [
  {
    id: 'burnt-canyon',
    name: 'Burnt Canyon',
    primaryHex: '#E85D04',
    secondaryHex: '#1C1613',
    forkHex: '#D97706',
    cost: 0,
  },
  {
    id: 'carbon-stealth',
    name: 'Obsidian Carbon',
    primaryHex: '#272320',
    secondaryHex: '#E85D04',
    forkHex: '#F59E0B',
    cost: 450,
  },
  {
    id: 'baja-gold',
    name: 'Baja Sun Gold',
    primaryHex: '#D97706',
    secondaryHex: '#231915',
    forkHex: '#FBBF24',
    cost: 700,
  },
  {
    id: 'alkali-white',
    name: 'Alkali Rally',
    primaryHex: '#EDE6DF',
    secondaryHex: '#C2410C',
    forkHex: '#B45309',
    cost: 900,
  },
];

export interface UpgradeMetadata {
  key: UpgradeKey;
  label: string;
  unitLabel: string;
  description: string;
  baseCost: number;
  costStep: number;
  maxLevel: number;
}

export const UPGRADE_DEFS: UpgradeMetadata[] = [
  {
    key: 'engine',
    label: '450cc Powerplant',
    unitLabel: 'Top Speed & Torque',
    description: 'High-compression piston, titanium header, and remapped ECU for steep canyon climbs.',
    baseCost: 300,
    costStep: 250,
    maxLevel: 5,
  },
  {
    key: 'suspension',
    label: 'Long-Travel USD Forks',
    unitLabel: 'Jump Pop & Landing',
    description: 'Progressive damping absorbs heavy mesa drops and increases kicker launch pop.',
    baseCost: 280,
    costStep: 240,
    maxLevel: 5,
  },
  {
    key: 'tires',
    label: 'Deep-Paddle Knobbies',
    unitLabel: 'Berm Grip & Cornering',
    description: 'Reinforced desert compound carves loose sandstone sweepers with sharper lean authority.',
    baseCost: 250,
    costStep: 220,
    maxLevel: 5,
  },
  {
    key: 'nitro',
    label: 'Nitrous Canister',
    unitLabel: 'Boost Reserve & Regen',
    description: 'Expands surge duration and accelerates recharge across clean landings.',
    baseCost: 320,
    costStep: 260,
    maxLevel: 5,
  },
];

export const CAMPAIGN_STAGES: StageDefinition[] = [
  {
    id: 'redrock-wash',
    index: 0,
    name: 'Redrock Wash',
    subtitle: 'Wide canyon floor · Rolling tabletops',
    difficulty: 'Trail',
    distanceMeters: 1180,
    elevationDropMeters: 42,
    goldTimeSec: 46,
    silverTimeSec: 56,
    stuntPar: 1800,
    baseReward: 420,
    imageUrl: '/src/assets/images/stage_redrock_wash_1795086598938.jpg',
    skyTopHex: '#1C1318',
    skyHorizonHex: '#EA6A20',
    fogHex: '#C95A24',
    fogDensity: 0.0024,
    canyonWallColor: '#8B3A1E',
    trailDirtColor: '#A85732',
    trackWidth: 16,
    waypoints: [
      [0, 0, 0],
      [0, 0.5, -90],
      [18, 2.2, -190],
      [42, 1.0, -295],
      [25, 4.5, -405],
      [-18, 3.0, -515],
      [-55, 6.2, -625],
      [-32, 4.0, -740],
      [14, 7.5, -855],
      [46, 3.5, -970],
      [20, 1.5, -1080],
      [0, 0.2, -1180],
    ],
    ramps: [
      { progress: 0.14, width: 10, length: 14, height: 3.4, hasBoostPad: true, label: 'Wash Tabletop' },
      { progress: 0.34, width: 10, length: 15, height: 4.1, hasBoostPad: false, label: 'Sandstone Step-Up' },
      { progress: 0.56, width: 11, length: 16, height: 4.6, hasBoostPad: true, label: 'Sunburst Kicker' },
      { progress: 0.78, width: 10, length: 15, height: 4.2, hasBoostPad: true, label: 'Canyon Bowl Launch' },
    ],
    description:
      'Sun-baked sandstone wash with sweeping berms and four wooden tabletop kickers built for high-speed flow.',
  },
  {
    id: 'rattlesnake-ridge',
    index: 1,
    name: 'Rattlesnake Ridge',
    subtitle: 'Switchback berms · Chasm gap jumps',
    difficulty: 'Technical',
    distanceMeters: 1420,
    elevationDropMeters: 86,
    goldTimeSec: 54,
    silverTimeSec: 65,
    stuntPar: 2800,
    baseReward: 650,
    imageUrl: '/src/assets/images/stage_rattlesnake_ridge_1795086599352.jpg',
    skyTopHex: '#17101C',
    skyHorizonHex: '#D9531E',
    fogHex: '#A8421E',
    fogDensity: 0.0026,
    canyonWallColor: '#752D18',
    trailDirtColor: '#8F4628',
    trackWidth: 14.5,
    waypoints: [
      [0, 14, 0],
      [12, 16, -95],
      [56, 12, -200],
      [82, 18, -310],
      [30, 15, -430],
      [-45, 22, -545],
      [-86, 14, -670],
      [-42, 9, -795],
      [24, 15, -920],
      [68, 8, -1050],
      [26, 4, -1190],
      [0, 1.5, -1330],
    ],
    ramps: [
      { progress: 0.16, width: 9.5, length: 14, height: 4.3, hasBoostPad: true, label: 'Rattler Crest' },
      { progress: 0.36, width: 9.5, length: 15, height: 4.9, hasBoostPad: true, label: 'Switchback Leap' },
      { progress: 0.58, width: 10, length: 16, height: 5.4, hasBoostPad: false, label: 'Chasm Kicker' },
      { progress: 0.74, width: 9.5, length: 14, height: 4.6, hasBoostPad: true, label: 'Dusk Rhythm Jump' },
      { progress: 0.88, width: 10, length: 15, height: 4.8, hasBoostPad: true, label: 'Finish Gorge Drop' },
    ],
    description:
      'Sharp elevation swings along high redrock ridges where aggressive berm leaning keeps momentum alive across deep gaps.',
  },
  {
    id: 'diablo-mesa',
    index: 2,
    name: 'Diablo Mesa Summit',
    subtitle: 'High-altitude spine · Mega canyon leaps',
    difficulty: 'Pro Canyon',
    distanceMeters: 1680,
    elevationDropMeters: 124,
    goldTimeSec: 62,
    silverTimeSec: 74,
    stuntPar: 4200,
    baseReward: 950,
    imageUrl: '/src/assets/images/stage_diablo_mesa_1795086598972.jpg',
    skyTopHex: '#130D16',
    skyHorizonHex: '#F06A1A',
    fogHex: '#B84A1A',
    fogDensity: 0.0022,
    canyonWallColor: '#692616',
    trailDirtColor: '#823D22',
    trackWidth: 13.5,
    waypoints: [
      [0, 26, 0],
      [-24, 30, -110],
      [-74, 24, -230],
      [-55, 32, -365],
      [18, 28, -495],
      [88, 34, -630],
      [92, 22, -775],
      [28, 25, -920],
      [-48, 18, -1065],
      [-76, 12, -1210],
      [-22, 8, -1370],
      [0, 2, -1540],
    ],
    ramps: [
      { progress: 0.13, width: 9, length: 15, height: 4.9, hasBoostPad: true, label: 'Mesa Gate Launch' },
      { progress: 0.30, width: 9.5, length: 16, height: 5.5, hasBoostPad: true, label: 'Apex Step-Up' },
      { progress: 0.49, width: 9.5, length: 17, height: 6.1, hasBoostPad: true, label: 'Diablo Sky Kicker' },
      { progress: 0.67, width: 9, length: 15, height: 5.2, hasBoostPad: false, label: 'Spine Transfer' },
      { progress: 0.83, width: 10, length: 17, height: 5.9, hasBoostPad: true, label: 'Golden Hour Mega' },
    ],
    description:
      'High-exposure mesa spine featuring towering earthen kickers, narrow switchbacks, and massive airtime opportunities.',
  },
];

export const HERO_FALLBACK_IMAGE = '/src/assets/images/hero_canyon_moto_1795086599745.jpg';

export function getUpgradeCost(key: UpgradeKey, currentLevel: number): number {
  const def = UPGRADE_DEFS.find((u) => u.key === key);
  if (!def || currentLevel >= def.maxLevel) return 0;
  return def.baseCost + (currentLevel - 1) * def.costStep;
}
