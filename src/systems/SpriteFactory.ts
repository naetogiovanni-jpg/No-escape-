import Phaser from 'phaser';
import { BOSSES } from '@/src/data/bosses';
import { ENEMY_ARCHETYPES } from '@/src/data/enemies';
import { CharacterCustomization, getDefaultAppearance } from '@/src/systems/CharacterCustomization';
import { EnemyArchetype, OperativeAppearance, OperativeId } from '@/src/types/game';

const FRAME_SIZE = 48;

// Frame layout per character spritesheet (16 frames total):
// 0-1: idle (breathing)
// 2-5: walk cycle (4 frames)
// 6-9: sprint cycle (4 frames, leaned)
// 10-11: crouch cycle (2 frames)
// 12: dodge pose
// 13: interact / takedown pose
// 14: damage recoil
// 15: hidden/cloak shimmer frame

export function drawOperativeFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  operative: OperativeId,
  frameIdx: number,
  customAppearance?: OperativeAppearance
) {
  const appearance = customAppearance ?? getDefaultAppearance(operative);
  ctx.save();
  ctx.translate(ox + FRAME_SIZE / 2, oy + FRAME_SIZE / 2);

  const isIdle = frameIdx <= 1;
  const isWalk = frameIdx >= 2 && frameIdx <= 5;
  const isSprint = frameIdx >= 6 && frameIdx <= 9;
  const isCrouch = frameIdx === 10 || frameIdx === 11;
  const isDodge = frameIdx === 12;
  const isInteract = frameIdx === 13;
  const isDamage = frameIdx === 14;

  const breathY = isIdle ? (frameIdx === 1 ? 1.2 : 0) : 0;
  const crouchOffset = isCrouch ? 5 : 0;
  const walkPhase = isWalk
    ? (frameIdx - 2) * (Math.PI / 2)
    : isSprint
    ? (frameIdx - 6) * (Math.PI / 2)
    : 0;
  const legSwing = isWalk
    ? Math.sin(walkPhase) * 4.5
    : isSprint
    ? Math.sin(walkPhase) * 7
    : isCrouch
    ? Math.sin((frameIdx - 10) * Math.PI) * 2.5
    : 0;
  const armSwing = isWalk ? -Math.sin(walkPhase) * 4 : isSprint ? -Math.sin(walkPhase) * 6.5 : 0;
  const leanAngle = isSprint ? 0.16 : isDodge ? 0.32 : isDamage ? -0.22 : isInteract ? 0.1 : 0;

  const jacketColor = appearance.jacketColor;
  const trimColor = appearance.trimColor;
  const trouserColor = appearance.trouserColor;
  const hairColor = appearance.hairColor;
  const skinColor = '#e6cfc0';
  const showHood = appearance.hooded || appearance.jacketStyle === 'hooded_cloak';

  // Drop shadow on floor
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 17, isCrouch ? 12 : 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(leanAngle);
  ctx.translate(0, breathY + crouchOffset);

  // Dodge afterimage lines
  if (isDodge) {
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(-6, -6);
    ctx.moveTo(-18, 2);
    ctx.lineTo(-8, 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Legs & customizable footwear
  const drawLeg = (lx: number, offset: number, darker: boolean) => {
    ctx.fillStyle = darker ? '#090d16' : trouserColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(lx - 3, 6 + offset * 0.4, 5.5, isCrouch ? 6 : 9, 2);
    ctx.fill();
    ctx.stroke();

    const bootY = (isCrouch ? 10 : 13) + offset * 0.4;
    if (appearance.footwearStyle === 'silent_runners') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(lx - 3.2, bootY, 6, 3.2);
      ctx.fillStyle = trimColor;
      ctx.fillRect(lx - 3.2, bootY + 2.2, 6, 1.1);
    } else if (appearance.footwearStyle === 'mag_greaves') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(lx - 3.5, bootY - 1.5, 6.6, 5);
      ctx.fillStyle = trimColor;
      ctx.fillRect(lx - 1.2, bootY - 0.5, 2.4, 2);
    } else {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(lx - 3.2, bootY, 6, 3.5);
    }
  };

  drawLeg(-4.5, legSwing, false);
  drawLeg(3.5, -legSwing, true);

  // Flowing ponytail behind torso if hairStyle === ponytail and not hooded
  if (appearance.hairStyle === 'ponytail' && !showHood) {
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, -9);
    ctx.quadraticCurveTo(-11, -3, -9, 8);
    ctx.quadraticCurveTo(-5, 4, -3, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Hooded cloak back drape
  if (showHood) {
    ctx.fillStyle = jacketColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-11, 9);
    ctx.lineTo(11, 9);
    ctx.lineTo(9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Torso / Jacket style
  ctx.fillStyle = isDamage ? '#991b1b' : jacketColor;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (appearance.jacketStyle === 'armor_vest') {
    ctx.moveTo(-10.5, -8);
    ctx.lineTo(10.5, -8);
    ctx.lineTo(9.5, 8);
    ctx.lineTo(-9.5, 8);
  } else if (appearance.jacketStyle === 'casual_coat') {
    ctx.moveTo(-8, -7);
    ctx.lineTo(8, -7);
    ctx.lineTo(9, 10);
    ctx.lineTo(-9, 10);
  } else if (appearance.jacketStyle === 'stealth_suit') {
    ctx.moveTo(-7.2, -7);
    ctx.lineTo(7.2, -7);
    ctx.lineTo(6, 7.5);
    ctx.lineTo(-6, 7.5);
  } else {
    ctx.moveTo(-8.5, -7);
    ctx.lineTo(8.5, -7);
    ctx.lineTo(7.5, 7.5);
    ctx.lineTo(-7.5, 7.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (appearance.jacketStyle === 'armor_vest') {
    // Heavy shoulder pauldrons
    ctx.fillStyle = '#334155';
    ctx.fillRect(-13, -8, 4.5, 6);
    ctx.strokeRect(-13, -8, 4.5, 6);
    ctx.fillRect(8.5, -8, 4.5, 6);
    ctx.strokeRect(8.5, -8, 4.5, 6);
  } else if (appearance.jacketStyle === 'stealth_suit') {
    // Glowing chest seam trim
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(0, 2);
    ctx.lineTo(4, -5);
    ctx.stroke();
  } else if (appearance.jacketStyle === 'casual_coat') {
    // Coat lapels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-5, -7);
    ctx.lineTo(-1, -1);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -7);
    ctx.lineTo(1, -1);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
  }

  // Utility belt & clasp
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-7, 4, 14, 3);
  ctx.fillStyle = trimColor;
  ctx.fillRect(-1.8, 4.3, 3.6, 2.4);

  // Storm collar or Stealth Scarf
  if (appearance.accessory === 'scarf') {
    ctx.fillStyle = trimColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-7.5, -10.5, 15, 5, 2);
    ctx.fill();
    ctx.stroke();
  } else if (appearance.jacketStyle !== 'casual_coat') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(-7, -10.5);
    ctx.lineTo(7, -10.5);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Arms & customizable gloves
  const drawArm = (ax: number, swing: number, raised: boolean) => {
    ctx.save();
    ctx.translate(ax, -5);
    ctx.rotate(raised ? -1.15 : swing * 0.08);
    ctx.fillStyle = jacketColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-2, 0, 4.2, 9, 1.8);
    ctx.fill();
    ctx.stroke();

    if (appearance.gloveStyle === 'armored') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2.4, 5.5, 5, 4.2);
      ctx.strokeRect(-2.4, 5.5, 5, 4.2);
    } else if (appearance.gloveStyle === 'insulated') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-2.2, 6, 4.6, 3.8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2.2, 6, 4.6, 1.1);
    } else if (appearance.gloveStyle === 'neon_grip') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-2, 6.4, 4.2, 3.4);
      ctx.fillStyle = trimColor;
      ctx.fillRect(-2, 6.4, 4.2, 1.2);
    } else {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-2, 6.8, 4.2, 3);
    }
    ctx.restore();
  };

  drawArm(-9, armSwing, false);
  drawArm(9, -armSwing, isInteract);

  // Holographic wrist emitter (accessory or Nova default)
  if (appearance.accessory === 'holo_wrist') {
    ctx.fillStyle = trimColor;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(isInteract ? 11 : 8, isInteract ? -10 : 0, 5, 3);
    ctx.globalAlpha = 1;
  }

  // Head & Expressive Face
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -13, 6.2, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sharp eyes
  ctx.fillStyle = '#090d16';
  ctx.fillRect(-3.8, -13.2, 2.3, 1.8);
  ctx.fillRect(1.5, -13.2, 2.3, 1.8);
  ctx.fillStyle = trimColor;
  ctx.fillRect(-3.2, -12.9, 1.2, 1.1);
  ctx.fillRect(2.0, -12.9, 1.2, 1.1);

  // Lower-face atmospheric half-mask
  if (appearance.accessory === 'half_mask') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-5.2, -10.8, 10.4, 4.5, 1.5);
    ctx.fill();
    ctx.stroke();
  }

  // Recon Visor
  if (appearance.accessory === 'visor') {
    ctx.fillStyle = trimColor;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-5.4, -14.2, 10.8, 3.2);
    ctx.globalAlpha = 1;
  }

  // Hair Silhouette (hidden under hood if hooded)
  if (showHood) {
    ctx.fillStyle = jacketColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8.5, -10);
    ctx.quadraticCurveTo(-9, -22, 0, -23);
    ctx.quadraticCurveTo(9, -22, 8.5, -10);
    ctx.lineTo(5.5, -14.5);
    ctx.quadraticCurveTo(0, -18.5, -5.5, -14.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.quadraticCurveTo(0, -19, 6, -15);
    ctx.stroke();
  } else {
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (appearance.hairStyle === 'layered') {
      ctx.moveTo(-7.5, -13);
      ctx.lineTo(-8.5, -18);
      ctx.lineTo(-4.5, -21);
      ctx.lineTo(0, -21.5);
      ctx.lineTo(5, -20.5);
      ctx.lineTo(8.5, -17.5);
      ctx.lineTo(7, -12.5);
      ctx.lineTo(4, -15.5);
      ctx.lineTo(1.2, -12.2);
      ctx.lineTo(-1.5, -15.8);
      ctx.lineTo(-4.2, -12.8);
      ctx.closePath();
    } else if (appearance.hairStyle === 'undercut') {
      ctx.moveTo(-6.5, -14);
      ctx.lineTo(-6, -20.5);
      ctx.lineTo(1, -22);
      ctx.lineTo(8.5, -18);
      ctx.lineTo(7.5, -10.5);
      ctx.lineTo(2.5, -14.5);
      ctx.lineTo(-2, -16);
      ctx.closePath();
    } else if (appearance.hairStyle === 'swept') {
      ctx.moveTo(-7.2, -13.5);
      ctx.lineTo(-8, -18.5);
      ctx.lineTo(-3, -21.5);
      ctx.lineTo(2, -21.5);
      ctx.lineTo(7.8, -18.5);
      ctx.lineTo(7, -13.5);
      ctx.lineTo(3.5, -15.8);
      ctx.lineTo(0, -14);
      ctx.lineTo(-3.5, -16);
      ctx.closePath();
    } else if (appearance.hairStyle === 'cropped') {
      ctx.moveTo(-6.5, -15);
      ctx.lineTo(-6.5, -20.5);
      ctx.lineTo(6.5, -20.5);
      ctx.lineTo(6.5, -15);
      ctx.lineTo(4, -16.8);
      ctx.lineTo(-4, -16.8);
      ctx.closePath();
    } else {
      ctx.moveTo(-7, -12);
      ctx.lineTo(-7, -18.5);
      ctx.lineTo(0, -21);
      ctx.lineTo(7, -18.5);
      ctx.lineTo(7, -12);
      ctx.lineTo(4.2, -15.5);
      ctx.lineTo(0, -14.8);
      ctx.lineTo(-4.2, -15.5);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  }

  // Comms Headset over hair/ear
  if (appearance.accessory === 'headset') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-7.5, -15.5, 2.3, 4.4);
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6.4, -12.5);
    ctx.lineTo(-1, -10);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemyFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  archetype: EnemyArchetype,
  frameIdx: number
) {
  const cfg = ENEMY_ARCHETYPES[archetype];
  ctx.save();
  ctx.translate(ox + FRAME_SIZE / 2, oy + FRAME_SIZE / 2);

  const walkPhase = frameIdx >= 2 && frameIdx <= 5 ? (frameIdx - 2) * (Math.PI / 2) : 0;
  const legSwing = Math.sin(walkPhase) * 4.2;
  const armBob = Math.cos(walkPhase) * 1.1;
  const isFiring = frameIdx === 12 || frameIdx === 13;
  const isStunned = frameIdx === 14;
  const isRifle =
    archetype === EnemyArchetype.CAUTIOUS_GUARD ||
    archetype === EnemyArchetype.ELITE_AGENT ||
    archetype === EnemyArchetype.TRACKER;

  // Ground drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 17, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isStunned) {
    ctx.rotate(0.28);
  } else if (isFiring) {
    ctx.rotate(-0.06);
  }

  // Trousers & boots
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-5.5, 5.5 + legSwing * 0.35, 4.5, 10, 1.5);
  ctx.roundRect(1.2, 5.5 - legSwing * 0.35, 4.5, 10, 1.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#09090b';
  ctx.fillRect(-5.7, 12.5 + legSwing * 0.35, 5, 3.5);
  ctx.fillRect(1, 12.5 - legSwing * 0.35, 5, 3.5);

  // Back arm
  ctx.fillStyle = cfg.uniformPrimary;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-10.5, -5 + armBob, 4, 8.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // Human Security Uniform Torso (collared shirt / vest / tie / badge)
  ctx.fillStyle = isStunned ? '#475569' : cfg.uniformPrimary;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-8, -7, 16, 14, 2.5);
  ctx.fill();
  ctx.stroke();

  // Shirt collar & tie / vest trim
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.lineTo(0, -3);
  ctx.lineTo(4, -7);
  ctx.closePath();
  ctx.fill();

  // Tactical vest or uniform belt & security badge
  ctx.fillStyle = cfg.uniformSecondary;
  if (isRifle) {
    ctx.fillRect(-7.5, -3.5, 15, 7);
  }
  ctx.fillStyle = '#090d16';
  ctx.fillRect(-7.5, 4.2, 15, 2.8);
  // Gold/silver chest security badge
  ctx.fillStyle = cfg.visorColor;
  ctx.fillRect(-5.5, -4, 3, 2.5);

  // Human Head & Face (clearly visible skin, eyes, eyebrows)
  ctx.fillStyle = cfg.skinTone;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, -13, 5.8, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Human eyes + stern eyebrows
  ctx.fillStyle = '#0f172a';
  if (isStunned) {
    ctx.fillRect(-3.6, -13.2, 2.5, 1);
    ctx.fillRect(1.2, -13.2, 2.5, 1);
  } else {
    ctx.fillRect(-3.4, -13.4, 1.9, 1.8);
    ctx.fillRect(1.5, -13.4, 1.9, 1.8);
    // Eyebrows
    ctx.fillStyle = cfg.hairColor;
    ctx.fillRect(-3.8, -15.2, 2.6, 1);
    ctx.fillRect(1.2, -15.2, 2.6, 1);
  }

  // Distinct Human Hair & Security Headgear per archetype
  ctx.fillStyle = cfg.hairColor;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-6.2, -13.5);
  ctx.lineTo(-6.4, -18.2);
  ctx.lineTo(0, -20.5);
  ctx.lineTo(6.4, -18.2);
  ctx.lineTo(6.2, -13.5);
  ctx.lineTo(4.2, -16.2);
  ctx.lineTo(-4.2, -16.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (archetype === EnemyArchetype.STANDARD_GUARD) {
    // Peaked navy security officer cap with gold badge
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6.8, -20.2, 13.6, 4.2);
    ctx.strokeRect(-6.8, -20.2, 13.6, 4.2);
    ctx.fillStyle = '#020617';
    ctx.fillRect(-5, -16.4, 11.5, 1.8); // cap visor brim
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1.2, -19.2, 2.4, 2.2);
  } else if (archetype === EnemyArchetype.CAUTIOUS_GUARD) {
    // Comms headset + mic boom
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-7.2, -15.5, 2.2, 4.2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -12.5);
    ctx.lineTo(-1, -10.2);
    ctx.stroke();
  } else if (archetype === EnemyArchetype.TECHNICIAN) {
    // Safety goggles pushed up on forehead
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.fillRect(-4.8, -18.2, 4, 2.4);
    ctx.strokeRect(-4.8, -18.2, 4, 2.4);
    ctx.fillRect(0.8, -18.2, 4, 2.4);
    ctx.strokeRect(0.8, -18.2, 4, 2.4);
  } else if (archetype === EnemyArchetype.ELITE_AGENT) {
    // Crimson tactical beret
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(-0.5, -18.5, 7.2, 3.2, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (archetype === EnemyArchetype.TRACKER) {
    // Single right-eye tactical rangefinder eyepiece (face still human)
    ctx.fillStyle = '#34d399';
    ctx.fillRect(1.1, -13.9, 3, 2.3);
  }

  // Front arm + hands gripping firearm pointing right (+X direction; FlipX handles left)
  const gunY = isFiring ? -2.5 : -0.5 + armBob;
  ctx.fillStyle = cfg.uniformPrimary;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(3, -4.5, 7.5, 4.2, 1.5);
  ctx.fill();
  ctx.stroke();

  // Hand holding grip
  ctx.fillStyle = cfg.skinTone;
  ctx.fillRect(8.5, gunY - 0.5, 3, 3);

  // Firearm silhouette (Pistol vs Rifle/Carbine)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.9;
  if (isRifle) {
    // Rifle receiver + long barrel + stock + magazine
    ctx.fillRect(4, gunY - 2, 16, 3.2);
    ctx.strokeRect(4, gunY - 2, 16, 3.2);
    ctx.fillRect(10.5, gunY + 1, 2.6, 3.8); // magazine
    if (archetype === EnemyArchetype.TRACKER) {
      // Top scope
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, gunY - 4, 6, 1.8);
    }
  } else {
    // Service pistol / stun sidearm
    ctx.fillRect(9.5, gunY - 2.2, 9, 2.8);
    ctx.strokeRect(9.5, gunY - 2.2, 9, 2.8);
    ctx.fillRect(9.5, gunY + 0.4, 2.5, 3.2); // grip
  }

  // Muzzle flash on firing frames
  if (isFiring && !isStunned) {
    const muzzleX = isRifle ? 21 : 19.5;
    const muzzleY = gunY - 0.8;
    ctx.fillStyle = cfg.muzzleColor;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY - 3.5);
    ctx.lineTo(muzzleX + 6, muzzleY);
    ctx.lineTo(muzzleX, muzzleY + 3.5);
    ctx.lineTo(muzzleX + 2.5, muzzleY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawBossTexture(ctx: CanvasRenderingContext2D, bossId: string) {
  const boss = BOSSES[bossId];
  const size = 64;
  ctx.save();
  ctx.translate(size / 2, size / 2);

  // Boss ground aura
  ctx.strokeStyle = boss.accentColor;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 21, 20, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Flowing boss mantle / coat
  ctx.fillStyle = boss.primaryColor;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(14, -10);
  ctx.lineTo(18, 18);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Armored pauldrons
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = boss.accentColor;
  ctx.lineWidth = 1.5;
  ctx.fillRect(-18, -12, 8, 9);
  ctx.strokeRect(-18, -12, 8, 9);
  ctx.fillRect(10, -12, 8, 9);
  ctx.strokeRect(10, -12, 8, 9);

  // Head + Crown/Visor silhouette
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, -17, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = boss.accentColor;
  ctx.fillRect(-6, -18.5, 12, 3.2);

  ctx.restore();
}

export function ensureGameTextures(scene: Phaser.Scene): void {
  const ops: OperativeId[] = [
    OperativeId.GHOST,
    OperativeId.VEX,
    OperativeId.BASTION,
    OperativeId.NOVA,
    OperativeId.RAVEN,
  ];
  for (const op of ops) {
    const key = `sheet_op_${op}`;
    if (!scene.textures.exists(key)) {
      const canvasTex = scene.textures.createCanvas(key, FRAME_SIZE * 16, FRAME_SIZE);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        for (let f = 0; f < 16; f++) {
          drawOperativeFrame(ctx, f * FRAME_SIZE, 0, op, f);
        }
        canvasTex.refresh();
        scene.textures.addSpriteSheet(
          `${key}_ss`,
          canvasTex.getSourceImage() as unknown as HTMLImageElement,
          {
            frameWidth: FRAME_SIZE,
            frameHeight: FRAME_SIZE,
          }
        );
      }
      registerOperativeAnimations(scene, op);
    }
  }

  for (const arch of Object.values(EnemyArchetype)) {
    const key = `sheet_enemy_${arch}`;
    if (!scene.textures.exists(key)) {
      const canvasTex = scene.textures.createCanvas(key, FRAME_SIZE * 16, FRAME_SIZE);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        for (let f = 0; f < 16; f++) {
          drawEnemyFrame(ctx, f * FRAME_SIZE, 0, arch, f);
        }
        canvasTex.refresh();
        scene.textures.addSpriteSheet(
          `${key}_ss`,
          canvasTex.getSourceImage() as unknown as HTMLImageElement,
          {
            frameWidth: FRAME_SIZE,
            frameHeight: FRAME_SIZE,
          }
        );
      }
      registerEnemyAnimations(scene, arch);
    }
  }

  for (const bossId of Object.keys(BOSSES)) {
    const key = `tex_boss_${bossId}`;
    if (!scene.textures.exists(key)) {
      const canvasTex = scene.textures.createCanvas(key, 64, 64);
      if (canvasTex) {
        drawBossTexture(canvasTex.getContext(), bossId);
        canvasTex.refresh();
      }
    }
  }
}

export function ensureCustomOperativeTexture(
  scene: Phaser.Scene,
  operative: OperativeId,
  appearance: OperativeAppearance
): { ssKey: string; animPrefix: string } {
  const sig = CharacterCustomization.getAppearanceSignature(operative, appearance);
  // Deterministic short hash
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    hash = (hash * 31 + sig.charCodeAt(i)) | 0;
  }
  const tag = `custom_${operative}_${Math.abs(hash)}`;
  const texKey = `sheet_${tag}`;
  const ssKey = `${texKey}_ss`;

  if (!scene.textures.exists(ssKey)) {
    const canvasTex = scene.textures.createCanvas(texKey, FRAME_SIZE * 16, FRAME_SIZE);
    if (canvasTex) {
      const ctx = canvasTex.getContext();
      for (let f = 0; f < 16; f++) {
        drawOperativeFrame(ctx, f * FRAME_SIZE, 0, operative, f, appearance);
      }
      canvasTex.refresh();
      scene.textures.addSpriteSheet(
        ssKey,
        canvasTex.getSourceImage() as unknown as HTMLImageElement,
        {
          frameWidth: FRAME_SIZE,
          frameHeight: FRAME_SIZE,
        }
      );
    }
    registerOperativeAnimations(scene, tag, ssKey);
  }

  return { ssKey, animPrefix: tag };
}

function registerOperativeAnimations(
  scene: Phaser.Scene,
  prefix: string,
  overrideSsKey?: string
) {
  const ssKey = overrideSsKey ?? `sheet_op_${prefix}_ss`;
  if (!scene.textures.exists(ssKey)) return;

  if (!scene.anims.exists(`${prefix}_idle`)) {
    scene.anims.create({
      key: `${prefix}_idle`,
      frames: scene.anims.generateFrameNumbers(ssKey, { start: 0, end: 1 }),
      frameRate: 2.5,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_walk`,
      frames: scene.anims.generateFrameNumbers(ssKey, { start: 2, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_sprint`,
      frames: scene.anims.generateFrameNumbers(ssKey, { start: 6, end: 9 }),
      frameRate: 13,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_crouch`,
      frames: scene.anims.generateFrameNumbers(ssKey, { start: 10, end: 11 }),
      frameRate: 5,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_dodge`,
      frames: [{ key: ssKey, frame: 12 }],
      frameRate: 10,
    });
    scene.anims.create({
      key: `${prefix}_interact`,
      frames: [{ key: ssKey, frame: 13 }],
      frameRate: 10,
    });
    scene.anims.create({
      key: `${prefix}_damage`,
      frames: [{ key: ssKey, frame: 14 }],
      frameRate: 10,
    });
  }
}

function registerEnemyAnimations(scene: Phaser.Scene, arch: EnemyArchetype) {
  const ssKey = `sheet_enemy_${arch}_ss`;
  if (!scene.textures.exists(ssKey)) return;

  if (!scene.anims.exists(`enemy_${arch}_idle`)) {
    scene.anims.create({
      key: `enemy_${arch}_idle`,
      frames: [{ key: ssKey, frame: 0 }],
      frameRate: 2,
    });
    scene.anims.create({
      key: `enemy_${arch}_walk`,
      frames: scene.anims.generateFrameNumbers(ssKey, { start: 2, end: 5 }),
      frameRate: 7,
      repeat: -1,
    });
    scene.anims.create({
      key: `enemy_${arch}_fire`,
      frames: [
        { key: ssKey, frame: 12 },
        { key: ssKey, frame: 13 },
        { key: ssKey, frame: 0 },
      ],
      frameRate: 14,
      repeat: 0,
    });
    scene.anims.create({
      key: `enemy_${arch}_stunned`,
      frames: [{ key: ssKey, frame: 14 }],
      frameRate: 2,
    });
  }
}
