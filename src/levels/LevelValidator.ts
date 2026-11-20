import { LevelDefinition, TileType } from '@/src/types/game';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isWalkable(tile: TileType): boolean {
  return tile !== TileType.WALL && tile !== TileType.GLASS_PARTITION;
}

export function validateLevel(level: LevelDefinition): ValidationResult {
  const errors: string[] = [];

  if (level.width < 12 || level.height < 10) {
    errors.push(`Level ${level.id}: dimensions too small.`);
  }

  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < level.width && y < level.height;

  if (!inBounds(level.spawn.x, level.spawn.y) || !isWalkable(level.tiles[level.spawn.y][level.spawn.x])) {
    errors.push(`Level ${level.id}: player spawn (${level.spawn.x},${level.spawn.y}) is blocked.`);
  }

  if (!inBounds(level.exit.x, level.exit.y) || !isWalkable(level.tiles[level.exit.y][level.exit.x])) {
    errors.push(`Level ${level.id}: exit (${level.exit.x},${level.exit.y}) is blocked.`);
  }

  if (level.objectives.length === 0) {
    errors.push(`Level ${level.id}: no mission objectives defined.`);
  }

  // BFS reachability from spawn (walking + vent teleport links)
  const visited = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const queue: Array<{ x: number; y: number }> = [{ ...level.spawn }];
  visited.add(key(level.spawn.x, level.spawn.y));

  // Map vent entrances to paired target coordinates
  const ventTargets = new Map<string, { x: number; y: number }>();
  const vents = level.interactives.filter((i) => i.type === 'vent_entrance');
  for (let i = 0; i < vents.length; i += 2) {
    const a = vents[i];
    const b = vents[i + 1];
    if (a && b) {
      ventTargets.set(key(a.position.x, a.position.y), b.position);
      ventTargets.set(key(b.position.x, b.position.y), a.position);
    }
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBounds(nx, ny)) continue;
      if (!isWalkable(level.tiles[ny][nx])) continue;
      const nk = key(nx, ny);
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push({ x: nx, y: ny });
      }
    }

    const linkedVent = ventTargets.get(key(cur.x, cur.y));
    if (linkedVent) {
      const vk = key(linkedVent.x, linkedVent.y);
      if (!visited.has(vk) && isWalkable(level.tiles[linkedVent.y][linkedVent.x])) {
        visited.add(vk);
        queue.push(linkedVent);
      }
    }
  }

  if (!visited.has(key(level.exit.x, level.exit.y))) {
    errors.push(`Level ${level.id}: exit is unreachable from spawn.`);
  }

  for (const obj of level.interactives) {
    if (!inBounds(obj.position.x, obj.position.y) || !isWalkable(level.tiles[obj.position.y][obj.position.x])) {
      errors.push(`Level ${level.id}: interactive ${obj.id} sits on solid tile.`);
    } else if (!visited.has(key(obj.position.x, obj.position.y))) {
      errors.push(`Level ${level.id}: interactive ${obj.id} is unreachable.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
