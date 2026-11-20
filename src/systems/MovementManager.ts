import Phaser from 'phaser';
import { OperativeDefinition, SaveData } from '@/src/types/game';

export interface MovementInput {
  mx: number;
  my: number;
  wantsSprint: boolean;
  wantsCrouch: boolean;
  now: number;
  dtSec: number;
  parkourChain: number;
  isVaulting: boolean;
  isSliding: boolean;
  isDodging: boolean;
  trapSlowed: boolean;
  combatBoostUntil: number;
}

export interface MovementResult {
  vx: number;
  vy: number;
  speed: number;
  isSprinting: boolean;
  isCrouching: boolean;
  staminaRecovering: boolean;
  noiseRadius: number;
  didExhaust: boolean;
}

export class MovementManager {
  public velX = 0;
  public velY = 0;
  public stamina: number;
  public maxStamina: number;
  public exhaustedUntil = 0;
  private staminaDrainScale = 1;
  private staminaRegenScale = 1;

  constructor(op: OperativeDefinition, save: SaveData) {
    const coreTier = save.upgradeLevels?.staminaCoreLevel ?? 0;
    this.maxStamina = 100 + coreTier * 15;
    this.stamina = this.maxStamina;
    this.staminaDrainScale = op.modifiers.staminaDrainMultiplier * Math.max(0.7, 1 - coreTier * 0.08);
    this.staminaRegenScale = 1 + coreTier * 0.15;
  }

  public reset(): void {
    this.velX = 0;
    this.velY = 0;
    this.stamina = this.maxStamina;
    this.exhaustedUntil = 0;
  }

  public isRecovering(now: number): boolean {
    return now < this.exhaustedUntil;
  }

  public normalizeDirection(mx: number, my: number): { nx: number; ny: number; magnitude: number } {
    const len = Math.hypot(mx, my);
    if (len <= 0.0001) {
      return { nx: 0, ny: 0, magnitude: 0 };
    }
    if (len > 1) {
      return { nx: mx / len, ny: my / len, magnitude: 1 };
    }
    return { nx: mx, ny: my, magnitude: len };
  }

  public spendStamina(amount: number, now: number): void {
    this.stamina = Math.max(0, this.stamina - amount);
    if (this.stamina <= 0.5 && now >= this.exhaustedUntil) {
      this.exhaustedUntil = now + 1800;
    }
  }

  public step(op: OperativeDefinition, input: MovementInput): MovementResult {
    const { nx, ny, magnitude } = this.normalizeDirection(input.mx, input.my);
    const { now, dtSec } = input;
    const isRecovering = this.isRecovering(now);
    let didExhaust = false;

    const canSprint =
      input.wantsSprint &&
      !input.wantsCrouch &&
      !isRecovering &&
      magnitude > 0.1 &&
      this.stamina > 1;

    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - 24 * this.staminaDrainScale * dtSec);
      if (this.stamina <= 0.5) {
        this.stamina = 0;
        this.exhaustedUntil = now + 1850;
        didExhaust = true;
      }
    } else {
      const regenRate = isRecovering ? 18 * this.staminaRegenScale : 24 * this.staminaRegenScale;
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dtSec);
    }

    const momentumBonus = 1 + Math.min(0.26, input.parkourChain * 0.06);
    const trapSlowFactor = input.trapSlowed ? 0.55 : 1.0;
    const combatSlideFactor = now < input.combatBoostUntil ? 1.05 : 1.0;

    let maxSpeed = 160 * op.modifiers.moveSpeedMultiplier * momentumBonus * trapSlowFactor * combatSlideFactor;
    if (input.wantsCrouch) {
      maxSpeed *= 0.62;
    } else if (canSprint) {
      maxSpeed *= 1.5 * op.modifiers.sprintSpeedMultiplier;
    }

    const targetVx = nx * maxSpeed;
    const targetVy = ny * maxSpeed;

    // Smooth acceleration when starting to sprint or move, natural inertia when releasing
    const accelRate =
      (magnitude > 0.08 ? (canSprint ? 9.5 : 12.0) : 8.5) * op.modifiers.accelerationMultiplier;
    const blend = Math.min(1, dtSec * accelRate);
    this.velX = Phaser.Math.Linear(this.velX, targetVx, blend);
    this.velY = Phaser.Math.Linear(this.velY, targetVy, blend);

    if (Math.hypot(this.velX, this.velY) < 4 && magnitude < 0.05) {
      this.velX = 0;
      this.velY = 0;
    }

    const speed = Math.hypot(this.velX, this.velY);
    const noiseRadius = canSprint
      ? 145 * op.modifiers.noiseMultiplier
      : speed > 180
      ? 110 * op.modifiers.noiseMultiplier
      : 0;

    return {
      vx: this.velX,
      vy: this.velY,
      speed,
      isSprinting: canSprint,
      isCrouching: input.wantsCrouch,
      staminaRecovering: this.isRecovering(now),
      noiseRadius,
      didExhaust,
    };
  }
}
