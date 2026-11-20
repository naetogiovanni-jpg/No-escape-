import { BOSSES } from '@/src/data/bosses';
import { CHAPTERS } from '@/src/data/chapters';
import {
  CameraPlacement,
  EnemyArchetype,
  EnemyPlacement,
  EquipmentId,
  GridPoint,
  InteractivePlacement,
  InteractiveType,
  LaserPlacement,
  LevelDefinition,
  LevelLayoutStyle,
  LevelObjective,
  MovingHazardPlacement,
  TileType,
} from '@/src/types/game';

const LEVEL_NAMES: string[] = [
  // Ch 1: First Contact
  'Silent Entry', 'Dead Wing', 'Cold Corridor', 'Archive Node', 'Ventilation Run',
  'Reactor Shadow', 'Keycard Vault', 'Blind Sweep', 'Emergency Seal', 'The Warden',
  // Ch 2: Dead Signal
  'Lobby Perimeter', 'Glass Atrium', 'Server Mezzanine', 'Relay Junction', 'Fiber Spine',
  'Executive Wing', 'Firewall Gate', 'Signal Burnout', 'Penthouse Climb', 'Spectre',
  // Ch 3: Underground
  'Sublevel Stair', 'Freight Spur', 'Dark Tunnel', 'Signal Box', 'Express Line',
  'Maintenance Pit', 'Switchyard', 'Platform Nine', 'Collapsed Tube', 'Iron Jackal',
  // Ch 4: Blackout
  'Breaker Room', 'Emergency Strobe', 'Armory Annex', 'Radar Shadow', 'Thermal Maze',
  'Command Deck', 'Laser Grid', 'Siren Escape', 'Vault Descent', 'Nightfall',
  // Ch 5: False Identities
  'Courtyard Gate', 'Staff Kitchen', 'Grand Foyer', 'VIP Mezzanine', 'Private Study',
  'Ballroom Balcony', 'Safe Suite', 'Gala Lockdown', 'Master Vault', 'The Architect',
  // Ch 6: The Pursuit
  'Loading Dock', 'Crane Walk', 'Steam Alley', 'Skybridge', 'Overwatch Alley',
  'Turbine Roof', 'Searchlight Run', 'Lockdown Sprint', 'Helipad Approach', 'Vantage',
  // Ch 7: Ghost Network
  'Embassy Annex', 'Cipher Room', 'Diplomatic Wing', 'Dead Drop', 'Mirror Hall',
  'Node Seven', 'Crossfire Hub', 'Double Agent', 'Core Exchange', 'Mirage',
  // Ch 8: The Forgotten City
  'Sunken Gate', 'Stone Aqueduct', 'Buried Lab', 'Echo Chamber', 'Obsidian Hall',
  'Relic Vault', 'Silent Cistern', 'Old Archive', 'Sanctum Bridge', 'The Executor',
  // Ch 9: Protocol Zero
  'Outer Checkpoint', 'Briefing Hall', 'Armory Spire', 'Ops Center', 'Containment Hall',
  'Handler Suite', 'Server Sanctum', 'Internal Purge', 'Command Stairs', 'Commander Zero',
  // Ch 10: The Last Shadow
  'Citadel Base', 'Outer Ring', 'Surveillance Spine', 'Shadow Wing', 'Black Vault',
  'Null Corridor', 'Inner Bastion', 'Protocol Lock', 'Final Ascent', 'The Director',
];

function createSeededRng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeEmptyGrid(width: number, height: number, fill = TileType.FLOOR): TileType[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function carveRect(tiles: TileType[][], x: number, y: number, w: number, h: number, type: TileType) {
  for (let row = y; row < y + h; row++) {
    if (row < 1 || row >= tiles.length - 1) continue;
    for (let col = x; col < x + w; col++) {
      if (col < 1 || col >= tiles[0].length - 1) continue;
      tiles[row][col] = type;
    }
  }
}

function drawWallBorder(tiles: TileType[][]) {
  const h = tiles.length;
  const w = tiles[0].length;
  for (let x = 0; x < w; x++) {
    tiles[0][x] = TileType.WALL;
    tiles[h - 1][x] = TileType.WALL;
  }
  for (let y = 0; y < h; y++) {
    tiles[y][0] = TileType.WALL;
    tiles[y][w - 1] = TileType.WALL;
  }
}

function pickArchetype(chapter: number, index: number, rng: () => number): EnemyArchetype {
  const roll = rng();
  if (chapter === 1) {
    return index % 3 === 2 ? EnemyArchetype.CAUTIOUS_GUARD : EnemyArchetype.STANDARD_GUARD;
  }
  if (chapter === 2) {
    if (index % 3 === 1) return EnemyArchetype.TECHNICIAN;
    return roll > 0.55 ? EnemyArchetype.CAUTIOUS_GUARD : EnemyArchetype.STANDARD_GUARD;
  }
  if (chapter <= 4) {
    if (roll < 0.25) return EnemyArchetype.TRACKER;
    if (roll < 0.5) return EnemyArchetype.CAUTIOUS_GUARD;
    if (roll < 0.7) return EnemyArchetype.TECHNICIAN;
    return EnemyArchetype.STANDARD_GUARD;
  }
  if (chapter <= 7) {
    if (roll < 0.25) return EnemyArchetype.ELITE_AGENT;
    if (roll < 0.5) return EnemyArchetype.TRACKER;
    if (roll < 0.72) return EnemyArchetype.TECHNICIAN;
    return EnemyArchetype.CAUTIOUS_GUARD;
  }
  if (roll < 0.42) return EnemyArchetype.ELITE_AGENT;
  if (roll < 0.7) return EnemyArchetype.TRACKER;
  if (roll < 0.85) return EnemyArchetype.TECHNICIAN;
  return EnemyArchetype.CAUTIOUS_GUARD;
}

export function generateBossLevel(levelId: number, bossIdOverride?: string): LevelDefinition {
  const isSecret = levelId > 100;
  const chapter = isSecret ? 10 : Math.ceil(levelId / 10);
  const chMeta = CHAPTERS[chapter - 1];
  const bossId = bossIdOverride ?? chMeta.bossId;
  const boss = BOSSES[bossId];

  const width = 28;
  const height = 20;
  const tiles = makeEmptyGrid(width, height, TileType.FLOOR);
  drawWallBorder(tiles);

  // Arena tactical pillars & shadowed corners for cover
  const pillars = [
    [6, 5, 2, 2],
    [20, 5, 2, 2],
    [6, 13, 2, 2],
    [20, 13, 2, 2],
    [13, 4, 2, 1],
    [13, 15, 2, 1],
  ];
  for (const [px, py, pw, ph] of pillars) {
    carveRect(tiles, px, py, pw, ph, TileType.WALL);
  }

  // Dark concealment alcoves on flanks
  carveRect(tiles, 2, 2, 2, 2, TileType.DARK_CORNER);
  carveRect(tiles, 24, 2, 2, 2, TileType.DARK_CORNER);
  carveRect(tiles, 2, 16, 2, 2, TileType.DARK_CORNER);
  carveRect(tiles, 24, 16, 2, 2, TileType.DARK_CORNER);

  const interactives: InteractivePlacement[] = [
    {
      id: `boss_term_1_${levelId}`,
      type: InteractiveType.TERMINAL,
      position: { x: 4, y: 10 },
      label: 'Disrupt Shield Relay',
    },
    {
      id: `boss_term_2_${levelId}`,
      type: InteractiveType.TERMINAL,
      position: { x: 23, y: 10 },
      label: 'Disrupt Shield Relay',
    },
    {
      id: `boss_locker_${levelId}`,
      type: InteractiveType.LOCKER,
      position: { x: 2, y: 6 },
      label: 'Concealment Locker',
    },
    {
      id: `boss_exit_${levelId}`,
      type: InteractiveType.EXIT,
      position: { x: 25, y: 10 },
      label: 'Extraction Elevator',
    },
  ];

  const cameras: CameraPlacement[] =
    chapter >= 2
      ? [
          {
            id: `boss_cam_1`,
            position: { x: 14, y: 2 },
            baseAngleDeg: 90,
            sweepDeg: 60,
            sweepSpeed: 0.9,
            rangePx: 190,
            linkedTerminalId: `boss_term_1_${levelId}`,
          },
        ]
      : [];

  return {
    id: levelId,
    code: isSecret ? `SEC-${levelId - 100}` : `OP-${String(levelId).padStart(3, '0')}`,
    name: boss.name,
    chapter,
    layoutStyle: 'atrium_rings',
    isBossLevel: true,
    isEscapeLevel: false,
    bossId,
    width,
    height,
    tileSize: 40,
    tiles,
    spawn: { x: 3, y: 10 },
    exit: { x: 25, y: 10 },
    enemies: [],
    cameras,
    lasers: [],
    movingHazards: [],
    interactives,
    objectives: [
      {
        id: 'defeat_boss',
        description: `Neutralize ${boss.name} using Pulse charges or Shield Terminals`,
        type: 'boss',
        targetCount: 1,
      },
      {
        id: 'extract',
        description: 'Reach Extraction Elevator',
        type: 'extract',
        targetCount: 1,
      },
    ],
    routeHints: [
      'Use arena pillars to block telegraphed energy surges and dodge with Space / Shift.',
      'Hack the flank Shield Relay terminals or fire your Pulse Tool (key 5) to drop boss shields.',
    ],
    briefingNote: `${boss.firstAppearanceText}. ${boss.introLine}`,
  };
}

const CAMPAIGN_STYLES: LevelLayoutStyle[] = [
  'three_wing',
  'compound_rooms',
  'labyrinth',
  'zigzag_gauntlet',
  'atrium_rings',
];

function isTileWalkable(t: TileType): boolean {
  return t !== TileType.WALL && t !== TileType.GLASS_PARTITION;
}

function ensurePointConnected(
  tiles: TileType[][],
  spawn: GridPoint,
  target: GridPoint
): void {
  const h = tiles.length;
  const w = tiles[0].length;
  if (!isTileWalkable(tiles[target.y][target.x])) {
    tiles[target.y][target.x] = TileType.FLOOR;
  }

  const visited = new Set<string>();
  const queue: GridPoint[] = [{ ...spawn }];
  visited.add(`${spawn.x},${spawn.y}`);
  const visitedList: GridPoint[] = [{ ...spawn }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === target.x && cur.y === target.y) return;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
      if (!isTileWalkable(tiles[ny][nx])) continue;
      const k = `${nx},${ny}`;
      if (!visited.has(k)) {
        visited.add(k);
        const pt = { x: nx, y: ny };
        visitedList.push(pt);
        queue.push(pt);
      }
    }
  }

  // Target is disconnected — find closest reachable point and carve a clean L-corridor
  let best = visitedList[0];
  let bestDist = Infinity;
  for (const pt of visitedList) {
    const d = Math.abs(pt.x - target.x) + Math.abs(pt.y - target.y);
    if (d < bestDist) {
      bestDist = d;
      best = pt;
    }
  }

  let cx = best.x;
  let cy = best.y;
  while (cx !== target.x) {
    cx += cx < target.x ? 1 : -1;
    if (!isTileWalkable(tiles[cy][cx])) tiles[cy][cx] = TileType.FLOOR;
  }
  while (cy !== target.y) {
    cy += cy < target.y ? 1 : -1;
    if (!isTileWalkable(tiles[cy][cx])) tiles[cy][cx] = TileType.FLOOR;
  }
}

function carveBraidedLabyrinth(
  tiles: TileType[][],
  width: number,
  height: number,
  chapter: number,
  rng: () => number
) {
  // Fill interior with walls, then carve a 2-step braided recursive-backtracker maze
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      tiles[y][x] = TileType.WALL;
    }
  }

  // Carve perimeter stealth lanes at x=2 and x=width-3 and y=2/y=height-3 partially
  const visitedCells = new Set<string>();
  const stack: GridPoint[] = [{ x: 3, y: 3 }];
  visitedCells.add('3,3');
  tiles[3][3] = TileType.FLOOR;

  const cellDirs = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const candidates: Array<{ nx: number; ny: number; mx: number; my: number }> = [];
    for (const [dx, dy] of cellDirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx >= 2 && nx <= width - 3 && ny >= 2 && ny <= height - 3) {
        if (!visitedCells.has(`${nx},${ny}`)) {
          candidates.push({ nx, ny, mx: cur.x + dx / 2, my: cur.y + dy / 2 });
        }
      }
    }

    if (candidates.length === 0) {
      stack.pop();
    } else {
      const pick = candidates[Math.floor(rng() * candidates.length)];
      visitedCells.add(`${pick.nx},${pick.ny}`);
      tiles[pick.my][pick.mx] = TileType.FLOOR;
      tiles[pick.ny][pick.nx] = TileType.FLOOR;
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  // Braid ~45% of walls separating carved corridors so there are always flanking loops
  for (let y = 3; y < height - 3; y += 2) {
    for (let x = 3; x < width - 3; x += 2) {
      if (rng() < 0.45) {
        const offsets = [
          [1, 0],
          [0, 1],
        ];
        const [ox, oy] = offsets[Math.floor(rng() * offsets.length)];
        if (x + ox * 2 < width - 2 && y + oy * 2 < height - 2) {
          tiles[y + oy][x + ox] = TileType.FLOOR;
        }
      }
    }
  }

  // Add glass observation windows on select chapter 2/5/7 walls and widen spawn/exit hubs
  carveRect(tiles, 2, Math.floor(height / 2) - 2, 3, 5, TileType.FLOOR);
  carveRect(tiles, width - 5, Math.floor(height / 2) - 2, 3, 5, TileType.FLOOR);
  carveRect(tiles, Math.floor(width / 2) - 2, Math.floor(height / 2) - 2, 4, 4, TileType.FLOOR);

  if (chapter === 2 || chapter === 7) {
    for (let y = 4; y < height - 4; y += 4) {
      for (let x = 4; x < width - 4; x += 4) {
        if (tiles[y][x] === TileType.WALL && rng() > 0.4) {
          tiles[y][x] = TileType.GLASS_PARTITION;
        }
      }
    }
  }

  // Place LOW_COVER parkour barriers inside open maze hubs
  const midY = Math.floor(height / 2);
  const barrierCandidates: GridPoint[] = [
    { x: Math.floor(width / 2), y: midY - 1 },
    { x: Math.floor(width / 2) - 1, y: midY + 1 },
    { x: 3, y: midY },
    { x: width - 4, y: midY },
  ];
  for (const bc of barrierCandidates) {
    if (tiles[bc.y]?.[bc.x] === TileType.FLOOR) {
      tiles[bc.y][bc.x] = TileType.LOW_COVER;
    }
  }
}

function carveAtriumRings(
  tiles: TileType[][],
  width: number,
  height: number,
  chapter: number,
  rng: () => number
) {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  // Outer security ring wall
  for (let x = 4; x < width - 4; x++) {
    tiles[4][x] = chapter === 2 && x % 3 !== 0 ? TileType.GLASS_PARTITION : TileType.WALL;
    tiles[height - 5][x] = TileType.WALL;
  }
  for (let y = 4; y < height - 4; y++) {
    tiles[y][4] = TileType.WALL;
    tiles[y][width - 5] = TileType.WALL;
  }
  // 4 wide cardinal entries into outer ring
  carveRect(tiles, midX - 1, 4, 3, 1, TileType.FLOOR);
  carveRect(tiles, midX - 1, height - 5, 3, 1, TileType.FLOOR);
  carveRect(tiles, 4, midY - 1, 1, 3, TileType.FLOOR);
  carveRect(tiles, width - 5, midY - 1, 1, 3, TileType.FLOOR);

  // Inner fortified command core
  const ix1 = 9;
  const ix2 = width - 10;
  const iy1 = 7;
  const iy2 = height - 8;
  for (let x = ix1; x <= ix2; x++) {
    tiles[iy1][x] = x % 4 === 0 ? TileType.GLASS_PARTITION : TileType.WALL;
    tiles[iy2][x] = x % 4 === 0 ? TileType.GLASS_PARTITION : TileType.WALL;
  }
  for (let y = iy1; y <= iy2; y++) {
    tiles[y][ix1] = TileType.WALL;
    tiles[y][ix2] = TileType.WALL;
  }
  carveRect(tiles, midX - 1, iy1, 2, 1, TileType.FLOOR);
  carveRect(tiles, midX - 1, iy2, 2, 1, TileType.FLOOR);
  carveRect(tiles, ix1, midY - 1, 1, 2, TileType.FLOOR);
  carveRect(tiles, ix2, midY - 1, 1, 2, TileType.FLOOR);

  // Corner cover pillars & parkour barriers
  if (rng() > 0.2) {
    tiles[midY - 2][midX - 2] = TileType.LOW_COVER;
    tiles[midY + 2][midX + 2] = TileType.LOW_COVER;
  }
  tiles[6][7] = TileType.LOW_COVER;
  tiles[height - 7][width - 8] = TileType.LOW_COVER;
}

function carveZigzagGauntlet(
  tiles: TileType[][],
  width: number,
  height: number,
  chapter: number,
  rng: () => number
) {
  const baffles = [
    Math.floor(width * 0.24),
    Math.floor(width * 0.44),
    Math.floor(width * 0.64),
    Math.floor(width * 0.82),
  ];

  baffles.forEach((bx, idx) => {
    const openTop = idx % 2 === 0;
    for (let y = 2; y < height - 2; y++) {
      if (openTop && y <= 4) continue;
      if (!openTop && y >= height - 5) continue;
      tiles[y][bx] =
        chapter >= 2 && y % 5 === 0 ? TileType.GLASS_PARTITION : TileType.WALL;
    }
    // Mid-height parkour bypass doorway with low cover
    const midDoorY = Math.floor(height / 2) + (idx % 2 === 0 ? 1 : -1);
    tiles[midDoorY][bx] = TileType.FLOOR;
    tiles[midDoorY - 1][bx] = TileType.FLOOR;
    if (rng() > 0.3) {
      tiles[midDoorY][bx + (idx % 2 === 0 ? 2 : -2)] = TileType.LOW_COVER;
    }
  });
}

function carveCompoundRooms(
  tiles: TileType[][],
  width: number,
  height: number,
  chapter: number,
  rng: () => number
) {
  const midY = Math.floor(height / 2);
  const xSplits = [Math.floor(width * 0.3), Math.floor(width * 0.56), Math.floor(width * 0.8)];

  // Central east-west corridor spine walls
  for (let x = 2; x < width - 2; x++) {
    tiles[midY - 2][x] = chapter === 2 && x % 4 === 0 ? TileType.GLASS_PARTITION : TileType.WALL;
    tiles[midY + 2][x] = chapter === 5 && x % 4 === 0 ? TileType.GLASS_PARTITION : TileType.WALL;
  }

  // Vertical room dividers north and south of central corridor
  for (const sx of xSplits) {
    for (let y = 2; y < height - 2; y++) {
      tiles[y][sx] = TileType.WALL;
    }
    // Corridor archway
    tiles[midY - 1][sx] = TileType.FLOOR;
    tiles[midY][sx] = TileType.FLOOR;
    tiles[midY + 1][sx] = TileType.FLOOR;
    // Doors between adjacent north/south rooms
    tiles[4][sx] = TileType.FLOOR;
    tiles[height - 5][sx] = TileType.FLOOR;
  }

  // Doorways from central corridor into every chamber
  const roomCenters = [4, Math.floor(width * 0.43), Math.floor(width * 0.68), width - 5];
  for (const rx of roomCenters) {
    tiles[midY - 2][rx] = TileType.FLOOR;
    tiles[midY - 2][rx + 1] = TileType.FLOOR;
    tiles[midY + 2][rx] = TileType.FLOOR;
    tiles[midY + 2][rx + 1] = TileType.FLOOR;

    // Desk/barrier cover inside rooms
    if (rng() > 0.25 && tiles[4]?.[rx] === TileType.FLOOR) {
      tiles[4][rx] = TileType.LOW_COVER;
    }
    if (rng() > 0.25 && tiles[height - 5]?.[rx] === TileType.FLOOR) {
      tiles[height - 5][rx] = TileType.LOW_COVER;
    }
  }
}

function carveThreeWing(
  tiles: TileType[][],
  width: number,
  height: number,
  chapter: number,
  rng: () => number
) {
  const topWallY = 6;
  const botWallY = height - 6;

  for (let x = 2; x < width - 2; x++) {
    tiles[topWallY][x] = chapter === 2 && x % 5 !== 0 ? TileType.GLASS_PARTITION : TileType.WALL;
    tiles[botWallY][x] = TileType.WALL;
  }

  const topDoors = [5, Math.floor(width * 0.45), width - 7];
  const botDoors = [6, Math.floor(width * 0.55), width - 6];
  for (const dx of topDoors) {
    tiles[topWallY][dx] = TileType.FLOOR;
    tiles[topWallY][dx + 1] = TileType.FLOOR;
  }
  for (const dx of botDoors) {
    tiles[botWallY][dx] = TileType.FLOOR;
    tiles[botWallY][dx + 1] = TileType.FLOOR;
  }

  const midDiv1 = Math.floor(width * 0.34);
  const midDiv2 = Math.floor(width * 0.68);
  for (let y = topWallY + 1; y < botWallY; y++) {
    tiles[y][midDiv1] = TileType.WALL;
    tiles[y][midDiv2] = TileType.WALL;
  }
  const midY = Math.floor(height / 2);
  tiles[midY][midDiv1] = TileType.FLOOR;
  tiles[midY - 1][midDiv1] = TileType.FLOOR;
  tiles[topWallY + 2][midDiv1] = TileType.FLOOR;
  tiles[midY][midDiv2] = TileType.FLOOR;
  tiles[midY + 1][midDiv2] = TileType.FLOOR;
  tiles[botWallY - 2][midDiv2] = TileType.FLOOR;

  const coverOffsets = [
    [midDiv1 - 4, midY - 2],
    [midDiv1 + 4, midY + 1],
    [midDiv2 - 4, midY - 1],
    [midDiv2 + 3, midY],
  ];
  for (const [cx, cy] of coverOffsets) {
    if (cx > 3 && cx < width - 4 && cy > topWallY + 1 && cy < botWallY - 2) {
      if (rng() > 0.25) {
        tiles[cy][cx] = TileType.WALL;
        tiles[cy][cx + 1] = TileType.WALL;
      }
    }
  }

  const parkourSpots: GridPoint[] = [
    { x: 6, y: midY - 1 },
    { x: midDiv1 + 2, y: midY },
    { x: midDiv2 - 2, y: midY + 1 },
    { x: Math.floor(width * 0.5), y: 4 },
  ];
  for (const ps of parkourSpots) {
    if (tiles[ps.y]?.[ps.x] === TileType.FLOOR) {
      tiles[ps.y][ps.x] = TileType.LOW_COVER;
    }
  }
}

function buildCorridorPatrol(
  tiles: TileType[][],
  seedX: number,
  seedY: number,
  width: number,
  height: number,
  horizontalFirst: boolean
): { spawn: GridPoint; path: GridPoint[] } {
  // Find nearest walkable tile around (seedX, seedY)
  let sx = Math.max(3, Math.min(width - 4, seedX));
  let sy = Math.max(2, Math.min(height - 3, seedY));

  if (!isTileWalkable(tiles[sy][sx]) || tiles[sy][sx] === TileType.LOW_COVER) {
    let found = false;
    for (let r = 1; r <= 6 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (nx >= 3 && nx <= width - 4 && ny >= 2 && ny <= height - 3) {
            if (isTileWalkable(tiles[ny][nx]) && tiles[ny][nx] !== TileType.LOW_COVER) {
              sx = nx;
              sy = ny;
              found = true;
            }
          }
        }
      }
    }
  }

  // Extend along walkable horizontal/vertical corridor from (sx, sy)
  const scanLine = (x0: number, y0: number, dx: number, dy: number, maxSteps: number): GridPoint => {
    let cx = x0;
    let cy = y0;
    for (let i = 0; i < maxSteps; i++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 2 || nx >= width - 2 || ny < 2 || ny >= height - 2) break;
      const t = tiles[ny][nx];
      if (!isTileWalkable(t) || t === TileType.LOW_COVER) break;
      cx = nx;
      cy = ny;
    }
    return { x: cx, y: cy };
  };

  const pLeft = scanLine(sx, sy, -1, 0, 6);
  const pRight = scanLine(sx, sy, 1, 0, 6);
  const pUp = scanLine(sx, sy, 0, -1, 5);
  const pDown = scanLine(sx, sy, 0, 1, 5);

  const hLen = pRight.x - pLeft.x;
  const vLen = pDown.y - pUp.y;

  const path: GridPoint[] =
    (horizontalFirst && hLen >= 2) || vLen < 2
      ? [pLeft, pRight]
      : [pUp, pDown];

  return {
    spawn: { x: sx, y: sy },
    path,
  };
}

export function generateCampaignLevel(levelId: number): LevelDefinition {
  if (levelId % 10 === 0 && levelId <= 100) {
    return generateBossLevel(levelId);
  }

  const chapter = Math.ceil(levelId / 10);
  const subLevel = ((levelId - 1) % 10) + 1;
  const rng = createSeededRng(levelId * 37 + chapter * 101);
  const isEscapeLevel = subLevel === 9 || (chapter >= 3 && subLevel === 6);

  const layoutStyle: LevelLayoutStyle =
    levelId === 1
      ? 'three_wing'
      : CAMPAIGN_STYLES[(levelId - 1 + chapter) % CAMPAIGN_STYLES.length];

  // Progressive complex dimensions while keeping sightlines tight & readable
  const width = 28 + Math.min(8, Math.floor(chapter / 2) * 2);
  const height = 20 + Math.min(4, Math.floor(chapter / 3) * 2);
  const tiles = makeEmptyGrid(width, height, TileType.FLOOR);
  drawWallBorder(tiles);

  switch (layoutStyle) {
    case 'labyrinth':
      carveBraidedLabyrinth(tiles, width, height, chapter, rng);
      break;
    case 'atrium_rings':
      carveAtriumRings(tiles, width, height, chapter, rng);
      break;
    case 'zigzag_gauntlet':
      carveZigzagGauntlet(tiles, width, height, chapter, rng);
      break;
    case 'compound_rooms':
      carveCompoundRooms(tiles, width, height, chapter, rng);
      break;
    case 'three_wing':
    default:
      carveThreeWing(tiles, width, height, chapter, rng);
      break;
  }

  const midY = Math.floor(height / 2);
  const midDiv1 = Math.floor(width * 0.34);
  const midDiv2 = Math.floor(width * 0.68);
  const topWallY = 6;
  const botWallY = height - 6;

  // Dark corners for shadow stealth
  const darkSpots: GridPoint[] = [
    { x: 2, y: 2 },
    { x: Math.floor(width * 0.38), y: 2 },
    { x: Math.floor(width * 0.62), y: height - 4 },
    { x: width - 4, y: height - 3 },
  ];
  for (const ds of darkSpots) {
    carveRect(tiles, ds.x, ds.y, 2, 2, TileType.DARK_CORNER);
  }

  // Ventilation floor strip along top maintenance corridor (preserve labyrinth walls except key flank)
  if (layoutStyle !== 'labyrinth') {
    for (let x = 6; x < width - 7; x++) {
      if (isTileWalkable(tiles[2][x])) {
        tiles[2][x] = TileType.VENT_FLOOR;
      }
    }
  }

  // Chapter 3 / 6 rail track strip
  if (chapter === 3 && layoutStyle !== 'labyrinth') {
    for (let x = 2; x < width - 2; x++) {
      if (isTileWalkable(tiles[midY][x])) {
        tiles[midY][x] = TileType.RAIL_TRACK;
      }
    }
  }

  const spawn: GridPoint = { x: 2, y: midY };
  const exit: GridPoint = { x: width - 3, y: midY };
  tiles[spawn.y][spawn.x] = TileType.FLOOR;
  tiles[exit.y][exit.x] = TileType.FLOOR;

  const interactives: InteractivePlacement[] = [];

  // Paired ventilation passage shortcuts bypassing central security
  interactives.push(
    {
      id: `vent_a_${levelId}`,
      type: InteractiveType.VENT_ENTRANCE,
      position: { x: 5, y: 3 },
      label: 'Maintenance Vent (West)',
      targetId: `vent_b_${levelId}`,
    },
    {
      id: `vent_b_${levelId}`,
      type: InteractiveType.VENT_ENTRANCE,
      position: { x: width - 7, y: 3 },
      label: 'Maintenance Vent (East)',
      targetId: `vent_a_${levelId}`,
    }
  );

  // Hiding lockers
  interactives.push(
    {
      id: `locker_1_${levelId}`,
      type: InteractiveType.LOCKER,
      position: { x: midDiv1 - 2, y: botWallY - 2 },
      label: 'Storage Locker',
    },
    {
      id: `locker_2_${levelId}`,
      type: InteractiveType.LOCKER,
      position: { x: midDiv2 - 2, y: topWallY + 2 },
      label: 'Utility Cabinet',
    }
  );

  // Keycard + Locked security bulkhead on main eastern path
  const keyId = `key_${levelId}`;
  interactives.push({
    id: keyId,
    type: InteractiveType.KEYCARD,
    position: { x: midDiv1 + 3, y: height - 3 },
    label: 'Security Keycard',
  });
  if (layoutStyle === 'three_wing') {
    interactives.push({
      id: `door_lock_${levelId}`,
      type: InteractiveType.LOCKED_DOOR,
      position: { x: midDiv2, y: midY },
      label: 'Vault Bulkhead',
      requiredKeyId: keyId,
    });
  }

  // Security terminals linked to cameras/lasers
  const term1Id = `term_1_${levelId}`;
  const term2Id = `term_2_${levelId}`;
  interactives.push(
    {
      id: term1Id,
      type: InteractiveType.TERMINAL,
      position: { x: midDiv1 - 3, y: 3 },
      label: 'Security Relay Terminal',
    },
    {
      id: term2Id,
      type: InteractiveType.TERMINAL,
      position: { x: midDiv2 + 3, y: height - 3 },
      label: 'Mainframe Access Node',
    }
  );

  // Primary Intel Dossier(s)
  const intelCount = chapter >= 4 ? 2 : 1;
  interactives.push({
    id: `intel_1_${levelId}`,
    type: InteractiveType.INTEL_DOSSIER,
    position: { x: Math.floor(width * 0.54), y: midY - 2 },
    label: 'Classified Dossier',
  });
  if (intelCount > 1) {
    interactives.push({
      id: `intel_2_${levelId}`,
      type: InteractiveType.INTEL_DOSSIER,
      position: { x: width - 5, y: 3 },
      label: 'Encrypted Archive Disk',
    });
  }

  // Optional secret collectible in bottom-left alcove
  interactives.push({
    id: `collectible_${levelId}`,
    type: InteractiveType.COLLECTIBLE,
    position: { x: 3, y: height - 3 },
    label: 'VEIL Microfilm (Optional)',
    secret: true,
  });

  // Equipment pickup on early levels
  const pickupMap: Partial<Record<number, EquipmentId>> = {
    2: EquipmentId.ACOUSTIC_DECOY,
    3: EquipmentId.ACCESS_DEVICE,
    5: EquipmentId.SIGNAL_JAMMER,
    6: EquipmentId.PULSE_TOOL,
    8: EquipmentId.SHADOW_CLOAK,
  };
  if (pickupMap[levelId]) {
    interactives.push({
      id: `equip_pickup_${levelId}`,
      type: InteractiveType.EQUIPMENT_PICKUP,
      position: { x: midDiv1 - 2, y: midY + 2 },
      label: 'Field Gadget Cache',
      equipmentId: pickupMap[levelId],
    });
  }

  if (chapter >= 5) {
    interactives.push({
      id: `disguise_${levelId}`,
      type: InteractiveType.DISGUISE_STATION,
      position: { x: 4, y: 3 },
      label: 'Staff Uniform Locker',
    });
  }

  interactives.push({
    id: `exit_${levelId}`,
    type: InteractiveType.EXIT,
    position: { ...exit },
    label: 'Extraction Point',
  });

  // Ensure every interactive & exit is cleanly reachable from spawn regardless of maze layout
  for (const item of interactives) {
    ensurePointConnected(tiles, spawn, item.position);
  }
  ensurePointConnected(tiles, spawn, exit);

  // Enemies scaling smoothly from 2 armed human guards in Level 1 up to 7 in Ch10
  const enemyCount = Math.min(7, 2 + Math.floor(levelId / 16) + (subLevel >= 7 ? 1 : 0));
  const patrolSeeds: Array<{ x: number; y: number; h: boolean }> = [
    { x: Math.floor(width * 0.25), y: midY, h: false },
    { x: Math.floor(width * 0.5), y: midY, h: true },
    { x: Math.floor(width * 0.76), y: midY, h: false },
    { x: Math.floor(width * 0.5), y: height - 3, h: true },
    { x: Math.floor(width * 0.5), y: 4, h: true },
    { x: Math.floor(width * 0.38), y: midY - 2, h: true },
    { x: width - 5, y: midY - 2, h: false },
  ];

  const enemies: EnemyPlacement[] = [];
  for (let i = 0; i < enemyCount; i++) {
    const seed = patrolSeeds[i % patrolSeeds.length];
    const pz = buildCorridorPatrol(tiles, seed.x, seed.y, width, height, seed.h);
    enemies.push({
      id: `enemy_${levelId}_${i}`,
      archetype: pickArchetype(chapter, i, rng),
      spawn: pz.spawn,
      patrolPath: pz.path,
      initialFacingDeg: (i * 90) % 360,
    });
  }

  // Security cameras (Ch 1 level 4+ onward)
  const cameras: CameraPlacement[] = [];
  if (levelId >= 4) {
    cameras.push({
      id: `cam_1_${levelId}`,
      position: { x: midDiv1 + 1, y: topWallY + 1 },
      baseAngleDeg: 55,
      sweepDeg: 55,
      sweepSpeed: 0.75 + chapter * 0.05,
      rangePx: 185,
      linkedTerminalId: term1Id,
    });
  }
  if (levelId >= 12) {
    cameras.push({
      id: `cam_2_${levelId}`,
      position: { x: midDiv2 + 1, y: topWallY + 1 },
      baseAngleDeg: 85,
      sweepDeg: 65,
      sweepSpeed: 0.85 + chapter * 0.05,
      rangePx: 195,
      linkedTerminalId: term2Id,
    });
  }

  // Laser tripgrids (Ch 2+)
  const lasers: LaserPlacement[] = [];
  if (chapter >= 2 && subLevel >= 3) {
    lasers.push({
      id: `laser_1_${levelId}`,
      start: { x: midDiv1, y: topWallY + 2 },
      end: { x: midDiv1, y: topWallY + 3 },
      cycleOnMs: 2400,
      cycleOffMs: 1800,
      linkedTerminalId: term1Id,
    });
  }
  if (chapter >= 4 && subLevel >= 5) {
    lasers.push({
      id: `laser_2_${levelId}`,
      start: { x: midDiv2, y: botWallY - 2 },
      end: { x: midDiv2, y: botWallY - 1 },
      cycleOnMs: 2000,
      cycleOffMs: 1500,
      linkedTerminalId: term2Id,
    });
  }

  // Moving hazards (freight rail drones in Ch 3 & Ch 6 & Ch 10)
  const movingHazards: MovingHazardPlacement[] = [];
  if (chapter === 3 || chapter === 6 || chapter === 10) {
    movingHazards.push({
      id: `hazard_1_${levelId}`,
      axis: 'horizontal',
      start: { x: 4, y: midY },
      end: { x: width - 5, y: midY },
      speedPx: chapter === 3 ? 135 : 155,
      widthTiles: 2,
      heightTiles: 1,
      label: chapter === 3 ? 'Transit Rail Car' : 'Automated Patrol Drone',
    });
  }

  const objectives: LevelObjective[] = [
    {
      id: 'obj_intel',
      description: intelCount > 1 ? 'Retrieve Classified Intel (0/2)' : 'Retrieve Classified Dossier',
      type: 'intel',
      targetCount: intelCount,
    },
    {
      id: 'obj_terminal',
      description: 'Override Mainframe Access Node',
      type: 'terminal',
      targetCount: 1,
    },
    {
      id: 'obj_extract',
      description: isEscapeLevel ? 'Escape before lockdown timer expires' : 'Reach Extraction Point',
      type: 'extract',
      targetCount: 1,
    },
    {
      id: 'obj_optional',
      description: 'Recover Hidden VEIL Microfilm (Optional)',
      type: 'keycard',
      targetCount: 1,
      optional: true,
    },
  ];

  const levelName = LEVEL_NAMES[levelId - 1] ?? `Sector ${levelId}`;

  return {
    id: levelId,
    code: `OP-${String(levelId).padStart(3, '0')}`,
    name: levelName,
    chapter,
    layoutStyle,
    isBossLevel: false,
    isEscapeLevel,
    escapeTimerSec: isEscapeLevel ? Math.max(45, 78 - chapter * 2) : undefined,
    width,
    height,
    tileSize: 40,
    tiles,
    spawn,
    exit,
    enemies,
    cameras,
    lasers,
    movingHazards,
    interactives,
    objectives,
    routeHints: [
      `Sector Style (${layoutStyle.replace('_', ' ')}): Watch armed human security sightlines and vault low cover.`,
      'Use upper vents or crouch/slide behind low barriers to block incoming gunfire.',
      'Hack the Relay Terminal to shut down corridor cameras & laser grids.',
    ],
    briefingNote: isEscapeLevel
      ? 'High-alert zone: Once the mainframe is breached, emergency lockdown initiates a timed extraction.'
      : 'Armed human security patrols detected. Use maze corridors, cover, and timing to stay undetected.',
  };
}
