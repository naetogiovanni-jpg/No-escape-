import { EnemyAgent } from '@/src/systems/EnemyAI';
import {
  EnemyAIState,
  EnemyArchetype,
  EnemyTrapType,
  InteractiveType,
  LevelDefinition,
  TileType,
} from '@/src/types/game';

export interface TacticalLink {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  trapType: EnemyTrapType;
  expiresAt: number;
}

export interface TacticalContext {
  level: LevelDefinition;
  enemies: EnemyAgent[];
  playerX: number;
  playerY: number;
  playerVelX: number;
  playerVelY: number;
  objectivePoints: Array<{ x: number; y: number; type: InteractiveType; completed: boolean }>;
  closedDoors: Set<string>;
  jammedUntil: number;
  now: number;
  existingTraps: Array<{ x: number; y: number; type: EnemyTrapType }>;
}

export class TacticalAISystem {
  private nextCoordAt = 2400;
  private nextPatrolSyncAt = 4800;
  public activeLinks: TacticalLink[] = [];
  public lastCallout: string | null = null;
  public lastCalloutUntil = 0;

  public reset(): void {
    this.nextCoordAt = 2400;
    this.nextPatrolSyncAt = 4800;
    this.activeLinks = [];
    this.lastCallout = null;
    this.lastCalloutUntil = 0;
  }

  public update(ctx: TacticalContext): void {
    const { now } = ctx;
    this.activeLinks = this.activeLinks.filter((l) => now < l.expiresAt);
    if (this.lastCallout && now > this.lastCalloutUntil) {
      this.lastCallout = null;
    }

    // Signal Jammer disrupts tactical radio coordination
    if (now <= ctx.jammedUntil) return;

    const activeEnemies = ctx.enemies.filter((e) => e.state !== EnemyAIState.STUNNED);
    if (activeEnemies.length < 2) return;

    // 1. Combat / Alert / Search Coordinated Ambush Traps
    if (now >= this.nextCoordAt) {
      const alertedOrSearching = activeEnemies.filter(
        (e) =>
          e.state === EnemyAIState.ALERT ||
          e.state === EnemyAIState.INVESTIGATE ||
          e.state === EnemyAIState.SEARCH
      );

      if (alertedOrSearching.length > 0) {
        this.coordinateCombatTrap(ctx, activeEnemies, alertedOrSearching);
        const interval = Math.max(4200, 7600 - ctx.level.id * 30);
        this.nextCoordAt = now + interval;
        return;
      }
      this.nextCoordAt = now + 1800;
    }

    // 2. Proactive Patrol Perimeter Trap Coordination (scales up on Lv 8+)
    if (now >= this.nextPatrolSyncAt && ctx.level.id >= 8) {
      this.coordinatePatrolPerimeter(ctx, activeEnemies);
      const patrolInterval = Math.max(6500, 12000 - ctx.level.id * 45);
      this.nextPatrolSyncAt = now + patrolInterval;
    }
  }

  private coordinateCombatTrap(
    ctx: TacticalContext,
    allEnemies: EnemyAgent[],
    leads: EnemyAgent[]
  ): void {
    // Pick the lead closest to the player
    let lead = leads[0];
    let bestLeadDist = Infinity;
    for (const e of leads) {
      const d = Math.hypot(e.sprite.x - ctx.playerX, e.sprite.y - ctx.playerY);
      if (d < bestLeadDist) {
        bestLeadDist = d;
        lead = e;
      }
    }

    // Find an available partner within radio range without an active tactical trap order
    const candidates = allEnemies
      .filter((e) => e.id !== lead.id && !e.hasActiveTacticalOrder(ctx.now))
      .map((e) => ({
        enemy: e,
        distToLead: Math.hypot(e.sprite.x - lead.sprite.x, e.sprite.y - lead.sprite.y),
        distToPlayer: Math.hypot(e.sprite.x - ctx.playerX, e.sprite.y - ctx.playerY),
      }))
      .filter((c) => c.distToLead <= lead.config.radioRangePx * 1.35)
      .sort((a, b) => {
        const aSpec =
          a.enemy.archetype === EnemyArchetype.TECHNICIAN ||
          a.enemy.archetype === EnemyArchetype.TRACKER
            ? -80
            : 0;
        const bSpec =
          b.enemy.archetype === EnemyArchetype.TECHNICIAN ||
          b.enemy.archetype === EnemyArchetype.TRACKER
            ? -80
            : 0;
        return a.distToPlayer + aSpec - (b.distToPlayer + bSpec);
      });

    if (candidates.length === 0) return;

    const partner = candidates[0].enemy;
    const spot = this.findAmbushChokepoint(ctx, partner.sprite.x, partner.sprite.y);
    if (!spot) return;

    const trapType: EnemyTrapType = spot.isNarrowCorridor
      ? 'tripwire'
      : partner.archetype === EnemyArchetype.TECHNICIAN || Math.random() < 0.45
      ? 'proximity_alarm'
      : 'shock_mine';

    partner.assignTacticalTrapOrder(
      spot.x,
      spot.y,
      trapType,
      trapType === 'tripwire' ? 'TRAP · WIRE' : trapType === 'proximity_alarm' ? 'TRAP · ALRM' : 'TRAP · MINE',
      ctx.now,
      ctx.now + 7500
    );

    this.activeLinks.push({
      fromX: lead.sprite.x,
      fromY: lead.sprite.y,
      toX: partner.sprite.x,
      toY: partner.sprite.y,
      trapType,
      expiresAt: ctx.now + 1400,
    });

    // If a third guard is nearby, coordinate a complementary proximity alarm on a second flank
    if (candidates.length > 1 && ctx.level.id >= 15) {
      const second = candidates[1].enemy;
      const flankSpot = this.findAmbushChokepoint(ctx, second.sprite.x, second.sprite.y, spot);
      if (flankSpot) {
        const secondType: EnemyTrapType = trapType === 'tripwire' ? 'proximity_alarm' : 'tripwire';
        second.assignTacticalTrapOrder(
          flankSpot.x,
          flankSpot.y,
          secondType,
          secondType === 'proximity_alarm' ? 'SYNC · ALRM' : 'SYNC · WIRE',
          ctx.now,
          ctx.now + 7500
        );
        this.activeLinks.push({
          fromX: partner.sprite.x,
          fromY: partner.sprite.y,
          toX: second.sprite.x,
          toY: second.sprite.y,
          trapType: secondType,
          expiresAt: ctx.now + 1400,
        });
      }
    }

    this.lastCallout =
      trapType === 'tripwire'
        ? 'Tactical AI: Guards coordinating corridor tripwire ambush'
        : trapType === 'proximity_alarm'
        ? 'Tactical AI: Guards deploying perimeter proximity alarm'
        : 'Tactical AI: Guards rigging chokepoint shock mine';
    this.lastCalloutUntil = ctx.now + 2400;
  }

  private coordinatePatrolPerimeter(ctx: TacticalContext, allEnemies: EnemyAgent[]): void {
    const activeObjectives = ctx.objectivePoints.filter((o) => !o.completed);
    if (activeObjectives.length === 0) return;

    const patrolPairs = allEnemies.filter(
      (e) =>
        (e.state === EnemyAIState.PATROL || e.state === EnemyAIState.OBSERVE) &&
        !e.hasActiveTacticalOrder(ctx.now)
    );
    if (patrolPairs.length < 2) return;

    // Choose a guard closest to an uncompleted objective
    let bestGuard: EnemyAgent | null = null;
    let bestObj: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    for (const guard of patrolPairs) {
      for (const obj of activeObjectives) {
        const d = Math.hypot(guard.sprite.x - obj.x, guard.sprite.y - obj.y);
        if (d < bestDist && d <= 380) {
          bestDist = d;
          bestGuard = guard;
          bestObj = obj;
        }
      }
    }

    if (!bestGuard || !bestObj) return;

    const partner = patrolPairs.find(
      (e) =>
        e.id !== bestGuard!.id &&
        Math.hypot(e.sprite.x - bestGuard!.sprite.x, e.sprite.y - bestGuard!.sprite.y) <=
          bestGuard!.config.radioRangePx * 1.4
    );
    if (!partner) return;

    const spot = this.findWalkableChokepointNear(ctx, bestObj.x, bestObj.y, bestGuard.sprite.x, bestGuard.sprite.y);
    if (!spot) return;

    const trapType: EnemyTrapType = spot.isNarrowCorridor
      ? 'tripwire'
      : bestGuard.archetype === EnemyArchetype.TECHNICIAN
      ? 'proximity_alarm'
      : Math.random() < 0.5
      ? 'proximity_alarm'
      : 'tripwire';

    bestGuard.assignTacticalTrapOrder(
      spot.x,
      spot.y,
      trapType,
      trapType === 'proximity_alarm' ? 'PERIM · ALRM' : 'PERIM · WIRE',
      ctx.now,
      ctx.now + 8500
    );

    this.activeLinks.push({
      fromX: partner.sprite.x,
      fromY: partner.sprite.y,
      toX: bestGuard.sprite.x,
      toY: bestGuard.sprite.y,
      trapType,
      expiresAt: ctx.now + 1300,
    });
  }

  private findAmbushChokepoint(
    ctx: TacticalContext,
    guardX: number,
    guardY: number,
    avoidSpot?: { x: number; y: number }
  ): { x: number; y: number; isNarrowCorridor: boolean } | null {
    // Predict likely retreat/advance vector toward nearest uncompleted objective or player velocity
    const exitObj = ctx.objectivePoints.find((o) => o.type === InteractiveType.EXIT);
    const activeObj = ctx.objectivePoints.find((o) => !o.completed) ?? exitObj;

    let dirX = ctx.playerVelX;
    let dirY = ctx.playerVelY;
    if (Math.hypot(dirX, dirY) < 25 && activeObj) {
      dirX = activeObj.x - ctx.playerX;
      dirY = activeObj.y - ctx.playerY;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    const anchorX = ctx.playerX + (dirX / len) * 140;
    const anchorY = ctx.playerY + (dirY / len) * 140;

    return this.findWalkableChokepointNear(ctx, anchorX, anchorY, guardX, guardY, avoidSpot);
  }

  private findWalkableChokepointNear(
    ctx: TacticalContext,
    targetX: number,
    targetY: number,
    guardX: number,
    guardY: number,
    avoidSpot?: { x: number; y: number }
  ): { x: number; y: number; isNarrowCorridor: boolean } | null {
    const ts = ctx.level.tileSize;
    const cx = Math.max(1, Math.min(ctx.level.width - 2, Math.floor(targetX / ts)));
    const cy = Math.max(1, Math.min(ctx.level.height - 2, Math.floor(targetY / ts)));

    let best: { x: number; y: number; score: number; isNarrowCorridor: boolean } | null = null;

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx <= 0 || ty <= 0 || tx >= ctx.level.width - 1 || ty >= ctx.level.height - 1) continue;
        const tile = ctx.level.tiles[ty][tx];
        if (
          tile === TileType.WALL ||
          tile === TileType.GLASS_PARTITION ||
          tile === TileType.LOW_COVER ||
          ctx.closedDoors.has(`${tx},${ty}`)
        ) {
          continue;
        }

        const wx = tx * ts + ts / 2;
        const wy = ty * ts + ts / 2;
        // Never place directly on top of the player
        if (Math.hypot(wx - ctx.playerX, wy - ctx.playerY) < 58) continue;
        if (avoidSpot && Math.hypot(wx - avoidSpot.x, wy - avoidSpot.y) < 88) continue;
        if (ctx.existingTraps.some((t) => Math.hypot(t.x - wx, t.y - wy) < 70)) continue;

        const isSolid = (x: number, y: number) => {
          const t = ctx.level.tiles[y]?.[x];
          return t === undefined || t === TileType.WALL || t === TileType.GLASS_PARTITION || t === TileType.LOW_COVER;
        };
        const horizWalls = isSolid(tx - 1, ty) && isSolid(tx + 1, ty);
        const vertWalls = isSolid(tx, ty - 1) && isSolid(tx, ty + 1);
        const isNarrowCorridor = horizWalls || vertWalls;

        const distTarget = Math.hypot(wx - targetX, wy - targetY);
        const distGuard = Math.hypot(wx - guardX, wy - guardY);
        if (distGuard > 440) continue;

        const chokepointBonus = isNarrowCorridor ? -65 : 0;
        const score = distTarget + distGuard * 0.35 + chokepointBonus;

        if (!best || score < best.score) {
          best = { x: wx, y: wy, score, isNarrowCorridor };
        }
      }
    }

    return best ? { x: best.x, y: best.y, isNarrowCorridor: best.isNarrowCorridor } : null;
  }
}
