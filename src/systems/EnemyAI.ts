import Phaser from 'phaser';
import { ENEMY_ARCHETYPES } from '@/src/data/enemies';
import { EnemyAwareness } from '@/src/systems/EnemyAwareness';
import { hasLineOfSight, isInsideFovCone } from '@/src/systems/StealthSystem';
import {
  AwarenessState,
  EnemyAIState,
  EnemyArchetype,
  EnemyArchetypeConfig,
  EnemyPlacement,
  EnemyTrapType,
  LevelDefinition,
  TileType,
} from '@/src/types/game';

export interface EnemyContext {
  level: LevelDefinition;
  playerX: number;
  playerY: number;
  playerVisibleFactor: number; // 0 if hidden/cloaked, lower in dark corner/crouch
  playerNoiseRadius: number;
  playerDisguised: boolean;
  closedDoors: Set<string>;
  jammedUntil: number;
  now: number;
  dtSec: number;
  difficultyScale: number;
  onAlertTriggered: (x: number, y: number) => void;
  onPlayerHit: (damage: number) => void;
  onFireProjectile?: (x: number, y: number, angleRad: number, config: EnemyArchetypeConfig) => void;
  onDeployTrap?: (x: number, y: number, trapType: EnemyTrapType, ownerId: string) => void;
}

export class EnemyAgent {
  public readonly id: string;
  public readonly archetype: EnemyArchetype;
  public readonly config: EnemyArchetypeConfig;
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly coneGfx: Phaser.GameObjects.Graphics;
  public readonly statusText: Phaser.GameObjects.Text;

  public state: EnemyAIState = EnemyAIState.PATROL;
  public suspicion = 0; // 0..100
  public facingRad = 0;
  public stunnedUntil = 0;
  public recoveringUntil = 0;
  public noticedDisabledAllies = new Set<string>();

  private patrolPoints: Array<{ x: number; y: number }> = [];
  private patrolIndex = 0;
  private stateTimer = 0;
  private targetPos: { x: number; y: number } | null = null;
  private attackCooldownUntil = 0;
  private aimStartTime = 0;
  private firingPoseUntil = 0;
  private trapCooldownUntil = 0;
  private lastTrapPos: { x: number; y: number } | null = null;
  private patrolTrapsPlaced = 0;
  private tacticalOrder: {
    x: number;
    y: number;
    trapType: EnemyTrapType;
    label: string;
    expiresAt: number;
  } | null = null;
  private tacticalBadgeUntil = 0;
  private tacticalBadgeText = '';
  private nextPathRefreshAt = 0;
  private cachedChaseTarget: { x: number; y: number } | null = null;
  private lastSeenAt = 0;
  private observeSweepDir = 1;

  constructor(scene: Phaser.Scene, placement: EnemyPlacement, tileSize: number) {
    this.id = placement.id;
    this.archetype = placement.archetype;
    this.config = ENEMY_ARCHETYPES[placement.archetype];
    this.facingRad = (placement.initialFacingDeg * Math.PI) / 180;

    const sx = placement.spawn.x * tileSize + tileSize / 2;
    const sy = placement.spawn.y * tileSize + tileSize / 2;
    this.patrolPoints = placement.patrolPath.map((p) => ({
      x: p.x * tileSize + tileSize / 2,
      y: p.y * tileSize + tileSize / 2,
    }));
    if (this.patrolPoints.length === 0) {
      this.patrolPoints.push({ x: sx, y: sy });
    }

    this.coneGfx = scene.add.graphics();
    this.coneGfx.setDepth(4);

    const ssKey = `sheet_enemy_${this.archetype}_ss`;
    this.sprite = scene.physics.add.sprite(sx, sy, ssKey, 0);
    this.sprite.setDepth(10);
    this.sprite.setCollideWorldBounds(true);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 22);
    body.setOffset(13, 18);

    this.statusText = scene.add.text(sx, sy - 26, '', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f8fafc',
      stroke: '#020617',
      strokeThickness: 3,
    });
    this.statusText.setOrigin(0.5);
    this.statusText.setDepth(15);
  }

  public hearDisturbance(x: number, y: number, strength = 45): void {
    if (this.state === EnemyAIState.STUNNED || this.state === EnemyAIState.RECOVERING) return;
    this.suspicion = Math.max(this.suspicion, strength);
    this.targetPos = { x, y };
    if (this.state !== EnemyAIState.ALERT) {
      this.state = EnemyAIState.INVESTIGATE;
      this.stateTimer = 0;
    }
  }

  public receiveRadioAlert(x: number, y: number, escalateAlert = true): void {
    if (this.state === EnemyAIState.STUNNED || this.state === EnemyAIState.RECOVERING) return;
    this.suspicion = Math.max(this.suspicion, escalateAlert ? 100 : 82);
    this.targetPos = { x, y };
    this.cachedChaseTarget = null;
    if (escalateAlert) {
      this.state = EnemyAIState.ALERT;
      this.stateTimer = 0;
    } else if (this.state !== EnemyAIState.ALERT) {
      this.state = EnemyAIState.INVESTIGATE;
      this.stateTimer = 0;
    }
  }

  public stun(durationMs: number, now: number): void {
    this.stunnedUntil = now + durationMs;
    this.recoveringUntil = 0;
    this.state = EnemyAIState.STUNNED;
    this.suspicion = 0;
    this.tacticalOrder = null;
    this.sprite.setVelocity(0, 0);
    this.sprite.play(`enemy_${this.archetype}_stunned`, true);
  }

  public hasActiveTacticalOrder(now: number): boolean {
    if (!this.tacticalOrder) return false;
    if (now >= this.tacticalOrder.expiresAt) {
      this.tacticalOrder = null;
      return false;
    }
    return true;
  }

  public assignTacticalTrapOrder(
    x: number,
    y: number,
    trapType: EnemyTrapType,
    label: string,
    now: number,
    expiresAt: number
  ): void {
    if (this.state === EnemyAIState.STUNNED || this.state === EnemyAIState.RECOVERING) return;
    this.tacticalOrder = { x, y, trapType, label, expiresAt };
    this.tacticalBadgeText = label;
    this.tacticalBadgeUntil = now + 2600;
    this.cachedChaseTarget = null;
  }

  public getAwarenessState(): AwarenessState {
    return EnemyAwareness.resolveAwareness(this.state, this.suspicion);
  }

  public update(ctx: EnemyContext): void {
    const { now, dtSec } = ctx;

    if (this.state === EnemyAIState.STUNNED) {
      this.sprite.setVelocity(0, 0);
      this.statusText.setPosition(this.sprite.x, this.sprite.y - 26);
      this.statusText.setText('DISABLED');
      this.statusText.setColor('#94a3b8');
      this.coneGfx.clear();
      if (now >= this.stunnedUntil) {
        this.state = EnemyAIState.RECOVERING;
        this.recoveringUntil = now + 2600;
        this.stateTimer = 0;
      }
      return;
    }

    if (this.state === EnemyAIState.RECOVERING) {
      this.sprite.setVelocity(0, 0);
      this.facingRad += Math.sin(now / 190) * 1.4 * dtSec;
      this.sprite.play(`enemy_${this.archetype}_idle`, true);
      this.statusText.setPosition(this.sprite.x, this.sprite.y - 26);
      this.statusText.setText('RECOVER');
      this.statusText.setColor('#38bdf8');
      this.coneGfx.clear();
      if (now >= this.recoveringUntil) {
        this.state = EnemyAIState.SEARCH;
        this.suspicion = Math.max(this.suspicion, 42);
        this.stateTimer = 0;
      }
      return;
    }

    // 1. Vision, Close Proximity & Sound Perception
    const ex = this.sprite.x;
    const ey = this.sprite.y;
    const { inCone, distance } = isInsideFovCone(
      ex,
      ey,
      this.facingRad,
      this.config.fovAngleDeg,
      this.config.fovRangePx,
      ctx.playerX,
      ctx.playerY
    );

    const distToPlayer = Math.hypot(ctx.playerX - ex, ctx.playerY - ey);
    const closePresence = distToPlayer < 72 && ctx.playerVisibleFactor > 0.1;

    let canSeePlayer = false;
    if ((inCone || closePresence) && ctx.playerVisibleFactor > 0.05) {
      const disguiseBypass =
        ctx.playerDisguised &&
        this.archetype !== EnemyArchetype.ELITE_AGENT &&
        this.archetype !== EnemyArchetype.TRACKER &&
        distance > 65;

      if (!disguiseBypass) {
        canSeePlayer = hasLineOfSight(ctx.level, ex, ey, ctx.playerX, ctx.playerY, ctx.closedDoors);
      }
    }

    // Proximity noise detection
    const hearsPlayer = ctx.playerNoiseRadius > 0 && distToPlayer <= ctx.playerNoiseRadius;

    if (canSeePlayer) {
      this.lastSeenAt = now;
      const distFactor = Math.max(0.65, 1.6 - distToPlayer / this.config.fovRangePx);
      const gain =
        this.config.suspicionGainRate *
        distFactor *
        ctx.playerVisibleFactor *
        ctx.difficultyScale *
        dtSec;
      this.suspicion = Math.min(100, this.suspicion + gain);
      this.targetPos = { x: ctx.playerX, y: ctx.playerY };

      if (this.suspicion >= 100 || closePresence) {
        if (this.state !== EnemyAIState.ALERT) {
          this.suspicion = 100;
          this.state = EnemyAIState.ALERT;
          this.stateTimer = 0;
          if (now > ctx.jammedUntil) {
            ctx.onAlertTriggered(ctx.playerX, ctx.playerY);
          }
        }
      } else if (this.suspicion >= 26 && this.state !== EnemyAIState.ALERT) {
        this.state = EnemyAIState.INVESTIGATE;
      }
    } else {
      if (hearsPlayer && this.state !== EnemyAIState.ALERT) {
        this.hearDisturbance(ctx.playerX, ctx.playerY, 48);
      }
      // If recently alerted, keep updating player target slightly so guards actively hunt around corners!
      if (this.state === EnemyAIState.ALERT && now - this.lastSeenAt < 1800 && ctx.playerVisibleFactor > 0.1) {
        this.targetPos = { x: ctx.playerX, y: ctx.playerY };
      }
      const decayRate = this.state === EnemyAIState.ALERT ? 5 : 14;
      this.suspicion = Math.max(0, this.suspicion - decayRate * dtSec);
    }

    // Tactical & Proactive Trap Deployment (scales with mission level & archetype)
    this.maybeDeployTrap(ctx, ex, ey);

    // 2. State Machine Execution
    this.stateTimer += dtSec;

    if (this.tacticalOrder && now >= this.tacticalOrder.expiresAt) {
      this.tacticalOrder = null;
    }

    if (this.tacticalOrder && !canSeePlayer && now > ctx.jammedUntil) {
      const orderSpeed = Math.max(this.config.patrolSpeed * 1.35, this.config.alertSpeed * 0.86) * ctx.difficultyScale;
      const arrivedOrder = this.chaseTargetWithPathfinding(ctx, this.tacticalOrder.x, this.tacticalOrder.y, orderSpeed);
      if (arrivedOrder || Math.hypot(this.tacticalOrder.x - ex, this.tacticalOrder.y - ey) <= 22) {
        if (ctx.onDeployTrap) {
          ctx.onDeployTrap(this.tacticalOrder.x, this.tacticalOrder.y, this.tacticalOrder.trapType, this.id);
          this.lastTrapPos = { x: this.tacticalOrder.x, y: this.tacticalOrder.y };
          this.trapCooldownUntil = now + 5200;
        }
        this.tacticalBadgeText = 'SET!';
        this.tacticalBadgeUntil = now + 1100;
        this.tacticalOrder = null;
      }
    } else {
      switch (this.state) {
      case EnemyAIState.PATROL: {
        const wp = this.patrolPoints[this.patrolIndex];
        const arrived = this.moveToward(wp.x, wp.y, this.config.patrolSpeed * ctx.difficultyScale);
        if (arrived) {
          this.state = EnemyAIState.OBSERVE;
          this.stateTimer = 0;
          this.observeSweepDir = this.observeSweepDir * -1;
          this.sprite.setVelocity(0, 0);
        }
        break;
      }
      case EnemyAIState.OBSERVE: {
        this.sprite.setVelocity(0, 0);
        this.facingRad += this.observeSweepDir * 0.9 * dtSec;
        if (this.stateTimer >= 1.2) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
          this.state = EnemyAIState.PATROL;
          this.stateTimer = 0;
        }
        break;
      }
      case EnemyAIState.INVESTIGATE: {
        if (!this.targetPos) {
          this.state = EnemyAIState.SEARCH;
          this.stateTimer = 0;
          break;
        }
        const arrived = this.chaseTargetWithPathfinding(
          ctx,
          this.targetPos.x,
          this.targetPos.y,
          this.config.patrolSpeed * 1.3 * ctx.difficultyScale
        );
        if (arrived || this.stateTimer > 6.5) {
          this.state = EnemyAIState.SEARCH;
          this.stateTimer = 0;
        }
        break;
      }
      case EnemyAIState.SEARCH: {
        this.sprite.setVelocity(0, 0);
        this.facingRad += Math.sin(this.stateTimer * 2.8) * 2.1 * dtSec;
        if (this.stateTimer >= 3.2 && this.suspicion < 25) {
          this.state = EnemyAIState.RETURN;
          this.stateTimer = 0;
        }
        break;
      }
      case EnemyAIState.ALERT: {
        const fireRange = this.config.fireRangePx;
        const holdDist = 78;

        if (canSeePlayer) {
          this.facingRad = Math.atan2(ctx.playerY - ey, ctx.playerX - ex);
          this.sprite.setFlipX(Math.cos(this.facingRad) < 0);

          if (distToPlayer > holdDist && this.targetPos) {
            // Advance aggressively while keeping guns raised
            const advanceSpeed =
              distToPlayer > fireRange * 0.72
                ? this.config.alertSpeed * ctx.difficultyScale
                : this.config.alertSpeed * 0.68 * ctx.difficultyScale;
            this.moveToward(this.targetPos.x, this.targetPos.y, advanceSpeed);
          } else {
            this.sprite.setVelocity(0, 0);
          }

          // Snappy 180ms aim windup & firearm trigger
          if (distToPlayer <= fireRange && now >= this.attackCooldownUntil) {
            if (this.aimStartTime === 0) {
              this.aimStartTime = now;
            } else if (now - this.aimStartTime >= 180) {
              this.aimStartTime = 0;
              this.attackCooldownUntil =
                now + Math.max(460, this.config.fireIntervalMs / ctx.difficultyScale);
              this.firingPoseUntil = now + 220;
              this.sprite.play(`enemy_${this.archetype}_fire`, true);
              if (ctx.onFireProjectile) {
                const muzzleOffset = 18;
                const mx = ex + Math.cos(this.facingRad) * muzzleOffset;
                const my = ey + Math.sin(this.facingRad) * muzzleOffset;
                ctx.onFireProjectile(mx, my, this.facingRad, this.config);

                // Tactical Enforcers & Watchmen fire lethal 2-round bursts/spreads
                if (
                  this.archetype === EnemyArchetype.ELITE_AGENT ||
                  this.archetype === EnemyArchetype.CAUTIOUS_GUARD
                ) {
                  const spread = this.archetype === EnemyArchetype.CAUTIOUS_GUARD ? 0.08 : 0.04;
                  ctx.onFireProjectile(mx, my, this.facingRad + spread, this.config);
                }
              } else {
                ctx.onPlayerHit(this.config.bulletDamage);
              }
            }
          }

          if (distToPlayer < 28 && now >= this.attackCooldownUntil) {
            this.attackCooldownUntil = now + 850;
            ctx.onPlayerHit(20);
          }
        } else {
          // Smoothly decay aim lock rather than resetting abruptly
          if (this.aimStartTime > 0 && now - this.aimStartTime > 450) {
            this.aimStartTime = 0;
          }
          if (this.targetPos) {
            this.chaseTargetWithPathfinding(
              ctx,
              this.targetPos.x,
              this.targetPos.y,
              this.config.alertSpeed * ctx.difficultyScale
            );
          }
          if (now - this.lastSeenAt > 9000 && this.stateTimer > 8.5 && this.suspicion < 35) {
            this.state = EnemyAIState.SEARCH;
            this.stateTimer = 0;
          }
        }
        break;
      }
      case EnemyAIState.RETURN: {
        this.aimStartTime = 0;
        const wp = this.patrolPoints[this.patrolIndex];
        const arrived = this.chaseTargetWithPathfinding(
          ctx,
          wp.x,
          wp.y,
          this.config.patrolSpeed * ctx.difficultyScale
        );
        if (arrived) {
          this.state = EnemyAIState.PATROL;
          this.stateTimer = 0;
        }
        break;
      }
      }
    }

    // 3. Visual Updates (Animation, Facing Flip, FOV Cone, Aim Telegraph, Status Indicator)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (now < this.firingPoseUntil) {
      // Keep firing pose visible briefly
    } else if (speed > 8) {
      this.sprite.play(`enemy_${this.archetype}_walk`, true);
      if (Math.abs(body.velocity.x) > 4) {
        this.sprite.setFlipX(body.velocity.x < 0);
      }
    } else {
      this.sprite.play(`enemy_${this.archetype}_idle`, true);
    }

    this.drawVisionCone(ctx.now <= ctx.jammedUntil, canSeePlayer ? ctx.playerX : null, canSeePlayer ? ctx.playerY : null);
    this.updateStatusLabel();
  }

  private maybeDeployTrap(ctx: EnemyContext, ex: number, ey: number): void {
    if (!ctx.onDeployTrap || ctx.now < this.trapCooldownUntil || ctx.now <= ctx.jammedUntil) return;

    const levelId = ctx.level.id;
    const inCombatOrSearch =
      this.state === EnemyAIState.ALERT ||
      this.state === EnemyAIState.INVESTIGATE ||
      this.state === EnemyAIState.SEARCH;

    const isSpecialist =
      this.archetype === EnemyArchetype.TECHNICIAN ||
      this.archetype === EnemyArchetype.TRACKER ||
      this.archetype === EnemyArchetype.ELITE_AGENT;

    const patrolTrapCap = levelId >= 55 ? 3 : levelId >= 25 ? 2 : 1;
    const canPatrolFortify =
      (this.state === EnemyAIState.PATROL || this.state === EnemyAIState.OBSERVE) &&
      ctx.now > 3600 &&
      this.patrolTrapsPlaced < patrolTrapCap &&
      ((levelId >= 12 && (isSpecialist || this.archetype === EnemyArchetype.CAUTIOUS_GUARD)) ||
        levelId >= 24);

    if (!inCombatOrSearch && !canPatrolFortify) return;

    // Avoid clustering multiple traps from the same guard right next to each other
    if (this.lastTrapPos && Math.hypot(this.lastTrapPos.x - ex, this.lastTrapPos.y - ey) < 105) {
      return;
    }

    const trapType = this.selectTrapType(levelId, inCombatOrSearch);
    const baseMs = inCombatOrSearch
      ? isSpecialist
        ? 5000
        : 7600
      : isSpecialist
      ? 9000
      : 12200;
    const levelFactor = Math.max(0.55, 1 - levelId * 0.0042);

    this.trapCooldownUntil = ctx.now + (baseMs * levelFactor) / ctx.difficultyScale;
    this.lastTrapPos = { x: ex, y: ey };
    if (!inCombatOrSearch) {
      this.patrolTrapsPlaced += 1;
    }
    ctx.onDeployTrap(ex, ey, trapType, this.id);
  }

  private selectTrapType(levelId: number, inCombatOrSearch: boolean): EnemyTrapType {
    const roll = Math.random();
    if (this.archetype === EnemyArchetype.TECHNICIAN) {
      if (!inCombatOrSearch || levelId >= 18) {
        return roll < 0.62 ? 'proximity_alarm' : 'shock_mine';
      }
      return roll < 0.5 ? 'proximity_alarm' : 'shock_mine';
    }
    if (this.archetype === EnemyArchetype.TRACKER || this.archetype === EnemyArchetype.ELITE_AGENT) {
      if (levelId >= 15 && roll < 0.28) return 'proximity_alarm';
      return roll < 0.68 ? 'tripwire' : 'shock_mine';
    }
    if (this.archetype === EnemyArchetype.CAUTIOUS_GUARD) {
      if (levelId >= 20 && roll < 0.42) return 'tripwire';
      if (levelId >= 35 && roll < 0.65) return 'proximity_alarm';
      return 'shock_mine';
    }
    // STANDARD_GUARD on higher-level missions
    if (levelId >= 25 && roll < 0.35) return 'tripwire';
    if (levelId >= 45 && roll < 0.55) return 'proximity_alarm';
    return 'shock_mine';
  }

  private chaseTargetWithPathfinding(
    ctx: EnemyContext,
    tx: number,
    ty: number,
    speed: number
  ): boolean {
    const ex = this.sprite.x;
    const ey = this.sprite.y;
    if (hasLineOfSight(ctx.level, ex, ey, tx, ty, ctx.closedDoors)) {
      this.cachedChaseTarget = null;
      return this.moveToward(tx, ty, speed);
    }

    if (!this.cachedChaseTarget || ctx.now >= this.nextPathRefreshAt || Math.hypot(this.cachedChaseTarget.x - ex, this.cachedChaseTarget.y - ey) < 14) {
      this.nextPathRefreshAt = ctx.now + 260;
      this.cachedChaseTarget = this.findNextBfsStep(ctx.level, ex, ey, tx, ty, ctx.closedDoors);
    }

    const wp = this.cachedChaseTarget ?? { x: tx, y: ty };
    const arrivedWp = this.moveToward(wp.x, wp.y, speed);
    if (arrivedWp) {
      this.cachedChaseTarget = null;
    }
    return Math.hypot(tx - ex, ty - ey) < 14;
  }

  private findNextBfsStep(
    level: LevelDefinition,
    sxPx: number,
    syPx: number,
    txPx: number,
    tyPx: number,
    closedDoors: Set<string>
  ): { x: number; y: number } | null {
    const ts = level.tileSize;
    const sx = Math.max(1, Math.min(level.width - 2, Math.floor(sxPx / ts)));
    const sy = Math.max(1, Math.min(level.height - 2, Math.floor(syPx / ts)));
    const tx = Math.max(1, Math.min(level.width - 2, Math.floor(txPx / ts)));
    const ty = Math.max(1, Math.min(level.height - 2, Math.floor(tyPx / ts)));

    if (sx === tx && sy === ty) return { x: txPx, y: tyPx };

    const key = (x: number, y: number) => `${x},${y}`;
    const visited = new Set<string>([key(sx, sy)]);
    const parent = new Map<string, { x: number; y: number }>();
    const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    let found = false;
    let guard = 0;
    while (queue.length > 0 && guard < 420) {
      guard += 1;
      const cur = queue.shift()!;
      if (cur.x === tx && cur.y === ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 1 || ny < 1 || nx >= level.width - 1 || ny >= level.height - 1) continue;
        const t = level.tiles[ny][nx];
        if (t === TileType.WALL || t === TileType.GLASS_PARTITION) continue;
        if (closedDoors.has(key(nx, ny))) continue;
        const nk = key(nx, ny);
        if (!visited.has(nk)) {
          visited.add(nk);
          parent.set(nk, cur);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    if (!found) return null;

    let step = { x: tx, y: ty };
    let prev = parent.get(key(step.x, step.y));
    while (prev && !(prev.x === sx && prev.y === sy)) {
      step = prev;
      prev = parent.get(key(step.x, step.y));
    }
    return {
      x: step.x * ts + ts / 2,
      y: step.y * ts + ts / 2,
    };
  }

  private moveToward(tx: number, ty: number, speed: number): boolean {
    const dx = tx - this.sprite.x;
    const dy = ty - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      this.sprite.setVelocity(0, 0);
      return true;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    this.sprite.setVelocity(nx * speed, ny * speed);
    this.facingRad = Math.atan2(ny, nx);
    return false;
  }

  private drawVisionCone(jammed: boolean, aimTargetX: number | null, aimTargetY: number | null): void {
    this.coneGfx.clear();
    if (jammed) return;

    const half = ((this.config.fovAngleDeg / 2) * Math.PI) / 180;
    const color =
      this.state === EnemyAIState.ALERT
        ? 0xf43f5e
        : this.suspicion >= 30 || this.state === EnemyAIState.INVESTIGATE || this.state === EnemyAIState.SEARCH
        ? 0xf59e0b
        : 0x67e8f9;
    const alpha = this.state === EnemyAIState.ALERT ? 0.22 : 0.14;

    this.coneGfx.fillStyle(color, alpha);
    this.coneGfx.beginPath();
    this.coneGfx.moveTo(this.sprite.x, this.sprite.y);
    this.coneGfx.arc(
      this.sprite.x,
      this.sprite.y,
      this.config.fovRangePx,
      this.facingRad - half,
      this.facingRad + half,
      false
    );
    this.coneGfx.closePath();
    this.coneGfx.fillPath();

    this.coneGfx.lineStyle(1, color, 0.35);
    this.coneGfx.strokePath();

    // Laser sightline telegraph when aiming gun before firing
    if (this.aimStartTime > 0 && aimTargetX !== null && aimTargetY !== null) {
      this.coneGfx.lineStyle(1.6, 0xfb7185, 0.78);
      this.coneGfx.lineBetween(this.sprite.x, this.sprite.y - 2, aimTargetX, aimTargetY);
    }
  }

  private updateStatusLabel(): void {
    this.statusText.setPosition(this.sprite.x, this.sprite.y - 28);
    const now = this.sprite.scene.time.now;
    if (this.state === EnemyAIState.ALERT) {
      this.statusText.setText(now < this.tacticalBadgeUntil && this.tacticalBadgeText ? `! ${this.tacticalBadgeText}` : '!');
      this.statusText.setColor('#fb7185');
    } else if (now < this.tacticalBadgeUntil && this.tacticalBadgeText) {
      this.statusText.setText(this.tacticalBadgeText);
      this.statusText.setColor('#a78bfa');
    } else if (this.suspicion >= 50 || this.state === EnemyAIState.SEARCH) {
      this.statusText.setText(`?! ${Math.round(this.suspicion)}%`);
      this.statusText.setColor('#fbbf24');
    } else if (this.suspicion >= 18 || this.state === EnemyAIState.INVESTIGATE) {
      this.statusText.setText('?');
      this.statusText.setColor('#fde68a');
    } else {
      this.statusText.setText('');
    }
  }

  public destroy(): void {
    this.sprite.destroy();
    this.coneGfx.destroy();
    this.statusText.destroy();
  }
}
