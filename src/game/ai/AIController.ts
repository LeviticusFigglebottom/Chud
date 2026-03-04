import { GameEngine } from '../engine/GameEngine';
import {
  Player, Unit, Building, Command, Vector2,
  AIPersonality, DifficultyLevel, FactionId,
} from '../engine/types';
import {
  getFactionBuildings, getFactionUnits,
  getBuildingDefinition, getUnitDefinition,
} from '../data/definitions';

interface AIState {
  phase: 'early' | 'mid' | 'late';
  armyValue: number;
  needsWorkers: boolean;
  needsArmy: boolean;
  needsExpansion: boolean;
  needsSupply: boolean;
  attackReady: boolean;
  lastAttackTime: number;
  scoutSent: boolean;
}

export class AIController {
  private engine: GameEngine;
  private playerId: string;
  private personality: AIPersonality;
  private difficulty: DifficultyLevel;
  private state: AIState;
  private difficultyMultiplier: number;
  private thinkInterval: number; // how often AI makes decisions in seconds
  private timeSinceThink: number = 0;

  constructor(engine: GameEngine, playerId: string) {
    this.engine = engine;
    this.playerId = playerId;

    const player = this.getPlayer();
    this.personality = this.getPersonalityForFaction(player?.faction || 'chuds');
    this.difficulty = engine.state.config.difficulty;
    this.difficultyMultiplier = this.getDifficultyMultiplier();
    this.thinkInterval = this.getThinkInterval();

    this.state = {
      phase: 'early',
      armyValue: 0,
      needsWorkers: true,
      needsArmy: false,
      needsExpansion: false,
      needsSupply: false,
      attackReady: false,
      lastAttackTime: 0,
      scoutSent: false,
    };
  }

  private getPersonalityForFaction(faction: FactionId): AIPersonality {
    switch (faction) {
      case 'chuds': return 'turtler';
      case 'chosen': return 'boomer';
      case 'crusaders': return 'balanced';
      case 'chads': return 'rusher';
      default: return 'balanced';
    }
  }

  private getDifficultyMultiplier(): number {
    switch (this.difficulty) {
      case 'baby': return 0.5;
      case 'casual': return 0.75;
      case 'heated': return 1.0;
      case 'malding': return 1.3;
      case 'touch_grass': return 1.6;
    }
  }

  private getThinkInterval(): number {
    switch (this.difficulty) {
      case 'baby': return 5;
      case 'casual': return 3;
      case 'heated': return 2;
      case 'malding': return 1;
      case 'touch_grass': return 0.5;
    }
  }

  private getPlayer(): Player | undefined {
    return this.engine.state.players.find(p => p.id === this.playerId);
  }

  update(dt: number): void {
    const player = this.getPlayer();
    if (!player || player.defeated) return;

    this.timeSinceThink += dt;
    if (this.timeSinceThink < this.thinkInterval) return;
    this.timeSinceThink = 0;

    // Difficulty bonus: free resources
    if (this.difficulty === 'malding' || this.difficulty === 'touch_grass') {
      player.resources.copium += 2 * this.difficultyMultiplier;
      player.resources.clout += 1 * this.difficultyMultiplier;
    }

    this.analyzeState(player);
    this.makeDecisions(player);
  }

  private analyzeState(player: Player): void {
    const units = this.engine.getPlayerUnits(this.playerId);
    const buildings = this.engine.getPlayerBuildings(this.playerId);
    const workers = units.filter(u => this.isWorker(u));
    const army = units.filter(u => !this.isWorker(u));

    this.state.armyValue = army.reduce((sum, u) => {
      const def = getUnitDefinition(u.unitType);
      return sum + (def ? (def.cost.copium || 0) + (def.cost.clout || 0) * 1.5 : 0);
    }, 0);

    this.state.needsWorkers = workers.length < 6 + Math.floor(this.engine.state.time / 120);
    this.state.needsSupply = player.population >= player.maxPopulation - 2;
    this.state.needsArmy = army.length < 3 + Math.floor(this.engine.state.time / 60) * this.difficultyMultiplier;

    // Determine game phase
    if (this.engine.state.time < 120) {
      this.state.phase = 'early';
    } else if (this.engine.state.time < 360) {
      this.state.phase = 'mid';
    } else {
      this.state.phase = 'late';
    }

    // Attack readiness based on personality
    const attackThreshold = this.personality === 'rusher' ? 3 :
                           this.personality === 'turtler' ? 10 :
                           this.personality === 'boomer' ? 8 : 5;

    this.state.attackReady = army.length >= attackThreshold &&
      (this.engine.state.time - this.state.lastAttackTime > 60);
  }

  private makeDecisions(player: Player): void {
    const buildings = this.engine.getPlayerBuildings(this.playerId);
    const units = this.engine.getPlayerUnits(this.playerId);

    // Priority 1: Build supply if needed
    if (this.state.needsSupply) {
      this.tryBuildSupply(player, buildings);
    }

    // Priority 2: Train workers
    if (this.state.needsWorkers) {
      this.tryTrainWorkers(player, buildings);
    }

    // Priority 3: Build production buildings
    this.tryBuildProduction(player, buildings);

    // Priority 4: Train army
    if (this.state.needsArmy) {
      this.tryTrainArmy(player, buildings);
    }

    // Priority 5: Manage workers (send idle to gather)
    this.manageWorkers(player, units);

    // Priority 6: Attack
    if (this.state.attackReady) {
      this.launchAttack(player, units);
    }
  }

  private tryTrainWorkers(player: Player, buildings: Building[]): void {
    const mainBuildings = buildings.filter(b =>
      b.state === 'idle' && this.isMainBuilding(b) && b.buildProgress >= 100
    );

    for (const main of mainBuildings) {
      const workerType = this.getWorkerType(player.faction);
      if (!workerType) continue;
      const def = getUnitDefinition(workerType);
      if (!def) continue;
      if (player.resources.copium < (def.cost.copium || 0)) continue;
      if (player.population >= player.maxPopulation) continue;

      this.engine.issueCommand({
        type: 'train',
        entityIds: [main.id],
        unitType: workerType,
      });
    }
  }

  private tryTrainArmy(player: Player, buildings: Building[]): void {
    const productionBuildings = buildings.filter(b =>
      b.state === 'idle' && !this.isMainBuilding(b) && !this.isSupplyBuilding(b) &&
      b.buildProgress >= 100
    );

    for (const bld of productionBuildings) {
      const def = getBuildingDefinition(bld.buildingType);
      if (!def || def.trains.length === 0) continue;

      // Pick a unit to train (prefer non-hero, affordable)
      for (const unitType of def.trains) {
        const unitDef = getUnitDefinition(unitType);
        if (!unitDef || unitDef.isHero) continue;
        if (player.resources.copium < (unitDef.cost.copium || 0)) continue;
        if (player.resources.clout < (unitDef.cost.clout || 0)) continue;
        if (player.population + unitDef.populationCost > player.maxPopulation) continue;

        this.engine.issueCommand({
          type: 'train',
          entityIds: [bld.id],
          unitType,
        });
        break;
      }
    }
  }

  private tryBuildSupply(player: Player, buildings: Building[]): void {
    const supplyType = this.getSupplyBuildingType(player.faction);
    if (!supplyType) return;
    const def = getBuildingDefinition(supplyType);
    if (!def) return;
    if (player.resources.copium < (def.cost.copium || 0)) return;
    if (player.resources.clout < (def.cost.clout || 0)) return;

    // Find a position near main base
    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return;

    const pos = this.findBuildPosition(main.position, def.size.x);
    if (!pos) return;

    this.engine.resourceSystem.deductCost(player, def.cost);
    this.engine.spawnBuilding(supplyType, player.faction, pos, this.playerId, false);
  }

  private tryBuildProduction(player: Player, buildings: Building[]): void {
    const factionBuildings = getFactionBuildings(player.faction);
    const existingTypes = new Set(buildings.map(b => b.buildingType));

    for (const bdef of factionBuildings) {
      if (existingTypes.has(bdef.id)) continue;
      if (this.isSupplyBuilding({ buildingType: bdef.id } as Building)) continue;

      // Check prerequisites
      const prereqsMet = bdef.prerequisites.every(p => existingTypes.has(p));
      if (!prereqsMet) continue;

      // Check cost
      if (player.resources.copium < (bdef.cost.copium || 0)) continue;
      if (player.resources.clout < (bdef.cost.clout || 0)) continue;
      if (player.resources.tendies < (bdef.cost.tendies || 0)) continue;

      const main = buildings.find(b => this.isMainBuilding(b));
      if (!main) continue;

      const pos = this.findBuildPosition(main.position, bdef.size.x);
      if (!pos) continue;

      this.engine.resourceSystem.deductCost(player, bdef.cost);
      this.engine.spawnBuilding(bdef.id, player.faction, pos, this.playerId, false);
      break; // Build one at a time
    }
  }

  private manageWorkers(player: Player, units: Unit[]): void {
    const workers = units.filter(u => this.isWorker(u) && u.state === 'idle');

    for (const worker of workers) {
      // Find nearest resource
      const resourcePos = this.findNearestResource(worker.position);
      if (resourcePos) {
        this.engine.issueCommand({
          type: 'gather',
          entityIds: [worker.id],
          target: resourcePos,
        });
      }
    }
  }

  private launchAttack(player: Player, units: Unit[]): void {
    const army = units.filter(u => !this.isWorker(u) && u.state !== 'dead');
    if (army.length < 3) return;

    // Find enemy base
    const enemyPlayer = this.engine.state.players.find(p =>
      p.id !== this.playerId && !p.defeated && p.teamId !== player.teamId
    );
    if (!enemyPlayer) return;

    const enemyBuildings = this.engine.getPlayerBuildings(enemyPlayer.id);
    const target = enemyBuildings[0]?.position || { x: 500, y: 500 };

    for (const unit of army) {
      this.engine.issueCommand({
        type: 'attack',
        entityIds: [unit.id],
        target,
      });
    }

    this.state.lastAttackTime = this.engine.state.time;
    this.state.attackReady = false;
  }

  private findBuildPosition(near: Vector2, buildingSize: number): Vector2 | null {
    const offsets = [
      { x: 120, y: 0 }, { x: -120, y: 0 }, { x: 0, y: 120 }, { x: 0, y: -120 },
      { x: 120, y: 120 }, { x: -120, y: 120 }, { x: 120, y: -120 }, { x: -120, y: -120 },
      { x: 200, y: 0 }, { x: -200, y: 0 }, { x: 0, y: 200 }, { x: 0, y: -200 },
    ];

    for (const offset of offsets) {
      const pos = { x: near.x + offset.x, y: near.y + offset.y };
      if (pos.x > 0 && pos.y > 0 &&
          pos.x < this.engine.state.config.mapWidth * this.engine.state.config.tileSize - buildingSize &&
          pos.y < this.engine.state.config.mapHeight * this.engine.state.config.tileSize - buildingSize) {
        return pos;
      }
    }
    return null;
  }

  private findNearestResource(from: Vector2): Vector2 | null {
    const map = this.engine.state.map;
    const tileSize = this.engine.state.config.tileSize;
    let nearest: Vector2 | null = null;
    let nearestDist = Infinity;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x].resource && map[y][x].resource!.amount > 0) {
          const pos = { x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 };
          const dist = this.engine.distanceBetween(from, pos);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = pos;
          }
        }
      }
    }
    return nearest;
  }

  private isWorker(unit: Unit): boolean {
    return ['chud_neet', 'chosen_merchant', 'crusader_simp', 'chad_gym_rat'].includes(unit.unitType);
  }

  private isMainBuilding(building: Building): boolean {
    return ['chud_main', 'chosen_main', 'crusader_main', 'chad_main'].includes(building.buildingType);
  }

  private isSupplyBuilding(building: Building): boolean {
    return ['chud_supply', 'chosen_supply', 'crusader_supply', 'chad_supply'].includes(building.buildingType);
  }

  private getWorkerType(faction: FactionId): string | undefined {
    const workerMap: Record<string, string> = {
      chuds: 'chud_neet',
      chosen: 'chosen_merchant',
      crusaders: 'crusader_simp',
      chads: 'chad_gym_rat',
    };
    return workerMap[faction];
  }

  private getSupplyBuildingType(faction: FactionId): string | undefined {
    const supplyMap: Record<string, string> = {
      chuds: 'chud_supply',
      chosen: 'chosen_supply',
      crusaders: 'crusader_supply',
      chads: 'chad_supply',
    };
    return supplyMap[faction];
  }
}
