import { Tile, TerrainType, ResourceNode, GameConfig, Vector2 } from '../engine/types';

interface MapTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  playerPositions: Vector2[];
  generate: (config: GameConfig) => Tile[][];
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
  const amounts = { copium: 2500, clout: 1500, tendies: 500 };

  for (let i = 0; i < count; i++) {
    const dx = rng.nextInt(-2, 2);
    const dy = rng.nextInt(-2, 2);
    const x = centerX + dx;
    const y = centerY + dy;
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
      map[y][x].resource = {
        type,
        amount: amounts[type] + rng.nextInt(-200, 200),
        maxAmount: amounts[type] + 200,
        harvesters: [],
      };
      map[y][x].walkable = true;
      map[y][x].buildable = false;
      map[y][x].terrain = type === 'copium' ? 'dirt' : type === 'clout' ? 'grass' : 'meme_zone';
    }
  }
}

// =====================================================
// MAP: The Discourse Arena
// =====================================================
export function generateDiscourseArena(config: GameConfig): Tile[][] {
  const { mapWidth, mapHeight } = config;
  const rng = new SeededRandom(42069);
  const map: Tile[][] = [];

  // Base terrain
  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      const distToCenter = Math.sqrt(
        Math.pow(x - mapWidth / 2, 2) + Math.pow(y - mapHeight / 2, 2)
      );

      // Circular arena with water border
      if (distToCenter > Math.min(mapWidth, mapHeight) * 0.48) {
        map[y][x] = createEmptyTile('water');
      } else if (distToCenter > Math.min(mapWidth, mapHeight) * 0.44) {
        map[y][x] = createEmptyTile(rng.next() > 0.5 ? 'swamp' : 'grass');
      } else {
        map[y][x] = createEmptyTile(rng.next() > 0.85 ? 'dirt' : 'grass');
      }

      // Mountain clusters
      if (rng.next() > 0.97 && distToCenter > 10 && distToCenter < mapWidth * 0.35) {
        map[y][x] = createEmptyTile('mountain');
        // Small mountain cluster
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (rng.next() > 0.5 && y + dy >= 0 && y + dy < mapHeight && x + dx >= 0 && x + dx < mapWidth) {
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
      if (cy + dy >= 0 && cy + dy < mapHeight && cx + dx >= 0 && cx + dx < mapWidth) {
        map[cy + dy][cx + dx] = createEmptyTile('meme_zone');
        map[cy + dy][cx + dx].walkable = true;
        map[cy + dy][cx + dx].buildable = false;
      }
    }
  }

  // Resources near player spawn points (corners)
  const corners = [
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.15) },
    { x: Math.floor(mapWidth * 0.15), y: Math.floor(mapHeight * 0.85) },
    { x: Math.floor(mapWidth * 0.85), y: Math.floor(mapHeight * 0.85) },
  ];

  for (const corner of corners) {
    // Main copium deposit near start
    placeResourceCluster(map, corner.x + 3, corner.y + 3, 'copium', 5, rng);
    placeResourceCluster(map, corner.x - 2, corner.y + 5, 'clout', 4, rng);
  }

  // Expansion resources in mid positions
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

  // Center tendies (contested)
  placeResourceCluster(map, cx, cy, 'tendies', 4, rng);

  // Random decorations (trees etc)
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (map[y][x].terrain === 'grass' && rng.next() > 0.95) {
        map[y][x].decoration = rng.next() > 0.5 ? 'tree' : 'bush';
      }
    }
  }

  return map;
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
    description: 'A circular battleground where ideologies clash. Contested tendies in the center. Classic 4-player map.',
    width: 80,
    height: 80,
    playerPositions: [
      { x: 12, y: 12 }, { x: 68, y: 68 }, { x: 68, y: 12 }, { x: 12, y: 68 },
    ],
    generate: generateDiscourseArena,
  },
];
