import Phaser from 'phaser';
import { BOSSES } from '@/src/data/bosses';
import { CHAPTERS } from '@/src/data/chapters';
import { OPERATIVES } from '@/src/data/characters';
import { EQUIPMENT_CATALOG, EQUIPMENT_ORDER } from '@/src/data/equipment';
import { LevelRegistry } from '@/src/levels/LevelRegistry';
import { AudioSystem } from '@/src/systems/AudioSystem';
import { BossEncounterController } from '@/src/systems/BossEncounter';
import { CharacterCustomization } from '@/src/systems/CharacterCustomization';
import { CombatManager, TakedownCandidate } from '@/src/systems/CombatManager';
import { EnemyAgent } from '@/src/systems/EnemyAI';
import { EquipmentInventory } from '@/src/systems/EquipmentInventory';
import { EventBus } from '@/src/systems/EventBus';
import { GadgetManager } from '@/src/systems/GadgetManager';
import { MovementManager } from '@/src/systems/MovementManager';
import { SaveSystem } from '@/src/systems/SaveSystem';
import { ensureCustomOperativeTexture, ensureGameTextures } from '@/src/systems/SpriteFactory';
import { hasLineOfSight, isInsideFovCone } from '@/src/systems/StealthSystem';
import { TacticalAISystem } from '@/src/systems/TacticalAISystem';
import {
  AwarenessState,
  EnemyAIState,
  EnemyArchetypeConfig,
  EnemyTrapType,
  EquipmentId,
  GameMode,
  HudSnapshot,
  InteractivePlacement,
  InteractiveType,
  LevelDefinition,
  OperativeId,
  TileType,
} from '@/src/types/game';

export interface SceneLaunchData {
  levelId: number;
  mode: GameMode;
  operativeId: OperativeId;
  newGamePlus: boolean;
}

interface InteractiveRuntime {
  spec: InteractivePlacement;
  gfx: Phaser.GameObjects.Container;
  completed: boolean;
  locked: boolean;
}

interface CameraRuntime {
  id: string;
  x: number;
  y: number;
  baseAngleDeg: number;
  sweepDeg: number;
  sweepSpeed: number;
  rangePx: number;
  linkedTerminalId?: string;
  disabled: boolean;
  coneGfx: Phaser.GameObjects.Graphics;
  bodyGfx: Phaser.GameObjects.Arc;
}

interface LaserRuntime {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cycleOnMs: number;
  cycleOffMs: number;
  linkedTerminalId?: string;
  disabled: boolean;
  active: boolean;
  gfx: Phaser.GameObjects.Graphics;
}

interface MovingHazardRuntime {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  speedPx: number;
  dir: 1 | -1;
  sprite: Phaser.GameObjects.Rectangle;
}

interface EnemyBulletRuntime {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
  expiresAt: number;
  gfx: Phaser.GameObjects.Arc;
  tail: Phaser.GameObjects.Line;
}

interface EnemyTrapRuntime {
  x: number;
  y: number;
  radius: number;
  type: EnemyTrapType;
  armTime: number;
  expiresAt: number;
  coreGfx: Phaser.GameObjects.Arc;
  ringGfx: Phaser.GameObjects.Arc;
  wireGfx?: Phaser.GameObjects.Graphics;
  wireLine?: { x1: number; y1: number; x2: number; y2: number };
}

export class GameplayScene extends Phaser.Scene {
  private launchData!: SceneLaunchData;
  private level!: LevelDefinition;
  private player!: Phaser.Physics.Arcade.Sprite;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lowCoverGroup!: Phaser.Physics.Arcade.StaticGroup;
  private closedDoorGroup!: Phaser.Physics.Arcade.StaticGroup;
  private closedDoorMap = new Map<string, Phaser.Physics.Arcade.Image>();
  private closedDoorCoords = new Set<string>();

  private interactives: InteractiveRuntime[] = [];
  private enemies: EnemyAgent[] = [];
  private enemyBullets: EnemyBulletRuntime[] = [];
  private enemyTraps: EnemyTrapRuntime[] = [];
  private camerasList: CameraRuntime[] = [];
  private lasersList: LaserRuntime[] = [];
  private movingHazards: MovingHazardRuntime[] = [];
  private bossController: BossEncounterController | null = null;
  private tacticalAI = new TacticalAISystem();
  private movementManager!: MovementManager;
  private combatManager = new CombatManager();
  private gadgetManager = new GadgetManager();
  private inventory!: EquipmentInventory;
  private playerAnimPrefix = 'ghost';
  private trailColorHex = '#67e8f9';

  private reconOverlayGfx!: Phaser.GameObjects.Graphics;
  private aimOverlayGfx!: Phaser.GameObjects.Graphics;
  private noiseRippleGfx!: Phaser.GameObjects.Graphics;
  private waypointGfx!: Phaser.GameObjects.Graphics;
  private tacticalLinksGfx!: Phaser.GameObjects.Graphics;
  private objectiveBeaconsGfx!: Phaser.GameObjects.Graphics;
  private escapeTintGfx!: Phaser.GameObjects.Rectangle;

  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    CTRL: Phaser.Input.Keyboard.Key;
    C: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
    FIVE: Phaser.Input.Keyboard.Key;
    SIX: Phaser.Input.Keyboard.Key;
    SEVEN: Phaser.Input.Keyboard.Key;
  };

  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private velX = 0;
  private velY = 0;
  private parkourChain = 0;
  private parkourDecayAt = 0;
  private vaultUntil = 0;
  private slideUntil = 0;
  private slideDir = { x: 1, y: 0 };
  private afterimageTimer = 0;
  private facingRad = 0;
  private pointerAimRad: number | null = null;
  private isCrouching = false;
  private isHiding = false;
  private hidingLockerPos: { x: number; y: number } | null = null;
  private isDisguised = false;
  private cloakedUntil = 0;
  private jammedUntil = 0;
  private reconUntil = 0;
  private dodgeUntil = 0;
  private dodgeCooldownUntil = 0;
  private dodgeDir = { x: 1, y: 0 };
  private invulnerableUntil = 0;
  private trapSlowUntil = 0;
  private footstepTimer = 0;
  private visibilityPct = 0;
  private visibilityState: 'Hidden' | 'Shadow' | 'Cover' | 'Exposed' | 'Lit' = 'Shadow';
  private activeTakedownCandidate: TakedownCandidate | null = null;

  private elapsedSec = 0;
  private alarmsTriggered = 0;
  private prevAlerted = false;
  private escapeActive = false;
  private escapeTimeRemainingSec = 0;
  private levelFinished = false;

  private keycardsCollected: string[] = [];
  private intelFound = 0;
  private terminalsHacked = 0;
  private optionalFound = 0;
  private hiddenRoomsFound = 0;
  private discoveredHiddenZones = new Set<string>();
  private toastMessage: string | null = null;
  private toastUntil = 0;
  private lastHudEmit = 0;

  private unsubEquip?: () => void;
  private unsubSelectEquip?: () => void;
  private unsubAction?: () => void;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  public init(data: SceneLaunchData): void {
    this.launchData = data;
    this.level = LevelRegistry.getLevel(data.levelId);
    const op = OPERATIVES[data.operativeId];
    const save = SaveSystem.getSave();

    this.movementManager = new MovementManager(op, save);
    this.inventory = new EquipmentInventory(op, save);
    this.combatManager.reset();
    this.trailColorHex = CharacterCustomization.getTrailColor(save.appearance, op.accentColor);

    this.hp = op.maxHp;
    this.maxHp = op.maxHp;
    this.stamina = this.movementManager.stamina;
    this.maxStamina = this.movementManager.maxStamina;
    this.velX = 0;
    this.velY = 0;
    this.parkourChain = 0;
    this.parkourDecayAt = 0;
    this.vaultUntil = 0;
    this.slideUntil = 0;
    this.afterimageTimer = 0;
    this.facingRad = 0;
    this.pointerAimRad = null;
    this.isCrouching = false;
    this.isHiding = false;
    this.hidingLockerPos = null;
    this.isDisguised = false;
    this.cloakedUntil = 0;
    this.jammedUntil = 0;
    this.reconUntil = 0;
    this.dodgeUntil = 0;
    this.dodgeCooldownUntil = 0;
    this.invulnerableUntil = 0;
    this.trapSlowUntil = 0;
    this.visibilityPct = 0;
    this.visibilityState = 'Shadow';
    this.activeTakedownCandidate = null;
    this.elapsedSec = 0;
    this.alarmsTriggered = 0;
    this.prevAlerted = false;
    this.escapeActive = false;
    this.escapeTimeRemainingSec = this.level.escapeTimerSec ?? 60;
    this.levelFinished = false;
    this.keycardsCollected = [];
    this.intelFound = 0;
    this.terminalsHacked = 0;
    this.optionalFound = 0;
    this.hiddenRoomsFound = 0;
    this.discoveredHiddenZones.clear();
    this.toastMessage = null;

    this.interactives = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.enemyTraps = [];
    this.camerasList = [];
    this.lasersList = [];
    this.movingHazards = [];
    this.closedDoorMap.clear();
    this.closedDoorCoords.clear();
    this.bossController = null;
    this.tacticalAI.reset();
  }

  public create(): void {
    ensureGameTextures(this);

    const ts = this.level.tileSize;
    const worldW = this.level.width * ts;
    const worldH = this.level.height * ts;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.buildEnvironment();
    this.buildInteractives();
    this.buildPlayer();
    this.buildEnemiesAndSecurity();

    this.reconOverlayGfx = this.add.graphics().setDepth(25);
    this.aimOverlayGfx = this.add.graphics().setDepth(20);
    this.noiseRippleGfx = this.add.graphics().setDepth(9);
    this.waypointGfx = this.add.graphics().setDepth(14);
    this.tacticalLinksGfx = this.add.graphics().setDepth(13);
    this.objectiveBeaconsGfx = this.add.graphics().setDepth(7);
    this.escapeTintGfx = this.add
      .rectangle(worldW / 2, worldH / 2, worldW, worldH, 0xf43f5e, 0)
      .setDepth(30)
      .setScrollFactor(0);

    // Colliders (lowCoverGroup skips collision while vaulting)
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(
      this.player,
      this.lowCoverGroup,
      () => this.onLowCoverContact(),
      () => this.time.now > this.vaultUntil
    );
    this.physics.add.collider(
      this.player,
      this.closedDoorGroup,
      (_p, doorObj) => this.onLockedDoorImpact(doorObj as Phaser.Physics.Arcade.Image)
    );
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, this.wallGroup);
      this.physics.add.collider(enemy.sprite, this.lowCoverGroup);
      this.physics.add.collider(enemy.sprite, this.closedDoorGroup);
    }
    if (this.bossController) {
      this.physics.add.collider(this.bossController.sprite, this.wallGroup);
    }

    // Camera follows operative smoothly
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setZoom(1.0);

    this.setupInputs();
    this.showToast(`${this.level.code} — ${this.level.name}`, 1800);

    AudioSystem.ensureUnlocked();
    AudioSystem.setMood(this.level.isBossLevel ? 'boss' : 'exploration');
    this.emitHud(true);
  }

  private buildEnvironment(): void {
    const ch = CHAPTERS[this.level.chapter - 1];
    const pal = ch.palette;
    const ts = this.level.tileSize;

    const floorBg = this.add.graphics().setDepth(0);
    const floorColorA = Phaser.Display.Color.HexStringToColor(pal.floorHex).color;
    const floorColorB = Phaser.Display.Color.HexStringToColor(pal.floorAltHex).color;
    const darkColor = Phaser.Display.Color.HexStringToColor(pal.darkZoneHex).color;
    const wallColor = Phaser.Display.Color.HexStringToColor(pal.wallHex).color;
    const trimColor = Phaser.Display.Color.HexStringToColor(pal.wallTrimHex).color;
    const accentColor = Phaser.Display.Color.HexStringToColor(pal.accentHex).color;

    this.wallGroup = this.physics.add.staticGroup();
    this.lowCoverGroup = this.physics.add.staticGroup();
    this.closedDoorGroup = this.physics.add.staticGroup();

    // Generate chapter-styled wall tile texture
    const wallTexKey = `wall_tex_${ch.id}`;
    if (!this.textures.exists(wallTexKey)) {
      const c = this.textures.createCanvas(wallTexKey, ts, ts);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = pal.wallHex;
        ctx.fillRect(0, 0, ts, ts);
        ctx.strokeStyle = pal.wallTrimHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, ts - 2, ts - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(4, 4, ts - 8, ts - 8);

        if (ch.id === 8) {
          // Stone ruins masonry blocks
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, ts / 2);
          ctx.lineTo(ts, ts / 2);
          ctx.moveTo(ts / 2, 0);
          ctx.lineTo(ts / 2, ts / 2);
          ctx.moveTo(ts / 4, ts / 2);
          ctx.lineTo(ts / 4, ts);
          ctx.stroke();
        } else if (ch.id === 3 || ch.id === 6) {
          // Industrial riveted caution trim
          ctx.fillStyle = pal.accentHex;
          ctx.fillRect(4, 4, 3, 3);
          ctx.fillRect(ts - 7, 4, 3, 3);
          ctx.fillRect(4, ts - 7, 3, 3);
          ctx.fillRect(ts - 7, ts - 7, 3, 3);
        } else if (ch.id === 4 || ch.id === 10) {
          // Armored bunker diagonal ribs
          ctx.strokeStyle = pal.accentHex;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(6, ts - 6);
          ctx.lineTo(ts - 6, 6);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        c.refresh();
      }
    }

    const lowCoverTexKey = `low_cover_tex_${ch.id}`;
    if (!this.textures.exists(lowCoverTexKey)) {
      const c = this.textures.createCanvas(lowCoverTexKey, ts, ts);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, 10, ts - 8, ts - 20);
        ctx.strokeStyle = pal.accentHex;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(4, 10, ts - 8, ts - 20);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(8, 13, ts - 16, 4);
        c.refresh();
      }
    }

    const glassTexKey = `glass_tex_${ch.id}`;
    if (!this.textures.exists(glassTexKey)) {
      const c = this.textures.createCanvas(glassTexKey, ts, ts);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fillRect(0, 0, ts, ts);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, 12, ts - 4, 16);
        ctx.beginPath();
        ctx.moveTo(8, 25);
        ctx.lineTo(16, 15);
        ctx.stroke();
        c.refresh();
      }
    }

    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        const tile = this.level.tiles[y][x];
        const px = x * ts;
        const py = y * ts;

        const checker = (x + y) % 2 === 0;
        floorBg.fillStyle(checker ? floorColorA : floorColorB, 1);
        floorBg.fillRect(px, py, ts, ts);
        floorBg.lineStyle(1, wallColor, 0.22);
        floorBg.strokeRect(px, py, ts, ts);

        // Chapter-distinct floor texture overlays
        if (ch.id === 5 && checker) {
          // Luxury diamond marble inlay
          floorBg.lineStyle(1, accentColor, 0.14);
          floorBg.strokeRect(px + 8, py + 8, ts - 16, ts - 16);
        } else if ((ch.id === 7 || ch.id === 9) && (x + y * 3) % 5 === 0) {
          // Intelligence hub circuit trace
          floorBg.lineStyle(1, accentColor, 0.16);
          floorBg.lineBetween(px + 4, py + ts / 2, px + ts - 4, py + ts / 2);
        } else if (ch.id === 1 && (x % 4 === 0 && y % 4 === 0)) {
          // Research lab blueprint nodes
          floorBg.fillStyle(accentColor, 0.12);
          floorBg.fillCircle(px + ts / 2, py + ts / 2, 3);
        }

        if (tile === TileType.DARK_CORNER) {
          floorBg.fillStyle(darkColor, 0.85);
          floorBg.fillRect(px, py, ts, ts);
          floorBg.lineStyle(1, accentColor, 0.18);
          floorBg.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
        } else if (tile === TileType.VENT_FLOOR) {
          floorBg.fillStyle(0x0b1220, 0.9);
          floorBg.fillRect(px, py, ts, ts);
          floorBg.lineStyle(1, 0x475569, 0.45);
          for (let g = 6; g < ts; g += 8) {
            floorBg.lineBetween(px + 4, py + g, px + ts - 4, py + g);
          }
        } else if (tile === TileType.RAIL_TRACK) {
          floorBg.fillStyle(0x09090b, 0.75);
          floorBg.fillRect(px, py, ts, ts);
          floorBg.lineStyle(2, 0x71717a, 0.7);
          floorBg.lineBetween(px, py + 10, px + ts, py + 10);
          floorBg.lineBetween(px, py + ts - 10, px + ts, py + ts - 10);
        } else if (tile === TileType.LOW_COVER) {
          const barrier = this.lowCoverGroup.create(px + ts / 2, py + ts / 2, lowCoverTexKey) as Phaser.Physics.Arcade.Image;
          barrier.setDepth(5);
          barrier.refreshBody();
        } else if (tile === TileType.WALL) {
          const wall = this.wallGroup.create(px + ts / 2, py + ts / 2, wallTexKey) as Phaser.Physics.Arcade.Image;
          wall.setDepth(3);
          wall.refreshBody();
        } else if (tile === TileType.GLASS_PARTITION) {
          const glass = this.wallGroup.create(px + ts / 2, py + ts / 2, glassTexKey) as Phaser.Physics.Arcade.Image;
          glass.setDepth(3);
          glass.refreshBody();
        }
      }
    }

    // Subtle chapter accent corner markers
    floorBg.lineStyle(1.5, trimColor, 0.25);
    floorBg.strokeRect(ts, ts, (this.level.width - 2) * ts, (this.level.height - 2) * ts);
  }

  private buildInteractives(): void {
    const ts = this.level.tileSize;

    // Door texture
    if (!this.textures.exists('door_locked_tex')) {
      const c = this.textures.createCanvas('door_locked_tex', ts, ts);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = '#3f1d2b';
        ctx.fillRect(2, 2, ts - 4, ts - 4);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, ts - 6, ts - 6);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(ts / 2 - 4, ts / 2 - 4, 8, 8);
        c.refresh();
      }
    }

    for (const item of this.level.interactives) {
      const wx = item.position.x * ts + ts / 2;
      const wy = item.position.y * ts + ts / 2;
      const container = this.add.container(wx, wy).setDepth(6);

      if (item.type === InteractiveType.LOCKED_DOOR) {
        const doorImg = this.closedDoorGroup.create(wx, wy, 'door_locked_tex') as Phaser.Physics.Arcade.Image;
        doorImg.setDepth(6);
        doorImg.refreshBody();
        this.closedDoorMap.set(item.id, doorImg);
        this.closedDoorCoords.add(`${item.position.x},${item.position.y}`);
      } else if (item.type === InteractiveType.EXIT) {
        const outer = this.add.circle(0, 0, 17, 0x10b981, 0.18).setStrokeStyle(2, 0x34d399, 0.9);
        const inner = this.add.circle(0, 0, 8, 0x34d399, 0.5);
        container.add([outer, inner]);
      } else if (item.type === InteractiveType.TERMINAL) {
        const desk = this.add.rectangle(0, 0, 26, 20, 0x0f172a).setStrokeStyle(1.8, 0x38bdf8);
        const screen = this.add.rectangle(0, -2, 16, 8, 0x38bdf8, 0.85);
        container.add([desk, screen]);
      } else if (item.type === InteractiveType.INTEL_DOSSIER) {
        const folder = this.add.rectangle(0, 0, 18, 22, 0xfef3c7).setStrokeStyle(1.5, 0xf59e0b);
        const stripe = this.add.rectangle(0, -4, 12, 3, 0xd97706);
        container.add([folder, stripe]);
      } else if (item.type === InteractiveType.COLLECTIBLE) {
        const gem = this.add.polygon(0, 0, [0, -10, 10, 0, 0, 10, -10, 0], 0xc084fc, 0.9).setStrokeStyle(1.5, 0xffffff);
        container.add([gem]);
      } else if (item.type === InteractiveType.KEYCARD) {
        const card = this.add.rectangle(0, 0, 20, 13, 0xfbbf24).setStrokeStyle(1.5, 0x78350f);
        const chip = this.add.rectangle(-4, 0, 5, 5, 0xfef08a);
        container.add([card, chip]);
      } else if (item.type === InteractiveType.LOCKER) {
        const box = this.add.rectangle(0, 0, 26, 28, 0x1e293b).setStrokeStyle(1.5, 0x64748b);
        const slit = this.add.rectangle(0, -6, 16, 3, 0x090d16);
        container.add([box, slit]);
      } else if (item.type === InteractiveType.VENT_ENTRANCE) {
        const vent = this.add.rectangle(0, 0, 28, 28, 0x0b1220).setStrokeStyle(1.5, 0x94a3b8);
        const bar1 = this.add.rectangle(0, -5, 18, 2, 0x64748b);
        const bar2 = this.add.rectangle(0, 0, 18, 2, 0x64748b);
        const bar3 = this.add.rectangle(0, 5, 18, 2, 0x64748b);
        container.add([vent, bar1, bar2, bar3]);
      } else if (item.type === InteractiveType.EQUIPMENT_PICKUP) {
        const crate = this.add.rectangle(0, 0, 22, 22, 0x1e293b).setStrokeStyle(2, 0x67e8f9);
        const core = this.add.circle(0, 0, 5, 0x67e8f9);
        container.add([crate, core]);
      } else if (item.type === InteractiveType.DISGUISE_STATION) {
        const rack = this.add.rectangle(0, 0, 26, 24, 0x312e81).setStrokeStyle(1.5, 0xeab308);
        const badge = this.add.circle(0, 0, 5, 0xeab308);
        container.add([rack, badge]);
      }

      this.interactives.push({
        spec: item,
        gfx: container,
        completed: false,
        locked: item.type === InteractiveType.LOCKED_DOOR,
      });
    }
  }

  private buildPlayer(): void {
    const ts = this.level.tileSize;
    const sx = this.level.spawn.x * ts + ts / 2;
    const sy = this.level.spawn.y * ts + ts / 2;
    const op = this.launchData.operativeId;
    const customTex = ensureCustomOperativeTexture(this, op, SaveSystem.getSave().appearance);
    this.playerAnimPrefix = customTex.animPrefix;

    this.player = this.physics.add.sprite(sx, sy, customTex.ssKey, 0);
    this.player.setDepth(12);
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    body.setOffset(14, 20);
    this.player.play(`${this.playerAnimPrefix}_idle`);
  }

  private buildEnemiesAndSecurity(): void {
    const ts = this.level.tileSize;

    for (const ep of this.level.enemies) {
      this.enemies.push(new EnemyAgent(this, ep, ts));
    }

    for (const cam of this.level.cameras) {
      const cx = cam.position.x * ts + ts / 2;
      const cy = cam.position.y * ts + ts / 2;
      const coneGfx = this.add.graphics().setDepth(4);
      const bodyGfx = this.add.circle(cx, cy, 7, 0x0f172a).setStrokeStyle(2, 0xf43f5e).setDepth(14);
      this.camerasList.push({
        id: cam.id,
        x: cx,
        y: cy,
        baseAngleDeg: cam.baseAngleDeg,
        sweepDeg: cam.sweepDeg,
        sweepSpeed: cam.sweepSpeed,
        rangePx: cam.rangePx,
        linkedTerminalId: cam.linkedTerminalId,
        disabled: false,
        coneGfx,
        bodyGfx,
      });
    }

    for (const las of this.level.lasers) {
      const gfx = this.add.graphics().setDepth(7);
      this.lasersList.push({
        id: las.id,
        x1: las.start.x * ts + ts / 2,
        y1: las.start.y * ts + ts / 2,
        x2: las.end.x * ts + ts / 2,
        y2: las.end.y * ts + ts / 2,
        cycleOnMs: las.cycleOnMs,
        cycleOffMs: las.cycleOffMs,
        linkedTerminalId: las.linkedTerminalId,
        disabled: false,
        active: true,
        gfx,
      });
    }

    for (const mh of this.level.movingHazards) {
      const sx = mh.start.x * ts + ts / 2;
      const sy = mh.start.y * ts + ts / 2;
      const rect = this.add
        .rectangle(sx, sy, mh.widthTiles * ts - 8, mh.heightTiles * ts - 10, 0x334155)
        .setStrokeStyle(2, 0xf59e0b)
        .setDepth(9);
      this.movingHazards.push({
        x1: sx,
        y1: sy,
        x2: mh.end.x * ts + ts / 2,
        y2: mh.end.y * ts + ts / 2,
        speedPx: mh.speedPx,
        dir: 1,
        sprite: rect,
      });
    }

    if (this.level.isBossLevel && this.level.bossId) {
      const difficultyScale = this.launchData.newGamePlus ? 1.25 : 1.0;
      const bx = (this.level.width - 7) * ts;
      const by = Math.floor(this.level.height / 2) * ts;
      this.bossController = new BossEncounterController(this, this.level.bossId, bx, by, difficultyScale);
      const boss = BOSSES[this.level.bossId];
      this.showToast(`Boss Encounter: ${boss.name}`, 3200);
    }
  }

  private setupInputs(): void {
    const kb = this.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      SHIFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      CTRL: kb.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
      C: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      F: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      Q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ESC: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      ONE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      TWO: kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      FOUR: kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      FIVE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      SIX: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      SEVEN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
    };

    this.keys.E.on('down', () => this.tryInteract());
    this.keys.SPACE.on('down', () => this.tryParkourOrDodge());
    this.keys.C.on('down', () => this.toggleCrouchOrSlide());
    this.keys.F.on('down', () => this.useSelectedGadget());
    this.keys.Q.on('down', () => {
      const save = SaveSystem.getSave();
      const next = this.inventory.cycleSelectedGadget(
        save,
        this.level.isBossLevel,
        this.launchData.mode
      );
      this.showToast(`Selected: ${EQUIPMENT_CATALOG[next].name}`, 1100);
    });
    this.keys.ESC.on('down', () => EventBus.emitPauseRequest());

    this.keys.ONE.on('down', () => this.useEquipment(EQUIPMENT_ORDER[0]));
    this.keys.TWO.on('down', () => this.useEquipment(EQUIPMENT_ORDER[1]));
    this.keys.THREE.on('down', () => this.useEquipment(EQUIPMENT_ORDER[2]));
    this.keys.FOUR.on('down', () => this.useEquipment(EQUIPMENT_ORDER[3]));
    this.keys.FIVE.on('down', () => this.useEquipment(EQUIPMENT_ORDER[4]));
    this.keys.SIX.on('down', () => this.useEquipment(EQUIPMENT_ORDER[5]));
    this.keys.SEVEN.on('down', () => this.useEquipment(EQUIPMENT_ORDER[6]));

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.player) return;
      this.pointerAimRad = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.levelFinished || this.isHiding) return;
      if (ptr.leftButtonDown()) {
        this.pointerAimRad = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
        this.useSelectedGadget();
      }
    });

    this.unsubEquip = EventBus.onEquipTrigger((eqId) => this.useEquipment(eqId));
    this.unsubSelectEquip = EventBus.onSelectEquip((eqId) => {
      this.inventory.selectGadget(eqId);
      this.showToast(`Selected: ${EQUIPMENT_CATALOG[eqId].name}`, 1000);
    });
    this.unsubAction = EventBus.onActionTrigger((act) => {
      if (act === 'interact') this.tryInteract();
      if (act === 'dodge') this.tryParkourOrDodge();
      if (act === 'crouch') this.toggleCrouchOrSlide();
      if (act === 'use_gadget') this.useSelectedGadget();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubEquip?.();
      this.unsubSelectEquip?.();
      this.unsubAction?.();
    });
  }

  public update(time: number, deltaMs: number): void {
    if (this.levelFinished) return;

    const dtSec = Math.min(0.05, deltaMs / 1000);
    this.elapsedSec += dtSec;
    this.inventory.update(dtSec);

    if (this.toastMessage && time > this.toastUntil) {
      this.toastMessage = null;
    }

    this.updatePlayerMovement(time, dtSec);
    this.checkHiddenRoomDiscovery();
    this.updateTakedownScan(time);
    this.updateSecurityAndHazards(time, dtSec);
    this.updateEnemiesAndBoss(time, dtSec);
    this.updateEnemyBullets(time, dtSec);
    this.updateEnemyTraps(time);
    this.updateAimOverlay(time);
    this.updateWaypointGuide(time);
    this.updateReconOverlay(time);
    this.updateEscapeSequence(time, dtSec);
    this.checkAutoExtraction();

    if (time - this.lastHudEmit > 90) {
      this.lastHudEmit = time;
      this.emitHud(false);
    }
  }

  private updatePlayerMovement(now: number, dtSec: number): void {
    const op = OPERATIVES[this.launchData.operativeId];
    const virtual = EventBus.getVirtualInput();

    if (this.parkourChain > 0 && now > this.parkourDecayAt) {
      this.parkourChain = 0;
    }

    let mx = virtual.moveX;
    let my = virtual.moveY;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) mx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) mx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) my -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) my += 1;

    // Normalize diagonal vector to prevent diagonal speed advantage
    const norm = this.movementManager.normalizeDirection(mx, my);
    mx = norm.nx;
    my = norm.ny;
    const len = norm.magnitude;

    // If hiding inside locker, movement exits locker cleanly
    if (this.isHiding) {
      this.velX = 0;
      this.velY = 0;
      this.movementManager.velX = 0;
      this.movementManager.velY = 0;
      this.player.setVelocity(0, 0);
      this.player.setAlpha(0.2);
      if (len > 0.35) {
        this.isHiding = false;
        this.player.setAlpha(1);
      }
      return;
    }

    const isVaulting = now < this.vaultUntil;
    const isSliding = now < this.slideUntil;
    const isDodging = now < this.dodgeUntil;
    const inTakedownPose = now < this.combatManager.activeTakedownUntil;

    // Vault scale arc
    if (isVaulting) {
      const rem = (this.vaultUntil - now) / 300;
      const arc = Math.sin(Math.max(0, Math.min(1, rem)) * Math.PI);
      this.player.setScale(1 + arc * 0.28);
    } else {
      this.player.setScale(1);
    }

    // Dodge / Vault dash burst with momentum carry
    if (isDodging) {
      const chainBonus = 1 + Math.min(0.25, this.parkourChain * 0.06);
      const dodgeSpeed = 355 * op.modifiers.moveSpeedMultiplier * op.modifiers.parkourBoostMultiplier * chainBonus;
      this.velX = this.dodgeDir.x * dodgeSpeed;
      this.velY = this.dodgeDir.y * dodgeSpeed;
      this.movementManager.velX = this.velX;
      this.movementManager.velY = this.velY;
      this.player.setVelocity(this.velX, this.velY);
      this.player.play(`${this.playerAnimPrefix}_dodge`, true);
      this.spawnAfterimage(now, this.trailColorHex);
      this.checkTankDashStun(now);
      return;
    }

    // Momentum Power Slide
    if (isSliding) {
      const slideSpeed = 290 * op.modifiers.moveSpeedMultiplier * op.modifiers.parkourBoostMultiplier;
      this.velX = Phaser.Math.Linear(this.velX, this.slideDir.x * slideSpeed, Math.min(1, dtSec * 8));
      this.velY = Phaser.Math.Linear(this.velY, this.slideDir.y * slideSpeed, Math.min(1, dtSec * 8));
      this.movementManager.velX = this.velX;
      this.movementManager.velY = this.velY;
      this.player.setVelocity(this.velX, this.velY);
      this.player.play(`${this.playerAnimPrefix}_crouch`, true);
      this.spawnAfterimage(now, this.trailColorHex);
      return;
    }

    const wantsCrouch = this.isCrouching || this.keys.CTRL.isDown || virtual.crouch;
    const wantsSprint = (this.keys.SHIFT.isDown || virtual.sprint) && !wantsCrouch && len > 0.1;

    const moveRes = this.movementManager.step(op, {
      mx,
      my,
      wantsSprint,
      wantsCrouch,
      now,
      dtSec,
      parkourChain: this.parkourChain,
      isVaulting,
      isSliding,
      isDodging,
      trapSlowed: now < this.trapSlowUntil,
      combatBoostUntil: this.combatManager.activeTakedownUntil,
    });

    this.velX = moveRes.vx;
    this.velY = moveRes.vy;
    this.stamina = this.movementManager.stamina;
    this.maxStamina = this.movementManager.maxStamina;
    if (moveRes.didExhaust) {
      this.showToast('Stamina depleted — recovering!', 1200);
    }

    this.player.setVelocity(this.velX, this.velY);
    const currentSpeed = moveRes.speed;

    // Subtle camera look-ahead proportional to momentum
    this.cameras.main.setFollowOffset(-this.velX * 0.14, -this.velY * 0.14);

    if (currentSpeed > 18) {
      if (len > 0.1) {
        this.facingRad = Math.atan2(my, mx);
      } else {
        this.facingRad = Math.atan2(this.velY, this.velX);
      }
      if (Math.abs(this.velX) > 6) {
        this.player.setFlipX(this.velX < 0);
      }
      if (inTakedownPose) {
        this.player.play(`${this.playerAnimPrefix}_interact`, true);
      } else if (wantsCrouch) {
        this.player.play(`${this.playerAnimPrefix}_crouch`, true);
      } else if (moveRes.isSprinting || currentSpeed > 215) {
        this.player.play(`${this.playerAnimPrefix}_sprint`, true);
      } else {
        this.player.play(`${this.playerAnimPrefix}_walk`, true);
      }

      this.footstepTimer -= dtSec;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = moveRes.isSprinting ? 0.23 : wantsCrouch ? 0.44 : 0.33;
        AudioSystem.playFootstep(moveRes.isSprinting, wantsCrouch);
        if (moveRes.isSprinting) {
          this.drawNoiseRing(this.player.x, this.player.y, moveRes.noiseRadius, 0x94a3b8);
        }
      }
    } else if (!inTakedownPose) {
      this.player.play(wantsCrouch ? `${this.playerAnimPrefix}_crouch` : `${this.playerAnimPrefix}_idle`, true);
    }

    // Visual alpha for dark corners & cloak
    const cloaked = now < this.cloakedUntil;
    this.player.setAlpha(cloaked ? 0.32 : wantsCrouch ? 0.85 : 1);
  }

  private toggleCrouchOrSlide(): void {
    const now = this.time.now;
    const speed = Math.hypot(this.velX, this.velY);
    if (!this.isHiding && speed > 175 && now > this.slideUntil && this.movementManager.stamina >= 10) {
      // Trigger momentum power-slide!
      const op = OPERATIVES[this.launchData.operativeId];
      this.slideDir = { x: this.velX / speed, y: this.velY / speed };
      this.slideUntil = now + 360;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 260);
      this.movementManager.spendStamina(10 * op.modifiers.staminaDrainMultiplier, now);
      this.stamina = this.movementManager.stamina;
      this.registerParkourMove(now);
      AudioSystem.playTone('dodge');
      return;
    }
    this.isCrouching = !this.isCrouching;
  }

  private tryParkourOrDodge(): void {
    const now = this.time.now;
    const op = OPERATIVES[this.launchData.operativeId];
    if (this.isHiding || now < this.dodgeCooldownUntil || this.movementManager.stamina < 14) return;

    const ts = this.level.tileSize;
    const gx = Math.floor(this.player.x / ts);
    const gy = Math.floor(this.player.y / ts);

    // Check if near a LOW_COVER barrier or wall for Parkour Vault / Wall-Kick!
    let nearLowCover = false;
    let wallNormal: { x: number; y: number } | null = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = this.level.tiles[gy + dy]?.[gx + dx];
        if (tile === TileType.LOW_COVER) {
          nearLowCover = true;
        }
        if ((dx === 0 || dy === 0) && (dx !== 0 || dy !== 0) && (tile === TileType.WALL || tile === TileType.GLASS_PARTITION)) {
          const wx = (gx + dx) * ts + ts / 2;
          const wy = (gy + dy) * ts + ts / 2;
          if (Math.hypot(this.player.x - wx, this.player.y - wy) < 38) {
            wallNormal = { x: -dx, y: -dy };
          }
        }
      }
    }

    let dx = this.velX;
    let dy = this.velY;
    const len = Math.hypot(dx, dy);
    if (len > 8) {
      dx /= len;
      dy /= len;
    } else if (wallNormal) {
      dx = wallNormal.x;
      dy = wallNormal.y;
    } else {
      dx = Math.cos(this.facingRad);
      dy = Math.sin(this.facingRad);
    }

    this.dodgeDir = { x: dx, y: dy };
    this.dodgeUntil = now + (nearLowCover ? 260 : 220);
    if (nearLowCover) {
      this.vaultUntil = now + 300;
      this.registerParkourMove(now);
      this.showToast(`Parkour Vault! Chain x${this.parkourChain}`, 1100);
    } else if (wallNormal) {
      // Wall-kick lateral/away redirect
      this.dodgeDir = {
        x: (dx + wallNormal.x * 0.85) / Math.hypot(dx + wallNormal.x * 0.85, dy + wallNormal.y * 0.85),
        y: (dy + wallNormal.y * 0.85) / Math.hypot(dx + wallNormal.x * 0.85, dy + wallNormal.y * 0.85),
      };
      this.registerParkourMove(now);
      this.showToast(`Wall-Kick Boost! Chain x${this.parkourChain}`, 1100);
    }

    this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 300);
    this.dodgeCooldownUntil = now + 680 * op.modifiers.dodgeCooldownMultiplier;
    this.movementManager.spendStamina(14, now);
    this.stamina = this.movementManager.stamina;
    AudioSystem.playTone('dodge');
  }

  private onLowCoverContact(): void {
    const now = this.time.now;
    const speed = Math.hypot(this.velX, this.velY);
    if (speed > 175 && now > this.vaultUntil) {
      // Auto-vault seamlessly when sprinting or carrying high momentum into low cover!
      this.vaultUntil = now + 290;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 250);
      this.registerParkourMove(now);
      AudioSystem.playTone('dodge');
    }
  }

  private onLockedDoorImpact(doorImg: Phaser.Physics.Arcade.Image): void {
    const now = this.time.now;
    const op = OPERATIVES[this.launchData.operativeId];
    if (op.classType === 'Tank' && (now < this.dodgeUntil || now < this.slideUntil || Math.hypot(this.velX, this.velY) > 200)) {
      for (const item of this.interactives) {
        if (item.spec.type === InteractiveType.LOCKED_DOOR && item.locked && this.closedDoorMap.get(item.spec.id) === doorImg) {
          this.unlockDoor(item);
          this.triggerCameraShake(140, 0.009);
          this.showToast('Tank Kinetic Breach — Bulkhead shattered!', 2000);
          break;
        }
      }
    }
  }

  private checkTankDashStun(now: number): void {
    const op = OPERATIVES[this.launchData.operativeId];
    if (op.classType !== 'Tank') return;
    for (const enemy of this.enemies) {
      if (Math.hypot(enemy.sprite.x - this.player.x, enemy.sprite.y - this.player.y) < 38) {
        enemy.stun(3500, now);
      }
    }
  }

  private registerParkourMove(now: number): void {
    this.parkourChain = Math.min(5, this.parkourChain + 1);
    this.parkourDecayAt = now + 3400;
  }

  private spawnAfterimage(now: number, colorHex: string): void {
    if (now < this.afterimageTimer) return;
    this.afterimageTimer = now + 45;
    const ghost = this.add.circle(this.player.x, this.player.y, 11, Phaser.Display.Color.HexStringToColor(colorHex).color, 0.35).setDepth(11);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: 0.5,
      duration: 210,
      onComplete: () => ghost.destroy(),
    });
  }

  private updateTakedownScan(now: number): void {
    if (this.isHiding) {
      this.activeTakedownCandidate = null;
      return;
    }
    this.activeTakedownCandidate = this.combatManager.findTakedownCandidate(
      this.player.x,
      this.player.y,
      this.enemies,
      this.level,
      this.closedDoorCoords,
      now
    );
  }

  private checkHiddenRoomDiscovery(): void {
    for (const item of this.interactives) {
      if (item.spec.type === InteractiveType.COLLECTIBLE && item.spec.secret) {
        const key = `secret_${item.spec.id}`;
        if (!this.discoveredHiddenZones.has(key)) {
          const dist = Math.hypot(item.gfx.x - this.player.x, item.gfx.y - this.player.y);
          if (dist < 56) {
            this.discoveredHiddenZones.add(key);
            this.hiddenRoomsFound += 1;
            AudioSystem.playTone('pickup');
            this.showToast('Hidden alcove discovered (+40 Shadow Credits on clear)', 2200);
          }
        }
      }
    }
  }

  private updateAimOverlay(now: number): void {
    this.aimOverlayGfx.clear();
    if (this.isHiding || this.levelFinished) return;

    const save = SaveSystem.getSave();
    if (
      this.inventory.selectedGadget !== EquipmentId.PULSE_TAGGER ||
      !this.inventory.isUnlocked(
        EquipmentId.PULSE_TAGGER,
        save,
        this.level.isBossLevel,
        this.launchData.mode
      )
    ) {
      return;
    }

    const aimAngle = this.pointerAimRad ?? this.facingRad;
    const range = this.inventory.getPulseTaggerRangePx();
    const target = this.combatManager.findPulseTaggerTarget(
      this.player.x,
      this.player.y,
      aimAngle,
      range,
      this.level,
      this.closedDoorCoords,
      this.enemies,
      this.camerasList,
      this.enemyTraps,
      now
    );

    const hasLock = target.kind !== 'none';
    const ready = this.inventory.pulseEnergy >= this.inventory.pulseCostPerShot;
    const ringColor = ready ? 0x22d3ee : 0x64748b;

    // Range boundary indicator
    this.aimOverlayGfx.lineStyle(1, ringColor, 0.22);
    this.aimOverlayGfx.strokeCircle(this.player.x, this.player.y, range);

    // Aiming sightline & directional reticle
    const lineColor = hasLock ? 0x34d399 : ringColor;
    this.aimOverlayGfx.lineStyle(1.6, lineColor, hasLock ? 0.72 : 0.35);
    this.aimOverlayGfx.lineBetween(this.player.x, this.player.y, target.x, target.y);

    this.aimOverlayGfx.lineStyle(2, lineColor, hasLock ? 0.95 : 0.55);
    this.aimOverlayGfx.strokeCircle(target.x, target.y, hasLock ? 13 : 8);
    if (hasLock) {
      this.aimOverlayGfx.fillStyle(lineColor, 0.22);
      this.aimOverlayGfx.fillCircle(target.x, target.y, 13);
    }
  }

  private tryInteract(): void {
    const now = this.time.now;
    if (this.isHiding) {
      this.isHiding = false;
      this.hidingLockerPos = null;
      this.player.setAlpha(1);
      AudioSystem.playTone('interact');
      return;
    }

    // Prioritize stealth non-lethal takedown if in stealth position behind/flank of an unaware guard
    const takedown = this.combatManager.findTakedownCandidate(
      this.player.x,
      this.player.y,
      this.enemies,
      this.level,
      this.closedDoorCoords,
      now
    );
    if (takedown) {
      const ok = this.combatManager.executeStealthTakedown(
        this,
        this.player,
        takedown,
        this.enemies,
        this.playerAnimPrefix,
        this.trailColorHex,
        now,
        (rx, ry, rad, col) => this.drawNoiseRing(rx, ry, rad, col)
      );
      if (ok) {
        this.activeTakedownCandidate = null;
        this.showToast('Non-lethal takedown — Guard temporarily disabled!', 1800);
        return;
      }
    }

    const nearest = this.findNearestInteractive();
    if (!nearest) return;

    const { spec } = nearest;
    this.player.play(`${this.playerAnimPrefix}_interact`, true);

    switch (spec.type) {
      case InteractiveType.LOCKER: {
        this.isHiding = true;
        this.hidingLockerPos = { x: nearest.gfx.x, y: nearest.gfx.y };
        this.player.setPosition(nearest.gfx.x, nearest.gfx.y);
        AudioSystem.playTone('door');
        this.showToast('Concealed inside locker. Move or press E to exit.', 1800);
        break;
      }
      case InteractiveType.VENT_ENTRANCE: {
        const target = this.interactives.find((i) => i.spec.id === spec.targetId);
        if (target) {
          this.player.setPosition(target.gfx.x, target.gfx.y);
          AudioSystem.playTone('door');
          if (!this.discoveredHiddenZones.has('vent_passage')) {
            this.discoveredHiddenZones.add('vent_passage');
            this.hiddenRoomsFound += 1;
            this.showToast('Secret ventilation route discovered (+40 SC bonus)', 2200);
          } else {
            this.showToast('Traversed maintenance ventilation shaft.', 1800);
          }
        }
        break;
      }
      case InteractiveType.KEYCARD: {
        if (!nearest.completed) {
          nearest.completed = true;
          nearest.gfx.setVisible(false);
          this.keycardsCollected.push(spec.id);
          AudioSystem.playTone('pickup');
          this.showToast('Security Keycard acquired.', 2000);
        }
        break;
      }
      case InteractiveType.LOCKED_DOOR: {
        if (nearest.locked) {
          if (spec.requiredKeyId && this.keycardsCollected.includes(spec.requiredKeyId)) {
            this.unlockDoor(nearest);
          } else {
            AudioSystem.playTone('suspicion');
            this.showToast('Locked Bulkhead — Keycard or Access Device required.', 2400);
          }
        }
        break;
      }
      case InteractiveType.TERMINAL: {
        if (!nearest.completed) {
          nearest.completed = true;
          this.terminalsHacked += 1;
          AudioSystem.playTone('hack');
          for (const cam of this.camerasList) {
            if (cam.linkedTerminalId === spec.id) cam.disabled = true;
          }
          for (const las of this.lasersList) {
            if (las.linkedTerminalId === spec.id) las.disabled = true;
          }
          if (this.bossController && !this.bossController.defeated) {
            const defeatedNow = this.bossController.applyDamage(32, 'terminal', now);
            this.showToast('Relay Overridden — Boss shield disrupted!', 2200);
            if (defeatedNow) this.onBossDefeated();
          } else {
            this.showToast('Security Terminal overridden. Linked traps offline.', 2200);
            if (this.level.isEscapeLevel && !this.escapeActive) {
              this.triggerEscapeSequence();
            }
          }
          const rect = nearest.gfx.getAt(1) as Phaser.GameObjects.Rectangle | undefined;
          rect?.setFillStyle(0x34d399, 0.9);
        }
        break;
      }
      case InteractiveType.INTEL_DOSSIER: {
        if (!nearest.completed) {
          nearest.completed = true;
          nearest.gfx.setVisible(false);
          this.intelFound += 1;
          AudioSystem.playTone('pickup');
          this.showToast('Classified Intel retrieved (+25 SC bonus).', 2000);
        }
        break;
      }
      case InteractiveType.COLLECTIBLE: {
        if (!nearest.completed) {
          nearest.completed = true;
          nearest.gfx.setVisible(false);
          this.optionalFound += 1;
          AudioSystem.playTone('pickup');
          this.showToast('Hidden VEIL Microfilm recovered (+25 SC bonus)!', 2200);
        }
        break;
      }
      case InteractiveType.EQUIPMENT_PICKUP: {
        if (!nearest.completed && spec.equipmentId) {
          nearest.completed = true;
          nearest.gfx.setVisible(false);
          SaveSystem.unlockEquipment(spec.equipmentId);
          this.inventory.grantUnlockedPickup(spec.equipmentId);
          AudioSystem.playTone('pickup');
          this.showToast(`Gadget Acquired: ${EQUIPMENT_CATALOG[spec.equipmentId].name}`, 2600);
        }
        break;
      }
      case InteractiveType.DISGUISE_STATION: {
        this.isDisguised = !this.isDisguised;
        AudioSystem.playTone('interact');
        this.showToast(
          this.isDisguised
            ? 'Staff disguise equipped. Standard patrols will ignore you at medium range.'
            : 'Disguise removed.',
          2400
        );
        break;
      }
      case InteractiveType.EXIT: {
        this.checkAutoExtraction(true);
        break;
      }
    }
  }

  private unlockDoor(runtime: InteractiveRuntime): void {
    runtime.locked = false;
    runtime.completed = true;
    runtime.gfx.setVisible(false);
    const doorImg = this.closedDoorMap.get(runtime.spec.id);
    if (doorImg) {
      doorImg.disableBody(true, true);
    }
    this.closedDoorCoords.delete(`${runtime.spec.position.x},${runtime.spec.position.y}`);
    AudioSystem.playTone('door');
    this.showToast('Vault Bulkhead unlocked.', 2000);
  }

  private useSelectedGadget(): void {
    this.useEquipment(this.inventory.selectedGadget);
  }

  private useEquipment(eqId: EquipmentId): void {
    if (this.levelFinished) return;
    const now = this.time.now;
    const save = SaveSystem.getSave();
    const aimAngle = this.pointerAimRad ?? this.facingRad;

    this.gadgetManager.activate(eqId, {
      scene: this,
      inventory: this.inventory,
      combat: this.combatManager,
      save,
      level: this.level,
      mode: this.launchData.mode,
      playerX: this.player.x,
      playerY: this.player.y,
      aimAngleRad: aimAngle,
      now,
      closedDoors: this.closedDoorCoords,
      enemies: this.enemies,
      cameras: this.camerasList,
      traps: this.enemyTraps,
      onReconActivate: (durMs) => {
        this.reconUntil = now + durMs;
      },
      onDecoyDeploy: (dx, dy) => {
        this.drawNoiseRing(dx, dy, 190, 0xf59e0b);
        AudioSystem.playTone('interact');
        for (const enemy of this.enemies) {
          if (Math.hypot(enemy.sprite.x - dx, enemy.sprite.y - dy) <= 230) {
            enemy.hearDisturbance(dx, dy, 55);
          }
        }
        let trippedTrap = false;
        for (let i = this.enemyTraps.length - 1; i >= 0; i--) {
          const tr = this.enemyTraps[i];
          if (now >= tr.armTime && Math.hypot(tr.x - dx, tr.y - dy) <= 72) {
            this.detonateTrap(tr, now, false);
            trippedTrap = true;
          }
        }
        this.showToast(
          trippedTrap ? 'Acoustic decoy tripped nearby security trap!' : 'Acoustic decoy deployed.',
          1600
        );
      },
      onBypassAttempt: () => {
        const lockedDoor = this.interactives.find(
          (i) =>
            i.spec.type === InteractiveType.LOCKED_DOOR &&
            i.locked &&
            Math.hypot(i.gfx.x - this.player.x, i.gfx.y - this.player.y) < 110
        );
        if (lockedDoor) {
          this.unlockDoor(lockedDoor);
          return true;
        }
        const term = this.interactives.find(
          (i) =>
            i.spec.type === InteractiveType.TERMINAL &&
            !i.completed &&
            Math.hypot(i.gfx.x - this.player.x, i.gfx.y - this.player.y) < 120
        );
        if (term) {
          term.completed = true;
          this.terminalsHacked += 1;
          AudioSystem.playTone('hack');
          for (const cam of this.camerasList) {
            if (cam.linkedTerminalId === term.spec.id) cam.disabled = true;
          }
          for (const las of this.lasersList) {
            if (las.linkedTerminalId === term.spec.id) las.disabled = true;
          }
          const rect = term.gfx.getAt(1) as Phaser.GameObjects.Rectangle | undefined;
          rect?.setFillStyle(0x34d399, 0.9);
          this.showToast('Terminal remotely overridden via Access Device.', 2000);
          return true;
        }
        return false;
      },
      onJammerActivate: () => {
        const bonus = this.launchData.operativeId === OperativeId.NOVA ? 2000 : 0;
        this.jammedUntil = now + 5000 + bonus;
        AudioSystem.playTone('hack');
        this.showToast('Signal Jammer active — cameras, lasers & radios scrambled.', 2200);
      },
      onPulseArcFire: () => {
        this.firePulseArc(now, aimAngle);
      },
      onCloakActivate: () => {
        this.cloakedUntil = now + 3500;
        AudioSystem.playTone('dodge');
        this.showToast('Optical Cloak engaged (3.5s).', 1800);
      },
      onDisableCamera: (camIdx) => {
        const cam = this.camerasList[camIdx];
        if (!cam) return;
        cam.disabled = true;
        this.time.delayedCall(10000, () => {
          if (this.scene.isActive() && !this.levelFinished) {
            cam.disabled = false;
          }
        });
      },
      onDisableTrap: (trapIdx) => {
        const tr = this.enemyTraps[trapIdx];
        if (!tr) return;
        this.enemyTraps.splice(trapIdx, 1);
        this.destroyTrapVisuals(tr);
      },
      onToast: (msg, ms) => this.showToast(msg, ms),
    });
  }

  private firePulseArc(now: number, aimRad?: number): void {
    const startX = this.player.x;
    const startY = this.player.y;
    const angle = aimRad ?? this.facingRad;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const endX = startX + dirX * 190;
    const endY = startY + dirY * 190;

    const beam = this.add.line(0, 0, startX, startY, endX, endY, 0xa78bfa, 0.95).setOrigin(0, 0).setLineWidth(4).setDepth(20);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 240,
      onComplete: () => beam.destroy(),
    });

    // Check enemy stun hits along ray
    for (const enemy of this.enemies) {
      const distToStart = Math.hypot(enemy.sprite.x - startX, enemy.sprite.y - startY);
      if (distToStart <= 200) {
        const dot = ((enemy.sprite.x - startX) * dirX + (enemy.sprite.y - startY) * dirY) / Math.max(1, distToStart);
        if (dot > 0.65 && hasLineOfSight(this.level, startX, startY, enemy.sprite.x, enemy.sprite.y, this.closedDoorCoords)) {
          enemy.stun(5500, now);
          this.showToast('Target stunned non-lethally.', 1400);
        }
      }
    }

    // Disarm enemy traps in pulse radius
    let neutralizedCount = 0;
    for (let i = this.enemyTraps.length - 1; i >= 0; i--) {
      const tr = this.enemyTraps[i];
      if (Math.hypot(tr.x - startX, tr.y - startY) <= 170) {
        const pop = this.add.circle(tr.x, tr.y, 18, 0xa78bfa, 0.45).setDepth(16);
        this.tweens.add({
          targets: pop,
          scale: 2.1,
          alpha: 0,
          duration: 200,
          onComplete: () => pop.destroy(),
        });
        this.destroyTrapVisuals(tr);
        this.enemyTraps.splice(i, 1);
        neutralizedCount += 1;
      }
    }
    if (neutralizedCount > 0) {
      this.triggerCameraShake(110, 0.007);
      this.showToast('Security trap neutralized.', 1200);
    }

    // Check Boss hit
    if (this.bossController && !this.bossController.defeated) {
      const bx = this.bossController.sprite.x;
      const by = this.bossController.sprite.y;
      const dist = Math.hypot(bx - startX, by - startY);
      if (dist <= 230) {
        const dot = ((bx - startX) * dirX + (by - startY) * dirY) / Math.max(1, dist);
        if (dot > 0.55) {
          const defeatedNow = this.bossController.applyDamage(24, 'pulse', now);
          if (defeatedNow) this.onBossDefeated();
        }
      }
    }
  }

  private updateSecurityAndHazards(now: number, dtSec: number): void {
    const jammed = now <= this.jammedUntil;
    const cloaked = now <= this.cloakedUntil;

    // Cameras
    for (const cam of this.camerasList) {
      cam.coneGfx.clear();
      if (cam.disabled || jammed) {
        cam.bodyGfx.setStrokeStyle(2, 0x475569);
        continue;
      }
      cam.bodyGfx.setStrokeStyle(2, 0xf43f5e);
      const angleDeg = cam.baseAngleDeg + Math.sin((now / 1000) * cam.sweepSpeed) * cam.sweepDeg;
      const angleRad = (angleDeg * Math.PI) / 180;
      const half = (24 * Math.PI) / 180;

      cam.coneGfx.fillStyle(0xf43f5e, 0.14);
      cam.coneGfx.beginPath();
      cam.coneGfx.moveTo(cam.x, cam.y);
      cam.coneGfx.arc(cam.x, cam.y, cam.rangePx, angleRad - half, angleRad + half, false);
      cam.coneGfx.closePath();
      cam.coneGfx.fillPath();

      if (!this.isHiding && !cloaked) {
        const { inCone } = isInsideFovCone(cam.x, cam.y, angleRad, 48, cam.rangePx, this.player.x, this.player.y);
        if (inCone && hasLineOfSight(this.level, cam.x, cam.y, this.player.x, this.player.y, this.closedDoorCoords)) {
          this.triggerFacilityAlert(this.player.x, this.player.y);
        }
      }
    }

    // Lasers
    for (const las of this.lasersList) {
      las.gfx.clear();
      if (las.disabled || jammed) continue;
      const period = las.cycleOnMs + las.cycleOffMs;
      las.active = now % period < las.cycleOnMs;
      if (!las.active) {
        las.gfx.lineStyle(1, 0x475569, 0.4);
        las.gfx.lineBetween(las.x1, las.y1, las.x2, las.y2);
        continue;
      }
      las.gfx.lineStyle(3, 0xf43f5e, 0.9);
      las.gfx.lineBetween(las.x1, las.y1, las.x2, las.y2);

      if (now > this.invulnerableUntil && !this.isHiding) {
        const nearestPt = Phaser.Geom.Line.GetNearestPoint(
          new Phaser.Geom.Line(las.x1, las.y1, las.x2, las.y2),
          new Phaser.Math.Vector2(this.player.x, this.player.y)
        );
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestPt.x, nearestPt.y);
        if (d < 14) {
          this.damagePlayer(20, now, 'trap');
          this.triggerFacilityAlert(this.player.x, this.player.y);
        }
      }
    }

    // Moving Rail Cars / Drones
    for (const mh of this.movingHazards) {
      const tx = mh.dir === 1 ? mh.x2 : mh.x1;
      const ty = mh.dir === 1 ? mh.y2 : mh.y1;
      const dx = tx - mh.sprite.x;
      const dy = ty - mh.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        mh.dir = mh.dir === 1 ? -1 : 1;
      } else {
        mh.sprite.x += (dx / dist) * mh.speedPx * dtSec;
        mh.sprite.y += (dy / dist) * mh.speedPx * dtSec;
      }
      if (now > this.invulnerableUntil && !this.isHiding) {
        const bounds = mh.sprite.getBounds();
        if (bounds.contains(this.player.x, this.player.y)) {
          this.damagePlayer(25, now, 'hazard');
        }
      }
    }
  }

  private updateEnemiesAndBoss(now: number, dtSec: number): void {
    const op = OPERATIVES[this.launchData.operativeId];
    const gx = Math.floor(this.player.x / this.level.tileSize);
    const gy = Math.floor(this.player.y / this.level.tileSize);
    const inDarkTile = this.level.tiles[gy]?.[gx] === TileType.DARK_CORNER;
    const nearCover = [
      this.level.tiles[gy - 1]?.[gx],
      this.level.tiles[gy + 1]?.[gx],
      this.level.tiles[gy]?.[gx - 1],
      this.level.tiles[gy]?.[gx + 1],
    ].some((t) => t === TileType.LOW_COVER || t === TileType.WALL);

    const cloaked = now <= this.cloakedUntil;
    let visFactor = op.modifiers.visibilityMultiplier;
    if (this.isHiding || cloaked) visFactor = 0;
    else if (inDarkTile && this.isCrouching) visFactor *= 0.35;
    else if (inDarkTile || this.isCrouching) visFactor *= nearCover && this.isCrouching ? 0.52 : 0.65;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const noiseRadius = speed > 180 ? 115 * op.modifiers.noiseMultiplier : 0;

    this.updateVisibilityExposure(now, dtSec, inDarkTile, nearCover, cloaked, speed, op.modifiers.visibilityMultiplier);

    const diffScale =
      (this.launchData.newGamePlus ? 1.2 : 1.0) *
      (this.launchData.mode === GameMode.CHALLENGE ? 1.15 : 1.0);

    let anyAlerted = false;
    let highestAwareness = AwarenessState.UNAWARE;

    for (const enemy of this.enemies) {
      enemy.update({
        level: this.level,
        playerX: this.player.x,
        playerY: this.player.y,
        playerVisibleFactor: visFactor,
        playerNoiseRadius: noiseRadius,
        playerDisguised: this.isDisguised,
        closedDoors: this.closedDoorCoords,
        jammedUntil: this.jammedUntil,
        now,
        dtSec,
        difficultyScale: diffScale,
        onAlertTriggered: (ax, ay) => this.triggerFacilityAlert(ax, ay),
        onPlayerHit: (dmg) => this.damagePlayer(dmg, now, 'enemy'),
        onFireProjectile: (bx, by, angleRad, cfg) =>
          this.spawnEnemyBullet(bx, by, angleRad, cfg, now),
        onDeployTrap: (tx, ty, trapType) => this.spawnEnemyTrap(tx, ty, trapType, now),
      });

      const aw = enemy.getAwarenessState();
      if (aw === AwarenessState.ALERTED) {
        anyAlerted = true;
        highestAwareness = AwarenessState.ALERTED;
      } else if (aw === AwarenessState.INVESTIGATING && highestAwareness !== AwarenessState.ALERTED) {
        highestAwareness = AwarenessState.INVESTIGATING;
      } else if (aw === AwarenessState.SUSPICIOUS && (highestAwareness === AwarenessState.UNAWARE || highestAwareness === AwarenessState.CURIOUS)) {
        highestAwareness = AwarenessState.SUSPICIOUS;
      } else if (aw === AwarenessState.CURIOUS && highestAwareness === AwarenessState.UNAWARE) {
        highestAwareness = AwarenessState.CURIOUS;
      }
    }

    // Allies can spot disabled guards and investigate
    for (const observer of this.enemies) {
      if (observer.state === EnemyAIState.STUNNED || observer.state === EnemyAIState.RECOVERING || observer.state === EnemyAIState.ALERT) {
        continue;
      }
      for (const ally of this.enemies) {
        if (ally.id === observer.id || ally.state !== EnemyAIState.STUNNED) continue;
        if (observer.noticedDisabledAllies.has(ally.id)) continue;
        const d = Math.hypot(ally.sprite.x - observer.sprite.x, ally.sprite.y - observer.sprite.y);
        if (d <= 135 && hasLineOfSight(this.level, observer.sprite.x, observer.sprite.y, ally.sprite.x, ally.sprite.y, this.closedDoorCoords)) {
          observer.noticedDisabledAllies.add(ally.id);
          observer.hearDisturbance(ally.sprite.x, ally.sprite.y, 78);
          this.showToast('Patrol spotted a disabled unit!', 1700);
        }
      }
    }

    if (anyAlerted && !this.prevAlerted) {
      this.prevAlerted = true;
    } else if (!anyAlerted) {
      this.prevAlerted = false;
    }

    AudioSystem.setMoodFromAwareness(highestAwareness, Boolean(this.bossController && !this.bossController.defeated));

    this.tacticalAI.update({
      level: this.level,
      enemies: this.enemies,
      playerX: this.player.x,
      playerY: this.player.y,
      playerVelX: this.velX,
      playerVelY: this.velY,
      objectivePoints: this.interactives
        .filter(
          (i) =>
            i.spec.type === InteractiveType.INTEL_DOSSIER ||
            i.spec.type === InteractiveType.TERMINAL ||
            i.spec.type === InteractiveType.EXIT
        )
        .map((i) => ({ x: i.gfx.x, y: i.gfx.y, type: i.spec.type, completed: i.completed })),
      closedDoors: this.closedDoorCoords,
      jammedUntil: this.jammedUntil,
      now,
      existingTraps: this.enemyTraps,
    });

    this.tacticalLinksGfx.clear();
    for (const link of this.tacticalAI.activeLinks) {
      const alpha = Math.max(0.15, ((link.expiresAt - now) / 1400) * 0.75);
      const linkColor =
        link.trapType === 'tripwire'
          ? 0xf43f5e
          : link.trapType === 'proximity_alarm'
          ? 0xa78bfa
          : 0xf59e0b;
      this.tacticalLinksGfx.lineStyle(1.8, linkColor, alpha);
      this.tacticalLinksGfx.lineBetween(link.fromX, link.fromY, link.toX, link.toY);
      this.tacticalLinksGfx.fillStyle(linkColor, alpha);
      this.tacticalLinksGfx.fillCircle(link.toX, link.toY, 4);
    }

    if (this.bossController) {
      this.bossController.update(
        now,
        dtSec,
        this.player.x,
        this.player.y,
        now <= this.invulnerableUntil || this.isHiding,
        (dmg) => this.damagePlayer(dmg, now, 'boss')
      );
    }
  }

  private updateVisibilityExposure(
    now: number,
    dtSec: number,
    inDarkTile: boolean,
    nearCover: boolean,
    cloaked: boolean,
    speed: number,
    opVisMult: number
  ): void {
    let targetVisibility = 0;
    let nextState: 'Hidden' | 'Shadow' | 'Cover' | 'Exposed' | 'Lit' = 'Shadow';

    if (this.isHiding || cloaked) {
      targetVisibility = 0;
      nextState = 'Hidden';
    } else {
      let baseVis = 44;
      if (inDarkTile) {
        baseVis = this.isCrouching ? 8 : 16;
      } else if (this.isCrouching && nearCover) {
        baseVis = 18;
      } else if (this.isCrouching) {
        baseVis = 28;
      } else if (speed > 175) {
        baseVis = 60;
      } else if (nearCover) {
        baseVis = 34;
      }

      baseVis *= opVisMult;

      let lightExposure = 0;
      let enemyLosExposure = 0;
      let inEnemyLight = false;
      let inCameraLight = false;
      const jammed = now <= this.jammedUntil;

      // Enemy flashlight / vision cones & open line-of-sight
      for (const enemy of this.enemies) {
        if (enemy.state === EnemyAIState.STUNNED) continue;
        const ex = enemy.sprite.x;
        const ey = enemy.sprite.y;
        const { inCone, distance } = isInsideFovCone(
          ex,
          ey,
          enemy.facingRad,
          enemy.config.fovAngleDeg,
          enemy.config.fovRangePx,
          this.player.x,
          this.player.y
        );
        if (inCone && hasLineOfSight(this.level, ex, ey, this.player.x, this.player.y, this.closedDoorCoords)) {
          inEnemyLight = true;
          const prox = Math.max(0, 1 - distance / enemy.config.fovRangePx);
          lightExposure = Math.max(lightExposure, 78 + prox * 22);
        } else if (
          distance <= enemy.config.fovRangePx * 0.85 &&
          hasLineOfSight(this.level, ex, ey, this.player.x, this.player.y, this.closedDoorCoords)
        ) {
          enemyLosExposure = Math.max(enemyLosExposure, 22);
        }
      }

      // Security camera spotlight beams
      if (!jammed) {
        for (const cam of this.camerasList) {
          if (cam.disabled) continue;
          const angleDeg = cam.baseAngleDeg + Math.sin((now / 1000) * cam.sweepSpeed) * cam.sweepDeg;
          const angleRad = (angleDeg * Math.PI) / 180;
          const { inCone } = isInsideFovCone(
            cam.x,
            cam.y,
            angleRad,
            52,
            cam.rangePx * 1.12,
            this.player.x,
            this.player.y
          );
          if (inCone && hasLineOfSight(this.level, cam.x, cam.y, this.player.x, this.player.y, this.closedDoorCoords)) {
            inCameraLight = true;
            lightExposure = Math.max(lightExposure, 96);
          }
        }

        // Proximity to active laser emitters
        for (const las of this.lasersList) {
          if (las.disabled || !las.active) continue;
          const nearestPt = Phaser.Geom.Line.GetNearestPoint(
            new Phaser.Geom.Line(las.x1, las.y1, las.x2, las.y2),
            new Phaser.Math.Vector2(this.player.x, this.player.y)
          );
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestPt.x, nearestPt.y);
          if (d < 54) {
            lightExposure = Math.max(lightExposure, 66);
          }
        }
      }

      targetVisibility = Math.min(100, Math.round(Math.max(baseVis + enemyLosExposure, lightExposure)));

      if (inEnemyLight || inCameraLight || targetVisibility >= 75) {
        nextState = 'Lit';
      } else if (targetVisibility >= 45) {
        nextState = 'Exposed';
      } else if (inDarkTile) {
        nextState = 'Shadow';
      } else if (nearCover || targetVisibility <= 28) {
        nextState = 'Cover';
      } else {
        nextState = 'Exposed';
      }
    }

    const rate = targetVisibility > this.visibilityPct ? 240 : 115;
    if (targetVisibility > this.visibilityPct) {
      this.visibilityPct = Math.min(targetVisibility, this.visibilityPct + rate * dtSec);
    } else {
      this.visibilityPct = Math.max(targetVisibility, this.visibilityPct - rate * dtSec);
    }
    this.visibilityState = nextState;
  }

  private spawnEnemyBullet(
    x: number,
    y: number,
    angleRad: number,
    cfg: EnemyArchetypeConfig,
    now: number
  ): void {
    const color = Phaser.Display.Color.HexStringToColor(cfg.muzzleColor).color;
    const vx = Math.cos(angleRad) * cfg.bulletSpeedPx;
    const vy = Math.sin(angleRad) * cfg.bulletSpeedPx;

    // Muzzle flash pop
    const flash = this.add.circle(x, y, 7, color, 0.85).setDepth(18);
    this.tweens.add({
      targets: flash,
      scale: 1.7,
      alpha: 0,
      duration: 95,
      onComplete: () => flash.destroy(),
    });

    AudioSystem.playTone('gunshot');

    const gfx = this.add.circle(x, y, 3.2, color, 1).setDepth(16);
    const tail = this.add
      .line(0, 0, x, y, x - Math.cos(angleRad) * 14, y - Math.sin(angleRad) * 14, color, 0.65)
      .setOrigin(0, 0)
      .setLineWidth(2)
      .setDepth(15);

    this.enemyBullets.push({
      x,
      y,
      vx,
      vy,
      damage: cfg.bulletDamage,
      color,
      expiresAt: now + 1500,
      gfx,
      tail,
    });
  }

  private updateEnemyBullets(now: number, dtSec: number): void {
    const ts = this.level.tileSize;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;

      const speed = Math.hypot(b.vx, b.vy) || 1;
      const nx = b.vx / speed;
      const ny = b.vy / speed;
      b.gfx.setPosition(b.x, b.y);
      b.tail.setTo(b.x, b.y, b.x - nx * 14, b.y - ny * 14);

      const gx = Math.floor(b.x / ts);
      const gy = Math.floor(b.y / ts);
      const tile = this.level.tiles[gy]?.[gx];

      let remove = now >= b.expiresAt;
      if (
        tile === undefined ||
        tile === TileType.WALL ||
        tile === TileType.GLASS_PARTITION ||
        this.closedDoorCoords.has(`${gx},${gy}`)
      ) {
        // Wall / barrier spark
        const spark = this.add.circle(b.x, b.y, 4, b.color, 0.8).setDepth(17);
        this.tweens.add({
          targets: spark,
          scale: 1.8,
          alpha: 0,
          duration: 120,
          onComplete: () => spark.destroy(),
        });
        remove = true;
      } else if (
        tile === TileType.LOW_COVER &&
        (this.isCrouching || now <= this.slideUntil) &&
        Math.hypot(this.player.x - b.x, this.player.y - b.y) < 56
      ) {
        // Tactical low cover blocks gunfire when crouching or sliding behind it!
        AudioSystem.playTone('ricochet');
        const spark = this.add.circle(b.x, b.y, 5, 0x67e8f9, 0.9).setDepth(17);
        this.tweens.add({
          targets: spark,
          scale: 2,
          alpha: 0,
          duration: 140,
          onComplete: () => spark.destroy(),
        });
        remove = true;
      } else if (
        !this.isHiding &&
        now > this.dodgeUntil &&
        now > this.vaultUntil &&
        Math.hypot(this.player.x - b.x, this.player.y - b.y) < 15
      ) {
        this.damagePlayer(b.damage, now, 'enemy');
        remove = true;
      } else {
        for (let tIdx = this.enemyTraps.length - 1; tIdx >= 0; tIdx--) {
          const tr = this.enemyTraps[tIdx];
          if (now < tr.armTime || tr.type === 'proximity_alarm') continue;
          let hitTrap = Math.hypot(tr.x - b.x, tr.y - b.y) <= 14;
          if (!hitTrap && tr.wireLine) {
            const pt = Phaser.Geom.Line.GetNearestPoint(
              new Phaser.Geom.Line(tr.wireLine.x1, tr.wireLine.y1, tr.wireLine.x2, tr.wireLine.y2),
              new Phaser.Math.Vector2(b.x, b.y)
            );
            hitTrap = Phaser.Math.Distance.Between(b.x, b.y, pt.x, pt.y) <= 10;
          }
          if (hitTrap) {
            this.detonateTrap(tr, now, false);
            remove = true;
            break;
          }
        }
      }

      if (remove) {
        b.gfx.destroy();
        b.tail.destroy();
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  private destroyTrapVisuals(tr: EnemyTrapRuntime): void {
    tr.coreGfx.destroy();
    tr.ringGfx.destroy();
    tr.wireGfx?.destroy();
  }

  private computeTripwireLine(x: number, y: number): { x1: number; y1: number; x2: number; y2: number } {
    const ts = this.level.tileSize;
    const gx = Math.floor(x / ts);
    const gy = Math.floor(y / ts);
    const isAnchor = (tx: number, ty: number) => {
      const tile = this.level.tiles[ty]?.[tx];
      return (
        tile === undefined ||
        tile === TileType.WALL ||
        tile === TileType.GLASS_PARTITION ||
        tile === TileType.LOW_COVER
      );
    };

    let left = gx * ts;
    for (let dx = 1; dx <= 2; dx++) {
      if (isAnchor(gx - dx, gy)) {
        left = (gx - dx + 1) * ts;
        break;
      }
      left = (gx - dx) * ts;
    }
    let right = (gx + 1) * ts;
    for (let dx = 1; dx <= 2; dx++) {
      if (isAnchor(gx + dx, gy)) {
        right = (gx + dx) * ts;
        break;
      }
      right = (gx + dx + 1) * ts;
    }

    let top = gy * ts;
    for (let dy = 1; dy <= 2; dy++) {
      if (isAnchor(gx, gy - dy)) {
        top = (gy - dy + 1) * ts;
        break;
      }
      top = (gy - dy) * ts;
    }
    let bottom = (gy + 1) * ts;
    for (let dy = 1; dy <= 2; dy++) {
      if (isAnchor(gx, gy + dy)) {
        bottom = (gy + dy) * ts;
        break;
      }
      bottom = (gy + dy + 1) * ts;
    }

    const horizSpan = Math.min(ts * 2.5, right - left);
    const vertSpan = Math.min(ts * 2.5, bottom - top);
    if (horizSpan <= vertSpan) {
      const half = Math.max(24, horizSpan / 2);
      return {
        x1: Math.max(left, x - half),
        y1: y,
        x2: Math.min(right, x + half),
        y2: y,
      };
    }
    const half = Math.max(24, vertSpan / 2);
    return {
      x1: x,
      y1: Math.max(top, y - half),
      x2: x,
      y2: Math.min(bottom, y + half),
    };
  }

  private spawnEnemyTrap(
    x: number,
    y: number,
    type: EnemyTrapType,
    now: number
  ): void {
    // Cap active traps scaled moderately by chapter so high-level facilities feel fortified yet legible
    const maxActiveTraps = Math.min(16, 7 + Math.floor(this.level.chapter * 0.9));
    if (this.enemyTraps.length >= maxActiveTraps) {
      const oldest = this.enemyTraps.shift();
      if (oldest) this.destroyTrapVisuals(oldest);
    }
    // Avoid stacking traps directly on top of another trap
    if (this.enemyTraps.some((t) => Math.hypot(t.x - x, t.y - y) < 54)) {
      return;
    }

    const color =
      type === 'tripwire'
        ? 0xf43f5e
        : type === 'proximity_alarm'
        ? 0xa78bfa
        : 0xf59e0b;
    const radius = type === 'proximity_alarm' ? 48 : type === 'tripwire' ? 18 : 24;

    const ringGfx = this.add.circle(x, y, radius, color, 0.08).setStrokeStyle(1.5, color, 0.7).setDepth(5);
    const coreGfx = this.add
      .circle(x, y, type === 'proximity_alarm' ? 7 : 5.5, color, 0.95)
      .setStrokeStyle(1.5, 0xffffff, 0.85)
      .setDepth(6);

    let wireGfx: Phaser.GameObjects.Graphics | undefined;
    let wireLine: { x1: number; y1: number; x2: number; y2: number } | undefined;
    if (type === 'tripwire') {
      wireLine = this.computeTripwireLine(x, y);
      wireGfx = this.add.graphics().setDepth(6);
      wireGfx.lineStyle(2, 0xf43f5e, 0.85);
      wireGfx.lineBetween(wireLine.x1, wireLine.y1, wireLine.x2, wireLine.y2);
      wireGfx.fillStyle(0xfda4af, 0.95);
      wireGfx.fillCircle(wireLine.x1, wireLine.y1, 3);
      wireGfx.fillCircle(wireLine.x2, wireLine.y2, 3);
    }

    AudioSystem.playTone('ui');
    this.enemyTraps.push({
      x,
      y,
      radius,
      type,
      armTime: now + 800,
      expiresAt: now + (type === 'proximity_alarm' ? 34000 : 28000),
      coreGfx,
      ringGfx,
      wireGfx,
      wireLine,
    });
  }

  private updateEnemyTraps(now: number): void {
    const jammed = now <= this.jammedUntil;

    for (let i = this.enemyTraps.length - 1; i >= 0; i--) {
      const tr = this.enemyTraps[i];
      const armed = now >= tr.armTime && !jammed;
      const color =
        tr.type === 'tripwire'
          ? 0xf43f5e
          : tr.type === 'proximity_alarm'
          ? 0xa78bfa
          : 0xf59e0b;

      const pulse = jammed
        ? 0.02
        : armed
        ? 0.1 + Math.abs(Math.sin(now / (tr.type === 'proximity_alarm' ? 240 : 180))) * 0.16
        : 0.04;
      tr.ringGfx.setFillStyle(color, pulse);
      tr.ringGfx.setAlpha(jammed ? 0.3 : 1);
      tr.coreGfx.setAlpha(jammed ? 0.25 : armed ? 1 : 0.45);
      if (tr.wireGfx) {
        tr.wireGfx.setAlpha(jammed ? 0.2 : armed ? 0.95 : 0.4);
      }

      if (now >= tr.expiresAt) {
        this.destroyTrapVisuals(tr);
        this.enemyTraps.splice(i, 1);
        continue;
      }

      if (!armed || this.isHiding) continue;

      if (tr.type === 'tripwire' && tr.wireLine) {
        const nearestPt = Phaser.Geom.Line.GetNearestPoint(
          new Phaser.Geom.Line(tr.wireLine.x1, tr.wireLine.y1, tr.wireLine.x2, tr.wireLine.y2),
          new Phaser.Math.Vector2(this.player.x, this.player.y)
        );
        const distToWire = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestPt.x, nearestPt.y);
        if (distToWire <= 12) {
          if (now > this.vaultUntil && now > this.dodgeUntil) {
            this.detonateTrap(tr, now, true);
          } else {
            this.detonateTrap(tr, now, false);
            this.showToast('Tripwire leaped & snapped!', 1400);
          }
        }
      } else if (tr.type === 'proximity_alarm') {
        if (now <= this.cloakedUntil) continue;
        const effectiveRadius = this.isCrouching ? 30 : tr.radius;
        if (Math.hypot(this.player.x - tr.x, this.player.y - tr.y) <= effectiveRadius) {
          this.detonateTrap(tr, now, true);
        }
      } else if (Math.hypot(this.player.x - tr.x, this.player.y - tr.y) <= tr.radius) {
        if (now > this.vaultUntil && now > this.dodgeUntil) {
          this.detonateTrap(tr, now, true);
        } else {
          this.detonateTrap(tr, now, false);
          this.showToast('Trap tripped during vault — evaded!', 1400);
        }
      }
    }
  }

  private detonateTrap(tr: EnemyTrapRuntime, now: number, hitPlayer: boolean): void {
    const idx = this.enemyTraps.indexOf(tr);
    if (idx !== -1) {
      this.enemyTraps.splice(idx, 1);
    }
    this.destroyTrapVisuals(tr);

    const color =
      tr.type === 'tripwire'
        ? 0xf43f5e
        : tr.type === 'proximity_alarm'
        ? 0xa78bfa
        : 0xf59e0b;
    const blastRing = this.add.circle(tr.x, tr.y, 18, color, 0.35).setStrokeStyle(2.5, color, 0.95).setDepth(17);
    this.tweens.add({
      targets: blastRing,
      scale: tr.type === 'proximity_alarm' ? 4.2 : 3.1,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => blastRing.destroy(),
    });

    const distToPlayer = Math.hypot(this.player.x - tr.x, this.player.y - tr.y);

    if (tr.type === 'proximity_alarm') {
      AudioSystem.playTone('alert');
      this.drawNoiseRing(tr.x, tr.y, 210, color);
      for (const e of this.enemies) {
        if (Math.hypot(e.sprite.x - tr.x, e.sprite.y - tr.y) <= 360) {
          e.hearDisturbance(tr.x, tr.y, 100);
        }
      }
      if (distToPlayer <= 420) {
        const falloff = Math.max(0.35, 1 - distToPlayer / 420);
        this.triggerCameraShake(Math.round(180 + 80 * falloff), 0.018 * falloff);
      }
      if (hitPlayer) {
        this.triggerFacilityAlert(tr.x, tr.y);
        this.showToast('Proximity Alarm tripped! Security units converging!', 2100);
      }
      return;
    }

    AudioSystem.playTone('pulse');
    this.drawNoiseRing(tr.x, tr.y, 150, color);
    for (const e of this.enemies) {
      if (Math.hypot(e.sprite.x - tr.x, e.sprite.y - tr.y) <= 300) {
        e.hearDisturbance(tr.x, tr.y, 90);
      }
    }

    if (hitPlayer) {
      this.trapSlowUntil = now + (tr.type === 'tripwire' ? 1900 : 1700);
      const beforeHp = this.hp;
      this.damagePlayer(tr.type === 'tripwire' ? 24 : 22, now, 'trap');
      if (this.hp === beforeHp && distToPlayer <= 380) {
        this.triggerCameraShake(220, 0.016);
      }
      this.showToast(
        tr.type === 'tripwire'
          ? 'Tripped corridor tripwire! Movement slowed!'
          : 'Triggered Shock Mine! Speed reduced!',
        1800
      );
    } else if (distToPlayer <= 380) {
      const falloff = Math.max(0.28, 1 - distToPlayer / 380);
      this.triggerCameraShake(Math.round(160 + 110 * falloff), 0.02 * falloff);
    }
  }

  private triggerCameraShake(durationMs: number, intensity: number): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    const reduced = SaveSystem.getSave().settings.reducedMotion;
    const finalIntensity = reduced ? intensity * 0.3 : intensity;
    const finalDuration = reduced ? Math.min(durationMs, 110) : durationMs;
    cam.shake(finalDuration, finalIntensity, true);
  }

  private triggerFacilityAlert(x: number, y: number): void {
    this.alarmsTriggered += 1;
    AudioSystem.playTone('alert');

    if (this.launchData.mode === GameMode.GHOST_PROTOCOL) {
      this.failLevel('Ghost Protocol violated: Security alarm triggered.');
      return;
    }

    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.sprite.x - x, enemy.sprite.y - y);
      if (dist <= enemy.config.radioRangePx) {
        enemy.receiveRadioAlert(x, y, true);
      } else if (dist <= enemy.config.radioRangePx * 1.65) {
        enemy.receiveRadioAlert(x, y, false);
      }
    }
    this.showToast('ALERT: Security units converging & setting traps!', 2400);
  }

  private damagePlayer(
    amount: number,
    now: number,
    source: 'enemy' | 'boss' | 'trap' | 'hazard' = 'enemy'
  ): void {
    if (now < this.invulnerableUntil || this.levelFinished) return;
    const op = OPERATIVES[this.launchData.operativeId];
    const scaled = Math.max(1, Math.round(amount * op.modifiers.damageTakenMultiplier));
    this.hp = Math.max(0, this.hp - scaled);
    this.invulnerableUntil = now + 380;
    AudioSystem.playTone('damage');
    this.player.play(`${this.playerAnimPrefix}_damage`, true);
    this.player.setTint(0xfb7185);
    this.time.delayedCall(140, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });

    if (source === 'trap') {
      this.triggerCameraShake(260, Math.min(0.025, 0.017 + scaled * 0.0003));
    } else if (source === 'boss') {
      this.triggerCameraShake(240, Math.min(0.024, 0.015 + scaled * 0.00025));
    } else if (source === 'hazard') {
      this.triggerCameraShake(210, 0.017);
    } else {
      this.triggerCameraShake(190, Math.min(0.021, 0.012 + scaled * 0.0003));
    }

    if (this.hp <= 0) {
      this.failLevel('Operative incapacitated during infiltration.');
    }
  }

  private triggerEscapeSequence(): void {
    this.escapeActive = true;
    this.escapeTimeRemainingSec = this.level.escapeTimerSec ?? 60;
    AudioSystem.playTone('alert');
    AudioSystem.setMood('alert');
    this.showToast(`LOCKDOWN INITIATED! Reach Extraction in ${this.escapeTimeRemainingSec}s!`, 3200);
  }

  private updateEscapeSequence(now: number, dtSec: number): void {
    if (!this.escapeActive) {
      this.escapeTintGfx.setFillStyle(0xf43f5e, 0);
      return;
    }
    this.escapeTimeRemainingSec = Math.max(0, this.escapeTimeRemainingSec - dtSec);
    const pulse = 0.08 + Math.abs(Math.sin(now / 260)) * 0.1;
    this.escapeTintGfx.setFillStyle(0xf43f5e, pulse);
    if (this.escapeTimeRemainingSec <= 0) {
      this.failLevel('Lockdown timer expired before extraction.');
    }
  }

  private updateReconOverlay(now: number): void {
    this.reconOverlayGfx.clear();
    if (now > this.reconUntil) return;

    this.reconOverlayGfx.lineStyle(1.5, 0x67e8f9, 0.65);
    for (const item of this.interactives) {
      if (!item.completed && (item.spec.type === InteractiveType.INTEL_DOSSIER || item.spec.type === InteractiveType.COLLECTIBLE || item.spec.type === InteractiveType.KEYCARD || item.spec.type === InteractiveType.VENT_ENTRANCE)) {
        this.reconOverlayGfx.strokeCircle(item.gfx.x, item.gfx.y, 18);
      }
    }
    this.reconOverlayGfx.lineStyle(1.5, 0xf43f5e, 0.75);
    for (const enemy of this.enemies) {
      this.reconOverlayGfx.strokeCircle(enemy.sprite.x, enemy.sprite.y, 18);
    }
    if (this.inventory.doesScannerRevealTraps()) {
      this.reconOverlayGfx.lineStyle(1.5, 0xf59e0b, 0.85);
      for (const tr of this.enemyTraps) {
        this.reconOverlayGfx.strokeCircle(tr.x, tr.y, 14);
      }
    }
  }

  private drawNoiseRing(x: number, y: number, radius: number, color: number): void {
    const ring = this.add.circle(x, y, 8, color, 0).setStrokeStyle(2, color, 0.8).setDepth(9);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });
  }

  private onBossDefeated(): void {
    if (!this.bossController) return;
    SaveSystem.recordBossEncounter(this.bossController.boss.id, true, this.elapsedSec);
    this.showToast(`${this.bossController.boss.name} neutralized! Proceed to Extraction Elevator.`, 3500);
  }

  private arePrimaryObjectivesComplete(): boolean {
    for (const obj of this.level.objectives) {
      if (obj.optional || obj.type === 'extract') continue;
      if (obj.type === 'intel' && this.intelFound < obj.targetCount) return false;
      if (obj.type === 'terminal' && this.terminalsHacked < obj.targetCount) return false;
      if (obj.type === 'boss' && (!this.bossController || !this.bossController.defeated)) return false;
    }
    return true;
  }

  private checkAutoExtraction(explicitPress = false): void {
    const exitRuntime = this.interactives.find((i) => i.spec.type === InteractiveType.EXIT);
    if (!exitRuntime) return;
    const dist = Math.hypot(this.player.x - exitRuntime.gfx.x, this.player.y - exitRuntime.gfx.y);
    if (dist > 34) return;

    if (!this.arePrimaryObjectivesComplete()) {
      if (explicitPress) {
        this.showToast('Complete primary mission objectives before extracting.', 2200);
      }
      return;
    }

    this.completeLevel();
  }

  private completeLevel(): void {
    if (this.levelFinished) return;
    this.levelFinished = true;
    AudioSystem.playTone('victory');

    const timeSec = Math.round(this.elapsedSec * 10) / 10;
    const rank: 'S' | 'A' | 'B' | 'C' =
      this.alarmsTriggered === 0 && timeSec < 75
        ? 'S'
        : this.alarmsTriggered <= 1 && timeSec < 120
        ? 'A'
        : this.alarmsTriggered <= 3
        ? 'B'
        : 'C';

    const creditBreakdown = SaveSystem.recordLevelCompletion({
      levelId: this.level.id,
      timeSec,
      alarmsTriggered: this.alarmsTriggered,
      optionalCompleted: this.optionalFound > 0,
      collectiblesFound: this.optionalFound,
      intelFound: this.intelFound,
      hiddenRoomsFound: this.hiddenRoomsFound,
      rank,
      operativeId: this.launchData.operativeId,
      mode: this.launchData.mode,
    });

    EventBus.emitLevelEnd({
      victory: true,
      levelId: this.level.id,
      elapsedSec: timeSec,
      alarmsTriggered: this.alarmsTriggered,
      optionalCompleted: this.optionalFound > 0,
      collectiblesFound: this.optionalFound,
      hiddenRoomsFound: this.hiddenRoomsFound,
      intelFound: this.intelFound,
      rank,
      creditBreakdown,
      newBalance: SaveSystem.getSave().shadowCredits,
    });
  }

  private failLevel(reason: string): void {
    if (this.levelFinished) return;
    this.levelFinished = true;
    AudioSystem.playTone('damage');
    if (this.bossController) {
      SaveSystem.recordBossEncounter(this.bossController.boss.id, false, this.elapsedSec);
    }

    EventBus.emitLevelEnd({
      victory: false,
      levelId: this.level.id,
      elapsedSec: Math.round(this.elapsedSec * 10) / 10,
      alarmsTriggered: this.alarmsTriggered,
      optionalCompleted: false,
      collectiblesFound: this.optionalFound,
      rank: 'C',
      reason,
    });
  }

  private findNearestInteractive(): InteractiveRuntime | null {
    let best: InteractiveRuntime | null = null;
    let bestDist = 48;
    for (const item of this.interactives) {
      if (item.completed && item.spec.type !== InteractiveType.LOCKER && item.spec.type !== InteractiveType.VENT_ENTRANCE && item.spec.type !== InteractiveType.DISGUISE_STATION && item.spec.type !== InteractiveType.EXIT) {
        continue;
      }
      const d = Math.hypot(item.gfx.x - this.player.x, item.gfx.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return best;
  }

  private showToast(msg: string, durationMs: number): void {
    this.toastMessage = msg;
    this.toastUntil = this.time.now + durationMs;
  }

  private computeActiveDirective(): {
    instruction: string;
    targetLabel: string;
    angleDeg: number;
    distanceMeters: number;
    urgent: boolean;
    targetX: number;
    targetY: number;
  } | null {
    const px = this.player.x;
    const py = this.player.y;

    let instruction = 'Reach Extraction Point';
    let targetLabel = 'Extraction';
    let targetX = this.level.exit.x * this.level.tileSize + this.level.tileSize / 2;
    let targetY = this.level.exit.y * this.level.tileSize + this.level.tileSize / 2;
    let urgent = this.escapeActive;

    const intelObj = this.level.objectives.find((o) => o.type === 'intel' && !o.optional);
    const termObj = this.level.objectives.find((o) => o.type === 'terminal' && !o.optional);

    if (this.bossController && !this.bossController.defeated) {
      urgent = true;
      if (this.bossController.shielded) {
        const relay = this.interactives.find(
          (i) => i.spec.type === InteractiveType.TERMINAL && !i.completed
        );
        if (relay) {
          instruction = 'Hack Shield Relay (Press E) to drop Boss Shield';
          targetLabel = relay.spec.label;
          targetX = relay.gfx.x;
          targetY = relay.gfx.y;
        } else {
          instruction = `Strike ${this.bossController.boss.name} with Pulse Tool (Key 5)`;
          targetLabel = this.bossController.boss.name;
          targetX = this.bossController.sprite.x;
          targetY = this.bossController.sprite.y;
        }
      } else {
        instruction = `Attack ${this.bossController.boss.name} with Pulse Tool (Key 5)`;
        targetLabel = this.bossController.boss.name;
        targetX = this.bossController.sprite.x;
        targetY = this.bossController.sprite.y;
      }
    } else if (intelObj && this.intelFound < intelObj.targetCount) {
      let nearestIntel: InteractiveRuntime | null = null;
      let bestDist = Infinity;
      for (const item of this.interactives) {
        if (item.spec.type === InteractiveType.INTEL_DOSSIER && !item.completed) {
          const d = Math.hypot(item.gfx.x - px, item.gfx.y - py);
          if (d < bestDist) {
            bestDist = d;
            nearestIntel = item;
          }
        }
      }
      if (nearestIntel) {
        instruction = `Collect Classified Intel (${this.intelFound}/${intelObj.targetCount}) · Press E nearby`;
        targetLabel = nearestIntel.spec.label;
        targetX = nearestIntel.gfx.x;
        targetY = nearestIntel.gfx.y;
      }
    } else if (termObj && this.terminalsHacked < termObj.targetCount) {
      // Prioritize Mainframe terminal (last terminal) or unhacked terminal
      const unhacked = this.interactives.filter(
        (i) => i.spec.type === InteractiveType.TERMINAL && !i.completed
      );
      const targetTerm =
        unhacked.find((t) => t.spec.label.toLowerCase().includes('mainframe')) ?? unhacked[0];
      if (targetTerm) {
        instruction = `Hack ${targetTerm.spec.label} (Press E nearby)`;
        targetLabel = targetTerm.spec.label;
        targetX = targetTerm.gfx.x;
        targetY = targetTerm.gfx.y;
      }
    } else {
      const exitItem = this.interactives.find((i) => i.spec.type === InteractiveType.EXIT);
      if (exitItem) {
        targetX = exitItem.gfx.x;
        targetY = exitItem.gfx.y;
      }
      instruction = this.escapeActive
        ? `ESCAPE NOW! Reach Extraction (${Math.ceil(this.escapeTimeRemainingSec)}s)`
        : 'Objectives Complete — Follow arrow to Extraction Point';
      targetLabel = 'Extraction Point';
    }

    const dx = targetX - px;
    const dy = targetY - py;
    const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const distanceMeters = Math.max(1, Math.round(Math.hypot(dx, dy) / 20));

    return {
      instruction,
      targetLabel,
      angleDeg,
      distanceMeters,
      urgent,
      targetX,
      targetY,
    };
  }

  private updateWaypointGuide(now: number): void {
    this.waypointGfx.clear();
    this.objectiveBeaconsGfx.clear();
    if (this.levelFinished) return;

    // Pulsing world-space objective indicator rings on active mission targets
    const primaryComplete = this.arePrimaryObjectivesComplete();
    const pulse = 0.45 + Math.abs(Math.sin(now / 360)) * 0.45;
    const beaconRadius = 21 + Math.sin(now / 360) * 3;
    for (const item of this.interactives) {
      if (item.completed) continue;
      if (item.spec.type === InteractiveType.INTEL_DOSSIER) {
        this.objectiveBeaconsGfx.lineStyle(1.8, 0x38bdf8, pulse);
        this.objectiveBeaconsGfx.strokeCircle(item.gfx.x, item.gfx.y, beaconRadius);
      } else if (item.spec.type === InteractiveType.TERMINAL && this.level.objectives.some((o) => o.type === 'terminal' && !o.optional)) {
        this.objectiveBeaconsGfx.lineStyle(1.8, 0x22d3ee, pulse * 0.9);
        this.objectiveBeaconsGfx.strokeCircle(item.gfx.x, item.gfx.y, beaconRadius);
      } else if (item.spec.type === InteractiveType.EXIT && primaryComplete) {
        this.objectiveBeaconsGfx.lineStyle(2.2, 0x34d399, pulse);
        this.objectiveBeaconsGfx.strokeCircle(item.gfx.x, item.gfx.y, beaconRadius + 4);
      }
    }

    if (this.isHiding) return;
    const dir = this.computeActiveDirective();
    if (!dir) return;

    const dx = dir.targetX - this.player.x;
    const dy = dir.targetY - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 42) return;

    const ang = Math.atan2(dy, dx);
    const orbit = 32 + Math.sin(now / 220) * 2.5;
    const cx = this.player.x + Math.cos(ang) * orbit;
    const cy = this.player.y + Math.sin(ang) * orbit;

    const color = dir.urgent ? 0xfb7185 : primaryComplete ? 0x34d399 : 0x38bdf8;
    const tipX = cx + Math.cos(ang) * 7;
    const tipY = cy + Math.sin(ang) * 7;
    const leftX = cx + Math.cos(ang + 2.4) * 6;
    const leftY = cy + Math.sin(ang + 2.4) * 6;
    const rightX = cx + Math.cos(ang - 2.4) * 6;
    const rightY = cy + Math.sin(ang - 2.4) * 6;

    this.waypointGfx.fillStyle(color, 0.88);
    this.waypointGfx.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
  }

  private computeObjectiveMarkers(
    primaryTargetLabel: string | null
  ): HudSnapshot['objectiveMarkers'] {
    const px = this.player.x;
    const py = this.player.y;
    const view = this.cameras.main.worldView;
    const primaryComplete = this.arePrimaryObjectivesComplete();

    return this.level.objectives.map((o) => {
      let current = 0;
      let targetX = this.level.exit.x * this.level.tileSize + this.level.tileSize / 2;
      let targetY = this.level.exit.y * this.level.tileSize + this.level.tileSize / 2;
      let label = o.description;

      if (o.type === 'intel') {
        current = this.intelFound;
        label = 'Intel';
        let bestDist = Infinity;
        for (const item of this.interactives) {
          if (item.spec.type === InteractiveType.INTEL_DOSSIER && !item.completed) {
            const d = Math.hypot(item.gfx.x - px, item.gfx.y - py);
            if (d < bestDist) {
              bestDist = d;
              targetX = item.gfx.x;
              targetY = item.gfx.y;
            }
          }
        }
      } else if (o.type === 'terminal') {
        current = this.terminalsHacked;
        label = 'Terminal';
        let bestDist = Infinity;
        for (const item of this.interactives) {
          if (item.spec.type === InteractiveType.TERMINAL && !item.completed) {
            const d = Math.hypot(item.gfx.x - px, item.gfx.y - py);
            if (d < bestDist) {
              bestDist = d;
              targetX = item.gfx.x;
              targetY = item.gfx.y;
            }
          }
        }
      } else if (o.type === 'boss') {
        current = this.bossController?.defeated ? 1 : 0;
        label = this.bossController?.boss.name ?? 'Target';
        if (this.bossController) {
          targetX = this.bossController.sprite.x;
          targetY = this.bossController.sprite.y;
        }
      } else if (o.type === 'keycard') {
        current = this.optionalFound;
        label = 'Bonus';
        let bestDist = Infinity;
        for (const item of this.interactives) {
          if (
            (item.spec.type === InteractiveType.COLLECTIBLE || item.spec.type === InteractiveType.KEYCARD) &&
            !item.completed
          ) {
            const d = Math.hypot(item.gfx.x - px, item.gfx.y - py);
            if (d < bestDist) {
              bestDist = d;
              targetX = item.gfx.x;
              targetY = item.gfx.y;
            }
          }
        }
      } else if (o.type === 'extract' || o.type === 'escape') {
        current = 0;
        label = o.type === 'escape' ? 'Escape' : 'Extract';
        const exitItem = this.interactives.find((i) => i.spec.type === InteractiveType.EXIT);
        if (exitItem) {
          targetX = exitItem.gfx.x;
          targetY = exitItem.gfx.y;
        }
      }

      const kind: HudSnapshot['objectiveMarkers'][number]['kind'] =
        o.type === 'escape' ? 'extract' : o.type;
      const completed = o.type === 'extract' || o.type === 'escape' ? false : current >= o.targetCount;
      const dx = targetX - px;
      const dy = targetY - py;
      const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      const distanceMeters = Math.max(1, Math.round(Math.hypot(dx, dy) / 20));
      const inView =
        targetX >= view.x + 24 &&
        targetX <= view.right - 24 &&
        targetY >= view.y + 24 &&
        targetY <= view.bottom - 24;

      const isPrimaryTarget =
        !completed &&
        (((o.type === 'extract' || o.type === 'escape') && primaryComplete) ||
          (primaryTargetLabel !== null &&
            (label === 'Intel'
              ? primaryTargetLabel.toLowerCase().includes('intel') || primaryTargetLabel.toLowerCase().includes('dossier')
              : label === 'Terminal'
              ? primaryTargetLabel.toLowerCase().includes('terminal') || primaryTargetLabel.toLowerCase().includes('mainframe') || primaryTargetLabel.toLowerCase().includes('relay')
              : o.type === 'boss'
              ? primaryTargetLabel === this.bossController?.boss.name
              : false)));

      return {
        id: o.id,
        kind,
        label,
        current: Math.min(current, o.targetCount),
        target: o.targetCount,
        completed,
        optional: Boolean(o.optional),
        angleDeg,
        distanceMeters,
        isPrimaryTarget,
        screenEdge: !completed && !inView && (!o.optional || primaryComplete),
      };
    });
  }

  private emitHud(force: boolean): void {
    if (!force && this.levelFinished) return;
    const now = this.time.now;
    const ch = CHAPTERS[this.level.chapter - 1];

    let maxSuspicion = 0;
    let awareness = AwarenessState.UNAWARE;
    for (const e of this.enemies) {
      if (e.suspicion > maxSuspicion) maxSuspicion = e.suspicion;
      const aw = e.getAwarenessState();
      if (aw === AwarenessState.ALERTED) awareness = AwarenessState.ALERTED;
      else if (aw === AwarenessState.INVESTIGATING && awareness !== AwarenessState.ALERTED) awareness = AwarenessState.INVESTIGATING;
      else if (aw === AwarenessState.SUSPICIOUS && awareness === AwarenessState.UNAWARE) awareness = AwarenessState.SUSPICIOUS;
      else if (aw === AwarenessState.CURIOUS && awareness === AwarenessState.UNAWARE) awareness = AwarenessState.CURIOUS;
    }

    const nearest = this.findNearestInteractive();
    const save = SaveSystem.getSave();
    const op = OPERATIVES[this.launchData.operativeId];
    const speedNow = Math.hypot(this.velX, this.velY);
    const momentumPct = Math.min(100, Math.round((speedNow / 290) * 100));
    const directive = this.computeActiveDirective();

    const snapshot: HudSnapshot = {
      levelId: this.level.id,
      levelName: this.level.name,
      chapterTitle: `Chapter ${ch.id}: ${ch.title}`,
      mode: this.launchData.mode,
      operativeId: this.launchData.operativeId,
      operativeClass: op.classType,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      staminaRecovering: this.movementManager.isRecovering(now),
      momentumPct,
      parkourChain: this.parkourChain,
      isVaulting: now < this.vaultUntil,
      isSliding: now < this.slideUntil,
      isCrouching: this.isCrouching,
      isHiding: this.isHiding,
      isCloaked: now <= this.cloakedUntil,
      isDisguised: this.isDisguised,
      awareness,
      maxSuspicion: Math.round(maxSuspicion),
      visibilityPct: Math.round(this.visibilityPct),
      visibilityState: this.visibilityState,
      escapeActive: this.escapeActive,
      escapeTimeRemainingSec: this.escapeActive ? Math.ceil(this.escapeTimeRemainingSec) : null,
      objectives: this.level.objectives.map((o) => {
        let current = 0;
        if (o.type === 'intel') current = this.intelFound;
        else if (o.type === 'terminal') current = this.terminalsHacked;
        else if (o.type === 'boss') current = this.bossController?.defeated ? 1 : 0;
        else if (o.type === 'keycard') current = this.optionalFound;
        else if (o.type === 'extract') current = 0;
        return {
          id: o.id,
          description: o.description,
          current: Math.min(current, o.targetCount),
          target: o.targetCount,
          completed: current >= o.targetCount,
          optional: o.optional,
        };
      }),
      equipmentSlots: EQUIPMENT_ORDER.map((id) => ({
        id,
        charges: this.inventory.getCharges(id),
        maxCharges: this.inventory.getMaxCharges(id),
        cooldownRemaining: this.inventory.getCooldownRemainingSec(id, now),
        cooldownTotal: this.inventory.getCooldownTotalSec(id),
        unlocked: this.inventory.isUnlocked(
          id,
          save,
          this.level.isBossLevel,
          this.launchData.mode
        ),
      })),
      selectedGadget: this.inventory.selectedGadget,
      pulseTaggerEnergy: this.inventory.getPulseTaggerSnapshot(),
      activeAimRangePx:
        this.inventory.selectedGadget === EquipmentId.PULSE_TAGGER &&
        this.inventory.isUnlocked(
          EquipmentId.PULSE_TAGGER,
          save,
          this.level.isBossLevel,
          this.launchData.mode
        )
          ? this.inventory.getPulseTaggerRangePx()
          : null,
      activePrompt: this.isHiding
        ? 'Press E or Move to exit locker'
        : this.activeTakedownCandidate
        ? 'Press E — Non-Lethal Takedown'
        : nearest
        ? `Press E — ${nearest.spec.label}`
        : null,
      takedownPrompt: this.activeTakedownCandidate ? 'Press E — Non-Lethal Takedown' : null,
      activeDirective: directive
        ? {
            instruction: directive.instruction,
            targetLabel: directive.targetLabel,
            angleDeg: directive.angleDeg,
            distanceMeters: directive.distanceMeters,
            urgent: directive.urgent,
          }
        : null,
      objectiveMarkers: this.computeObjectiveMarkers(directive?.targetLabel ?? null),
      tacticalStatus: {
        coordinatingCount: this.enemies.filter((e) => e.hasActiveTacticalOrder(now)).length,
        activeTrapCount: this.enemyTraps.length,
        callout: this.tacticalAI.lastCallout,
      },
      elapsedSec: Math.floor(this.elapsedSec),
      alarmsTriggered: this.alarmsTriggered,
      keycardsCollected: [...this.keycardsCollected],
      hiddenRoomsFound: this.hiddenRoomsFound,
      shadowCreditsBalance: save.shadowCredits,
      bossState: this.bossController
        ? {
            active: !this.bossController.defeated,
            bossId: this.bossController.boss.id,
            name: this.bossController.boss.name,
            title: this.bossController.boss.title,
            resolve: this.bossController.resolve,
            maxResolve: this.bossController.maxResolve,
            phase: this.bossController.phase,
            shielded: this.bossController.shielded,
            bannerText: this.bossController.bannerText,
          }
        : null,
      toastMessage: this.toastMessage,
    };

    EventBus.emitHudUpdate(snapshot);
  }
}
