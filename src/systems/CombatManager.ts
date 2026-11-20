import Phaser from 'phaser';
import { AudioSystem } from '@/src/systems/AudioSystem';
import { EnemyAgent } from '@/src/systems/EnemyAI';
import { EnemyAwareness } from '@/src/systems/EnemyAwareness';
import { hasLineOfSight } from '@/src/systems/StealthSystem';
import { EnemyAIState, LevelDefinition } from '@/src/types/game';

export interface TakedownCandidate {
  enemy: EnemyAgent;
  distance: number;
}

export interface PulseTaggerTarget {
  kind: 'enemy' | 'camera' | 'trap' | 'none';
  x: number;
  y: number;
  enemy?: EnemyAgent;
  cameraIndex?: number;
  trapIndex?: number;
}

export class CombatManager {
  private takedownCooldownUntil = 0;
  public activeTakedownUntil = 0;

  public reset(): void {
    this.takedownCooldownUntil = 0;
    this.activeTakedownUntil = 0;
  }

  public findTakedownCandidate(
    playerX: number,
    playerY: number,
    enemies: EnemyAgent[],
    level: LevelDefinition,
    closedDoors: Set<string>,
    now: number
  ): TakedownCandidate | null {
    if (now < this.takedownCooldownUntil) return null;

    let best: TakedownCandidate | null = null;
    for (const enemy of enemies) {
      if (!EnemyAwareness.isVulnerableToTakedown(enemy.state)) continue;
      const dx = playerX - enemy.sprite.x;
      const dy = playerY - enemy.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 48) continue;

      if (!hasLineOfSight(level, playerX, playerY, enemy.sprite.x, enemy.sprite.y, closedDoors)) {
        continue;
      }

      // Require stealth positioning: player behind or flank of guard (not straight in front of their eyes)
      const ex = Math.cos(enemy.facingRad);
      const ey = Math.sin(enemy.facingRad);
      const toPlayerX = dx / Math.max(1, dist);
      const toPlayerY = dy / Math.max(1, dist);
      const facingAlignment = ex * toPlayerX + ey * toPlayerY;

      // facingAlignment > 0.55 means player is squarely in front of guard; allow behind/flank or very close blindside
      if (facingAlignment > 0.55 && enemy.state !== EnemyAIState.OBSERVE) {
        continue;
      }

      if (!best || dist < best.distance) {
        best = { enemy, distance: dist };
      }
    }
    return best;
  }

  public executeStealthTakedown(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    candidate: TakedownCandidate,
    enemies: EnemyAgent[],
    operativeId: string,
    accentColor: string,
    now: number,
    onNoiseRing: (x: number, y: number, radius: number, color: number) => void
  ): boolean {
    const { enemy } = candidate;
    if (!EnemyAwareness.isVulnerableToTakedown(enemy.state)) return false;

    this.takedownCooldownUntil = now + 1500;
    this.activeTakedownUntil = now + 260;

    // Quick cinematic non-blocking lunge step toward target without locking movement afterwards
    const tx = enemy.sprite.x + (player.x - enemy.sprite.x) * 0.35;
    const ty = enemy.sprite.y + (player.y - enemy.sprite.y) * 0.35;
    scene.tweens.add({
      targets: player,
      x: tx,
      y: ty,
      duration: 130,
      ease: 'Cubic.easeOut',
    });

    player.play(`${operativeId}_interact`, true);
    AudioSystem.playTone('takedown');

    const colorInt = Phaser.Display.Color.HexStringToColor(accentColor).color;
    const arc = scene.add.circle(enemy.sprite.x, enemy.sprite.y, 16, colorInt, 0.35).setDepth(17);
    scene.tweens.add({
      targets: arc,
      scale: 2.2,
      alpha: 0,
      duration: 240,
      onComplete: () => arc.destroy(),
    });

    // Guard enters temporarily disabled state (12s) then recovers
    enemy.stun(12000, now);

    // Subtle scuffle noise that nearby patrols can still investigate
    const scuffleRadius = 85;
    onNoiseRing(enemy.sprite.x, enemy.sprite.y, scuffleRadius, 0x94a3b8);
    for (const other of enemies) {
      if (other.id === enemy.id || other.state === EnemyAIState.STUNNED) continue;
      if (Math.hypot(other.sprite.x - enemy.sprite.x, other.sprite.y - enemy.sprite.y) <= scuffleRadius) {
        other.hearDisturbance(enemy.sprite.x, enemy.sprite.y, 60);
      }
    }

    return true;
  }

  public findPulseTaggerTarget(
    startX: number,
    startY: number,
    aimAngleRad: number,
    rangePx: number,
    level: LevelDefinition,
    closedDoors: Set<string>,
    enemies: EnemyAgent[],
    cameras: Array<{ x: number; y: number; disabled: boolean }>,
    traps: Array<{ x: number; y: number; armTime: number }>,
    now: number
  ): PulseTaggerTarget {
    const dirX = Math.cos(aimAngleRad);
    const dirY = Math.sin(aimAngleRad);

    let bestScore = Infinity;
    let bestTarget: PulseTaggerTarget = {
      kind: 'none',
      x: startX + dirX * rangePx,
      y: startY + dirY * rangePx,
    };

    // 1. Check enemies in narrow lock cone along aim direction
    for (const enemy of enemies) {
      if (enemy.state === EnemyAIState.STUNNED) continue;
      const dx = enemy.sprite.x - startX;
      const dy = enemy.sprite.y - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > rangePx || dist < 4) continue;
      const dot = (dx * dirX + dy * dirY) / dist;
      if (dot < 0.78) continue;
      if (!hasLineOfSight(level, startX, startY, enemy.sprite.x, enemy.sprite.y, closedDoors)) continue;
      const score = dist * (1.2 - dot);
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { kind: 'enemy', x: enemy.sprite.x, y: enemy.sprite.y, enemy };
      }
    }

    // 2. Check security cameras
    cameras.forEach((cam, idx) => {
      if (cam.disabled) return;
      const dx = cam.x - startX;
      const dy = cam.y - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > rangePx || dist < 4) return;
      const dot = (dx * dirX + dy * dirY) / dist;
      if (dot < 0.8) return;
      if (!hasLineOfSight(level, startX, startY, cam.x, cam.y, closedDoors)) return;
      const score = dist * (1.25 - dot);
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { kind: 'camera', x: cam.x, y: cam.y, cameraIndex: idx };
      }
    });

    // 3. Check armed enemy traps
    traps.forEach((tr, idx) => {
      if (now < tr.armTime) return;
      const dx = tr.x - startX;
      const dy = tr.y - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > rangePx || dist < 4) return;
      const dot = (dx * dirX + dy * dirY) / dist;
      if (dot < 0.8) return;
      const score = dist * (1.25 - dot);
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { kind: 'trap', x: tr.x, y: tr.y, trapIndex: idx };
      }
    });

    return bestTarget;
  }
}
