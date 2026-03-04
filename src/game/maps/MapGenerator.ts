import { Tile, TerrainType, ResourceNode, GameConfig, Vector2 } from '../engine/types';

export interface MapTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  playerPositions: Vector2[];
  generate: (config: GameConfig) => Tile[][];
}

export interface SkirmishMapConfig {
  mapSize: 'small' | 'medium' | 'large';
  mapType: 'random' | 'discourse_arena' | 'river_crossing' | 'island_chains';
  numPlayers: number;
  seed?: number;
}

// Simple seeded random for deterministic maps
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function createEmptyTile(terrain: TerrainType = 'grass'): Tile {
  return {
    terrain,
    walkable: terrain !== 'water' && terrain !== 'mountain',
    buildable: terrain === 'grass' || terrain === 'dirt',
    fogState: 'hidden',
  };
}

function placeResourceCluster(
  map: Tile[][],
  centerX: number,
  centerY: number,
  type: 'copium' | 'clout' | 'tendies',
  count: number,
  rng: SeededRandom,
): void {
  const amounts = { copium: 1000, clout: 1500, tendies: 500 };

  for (let i = 0; i < count; i++) {
    const dx = rng.nextInt(-2, 2);
    const dy = rng.nextInt(-2, 2);
    const x = centerX + dx;
    const y = centerY + dy;
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
      if (map[y][x].terrain === 'water' || map[y][x].terrain === 'mountain') continue;
      map[y][x].resource = {
        type,
        amount: amounts[type] + rng.nextInt(-200, 200),
        maxAmount: amounts[type] + 200,
        harvesters: [],
      };
      map[y][x].walkable = true;
      map[y][x].buildable = false;
      map[y][x].terrain = type === 'copium' ? 'dirt' : type === 'clout' ? 'grass' : 'meme_zone';
      map[y][x].decoration = undefined;
    }
  }
}

// Smooth noise for natural terrain variation
function simpleNoise(x: number, y: number, seed: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
  return h - Math.floor(h);
}

function smoothNoise(x: number, y: number, scale: number, seed: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;
  const a = simpleNoise(x0, y0, seed);
  const b = simpleNoise(x0 + 1, y0, seed);
  const c = simpleNoise(x0, y0 + 1, seed);
  const d = simpleNoise(x0 + 1, y0 + 1, seed);
  const ix = a + (b - a) * fx;
  const iy = c + (d - c) * fx;
  return ix + (iy - ix) * fy;
}

// Clear area around start positions
function clearStartPositions(map: Tile[][], positions: { x: number; y: number }[], mapWidth: number, mapHeight: number): void {
  for (const sc of positions) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const tx = sc.x + dx;
        const ty = sc.y + dy;
        if (ty >= 0 && ty < mapHeight && tx >= 0 && tx < mapWidth) {
          if (map[ty][tx].terrain === 'water' || map[ty][tx].terrain === 'mountain') {
            map[ty][tx] = createEmptyTile('grass');
          }
          if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
            map[ty][tx].decoration = undefined;
          }
        }
      }
    }
  }
}

// Add varied decorations to map
function addDecorations(map: Tile[][], mapWidth: number, mapHeight: number, rng: SeededRandom): void {
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = map[y][x];
      if (!tile.walkable || tile.resource) continue;

      const r = rng.next();

      if (tile.terrain === 'grass') {
        if (r > 0.96) tile.decoration = 'tree';
        else if (r > 0.94) tile.decoration = 'bush';
        else if (r > 0.93) tile.decoration = 'flowers';
        else if (r > 0.925) tile.decoration = 'rocks';
        else if (r > 0.92) tile.decoration = 'mushrooms';
      } else if (tile.terrain === 'dirt') {
        if (r > 0.96) tile.decoration = 'rocks';
        else if (r > 0.94) tile.decoration = 'bones';
        else if (r > 0.93) tile.decoration = 'fallen_log';
      } else if (tile.terrain === 'swamp') {
        if (r > 0.93) tile.decoration = 'mushrooms';
        else if (r > 0.91) tile.decoration = 'reeds';
      }
    }
  }
}

// =====================================================
// MAP: The Discourse Arena (preset)
// =====================================================
export function generateDiscourseArena(config: GameConfig): Tile[][] {
  const { mapWidth, mapHeight } = config;
  const rng = new SeededRandom(42069);
  const map: Tile[][] = [];

  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
  }

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const distToCenter = Math.sqrt(
        Math.pow(x - mapWidth / 2, 2) + Math.pow(y - mapHeight / 2, 2)
      );

      if (distToCenter > Math.min(mapWidth, mapHeight) * 0.48) {
        map[y][x] = createEmptyTile('water');
      } else if (distToCenter > Math.min(mapWidth, mapHeight) * 0.44) {
        map[y][x] = createEmptyTile(rng.next() > 0.5 ? 'swamp' : 'grass');
      } else {
        const n = smoothNoise(x, y, 8, 42);
        if (n > 0.75) {
          map[y][x] = createEmptyTile('dirt');
        } else if (n < 0.15 && distToCenter > 15) {
          map[y][x] = createEmptyTile('cursed_ground');
        } else {
          map[y][x] = createEmptyTile('grass');
        }
      }

      // Mountains via noise
      const mn = smoothNoise(x, y, 6, 123);
      if (mn > 0.82 && distToCenter > 12 && distToCenter < mapWidth * 0.38) {
        map[y][x] = createEmptyTile('mountain');
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (rng.next() > 0.4 && y + dy >= 0 && y + dy < mapHeight && x + dx >= 0 && x + dx < mapWidth) {
              map[y + dy][x + dx] = createEmptyTile('mountain');
            }
          }
        }
      }
    }
  }

  // Center meme zone
  const cx = Math.floor(mapWidth / 2);
  const cy = Math.floor(mapHeight / 2);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= 4 && cy + dy >= 0 && cy + dy < mapHeight && cx + dx >= 0 && cx + dx < mapWidth) {
        map[cy + dy][cx + dx] = createEmptyTile('meme_zone');
        map[cy + dy][cx + dx].walkable = true;
        map[cy + dy][cx + dx].buildable = false;
      }
    }
  }

  // Resources near corners
  const corners = [
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.85) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85) },
  ];
  for (const corner of corners) {
    placeResourceCluster(map, corner.x + 3, corner.y + 3, 'copium', 5, rng);
    placeResourceCluster(map, corner.x - 2, corner.y + 5, 'clout', 4, rng);
  }

  // Expansion resources
  const mids = [
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.2) },
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.8) },
    { x: Math.floor(mapWidth * 0.2), y: Math.floor(mapHeight * 0.5) },
    { x: Math.floor(mapWidth * 0.8), y: Math.floor(mapHeight * 0.5) },
  ];
  for (const mid of mids) {
    placeResourceCluster(map, mid.x, mid.y, 'copium', 6, rng);
    placeResourceCluster(map, mid.x + 4, mid.y + 2, 'clout', 5, rng);
  }

  placeResourceCluster(map, cx, cy, 'tendies', 4, rng);
  addDecorations(map, mapWidth, mapHeight, rng);

  clearStartPositions(map, [
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.85) },
  ], mapWidth, mapHeight);

  return map;
}

// =====================================================
// MAP: River Crossing (preset)
// =====================================================
export function generateRiverCrossing(config: GameConfig): Tile[][] {
  const { mapWidth, mapHeight } = config;
  const rng = new SeededRandom(31337);
  const map: Tile[][] = [];

  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      const riverCenter = mapWidth / 2 + Math.sin(y / (mapHeight * 0.15)) * (mapWidth * 0.08);
      const distToRiver = Math.abs(x - riverCenter);

      if (distToRiver < 2) {
        map[y][x] = createEmptyTile('water');
      } else if (distToRiver < 4) {
        map[y][x] = createEmptyTile('swamp');
      } else {
        const n = smoothNoise(x, y, 10, 99);
        map[y][x] = createEmptyTile(n > 0.8 ? 'dirt' : 'grass');
      }

      if (x <= 1 || x >= mapWidth - 2 || y <= 1 || y >= mapHeight - 2) {
        map[y][x] = createEmptyTile('water');
      }

      const mn = smoothNoise(x, y, 5, 200);
      if (mn > 0.85 && (x < mapWidth * 0.2 || x > mapWidth * 0.8) && y > 5 && y < mapHeight - 5) {
        map[y][x] = createEmptyTile('mountain');
      }
    }
  }

  // Bridges
  const bridgeYs = [Math.floor(mapHeight * 0.25), Math.floor(mapHeight * 0.5), Math.floor(mapHeight * 0.75)];
  for (const by of bridgeYs) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let x = 0; x < mapWidth; x++) {
        if (by + dy >= 0 && by + dy < mapHeight &&
            (map[by + dy][x].terrain === 'water' || map[by + dy][x].terrain === 'swamp')) {
          map[by + dy][x] = createEmptyTile('dirt');
        }
      }
    }
  }

  const leftBase = { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15) };
  const rightBase = { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85) };

  placeResourceCluster(map, leftBase.x + 3, leftBase.y + 3, 'copium', 5, rng);
  placeResourceCluster(map, leftBase.x - 2, leftBase.y + 5, 'clout', 4, rng);
  placeResourceCluster(map, rightBase.x - 3, rightBase.y - 3, 'copium', 5, rng);
  placeResourceCluster(map, rightBase.x + 2, rightBase.y - 5, 'clout', 4, rng);
  placeResourceCluster(map, Math.floor(mapWidth / 2), Math.floor(mapHeight / 2), 'tendies', 3, rng);
  placeResourceCluster(map, Math.floor(mapWidth * 0.3), Math.floor(mapHeight * 0.5), 'copium', 4, rng);
  placeResourceCluster(map, Math.floor(mapWidth * 0.7), Math.floor(mapHeight * 0.5), 'copium', 4, rng);

  addDecorations(map, mapWidth, mapHeight, rng);
  clearStartPositions(map, [leftBase, rightBase], mapWidth, mapHeight);

  return map;
}

// =====================================================
// MAP: Island Chains (preset)
// =====================================================
export function generateIslandChains(config: GameConfig): Tile[][] {
  const { mapWidth, mapHeight } = config;
  const rng = new SeededRandom(13579);
  const map: Tile[][] = [];

  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      map[y][x] = createEmptyTile('water');
    }
  }

  const islands = [
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15), r: 12 },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85), r: 12 },
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.5), r: 8 },
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.2), r: 6 },
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.8), r: 6 },
    { x: Math.floor(mapWidth * 0.2), y: Math.floor(mapHeight * 0.5), r: 6 },
    { x: Math.floor(mapWidth * 0.8), y: Math.floor(mapHeight * 0.5), r: 6 },
  ];

  for (const island of islands) {
    for (let dy = -island.r; dy <= island.r; dy++) {
      for (let dx = -island.r; dx <= island.r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tx = island.x + dx;
        const ty = island.y + dy;
        if (tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight) continue;
        const noise = smoothNoise(tx, ty, 4, 555) * 3;
        if (dist < island.r + noise - 2) {
          if (dist > island.r + noise - 4) {
            map[ty][tx] = createEmptyTile('swamp');
          } else {
            map[ty][tx] = createEmptyTile(smoothNoise(tx, ty, 6, 777) > 0.7 ? 'dirt' : 'grass');
          }
        }
      }
    }
  }

  // Land bridges
  const bridges: [typeof islands[0], typeof islands[0]][] = [
    [islands[0], islands[3]], [islands[1], islands[4]],
    [islands[2], islands[3]], [islands[2], islands[4]],
    [islands[2], islands[5]], [islands[2], islands[6]],
  ];
  for (const [a, b] of bridges) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const bx = Math.round(a.x + (b.x - a.x) * t);
      const by = Math.round(a.y + (b.y - a.y) * t);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = bx + dx; const ty = by + dy;
          if (tx >= 0 && tx < mapWidth && ty >= 0 && ty < mapHeight && map[ty][tx].terrain === 'water') {
            map[ty][tx] = createEmptyTile(Math.abs(dx) + Math.abs(dy) > 1 ? 'swamp' : 'dirt');
          }
        }
      }
    }
  }

  placeResourceCluster(map, islands[0].x + 3, islands[0].y + 3, 'copium', 5, rng);
  placeResourceCluster(map, islands[0].x - 2, islands[0].y + 4, 'clout', 4, rng);
  placeResourceCluster(map, islands[1].x - 3, islands[1].y - 3, 'copium', 5, rng);
  placeResourceCluster(map, islands[1].x + 2, islands[1].y - 4, 'clout', 4, rng);
  for (let i = 3; i < islands.length; i++) {
    placeResourceCluster(map, islands[i].x, islands[i].y, 'copium', 4, rng);
    placeResourceCluster(map, islands[i].x + 2, islands[i].y + 2, 'clout', 3, rng);
  }
  placeResourceCluster(map, islands[2].x, islands[2].y, 'tendies', 4, rng);

  addDecorations(map, mapWidth, mapHeight, rng);
  clearStartPositions(map, [islands[0], islands[1]], mapWidth, mapHeight);

  return map;
}

// =====================================================
// RANDOM MAP GENERATOR
// =====================================================
export function generateRandomMap(config: GameConfig, seed?: number): Tile[][] {
  const { mapWidth, mapHeight } = config;
  const rng = new SeededRandom(seed || Math.floor(Math.random() * 999999));
  const map: Tile[][] = [];

  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
  }

  const shapeType = rng.nextInt(0, 2);

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      let isLand = false;
      if (shapeType === 0) {
        const dist = Math.sqrt(Math.pow(x - mapWidth / 2, 2) + Math.pow(y - mapHeight / 2, 2));
        isLand = dist < Math.min(mapWidth, mapHeight) * 0.45;
      } else if (shapeType === 1) {
        isLand = x > 3 && x < mapWidth - 4 && y > 3 && y < mapHeight - 4;
      } else {
        const n = smoothNoise(x, y, 12, seed || 42);
        isLand = Math.min(x, y, mapWidth - 1 - x, mapHeight - 1 - y) > 2 && n > 0.2;
      }

      if (!isLand) { map[y][x] = createEmptyTile('water'); continue; }

      const n1 = smoothNoise(x, y, 8, (seed || 42) + 100);
      const n2 = smoothNoise(x, y, 15, (seed || 42) + 200);
      if (n1 > 0.8 && n2 > 0.5) map[y][x] = createEmptyTile('mountain');
      else if (n1 > 0.7) map[y][x] = createEmptyTile('dirt');
      else if (n2 < 0.15) map[y][x] = createEmptyTile('swamp');
      else if (n1 < 0.15 && n2 > 0.6) map[y][x] = createEmptyTile('cursed_ground');
      else map[y][x] = createEmptyTile('grass');
    }
  }

  // Ponds
  for (let p = 0; p < rng.nextInt(1, 3); p++) {
    const px = rng.nextInt(Math.floor(mapWidth * 0.25), Math.floor(mapWidth * 0.75));
    const py = rng.nextInt(Math.floor(mapHeight * 0.25), Math.floor(mapHeight * 0.75));
    const pr = rng.nextInt(2, 5);
    for (let dy = -pr; dy <= pr; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pr && py + dy >= 0 && py + dy < mapHeight && px + dx >= 0 && px + dx < mapWidth)
          map[py + dy][px + dx] = createEmptyTile(dist > pr - 1 ? 'swamp' : 'water');
      }
    }
  }

  // Center meme zone
  const cx = Math.floor(mapWidth / 2); const cy = Math.floor(mapHeight / 2);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= 3 && cy + dy >= 0 && cy + dy < mapHeight && cx + dx >= 0 && cx + dx < mapWidth) {
        if (map[cy + dy][cx + dx].terrain !== 'water') {
          map[cy + dy][cx + dx] = createEmptyTile('meme_zone');
          map[cy + dy][cx + dx].walkable = true;
          map[cy + dy][cx + dx].buildable = false;
        }
      }
    }
  }

  const starts = getStartTilePositions(mapWidth, mapHeight);
  for (const st of starts.slice(0, 2)) {
    placeResourceCluster(map, st.x + 3, st.y + 3, 'copium', 5, rng);
    placeResourceCluster(map, st.x - 2, st.y + 5, 'clout', 4, rng);
  }
  const mids = [
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.25) },
    { x: Math.floor(mapWidth * 0.5), y: Math.floor(mapHeight * 0.75) },
    { x: Math.floor(mapWidth * 0.25), y: Math.floor(mapHeight * 0.5) },
    { x: Math.floor(mapWidth * 0.75), y: Math.floor(mapHeight * 0.5) },
  ];
  for (const mid of mids) {
    placeResourceCluster(map, mid.x, mid.y, 'copium', 5, rng);
    placeResourceCluster(map, mid.x + 3, mid.y + 2, 'clout', 4, rng);
  }
  placeResourceCluster(map, cx, cy, 'tendies', 3, rng);

  addDecorations(map, mapWidth, mapHeight, rng);
  clearStartPositions(map, starts, mapWidth, mapHeight);

  return map;
}

function getStartTilePositions(mapWidth: number, mapHeight: number): { x: number; y: number }[] {
  return [
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.85) },
  ];
}

export function getMapDimensions(size: 'small' | 'medium' | 'large'): { width: number; height: number } {
  switch (size) {
    case 'small': return { width: 60, height: 60 };
    case 'medium': return { width: 80, height: 80 };
    case 'large': return { width: 120, height: 120 };
  }
}

export function getPlayerStartPositions(mapWidth: number, mapHeight: number, tileSize: number): Vector2[] {
  return [
    { x: mapWidth * 0.15 * tileSize, y: mapHeight * 0.15 * tileSize },
    { x: mapWidth * 0.85 * tileSize, y: mapHeight * 0.85 * tileSize },
    { x: mapWidth * 0.85 * tileSize, y: mapHeight * 0.15 * tileSize },
    { x: mapWidth * 0.15 * tileSize, y: mapHeight * 0.85 * tileSize },
  ];
}

export const MAP_TEMPLATES: MapTemplate[] = [
  {
    id: 'discourse_arena',
    name: 'The Discourse Arena',
    description: 'A circular battleground where ideologies clash. Contested tendies in the center.',
    width: 80, height: 80,
    playerPositions: [{ x: 12, y: 12 }, { x: 68, y: 68 }, { x: 68, y: 12 }, { x: 12, y: 68 }],
    generate: generateDiscourseArena,
  },
  {
    id: 'river_crossing',
    name: 'River Crossing',
    description: 'A winding river splits the map. Control the bridges to dominate.',
    width: 80, height: 80,
    playerPositions: [{ x: 12, y: 12 }, { x: 68, y: 68 }],
    generate: generateRiverCrossing,
  },
  {
    id: 'island_chains',
    name: 'Island Chains',
    description: 'Scattered islands connected by narrow land bridges. Resources on every shore.',
    width: 80, height: 80,
    playerPositions: [{ x: 12, y: 12 }, { x: 68, y: 68 }],
    generate: generateIslandChains,
  },
];
