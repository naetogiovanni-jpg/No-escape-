import Phaser from 'phaser';
import { BOSSES } from '@/src/data/bosses';
import { AudioSystem } from '@/src/systems/AudioSystem';
import { BossDefinition } from '@/src/types/game';

interface BossProjectile {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
}

export class BossEncounterController {
  public readonly boss: BossDefinition;
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private shieldRing: Phaser.GameObjects.Arc;
  private telegraphGfx: Phaser.GameObjects.Graphics;
  private projectiles: BossProjectile[] = [];

  public resolve: number;
  public maxResolve: number;
  public phase: 1 | 2 | 3 = 1;
  public shielded = false;
  public bannerText: string | null = null;
  public defeated = false;

  private bannerUntil = 0;
  private nextAttackAt = 0;
  private stunnedUntil = 0;
  private strafeAngle = 0;
  private arenaCenter: { x: number; y: number };
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, bossId: string, spawnX: number, spawnY: number, difficultyScale: number) {
    this.scene = scene;
    this.boss = BOSSES[bossId];
    this.maxResolve = Math.round(this.boss.maxResolve * difficultyScale);
    this.resolve = this.maxResolve;
    this.arenaCenter = { x: spawnX, y: spawnY };

    this.sprite = scene.physics.add.sprite(spawnX, spawnY, `tex_boss_${bossId}`);
    this.sprite.setDepth(11);
    this.sprite.setCollideWorldBounds(true);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 30);
    body.setOffset(17, 20);

    const accentInt = Phaser.Display.Color.HexStringToColor(this.boss.accentColor).color;
    this.shieldRing = scene.add.circle(spawnX, spawnY, 34, accentInt, 0.14);
    this.shieldRing.setStrokeStyle(2.5, accentInt, 0.9);
    this.shieldRing.setVisible(false);
    this.shieldRing.setDepth(12);

    this.telegraphGfx = scene.add.graphics();
    this.telegraphGfx.setDepth(5);

    this.showBanner(this.boss.introLine, 3500, scene.time.now);
    this.nextAttackAt = scene.time.now + 1800;
  }

  public showBanner(text: string, durationMs: number, now: number): void {
    this.bannerText = text;
    this.bannerUntil = now + durationMs;
  }

  public applyDamage(amount: number, source: 'pulse' | 'terminal', now: number): boolean {
    if (this.defeated) return false;

    if (source === 'terminal') {
      this.shielded = false;
      this.stunnedUntil = now + 2200;
    } else if (this.shielded) {
      // Pulse breaks shield first
      this.shielded = false;
      this.showBanner('Defense shield disrupted!', 1800, now);
      return false;
    }

    this.resolve = Math.max(0, this.resolve - amount);
    this.sprite.setTint(0xfca5a5);
    this.scene.time.delayedCall(120, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    const pct = this.resolve / this.maxResolve;
    if (pct <= 0) {
      this.defeated = true;
      this.sprite.setVelocity(0, 0);
      this.shieldRing.setVisible(false);
      this.clearProjectiles();
      this.showBanner(this.boss.defeatLine, 4000, now);
      AudioSystem.playTone('victory');
      return true;
    }

    if (pct <= 0.34 && this.phase < 3) {
      this.phase = 3;
      this.shielded = false;
      this.showBanner(this.boss.phaseThreeLine, 3400, now);
      AudioSystem.playTone('alert');
    } else if (pct <= 0.67 && this.phase < 2) {
      this.phase = 2;
      this.shielded = this.boss.phases[1].shielded;
      this.showBanner(this.boss.phaseTwoLine, 3400, now);
      AudioSystem.playTone('suspicion');
    }

    return false;
  }

  public update(
    now: number,
    dtSec: number,
    playerX: number,
    playerY: number,
    playerInvulnerable: boolean,
    onHitPlayer: (dmg: number) => void
  ): void {
    if (this.bannerText && now > this.bannerUntil) {
      this.bannerText = null;
    }

    if (this.defeated) {
      this.telegraphGfx.clear();
      return;
    }

    const phaseSpec = this.boss.phases[this.phase - 1];
    this.shieldRing.setPosition(this.sprite.x, this.sprite.y);
    this.shieldRing.setVisible(this.shielded);

    if (now < this.stunnedUntil) {
      this.sprite.setVelocity(0, 0);
    } else {
      // Tactical arena orbit + pressure movement
      this.strafeAngle += dtSec * 0.9 * phaseSpec.speedMultiplier;
      const desiredRadius = this.phase === 3 ? 110 : 165;
      const targetX = this.arenaCenter.x + Math.cos(this.strafeAngle) * desiredRadius;
      const targetY = this.arenaCenter.y + Math.sin(this.strafeAngle * 1.3) * (desiredRadius * 0.65);

      const dx = targetX - this.sprite.x;
      const dy = targetY - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      const moveSpeed = 105 * phaseSpec.speedMultiplier;
      if (dist > 8) {
        this.sprite.setVelocity((dx / dist) * moveSpeed, (dy / dist) * moveSpeed);
        this.sprite.setFlipX(dx < 0);
      } else {
        this.sprite.setVelocity(0, 0);
      }

      // Telegraph & launch energy bolts
      this.telegraphGfx.clear();
      const timeToAttack = this.nextAttackAt - now;
      if (timeToAttack > 0 && timeToAttack < 550) {
        const accentInt = Phaser.Display.Color.HexStringToColor(this.boss.accentColor).color;
        this.telegraphGfx.lineStyle(2, accentInt, 0.55);
        this.telegraphGfx.lineBetween(this.sprite.x, this.sprite.y, playerX, playerY);
      }

      if (now >= this.nextAttackAt) {
        this.nextAttackAt = now + phaseSpec.attackIntervalMs;
        this.firePattern(playerX, playerY, phaseSpec.hazardCount, now);
      }
    }

    // Update boss energy projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.gfx.setPosition(p.x, p.y);

      const d = Math.hypot(p.x - playerX, p.y - playerY);
      if (d < 18 && !playerInvulnerable) {
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
        onHitPlayer(18);
        continue;
      }

      if (now - p.bornAt > 3600) {
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private firePattern(playerX: number, playerY: number, count: number, now: number): void {
    const baseAngle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    const speed = this.phase === 3 ? 255 : this.phase === 2 ? 225 : 195;
    const accentInt = Phaser.Display.Color.HexStringToColor(this.boss.accentColor).color;

    AudioSystem.playTone('pulse');

    if (this.phase === 3 && count >= 5) {
      // Radial burst + aimed shot
      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (i * Math.PI * 2) / count;
        this.spawnProjectile(ang, speed, accentInt, now);
      }
    } else {
      const spread = 0.24;
      const startOffset = -((count - 1) * spread) / 2;
      for (let i = 0; i < count; i++) {
        this.spawnProjectile(baseAngle + startOffset + i * spread, speed, accentInt, now);
      }
    }
  }

  private spawnProjectile(angle: number, speed: number, colorInt: number, now: number): void {
    const gfx = this.scene.add.circle(this.sprite.x, this.sprite.y, 6, colorInt, 0.92);
    gfx.setStrokeStyle(1.5, 0xffffff, 0.8);
    gfx.setDepth(13);
    this.projectiles.push({
      gfx,
      x: this.sprite.x,
      y: this.sprite.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bornAt: now,
    });
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      p.gfx.destroy();
    }
    this.projectiles = [];
  }

  public destroy(): void {
    this.clearProjectiles();
    this.sprite.destroy();
    this.shieldRing.destroy();
    this.telegraphGfx.destroy();
  }
}
