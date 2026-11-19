export type AppViewMode = 'site' | 'ride';

export type CameraMode = 'chase' | 'heli' | 'fpv';

export type LiveryId = 'burnt-canyon' | 'carbon-stealth' | 'baja-gold' | 'alkali-white';

export type UpgradeKey = 'engine' | 'suspension' | 'tires' | 'nitro';

export interface UpgradeLevels {
  engine: number;
  suspension: number;
  tires: number;
  nitro: number;
}

export interface LiveryOption {
  id: LiveryId;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  forkHex: string;
  cost: number;
}

export interface StageRampSpec {
  /** Normalized progress along track spline [0..1] */
  progress: number;
  /** Width of ramp */
  width: number;
  /** Length of ramp */
  length: number;
  /** Height of launch lip */
  height: number;
  /** Whether this jump features a canyon gap or boost pad */
  hasBoostPad?: boolean;
  label: string;
}

export interface StageDefinition {
  id: string;
  index: number;
  name: string;
  subtitle: string;
  difficulty: 'Trail' | 'Technical' | 'Pro Canyon';
  distanceMeters: number;
  elevationDropMeters: number;
  goldTimeSec: number;
  silverTimeSec: number;
  stuntPar: number;
  baseReward: number;
  imageUrl: string;
  skyTopHex: string;
  skyHorizonHex: string;
  fogHex: string;
  fogDensity: number;
  canyonWallColor: string;
  trailDirtColor: string;
  /** 3D control points defining the canyon trail centerline */
  waypoints: [number, number, number][];
  trackWidth: number;
  ramps: StageRampSpec[];
  description: string;
}

export interface StageRecord {
  bestTimeSec: number | null;
  bestStuntScore: number;
  topSpeedKmh: number;
  maxAirtimeSec: number;
  medal: 'Gold' | 'Silver' | 'Bronze' | null;
  completions: number;
}

export interface PlayerProgression {
  credits: number;
  unlockedStageIndex: number;
  selectedStageId: string;
  activeLivery: LiveryId;
  ownedLiveries: LiveryId[];
  upgrades: UpgradeLevels;
  records: Record<string, StageRecord>;
}

export interface TelemetryFrame {
  speedKmh: number;
  rpm: number; // 0..1
  gear: number; // 1..6
  nitro: number; // 0..1
  isAirborne: boolean;
  airtimeSec: number;
  lastAirtimeSec: number;
  suspensionLoad: number; // 0..1
  leanDeg: number;
  pitchDeg: number;
  progress: number; // 0..1
  elapsedSec: number;
  stuntScore: number;
  comboMultiplier: number;
  activeStuntLabel: string;
  topSpeedKmh: number;
  maxAirtimeSec: number;
  checkpointsPassed: number;
  totalCheckpoints: number;
  isFinished: boolean;
  isPaused: boolean;
}

export interface RideResult {
  stageId: string;
  elapsedSec: number;
  stuntScore: number;
  topSpeedKmh: number;
  maxAirtimeSec: number;
  medal: 'Gold' | 'Silver' | 'Bronze';
  creditsEarned: number;
  isNewBestTime: boolean;
  unlockedNextStage: boolean;
}

export interface RideInputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  nitro: boolean;
  jumpWhip: boolean;
  pitchBack: boolean;
  pitchForward: boolean;
}
