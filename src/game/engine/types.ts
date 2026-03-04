// ============================================================
// CORE TYPES - The Sacred Scrolls of the Chronically Online Wars
// ============================================================

export type FactionId = 'chuds' | 'chosen' | 'crusaders' | 'chads' | 'neutral';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Resources - every faction hoards differently
export interface Resources {
  copium: number;    // Primary resource (like Gold) - mined from Copium Deposits
  clout: number;     // Secondary resource (like Lumber) - harvested from Clout Trees
  tendies: number;   // Tertiary/special resource - used for elite units/upgrades
}

export type ResourceType = keyof Resources;

export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  startingResources: Resources;
  maxPopulation: number;
  fogOfWar: boolean;
  difficulty: DifficultyLevel;
}

export type DifficultyLevel = 'baby' | 'casual' | 'heated' | 'malding' | 'touch_grass';

export type TerrainType = 'grass' | 'dirt' | 'water' | 'mountain' | 'swamp' | 'meme_zone' | 'cursed_ground';

export interface Tile {
  terrain: TerrainType;
  walkable: boolean;
  buildable: boolean;
  resource?: ResourceNode;
  decoration?: string;
  fogState: 'hidden' | 'explored' | 'visible';
}

export interface ResourceNode {
  type: ResourceType;
  amount: number;
  maxAmount: number;
  harvesters: string[]; // entity IDs of current harvesters
}

// Entity system
export type EntityType = 'unit' | 'building' | 'projectile' | 'effect';
export type UnitState = 'idle' | 'moving' | 'attacking' | 'gathering' | 'building' | 'dead' | 'casting' | 'patrolling';
export type BuildingState = 'constructing' | 'idle' | 'training' | 'researching' | 'destroyed';

export interface Entity {
  id: string;
  type: EntityType;
  faction: FactionId;
  position: Vector2;
  size: Vector2;
  hp: number;
  maxHp: number;
  armor: number;
  visible: boolean;
  selected: boolean;
}

export interface Unit extends Entity {
  type: 'unit';
  unitType: string;
  state: UnitState;
  speed: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;   // attacks per second
  attackCooldown: number; // current cooldown timer
  sightRange: number;
  target?: Vector2;
  targetEntity?: string;
  path: Vector2[];
  abilities: Ability[];
  carryingResource?: { type: ResourceType; amount: number };
  experience: number;
  level: number;
  isHero: boolean;
  rallyPoint?: Vector2;
}

export interface Building extends Entity {
  type: 'building';
  buildingType: string;
  state: BuildingState;
  buildProgress: number; // 0-100
  trainQueue: TrainOrder[];
  currentResearch?: ResearchOrder;
  rallyPoint?: Vector2;
  sightRange: number;
  providesPopulation: number;
  garrisonedUnits: string[];
  garrisonCapacity: number;
}

export interface TrainOrder {
  unitType: string;
  progress: number; // 0-100
  trainTime: number; // seconds
}

export interface ResearchOrder {
  upgradeId: string;
  progress: number;
  researchTime: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  manaCost: number;
  range: number;
  icon: string;
  targetType: 'none' | 'point' | 'unit' | 'area';
}

export interface Projectile extends Entity {
  type: 'projectile';
  sourceId: string;
  targetId: string;
  targetPos: Vector2;
  speed: number;
  damage: number;
  splashRadius?: number;
}

// Unit/Building definitions
export interface UnitDefinition {
  id: string;
  name: string;
  description: string;
  faction: FactionId;
  hp: number;
  armor: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;
  speed: number;
  sightRange: number;
  cost: Partial<Resources>;
  trainTime: number;
  populationCost: number;
  abilities: Ability[];
  isHero: boolean;
  size: Vector2;
  icon: string;
  color: string;
  prerequisites: string[];
}

export interface BuildingDefinition {
  id: string;
  name: string;
  description: string;
  faction: FactionId;
  hp: number;
  armor: number;
  cost: Partial<Resources>;
  buildTime: number;
  size: Vector2;
  providesPopulation: number;
  garrisonCapacity: number;
  sightRange: number;
  trains: string[];      // unit IDs this building can train
  researches: string[];  // upgrade IDs this building can research
  icon: string;
  color: string;
  prerequisites: string[];
  isResourceDrop: boolean; // can workers drop off resources here
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  faction: FactionId;
  cost: Partial<Resources>;
  researchTime: number;
  effects: UpgradeEffect[];
  icon: string;
  prerequisites: string[];
}

export interface UpgradeEffect {
  target: 'unit' | 'building';
  targetId: string; // which unit/building type
  stat: string;
  modifier: 'add' | 'multiply';
  value: number;
}

// Player state
export interface Player {
  id: string;
  name: string;
  faction: FactionId;
  resources: Resources;
  population: number;
  maxPopulation: number;
  entities: string[];
  upgrades: string[];    // completed upgrade IDs
  isAI: boolean;
  teamId: number;
  color: string;
  defeated: boolean;
}

// Commands from player input
export type CommandType = 'move' | 'attack' | 'gather' | 'build' | 'train' | 'research' | 'stop' | 'patrol' | 'ability' | 'rally';

export interface Command {
  type: CommandType;
  entityIds: string[];
  target?: Vector2;
  targetEntityId?: string;
  buildingType?: string;
  unitType?: string;
  upgradeId?: string;
  abilityId?: string;
  queued?: boolean;
}

// Camera
export interface Camera {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

// Game state
export interface GameState {
  tick: number;
  time: number;
  paused: boolean;
  speed: number;
  config: GameConfig;
  map: Tile[][];
  entities: Map<string, Entity>;
  players: Player[];
  localPlayerId: string;
  camera: Camera;
  selectedEntities: string[];
  commands: Command[];
  gameOver: boolean;
  winner?: string;
}

// AI
export type AIPersonality = 'rusher' | 'turtler' | 'boomer' | 'harasser' | 'balanced';

export interface AIConfig {
  personality: AIPersonality;
  difficulty: DifficultyLevel;
  aggressiveness: number;  // 0-1
  expansionRate: number;   // 0-1
  microIntensity: number;  // 0-1 how much it micros units
}

// Campaign
export interface CampaignMission {
  id: string;
  name: string;
  description: string;
  briefing: string;
  faction: FactionId;
  mapId: string;
  objectives: MissionObjective[];
  sideQuests: SideQuest[];
  secrets: Secret[];
  difficulty: DifficultyLevel;
  nextMission?: string;
  unlocks: string[];
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'destroy' | 'survive' | 'collect' | 'build' | 'escort' | 'discover';
  target: string;
  amount?: number;
  timeLimit?: number;
  completed: boolean;
  required: boolean;
}

export interface SideQuest {
  id: string;
  name: string;
  description: string;
  trigger: { type: 'location' | 'interact' | 'time'; value: string };
  objectives: MissionObjective[];
  reward: Partial<Resources> & { units?: string[]; item?: string };
  discovered: boolean;
  completed: boolean;
}

export interface Secret {
  id: string;
  name: string;
  hint: string;
  location: Vector2;
  discovered: boolean;
  reward: string;
}
