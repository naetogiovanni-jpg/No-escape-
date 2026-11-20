import { LevelDefinition, TileType } from '@/src/types/game';

/**
 * Raycast across the tilemap grid using Bresenham-style stepping to verify
 * whether an enemy or camera has an unobstructed line of sight to the target.
 */
export function hasLineOfSight(
  level: LevelDefinition,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  closedDoorTiles: Set<string>
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;

  const stepSize = 10;
  const steps = Math.ceil(dist / stepSize);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const gx = Math.floor(px / level.tileSize);
    const gy = Math.floor(py / level.tileSize);
    if (gy < 0 || gy >= level.height || gx < 0 || gx >= level.width) {
      return false;
    }
    const tile = level.tiles[gy][gx];
    // Note: GLASS_PARTITION blocks movement, NOT line of sight!
    if (tile === TileType.WALL) {
      return false;
    }
    if (closedDoorTiles.has(`${gx},${gy}`)) {
      return false;
    }
  }
  return true;
}

export function isInsideFovCone(
  originX: number,
  originY: number,
  facingRad: number,
  fovAngleDeg: number,
  fovRangePx: number,
  targetX: number,
  targetY: number
): { inCone: boolean; distance: number } {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const distance = Math.hypot(dx, dy);
  if (distance > fovRangePx) {
    return { inCone: false, distance };
  }
  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - facingRad;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const halfFovRad = ((fovAngleDeg / 2) * Math.PI) / 180;
  return {
    inCone: Math.abs(diff) <= halfFovRad,
    distance,
  };
}
