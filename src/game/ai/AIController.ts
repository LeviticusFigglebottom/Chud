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
  enemyBasePos: Vector2 | null;
  retreating: boolean;
  harassTarget: Vector2 | null;
}

export class AIController {
  private engine: GameEngine;
  private playerId: string;
  private personality: AIPersonality;
  private difficulty: DifficultyLevel;
  private state: AIState;
  private difficultyMultiplier: number;
  private thinkInterval: number;
  private timeSinceThink: number = 0;
  private builtTypes: Set<string> = new Set();

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
      enemyBasePos: null,
      retreating: false,
      harassTarget: null,
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
    const army = units.filter(u => !this.isWorker(u) && !u.isHero);
    const heroes = units.filter(u => u.isHero);

    this.state.armyValue = army.reduce((sum, u) => {
      const def = getUnitDefinition(u.unitType);
      return sum + (def ? (def.cost.copium || 0) + (def.cost.clout || 0) * 1.5 : 0);
    }, 0);

    // Workers: scale with game time, capped
    const desiredWorkers = Math.min(12, 4 + Math.floor(this.engine.state.time / 90));
    this.state.needsWorkers = workers.length < desiredWorkers;
    this.state.needsSupply = player.population >= player.maxPopulation - 2;

    const armyGoal = this.personality === 'rusher'
      ? 3 + Math.floor(this.engine.state.time / 45) * this.difficultyMultiplier
      : this.personality === 'boomer'
      ? 2 + Math.floor(this.engine.state.time / 40) * this.difficultyMultiplier
      : 3 + Math.floor(this.engine.state.time / 50) * this.difficultyMultiplier;
    this.state.needsArmy = army.length < armyGoal;

    // Determine game phase
    if (this.engine.state.time < 90) {
      this.state.phase = 'early';
    } else if (this.engine.state.time < 300) {
      this.state.phase = 'mid';
    } else {
      this.state.phase = 'late';
    }

    // Attack readiness based on personality
    const attackThreshold = this.personality === 'rusher' ? 3 :
                           this.personality === 'harasser' ? 2 :
                           this.personality === 'turtler' ? 8 :
                           this.personality === 'boomer' ? 6 : 5;

    const attackCooldown = this.personality === 'rusher' ? 40 :
                          this.personality === 'harasser' ? 25 :
                          this.personality === 'turtler' ? 90 : 60;

    this.state.attackReady = army.length >= attackThreshold &&
      (this.engine.state.time - this.state.lastAttackTime > attackCooldown);

    // Track enemy base location
    this.updateEnemyBasePos(player);

    // Check if army is low health and should retreat
    if (army.length > 0) {
      const avgHpRatio = army.reduce((sum, u) => sum + u.hp / u.maxHp, 0) / army.length;
      this.state.retreating = avgHpRatio < 0.35 && army.length < 4;
    }
  }

  private updateEnemyBasePos(player: Player): void {
    const enemyPlayer = this.engine.state.players.find(p =>
      p.id !== this.playerId && !p.defeated && p.teamId !== player.teamId
    );
    if (!enemyPlayer) return;
    const enemyBuildings = this.engine.getPlayerBuildings(enemyPlayer.id);
    if (enemyBuildings.length > 0) {
      this.state.enemyBasePos = { ...enemyBuildings[0].position };
    }
  }

  private makeDecisions(player: Player): void {
    const buildings = this.engine.getPlayerBuildings(this.playerId);
    const units = this.engine.getPlayerUnits(this.playerId);

    // Retreat damaged army
    if (this.state.retreating) {
      this.retreatArmy(player, units);
      return; // Don't attack while retreating
    }

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

    // Priority 6: Scout early game
    if (!this.state.scoutSent && this.engine.state.time > 30) {
      this.sendScout(player, units);
    }

    // Priority 7: Manage hero
    this.manageHero(player, units);

    // Priority 8: Defend base if under attack
    if (this.isBaseUnderAttack(player, buildings)) {
      this.defendBase(player, units, buildings);
    }

    // Priority 9: Attack
    if (this.state.attackReady) {
      this.launchAttack(player, units);
    }

    // Priority 10: Send idle army to rally point
    this.rallyIdleArmy(player, units, buildings);
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
      (b.state === 'idle' || (b.state === 'training' && b.trainQueue.length < 2)) &&
      !this.isMainBuilding(b) && !this.isSupplyBuilding(b) &&
      b.buildProgress >= 100
    );

    for (const bld of productionBuildings) {
      const def = getBuildingDefinition(bld.buildingType);
      if (!def || def.trains.length === 0) continue;

      // Pick best affordable unit (prefer higher tier in late game)
      const trainable = def.trains
        .map(ut => ({ type: ut, def: getUnitDefinition(ut) }))
        .filter(u => u.def && !u.def.isHero)
        .filter(u => {
          const d = u.def!;
          return player.resources.copium >= (d.cost.copium || 0) &&
                 player.resources.clout >= (d.cost.clout || 0) &&
                 player.resources.tendies >= (d.cost.tendies || 0) &&
                 player.population + d.populationCost <= player.maxPopulation;
        });

      if (trainable.length === 0) continue;

      // Late game: prefer stronger units
      const pick = this.state.phase === 'late'
        ? trainable[trainable.length - 1]
        : trainable[0];

      this.engine.issueCommand({
        type: 'train',
        entityIds: [bld.id],
        unitType: pick.type,
      });
    }

    // Also train from main building if production buildings not available
    if (productionBuildings.length === 0 && this.state.phase !== 'early') {
      const mainBuildings = buildings.filter(b =>
        b.state === 'idle' && this.isMainBuilding(b) && b.buildProgress >= 100
      );
      for (const main of mainBuildings) {
        const def = getBuildingDefinition(main.buildingType);
        if (!def) continue;
        const trainable = def.trains
          .map(ut => ({ type: ut, def: getUnitDefinition(ut) }))
          .filter(u => u.def && !u.def.isHero && !this.isWorkerType(u.type))
          .filter(u => {
            const d = u.def!;
            return player.resources.copium >= (d.cost.copium || 0) &&
                   player.population + d.populationCost <= player.maxPopulation;
          });
        if (trainable.length > 0) {
          this.engine.issueCommand({
            type: 'train',
            entityIds: [main.id],
            unitType: trainable[0].type,
          });
        }
      }
    }
  }

  private tryBuildSupply(player: Player, buildings: Building[]): void {
    // Don't build supply if one is already constructing
    if (buildings.some(b => this.isSupplyBuilding(b) && b.state === 'constructing')) return;

    const supplyType = this.getSupplyBuildingType(player.faction);
    if (!supplyType) return;
    const def = getBuildingDefinition(supplyType);
    if (!def) return;
    if (player.resources.copium < (def.cost.copium || 0)) return;
    if (player.resources.clout < (def.cost.clout || 0)) return;

    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return;

    const pos = this.findBuildPosition(main.position, def.size.x);
    if (!pos) return;

    this.engine.resourceSystem.deductCost(player, def.cost);
    this.engine.spawnBuilding(supplyType, player.faction, pos, this.playerId, false);
  }

  private tryBuildProduction(player: Player, buildings: Building[]): void {
    // Don't build while something is already constructing
    if (buildings.some(b => b.state === 'constructing' && !this.isSupplyBuilding(b))) return;

    const factionBuildings = getFactionBuildings(player.faction);
    const existingTypes = new Set(buildings.map(b => b.buildingType));

    for (const bdef of factionBuildings) {
      if (existingTypes.has(bdef.id)) continue;
      if (this.isSupplyBuilding({ buildingType: bdef.id } as Building)) continue;

      const prereqsMet = bdef.prerequisites.every(p => existingTypes.has(p));
      if (!prereqsMet) continue;

      if (player.resources.copium < (bdef.cost.copium || 0)) continue;
      if (player.resources.clout < (bdef.cost.clout || 0)) continue;
      if (player.resources.tendies < (bdef.cost.tendies || 0)) continue;

      const main = buildings.find(b => this.isMainBuilding(b));
      if (!main) continue;

      const pos = this.findBuildPosition(main.position, bdef.size.x);
      if (!pos) continue;

      this.engine.resourceSystem.deductCost(player, bdef.cost);
      this.engine.spawnBuilding(bdef.id, player.faction, pos, this.playerId, false);
      break;
    }
  }

  private manageWorkers(player: Player, units: Unit[]): void {
    const workers = units.filter(u => this.isWorker(u) && u.state === 'idle');

    for (const worker of workers) {
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

  private sendScout(player: Player, units: Unit[]): void {
    const workers = units.filter(u => this.isWorker(u) && u.state === 'idle');
    if (workers.length < 2) return; // Don't scout with last worker

    const scout = workers[workers.length - 1];
    // Send to center of map or enemy likely positions
    const mapW = this.engine.state.config.mapWidth * this.engine.state.config.tileSize;
    const mapH = this.engine.state.config.mapHeight * this.engine.state.config.tileSize;

    this.engine.issueCommand({
      type: 'move',
      entityIds: [scout.id],
      target: { x: mapW / 2, y: mapH / 2 },
    });

    this.state.scoutSent = true;
  }

  private manageHero(player: Player, units: Unit[]): void {
    const heroes = units.filter(u => u.isHero && u.state === 'idle');
    if (heroes.length === 0) return;

    // Hero follows the army group
    const army = units.filter(u => !this.isWorker(u) && !u.isHero && u.state !== 'dead');
    if (army.length > 0) {
      // Move hero to army center
      const cx = army.reduce((s, u) => s + u.position.x, 0) / army.length;
      const cy = army.reduce((s, u) => s + u.position.y, 0) / army.length;
      for (const hero of heroes) {
        const dist = this.engine.distanceBetween(hero.position, { x: cx, y: cy });
        if (dist > 100) {
          this.engine.issueCommand({
            type: 'move',
            entityIds: [hero.id],
            target: { x: cx, y: cy },
          });
        }
      }
    }
  }

  private isBaseUnderAttack(player: Player, buildings: Building[]): boolean {
    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return false;

    // Check for nearby enemy units
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'unit') continue;
      const owner = this.engine.getEntityOwner(entity.id);
      if (!owner || owner.teamId === player.teamId) continue;
      const dist = this.engine.distanceBetween(entity.position, main.position);
      if (dist < 300) return true;
    }
    return false;
  }

  private defendBase(player: Player, units: Unit[], buildings: Building[]): void {
    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return;

    const army = units.filter(u => !this.isWorker(u) && u.state !== 'dead');
    const idleArmy = army.filter(u => u.state === 'idle' || u.state === 'patrolling');

    // Find closest enemy near base
    let closestEnemy: Unit | null = null;
    let closestDist = 300;
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'unit') continue;
      const owner = this.engine.getEntityOwner(entity.id);
      if (!owner || owner.teamId === player.teamId) continue;
      const dist = this.engine.distanceBetween(entity.position, main.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = entity as Unit;
      }
    }

    if (closestEnemy && idleArmy.length > 0) {
      this.engine.issueCommand({
        type: 'attack',
        entityIds: idleArmy.map(u => u.id),
        targetEntityId: closestEnemy.id,
      });
    }
  }

  private retreatArmy(player: Player, units: Unit[]): void {
    const buildings = this.engine.getPlayerBuildings(this.playerId);
    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return;

    const army = units.filter(u => !this.isWorker(u) && u.state !== 'dead' && u.state !== 'idle');
    const damagedArmy = army.filter(u => u.hp / u.maxHp < 0.5);

    for (const unit of damagedArmy) {
      const dist = this.engine.distanceBetween(unit.position, main.position);
      if (dist > 200) {
        this.engine.issueCommand({
          type: 'move',
          entityIds: [unit.id],
          target: main.position,
        });
      }
    }
  }

  private launchAttack(player: Player, units: Unit[]): void {
    const army = units.filter(u => !this.isWorker(u) && u.state !== 'dead');
    if (army.length < 3) return;

    // Find target: enemy base or nearest enemy unit
    const enemyPlayer = this.engine.state.players.find(p =>
      p.id !== this.playerId && !p.defeated && p.teamId !== player.teamId
    );
    if (!enemyPlayer) return;

    const enemyBuildings = this.engine.getPlayerBuildings(enemyPlayer.id);
    const enemyUnits = this.engine.getPlayerUnits(enemyPlayer.id);

    let target: Vector2;
    if (enemyBuildings.length > 0) {
      target = { ...enemyBuildings[0].position };
    } else if (enemyUnits.length > 0) {
      target = { ...enemyUnits[0].position };
    } else {
      return;
    }

    // Group attack command (formation offsets handled by engine)
    this.engine.issueCommand({
      type: 'attack',
      entityIds: army.map(u => u.id),
      target,
    });

    this.state.lastAttackTime = this.engine.state.time;
    this.state.attackReady = false;
  }

  private rallyIdleArmy(player: Player, units: Unit[], buildings: Building[]): void {
    const army = units.filter(u => !this.isWorker(u) && !u.isHero && u.state === 'idle');
    if (army.length === 0) return;

    const main = buildings.find(b => this.isMainBuilding(b));
    if (!main) return;

    // Rally idle units near the base front (toward center of map)
    const mapW = this.engine.state.config.mapWidth * this.engine.state.config.tileSize;
    const mapH = this.engine.state.config.mapHeight * this.engine.state.config.tileSize;
    const dirX = (mapW / 2 - main.position.x);
    const dirY = (mapH / 2 - main.position.y);
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const rallyPoint = {
      x: main.position.x + (dirX / dirLen) * 120,
      y: main.position.y + (dirY / dirLen) * 120,
    };

    for (const unit of army) {
      const dist = this.engine.distanceBetween(unit.position, rallyPoint);
      if (dist > 150) {
        this.engine.issueCommand({
          type: 'move',
          entityIds: [unit.id],
          target: rallyPoint,
        });
      }
    }
  }

  private findBuildPosition(near: Vector2, buildingSize: number): Vector2 | null {
    const offsets = [
      { x: 120, y: 0 }, { x: -120, y: 0 }, { x: 0, y: 120 }, { x: 0, y: -120 },
      { x: 120, y: 120 }, { x: -120, y: 120 }, { x: 120, y: -120 }, { x: -120, y: -120 },
      { x: 200, y: 0 }, { x: -200, y: 0 }, { x: 0, y: 200 }, { x: 0, y: -200 },
      { x: 200, y: 200 }, { x: -200, y: 200 }, { x: 200, y: -200 }, { x: -200, y: -200 },
    ];

    for (const offset of offsets) {
      const pos = { x: near.x + offset.x, y: near.y + offset.y };
      if (pos.x > 50 && pos.y > 50 &&
          pos.x < this.engine.state.config.mapWidth * this.engine.state.config.tileSize - buildingSize - 50 &&
          pos.y < this.engine.state.config.mapHeight * this.engine.state.config.tileSize - buildingSize - 50) {
        // Check no other building too close
        let blocked = false;
        for (const [, entity] of this.engine.state.entities) {
          if (entity.type === 'building') {
            const dist = this.engine.distanceBetween(pos, entity.position);
            if (dist < 80) { blocked = true; break; }
          }
        }
        if (!blocked) return pos;
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

  private isWorkerType(unitType: string): boolean {
    return ['chud_neet', 'chosen_merchant', 'crusader_simp', 'chad_gym_rat'].includes(unitType);
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
