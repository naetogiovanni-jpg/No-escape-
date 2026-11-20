import Phaser from 'phaser';
import { EQUIPMENT_CATALOG } from '@/src/data/equipment';
import { AudioSystem } from '@/src/systems/AudioSystem';
import { CombatManager } from '@/src/systems/CombatManager';
import { EnemyAgent } from '@/src/systems/EnemyAI';
import { EquipmentInventory } from '@/src/systems/EquipmentInventory';
import { EquipmentId, GameMode, LevelDefinition, SaveData } from '@/src/types/game';

export interface GadgetContext {
  scene: Phaser.Scene;
  inventory: EquipmentInventory;
  combat: CombatManager;
  save: SaveData;
  level: LevelDefinition;
  mode: GameMode;
  playerX: number;
  playerY: number;
  aimAngleRad: number;
  now: number;
  closedDoors: Set<string>;
  enemies: EnemyAgent[];
  cameras: Array<{ x: number; y: number; disabled: boolean }>;
  traps: Array<{ x: number; y: number; armTime: number }>;
  onReconActivate: (durationMs: number) => void;
  onDecoyDeploy: (x: number, y: number) => void;
  onBypassAttempt: () => boolean;
  onJammerActivate: () => void;
  onPulseArcFire: () => void;
  onCloakActivate: () => void;
  onDisableCamera: (index: number) => void;
  onDisableTrap: (index: number) => void;
  onToast: (msg: string, ms: number) => void;
}

export class GadgetManager {
  public activate(eqId: EquipmentId, ctx: GadgetContext): boolean {
    const check = ctx.inventory.canUse(
      eqId,
      ctx.now,
      ctx.save,
      ctx.level.isBossLevel,
      ctx.mode
    );
    if (!check.ok) {
      ctx.onToast(check.reason ?? `${EQUIPMENT_CATALOG[eqId].shortName} unavailable.`, 1400);
      return false;
    }

    ctx.inventory.selectGadget(eqId);
    ctx.inventory.consumeUse(eqId, ctx.now);

    switch (eqId) {
      case EquipmentId.RECON_SCANNER: {
        const durMs = ctx.inventory.getScannerDurationMs();
        ctx.onReconActivate(durMs);
        AudioSystem.playTone('hack');
        ctx.onToast(`Reconnaissance pulse active (${Math.round(durMs / 1000)}s).`, 1800);
        return true;
      }

      case EquipmentId.ACOUSTIC_DECOY: {
        const dx = ctx.playerX + Math.cos(ctx.aimAngleRad) * 145;
        const dy = ctx.playerY + Math.sin(ctx.aimAngleRad) * 145;
        ctx.onDecoyDeploy(dx, dy);
        return true;
      }

      case EquipmentId.ACCESS_DEVICE: {
        const ok = ctx.onBypassAttempt();
        if (!ok) {
          ctx.inventory.refundUse(eqId);
          ctx.onToast('Move closer to a locked door or terminal to bypass.', 1800);
          return false;
        }
        return true;
      }

      case EquipmentId.SIGNAL_JAMMER: {
        ctx.onJammerActivate();
        return true;
      }

      case EquipmentId.PULSE_TOOL: {
        AudioSystem.playTone('pulse');
        ctx.onPulseArcFire();
        return true;
      }

      case EquipmentId.SHADOW_CLOAK: {
        ctx.onCloakActivate();
        return true;
      }

      case EquipmentId.PULSE_TAGGER: {
        return this.firePulseTagger(ctx);
      }
    }
  }

  private firePulseTagger(ctx: GadgetContext): boolean {
    const range = ctx.inventory.getPulseTaggerRangePx();
    const target = ctx.combat.findPulseTaggerTarget(
      ctx.playerX,
      ctx.playerY,
      ctx.aimAngleRad,
      range,
      ctx.level,
      ctx.closedDoors,
      ctx.enemies,
      ctx.cameras,
      ctx.traps,
      ctx.now
    );

    AudioSystem.playTone('tagger');

    // Distinctive electronic tether beam + lock ring VFX (clearly non-ballistic electronic pulse)
    const beam = ctx.scene.add
      .line(0, 0, ctx.playerX, ctx.playerY, target.x, target.y, 0x22d3ee, 0.92)
      .setOrigin(0, 0)
      .setLineWidth(3)
      .setDepth(21);
    const lockRing = ctx.scene.add
      .circle(target.x, target.y, 12, 0x22d3ee, 0.28)
      .setStrokeStyle(2, 0x67e8f9, 0.95)
      .setDepth(21);

    ctx.scene.tweens.add({
      targets: [beam, lockRing],
      alpha: 0,
      scale: 1.5,
      duration: 280,
      onComplete: () => {
        beam.destroy();
        lockRing.destroy();
      },
    });

    if (target.kind === 'enemy' && target.enemy) {
      target.enemy.stun(9000, ctx.now);
      ctx.onToast('Pulse Tagger lock — Security unit temporarily disabled.', 1600);
      return true;
    }

    if (target.kind === 'camera' && target.cameraIndex !== undefined) {
      ctx.onDisableCamera(target.cameraIndex);
      ctx.onToast('Pulse Tagger surge — Camera temporarily scrambled.', 1600);
      return true;
    }

    if (target.kind === 'trap' && target.trapIndex !== undefined) {
      ctx.onDisableTrap(target.trapIndex);
      ctx.onToast('Pulse Tagger surge — Security trap neutralized.', 1600);
      return true;
    }

    ctx.onToast('Pulse Tagger discharged (no electronic lock in arc).', 1200);
    return true;
  }
}
