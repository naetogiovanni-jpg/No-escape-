import { EQUIPMENT_CATALOG, EQUIPMENT_ORDER } from '@/src/data/equipment';
import { EquipmentId, GameMode, OperativeDefinition, SaveData } from '@/src/types/game';

export class EquipmentInventory {
  private charges: Record<EquipmentId, number>;
  private maxChargesMap: Record<EquipmentId, number>;
  private cooldownUntil: Record<EquipmentId, number>;
  public selectedGadget: EquipmentId = EquipmentId.RECON_SCANNER;

  // Rechargeable Pulse Tagger energy pool
  public pulseEnergy = 100;
  public maxPulseEnergy = 100;
  public pulseCostPerShot = 34;
  public pulseRechargePerSec = 10;

  private cooldownScale = 1;
  private scannerDurationBonusMs = 0;
  private scannerRevealsTraps = false;
  private pulseRangeBonusPx = 0;

  constructor(op: OperativeDefinition, save: SaveData) {
    this.charges = {} as Record<EquipmentId, number>;
    this.maxChargesMap = {} as Record<EquipmentId, number>;
    this.cooldownUntil = {} as Record<EquipmentId, number>;

    const extraCharges =
      op.modifiers.bonusGadgetCharges + (save.upgradeLevels?.extraSlotLevel ?? 0);
    const beltTier = save.upgradeLevels?.gadgetBeltLevel ?? 0;
    this.cooldownScale = Math.max(0.58, 1 - beltTier * 0.12);

    const pulseTier = save.upgradeLevels?.pulseEnergyLevel ?? 0;
    this.maxPulseEnergy = 100 + pulseTier * 35;
    this.pulseEnergy = this.maxPulseEnergy;
    this.pulseRechargePerSec = 10 + pulseTier * 3.5;
    this.pulseRangeBonusPx = pulseTier * 35;

    const scannerTier = save.upgradeLevels?.scannerLevel ?? 0;
    this.scannerDurationBonusMs = scannerTier * 2000;
    this.scannerRevealsTraps = scannerTier >= 1;

    for (const eqId of EQUIPMENT_ORDER) {
      const base = EQUIPMENT_CATALOG[eqId].maxCharges;
      const resolvedMax = base < 0 ? -1 : base + extraCharges;
      this.maxChargesMap[eqId] = resolvedMax;
      this.charges[eqId] = resolvedMax;
      this.cooldownUntil[eqId] = 0;
    }

    if (save.unlockedEquipment.includes(EquipmentId.PULSE_TAGGER)) {
      this.selectedGadget = EquipmentId.PULSE_TAGGER;
    }
  }

  public update(dtSec: number): void {
    if (this.pulseEnergy < this.maxPulseEnergy) {
      this.pulseEnergy = Math.min(
        this.maxPulseEnergy,
        this.pulseEnergy + this.pulseRechargePerSec * dtSec
      );
    }
  }

  public isUnlocked(id: EquipmentId, save: SaveData, isBossLevel: boolean, mode: GameMode): boolean {
    if (isBossLevel || mode === GameMode.BOSS_RUSH) return true;
    return save.unlockedEquipment.includes(id);
  }

  public selectGadget(id: EquipmentId): void {
    this.selectedGadget = id;
  }

  public cycleSelectedGadget(save: SaveData, isBossLevel: boolean, mode: GameMode): EquipmentId {
    const unlocked = EQUIPMENT_ORDER.filter((id) => this.isUnlocked(id, save, isBossLevel, mode));
    if (unlocked.length === 0) return this.selectedGadget;
    const idx = unlocked.indexOf(this.selectedGadget);
    const next = unlocked[(idx + 1) % unlocked.length];
    this.selectedGadget = next;
    return next;
  }

  public getCharges(id: EquipmentId): number {
    if (id === EquipmentId.PULSE_TAGGER) {
      return Math.floor(this.pulseEnergy / this.pulseCostPerShot);
    }
    return this.charges[id];
  }

  public getMaxCharges(id: EquipmentId): number {
    if (id === EquipmentId.PULSE_TAGGER) {
      return Math.floor(this.maxPulseEnergy / this.pulseCostPerShot);
    }
    return this.maxChargesMap[id];
  }

  public grantUnlockedPickup(id: EquipmentId): void {
    if (id === EquipmentId.PULSE_TAGGER) {
      this.pulseEnergy = this.maxPulseEnergy;
      return;
    }
    this.charges[id] = this.maxChargesMap[id];
  }

  public getCooldownRemainingSec(id: EquipmentId, now: number): number {
    return Math.max(0, Math.ceil((this.cooldownUntil[id] - now) / 1000));
  }

  public getCooldownTotalSec(id: EquipmentId): number {
    return Math.round(EQUIPMENT_CATALOG[id].cooldownSec * this.cooldownScale * 10) / 10;
  }

  public canUse(
    id: EquipmentId,
    now: number,
    save: SaveData,
    isBossLevel: boolean,
    mode: GameMode
  ): { ok: boolean; reason?: string } {
    if (!this.isUnlocked(id, save, isBossLevel, mode)) {
      return { ok: false, reason: `${EQUIPMENT_CATALOG[id].name} not unlocked yet.` };
    }
    if (now < this.cooldownUntil[id]) {
      return { ok: false, reason: `${EQUIPMENT_CATALOG[id].shortName} recharging...` };
    }
    if (id === EquipmentId.PULSE_TAGGER) {
      if (this.pulseEnergy < this.pulseCostPerShot) {
        return { ok: false, reason: 'Pulse Tagger capacitor recharging...' };
      }
      return { ok: true };
    }
    if (this.charges[id] === 0) {
      return { ok: false, reason: `No ${EQUIPMENT_CATALOG[id].shortName} charges remaining.` };
    }
    return { ok: true };
  }

  public consumeUse(id: EquipmentId, now: number): void {
    const cdMs = EQUIPMENT_CATALOG[id].cooldownSec * 1000 * this.cooldownScale;
    this.cooldownUntil[id] = now + cdMs;
    if (id === EquipmentId.PULSE_TAGGER) {
      this.pulseEnergy = Math.max(0, this.pulseEnergy - this.pulseCostPerShot);
      return;
    }
    if (this.charges[id] > 0) {
      this.charges[id] -= 1;
    }
  }

  public refundUse(id: EquipmentId): void {
    this.cooldownUntil[id] = 0;
    if (id === EquipmentId.PULSE_TAGGER) {
      this.pulseEnergy = Math.min(this.maxPulseEnergy, this.pulseEnergy + this.pulseCostPerShot);
      return;
    }
    if (this.charges[id] >= 0) {
      this.charges[id] = Math.min(this.maxChargesMap[id], this.charges[id] + 1);
    }
  }

  public getScannerDurationMs(): number {
    return 6000 + this.scannerDurationBonusMs;
  }

  public doesScannerRevealTraps(): boolean {
    return this.scannerRevealsTraps;
  }

  public getPulseTaggerRangePx(): number {
    return 220 + this.pulseRangeBonusPx;
  }

  public getPulseTaggerSnapshot() {
    const remainder = this.pulseEnergy % this.pulseCostPerShot;
    return {
      current: Math.round(this.pulseEnergy),
      max: this.maxPulseEnergy,
      rechargePct:
        this.pulseEnergy >= this.maxPulseEnergy
          ? 100
          : Math.round((remainder / this.pulseCostPerShot) * 100),
    };
  }
}
