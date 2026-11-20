export enum OperativeId {
  GHOST = 'ghost',
  VEX = 'vex',
  BASTION = 'bastion',
  NOVA = 'nova',
  RAVEN = 'raven',
}

export type OperativeClass = 'Skill' | 'Tank' | 'Technical';

export enum GameMode {
  CAMPAIGN = 'campaign',
  CHALLENGE = 'challenge',
  BOSS_RUSH = 'boss_rush',
  ENDLESS = 'endless',
  TIME_TRIAL = 'time_trial',
  GHOST_PROTOCOL = 'ghost_protocol',
  NEW_GAME_PLUS = 'new_game_plus',
}

export enum AwarenessState {
  UNAWARE = 'UNAWARE',
  CURIOUS = 'CURIOUS',
  SUSPICIOUS = 'SUSPICIOUS',
  INVESTIGATING = 'INVESTIGATING',
  ALERTED = 'ALERTED',
  DISABLED = 'DISABLED',
  RECOVERING = 'RECOVERING',
}

export enum EnemyAIState {
  PATROL = 'PATROL',
  OBSERVE = 'OBSERVE',
  INVESTIGATE = 'INVESTIGATE',
  SEARCH = 'SEARCH',
  ALERT = 'ALERT',
  RETURN = 'RETURN',
  STUNNED = 'STUNNED',
  RECOVERING = 'RECOVERING',
}

export enum EnemyArchetype {
  STANDARD_GUARD = 'standard_guard',
  CAUTIOUS_GUARD = 'cautious_guard',
  TECHNICIAN = 'technician',
  ELITE_AGENT = 'elite_agent',
  TRACKER = 'tracker',
}

export enum EquipmentId {
  RECON_SCANNER = 'recon_scanner',
  ACCESS_DEVICE = 'access_device',
  SIGNAL_JAMMER = 'signal_jammer',
  ACOUSTIC_DECOY = 'acoustic_decoy',
  PULSE_TOOL = 'pulse_tool',
  SHADOW_CLOAK = 'shadow_cloak',
  PULSE_TAGGER = 'pulse_tagger',
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  DARK_CORNER = 2,
  VENT_FLOOR = 3,
  HAZARD_LASER = 4,
  GLASS_PARTITION = 5,
  RAIL_TRACK = 6,
  LOW_COVER = 7,
}

export type EnemyTrapType = 'shock_mine' | 'tripwire' | 'proximity_alarm';

export enum InteractiveType {
  DOOR = 'door',
  LOCKED_DOOR = 'locked_door',
  TERMINAL = 'terminal',
  LOCKER = 'locker',
  VENT_ENTRANCE = 'vent_entrance',
  INTEL_DOSSIER = 'intel_dossier',
  COLLECTIBLE = 'collectible',
  EQUIPMENT_PICKUP = 'equipment_pickup',
  KEYCARD = 'keycard',
  SWITCH = 'switch',
  DISGUISE_STATION = 'disguise_station',
  EXIT = 'exit',
}

export interface OperativeReferenceSheet {
  frontAppearance: string;
  sideAppearance: string;
  backAppearance: string;
  hairstyle: string;
  clothingDetails: string;
  palette: string[];
  proportions: string;
  animationNotes: string;
}

export interface OperativeDefinition {
  id: OperativeId;
  codename: string;
  classType: OperativeClass;
  title: string;
  portraitUrl: string;
  accentColor: string;
  personality: string;
  roleSummary: string;
  passiveAbility: string;
  maxHp: number;
  stats: {
    speed: number; // 1-10
    stealth: number; // 1-10
    hacking: number; // 1-10
    evasion: number; // 1-10
  };
  modifiers: {
    moveSpeedMultiplier: number;
    sprintSpeedMultiplier: number;
    staminaDrainMultiplier: number;
    noiseMultiplier: number;
    visibilityMultiplier: number;
    hackSpeedMultiplier: number;
    dodgeCooldownMultiplier: number;
    damageTakenMultiplier: number;
    accelerationMultiplier: number;
    parkourBoostMultiplier: number;
    bonusGadgetCharges: number;
  };
  referenceSheet: OperativeReferenceSheet;
}

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  shortName: string;
  description: string;
  tacticalUse: string;
  unlockLevel: number;
  cooldownSec: number;
  maxCharges: number; // -1 for unlimited
  accentHex: string;
}

export type LevelLayoutStyle =
  | 'three_wing'
  | 'labyrinth'
  | 'atrium_rings'
  | 'zigzag_gauntlet'
  | 'compound_rooms';

export interface EnemyArchetypeConfig {
  id: EnemyArchetype;
  name: string;
  description: string;
  uniformPrimary: string;
  uniformSecondary: string;
  visorColor: string;
  skinTone: string;
  hairColor: string;
  weaponName: string;
  muzzleColor: string;
  fireRangePx: number;
  fireIntervalMs: number;
  bulletSpeedPx: number;
  bulletDamage: number;
  patrolSpeed: number;
  alertSpeed: number;
  fovAngleDeg: number;
  fovRangePx: number;
  suspicionGainRate: number; // per second
  radioRangePx: number;
  investigatesHiding: boolean;
  resetsTerminals: boolean;
}

export interface BossPhaseSpec {
  phase: 1 | 2 | 3;
  title: string;
  description: string;
  speedMultiplier: number;
  attackIntervalMs: number;
  hazardCount: number;
  shielded: boolean;
}

export interface BossDefinition {
  id: string;
  name: string;
  title: string;
  chapter: number; // 1-10, or 0 for secret bosses
  levelNumber: number; // 10, 20, ..., 100 or secret
  isSecret: boolean;
  unlockHint?: string;
  recurringAppearances?: number[];
  firstAppearanceText: string;
  accentColor: string;
  primaryColor: string;
  maxResolve: number;
  personality: string;
  lore: string;
  introLine: string;
  phaseTwoLine: string;
  phaseThreeLine: string;
  defeatLine: string;
  phases: [BossPhaseSpec, BossPhaseSpec, BossPhaseSpec];
}

export interface ChapterPalette {
  floorHex: string;
  floorAltHex: string;
  wallHex: string;
  wallTrimHex: string;
  darkZoneHex: string;
  accentHex: string;
  ambientLightHex: string;
}

export interface ChapterDefinition {
  id: number;
  title: string;
  location: string;
  levelRange: [number, number];
  mechanicsSummary: string;
  storySummary: string;
  bossId: string;
  ambientTrack: 'facility' | 'tower' | 'subway' | 'bunker' | 'estate' | 'rooftop' | 'network' | 'ruins' | 'headquarters' | 'citadel';
  palette: ChapterPalette;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface EnemyPlacement {
  id: string;
  archetype: EnemyArchetype;
  spawn: GridPoint;
  patrolPath: GridPoint[];
  initialFacingDeg: number;
}

export interface CameraPlacement {
  id: string;
  position: GridPoint;
  baseAngleDeg: number;
  sweepDeg: number;
  sweepSpeed: number;
  rangePx: number;
  linkedTerminalId?: string;
}

export interface LaserPlacement {
  id: string;
  start: GridPoint;
  end: GridPoint;
  cycleOnMs: number;
  cycleOffMs: number;
  linkedTerminalId?: string;
}

export interface MovingHazardPlacement {
  id: string;
  axis: 'horizontal' | 'vertical';
  start: GridPoint;
  end: GridPoint;
  speedPx: number;
  widthTiles: number;
  heightTiles: number;
  label: string;
}

export interface InteractivePlacement {
  id: string;
  type: InteractiveType;
  position: GridPoint;
  label: string;
  targetId?: string;
  equipmentId?: EquipmentId;
  requiredKeyId?: string;
  secret?: boolean;
}

export interface LevelObjective {
  id: string;
  description: string;
  type: 'intel' | 'terminal' | 'keycard' | 'boss' | 'escape' | 'extract';
  targetCount: number;
  optional?: boolean;
}

export interface LevelDefinition {
  id: number; // 1..100 (or 101+ for secret/special)
  code: string;
  name: string;
  chapter: number;
  layoutStyle: LevelLayoutStyle;
  isBossLevel: boolean;
  isEscapeLevel: boolean;
  escapeTimerSec?: number;
  bossId?: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: TileType[][];
  spawn: GridPoint;
  exit: GridPoint;
  enemies: EnemyPlacement[];
  cameras: CameraPlacement[];
  lasers: LaserPlacement[];
  movingHazards: MovingHazardPlacement[];
  interactives: InteractivePlacement[];
  objectives: LevelObjective[];
  routeHints: string[];
  briefingNote: string;
}

export interface DialogueChoice {
  label: string;
  consequenceKey: string;
  nextLineIndex?: number;
  trustDelta?: number;
}

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  portraitUrl?: string;
  accentColor: string;
  text: string;
  choices?: DialogueChoice[];
}

export interface DialogueSequence {
  id: string;
  triggerLevel: number;
  timing: 'pre' | 'post';
  title: string;
  lines: DialogueLine[];
}

export interface LevelCompletionRecord {
  levelId: number;
  completed: boolean;
  bestTimeSec: number;
  ghostProtocolCleared: boolean;
  optionalCompleted: boolean;
  collectiblesFound: number;
  rank: 'S' | 'A' | 'B' | 'C';
}

export interface BossArchiveRecord {
  bossId: string;
  encountered: boolean;
  defeated: boolean;
  bestTimeSec: number | null;
  encountersCount: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  showTouchControls: 'auto' | 'always' | 'off';
  reducedMotion: boolean;
  showRouteHints: boolean;
}

export interface MissionLogEntry {
  id: string;
  levelId: number;
  levelCode: string;
  levelName: string;
  chapter: number;
  chapterTitle: string;
  operativeId: OperativeId;
  mode: GameMode;
  rank: 'S' | 'A' | 'B' | 'C';
  timeSec: number;
  alarmsTriggered: number;
  optionalCompleted: boolean;
  narrative: string;
  recordedAtIso: string;
}

export type JacketStyle =
  | 'tactical_jacket'
  | 'hooded_cloak'
  | 'armor_vest'
  | 'casual_coat'
  | 'stealth_suit';

export type GloveStyle = 'fingerless' | 'armored' | 'insulated' | 'neon_grip';
export type FootwearStyle = 'combat_boots' | 'silent_runners' | 'mag_greaves';
export type HairStyle = 'layered' | 'undercut' | 'ponytail' | 'cropped' | 'swept';
export type AccessoryStyle = 'none' | 'visor' | 'headset' | 'scarf' | 'holo_wrist' | 'half_mask';
export type VisualFxTrail =
  | 'class_default'
  | 'cyan_ghost'
  | 'amber_ember'
  | 'violet_static'
  | 'emerald_flux';

export interface OperativeAppearance {
  jacketStyle: JacketStyle;
  hooded: boolean;
  gloveStyle: GloveStyle;
  footwearStyle: FootwearStyle;
  hairStyle: HairStyle;
  accessory: AccessoryStyle;
  jacketColor: string;
  trimColor: string;
  trouserColor: string;
  hairColor: string;
  vfxTrail: VisualFxTrail;
}

export interface UpgradeLevels {
  pulseEnergyLevel: number; // 0..3
  gadgetBeltLevel: number; // 0..3
  scannerLevel: number; // 0..3
  staminaCoreLevel: number; // 0..3
  extraSlotLevel: number; // 0..2
}

export type ShopCategory = 'gadgets' | 'upgrades' | 'scanner' | 'slots' | 'outfits' | 'cosmetics';

export interface ShopItemDefinition {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  maxTier: number;
  description: string;
  effectSummary: string;
  accentHex: string;
  equipmentId?: EquipmentId;
  upgradeKey?: keyof UpgradeLevels;
  outfitPreset?: Partial<OperativeAppearance>;
  vfxTrail?: VisualFxTrail;
}

export interface CreditBreakdown {
  missionClear: number;
  difficultyBonus: number;
  rankBonus: number;
  intelBonus: number;
  hiddenRoomsBonus: number;
  optionalBonus: number;
  ghostBonus: number;
  total: number;
}

export interface SaveData {
  version: number;
  selectedOperative: OperativeId;
  unlockedLevel: number; // 1..100
  newGamePlusUnlocked: boolean;
  newGamePlusActive: boolean;
  unlockedEquipment: EquipmentId[];
  levelRecords: Record<number, LevelCompletionRecord>;
  bossRecords: Record<string, BossArchiveRecord>;
  unlockedSecretBosses: string[];
  storyDecisions: Record<string, string>;
  missionLogs: MissionLogEntry[];
  trustScore: number;
  totalAlarmsTriggered: number;
  totalPlayTimeSec: number;
  shadowCredits: number;
  purchasedShopItems: string[];
  upgradeLevels: UpgradeLevels;
  appearance: OperativeAppearance;
  unlockedOutfits: string[];
  settings: GameSettings;
}

export interface HudSnapshot {
  levelId: number;
  levelName: string;
  chapterTitle: string;
  mode: GameMode;
  operativeId: OperativeId;
  operativeClass: OperativeClass;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRecovering: boolean;
  momentumPct: number;
  parkourChain: number;
  isVaulting: boolean;
  isSliding: boolean;
  isCrouching: boolean;
  isHiding: boolean;
  isCloaked: boolean;
  isDisguised: boolean;
  awareness: AwarenessState;
  maxSuspicion: number; // 0..100
  visibilityPct: number; // 0..100
  visibilityState: 'Hidden' | 'Shadow' | 'Cover' | 'Exposed' | 'Lit';
  escapeActive: boolean;
  escapeTimeRemainingSec: number | null;
  objectives: Array<{
    id: string;
    description: string;
    current: number;
    target: number;
    completed: boolean;
    optional?: boolean;
  }>;
  equipmentSlots: Array<{
    id: EquipmentId;
    charges: number;
    maxCharges: number;
    cooldownRemaining: number;
    cooldownTotal: number;
    unlocked: boolean;
  }>;
  selectedGadget: EquipmentId;
  pulseTaggerEnergy: {
    current: number;
    max: number;
    rechargePct: number;
  };
  activeAimRangePx: number | null;
  activePrompt: string | null;
  takedownPrompt: string | null;
  activeDirective: {
    instruction: string;
    targetLabel: string;
    angleDeg: number;
    distanceMeters: number;
    urgent: boolean;
  } | null;
  objectiveMarkers: Array<{
    id: string;
    kind: 'intel' | 'terminal' | 'boss' | 'keycard' | 'extract';
    label: string;
    current: number;
    target: number;
    completed: boolean;
    optional: boolean;
    angleDeg: number;
    distanceMeters: number;
    isPrimaryTarget: boolean;
    screenEdge: boolean;
  }>;
  tacticalStatus: {
    coordinatingCount: number;
    activeTrapCount: number;
    callout: string | null;
  };
  elapsedSec: number;
  alarmsTriggered: number;
  keycardsCollected: string[];
  hiddenRoomsFound: number;
  shadowCreditsBalance: number;
  bossState: {
    active: boolean;
    bossId: string;
    name: string;
    title: string;
    resolve: number;
    maxResolve: number;
    phase: 1 | 2 | 3;
    shielded: boolean;
    bannerText: string | null;
  } | null;
  toastMessage: string | null;
}
