import {
  GameState, GameConfig, Entity, Unit, Building, Projectile,
  Player, Command, Vector2, Tile, TerrainType, Resources,
  FactionId, Camera, ResourceNode, TrainOrder,
} from './types';
import { PathFinder } from './PathFinder';
import { CombatSystem } from '../systems/CombatSystem';
import { ResourceSystem } from '../systems/ResourceSystem';
import { BuildingSystem } from '../systems/BuildingSystem';
import { FogOfWar } from '../systems/FogOfWar';
import { AIController } from '../ai/AIController';
import { getUnitDefinition, getBuildingDefinition } from '../data/definitions';

let entityIdCounter = 0;
function generateId(): string {
  return `e_${++entityIdCounter}`;
}

export class GameEngine {
  state: GameState;
  pathFinder: PathFinder;
  combatSystem: CombatSystem;
  resourceSystem: ResourceSystem;
  buildingSystem: BuildingSystem;
  fogOfWar: FogOfWar;
  aiControllers: Map<string, AIController> = new Map();

  private lastTime = 0;
  private accumulator = 0;
  private readonly TICK_RATE = 1000 / 20; // 20 ticks per second

  constructor(config: GameConfig, players: Player[], map: Tile[][]) {
    this.state = {
      tick: 0,
      time: 0,
      paused: false,
      speed: 1,
      config,
      map,
      entities: new Map(),
      players,
      localPlayerId: players.find(p => !p.isAI)?.id || players[0].id,
      camera: { x: 0, y: 0, zoom: 1, width: 0, height: 0 },
      selectedEntities: [],
      commands: [],
      gameOver: false,
    };

    this.pathFinder = new PathFinder(map, config.tileSize);
    this.combatSystem = new CombatSystem(this);
    this.resourceSystem = new ResourceSystem(this);
    this.buildingSystem = new BuildingSystem(this);
    this.fogOfWar = new FogOfWar(this);

    // Initialize AI controllers
    for (const player of players) {
      if (player.isAI) {
        this.aiControllers.set(player.id, new AIController(this, player.id));
      }
    }
  }

  spawnUnit(unitType: string, faction: FactionId, position: Vector2, playerId: string): Unit | null {
    const def = getUnitDefinition(unitType);
    if (!def) return null;

    const unit: Unit = {
      id: generateId(),
      type: 'unit',
      unitType,
      faction,
      position: { ...position },
      size: { ...def.size },
      hp: def.hp,
      maxHp: def.hp,
      armor: def.armor,
      damage: def.damage,
      attackRange: def.attackRange,
      attackSpeed: def.attackSpeed,
      attackCooldown: 0,
      speed: def.speed,
      sightRange: def.sightRange,
      state: 'idle',
      visible: true,
      selected: false,
      target: undefined,
      targetEntity: undefined,
      path: [],
      abilities: [...def.abilities],
      experience: 0,
      level: 1,
      isHero: def.isHero,
    };

    this.state.entities.set(unit.id, unit);
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.entities.push(unit.id);
      player.population += def.populationCost;
    }
    return unit;
  }

  spawnBuilding(buildingType: string, faction: FactionId, position: Vector2, playerId: string, instant = false): Building | null {
    const def = getBuildingDefinition(buildingType);
    if (!def) return null;

    const building: Building = {
      id: generateId(),
      type: 'building',
      buildingType,
      faction,
      position: { ...position },
      size: { ...def.size },
      hp: instant ? def.hp : 1,
      maxHp: def.hp,
      armor: def.armor,
      state: instant ? 'idle' : 'constructing',
      buildProgress: instant ? 100 : 0,
      visible: true,
      selected: false,
      trainQueue: [],
      sightRange: def.sightRange,
      providesPopulation: def.providesPopulation,
      garrisonedUnits: [],
      garrisonCapacity: def.garrisonCapacity,
    };

    this.state.entities.set(building.id, building);
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.entities.push(building.id);
      if (instant) {
        player.maxPopulation += def.providesPopulation;
      }
    }
    return building;
  }

  removeEntity(entityId: string): void {
    const entity = this.state.entities.get(entityId);
    if (!entity) return;

    this.state.entities.delete(entityId);
    for (const player of this.state.players) {
      const idx = player.entities.indexOf(entityId);
      if (idx !== -1) {
        player.entities.splice(idx, 1);
        if (entity.type === 'unit') {
          const def = getUnitDefinition((entity as Unit).unitType);
          if (def) player.population -= def.populationCost;
        }
        if (entity.type === 'building') {
          const bld = entity as Building;
          player.maxPopulation -= bld.providesPopulation;
        }
        break;
      }
    }

    // Deselect
    const selIdx = this.state.selectedEntities.indexOf(entityId);
    if (selIdx !== -1) this.state.selectedEntities.splice(selIdx, 1);
  }

  issueCommand(command: Command): void {
    this.state.commands.push(command);
  }

  processCommands(): void {
    for (const cmd of this.state.commands) {
      for (const entityId of cmd.entityIds) {
        const entity = this.state.entities.get(entityId);
        if (!entity) continue;

        if (entity.type === 'unit') {
          this.processUnitCommand(entity as Unit, cmd);
        } else if (entity.type === 'building') {
          this.processBuildingCommand(entity as Building, cmd);
        }
      }
    }
    this.state.commands = [];
  }

  private processUnitCommand(unit: Unit, cmd: Command): void {
    switch (cmd.type) {
      case 'move':
        if (cmd.target) {
          unit.path = this.pathFinder.findPath(unit.position, cmd.target);
          unit.state = 'moving';
          unit.targetEntity = undefined;
        }
        break;
      case 'attack':
        if (cmd.targetEntityId) {
          unit.targetEntity = cmd.targetEntityId;
          unit.state = 'attacking';
        } else if (cmd.target) {
          unit.path = this.pathFinder.findPath(unit.position, cmd.target);
          unit.state = 'moving'; // attack-move
        }
        break;
      case 'gather':
        if (cmd.target) {
          unit.target = cmd.target;
          unit.state = 'gathering';
          unit.path = this.pathFinder.findPath(unit.position, cmd.target);
        }
        break;
      case 'build':
        if (cmd.target && cmd.buildingType) {
          unit.target = cmd.target;
          unit.state = 'building';
          unit.path = this.pathFinder.findPath(unit.position, cmd.target);
        }
        break;
      case 'stop':
        unit.state = 'idle';
        unit.path = [];
        unit.targetEntity = undefined;
        unit.target = undefined;
        break;
      case 'patrol':
        if (cmd.target) {
          unit.state = 'patrolling';
          unit.rallyPoint = { ...unit.position };
          unit.target = cmd.target;
          unit.path = this.pathFinder.findPath(unit.position, cmd.target);
        }
        break;
    }
  }

  private processBuildingCommand(building: Building, cmd: Command): void {
    switch (cmd.type) {
      case 'train':
        if (cmd.unitType) {
          const def = getUnitDefinition(cmd.unitType);
          if (!def) break;
          const player = this.getEntityOwner(building.id);
          if (!player) break;
          // Check resources
          if (!this.resourceSystem.canAfford(player, def.cost)) break;
          if (player.population + def.populationCost > player.maxPopulation) break;
          this.resourceSystem.deductCost(player, def.cost);
          building.trainQueue.push({
            unitType: cmd.unitType,
            progress: 0,
            trainTime: def.trainTime,
          });
          if (building.state === 'idle') building.state = 'training';
        }
        break;
      case 'rally':
        if (cmd.target) {
          building.rallyPoint = cmd.target;
        }
        break;
      case 'research':
        // handled by building system
        break;
    }
  }

  getEntityOwner(entityId: string): Player | undefined {
    return this.state.players.find(p => p.entities.includes(entityId));
  }

  getPlayerEntities(playerId: string): Entity[] {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return [];
    return player.entities
      .map(id => this.state.entities.get(id))
      .filter((e): e is Entity => !!e);
  }

  getPlayerUnits(playerId: string): Unit[] {
    return this.getPlayerEntities(playerId).filter((e): e is Unit => e.type === 'unit');
  }

  getPlayerBuildings(playerId: string): Building[] {
    return this.getPlayerEntities(playerId).filter((e): e is Building => e.type === 'building');
  }

  update(currentTime: number): void {
    if (this.state.paused || this.state.gameOver) return;

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return;
    }

    const delta = (currentTime - this.lastTime) * this.state.speed;
    this.lastTime = currentTime;
    this.accumulator += delta;

    while (this.accumulator >= this.TICK_RATE) {
      this.tick(this.TICK_RATE / 1000);
      this.accumulator -= this.TICK_RATE;
      this.state.tick++;
      this.state.time += this.TICK_RATE / 1000;
    }
  }

  private tick(dt: number): void {
    this.processCommands();
    this.updateUnits(dt);
    this.buildingSystem.update(dt);
    this.combatSystem.update(dt);
    this.resourceSystem.update(dt);
    this.fogOfWar.update();
    this.updateProjectiles(dt);

    // AI update every 10 ticks
    if (this.state.tick % 10 === 0) {
      for (const [, controller] of this.aiControllers) {
        controller.update(dt);
      }
    }

    this.checkVictoryConditions();
  }

  private updateUnits(dt: number): void {
    for (const [, entity] of this.state.entities) {
      if (entity.type !== 'unit') continue;
      const unit = entity as Unit;
      if (unit.state === 'dead') continue;

      // Move along path
      if (unit.path.length > 0 && (unit.state === 'moving' || unit.state === 'gathering' || unit.state === 'building' || unit.state === 'attacking' || unit.state === 'patrolling')) {
        const target = unit.path[0];
        const dx = target.x - unit.position.x;
        const dy = target.y - unit.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveSpeed = unit.speed * dt;

        if (dist <= moveSpeed) {
          unit.position.x = target.x;
          unit.position.y = target.y;
          unit.path.shift();
          if (unit.path.length === 0 && unit.state === 'moving') {
            unit.state = 'idle';
          }
        } else {
          unit.position.x += (dx / dist) * moveSpeed;
          unit.position.y += (dy / dist) * moveSpeed;
        }
      }

      // Update attack cooldown
      if (unit.attackCooldown > 0) {
        unit.attackCooldown -= dt;
      }

      // Patrol logic
      if (unit.state === 'patrolling' && unit.path.length === 0) {
        if (unit.rallyPoint && unit.target) {
          const goingTo = this.distanceBetween(unit.position, unit.target) < 10 ? unit.rallyPoint : unit.target;
          unit.path = this.pathFinder.findPath(unit.position, goingTo);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const toRemove: string[] = [];
    for (const [id, entity] of this.state.entities) {
      if (entity.type !== 'projectile') continue;
      const proj = entity as Projectile;
      const dx = proj.targetPos.x - proj.position.x;
      const dy = proj.targetPos.y - proj.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = proj.speed * dt;

      if (dist <= moveSpeed) {
        // Hit target
        const target = this.state.entities.get(proj.targetId);
        if (target && (target.type === 'unit' || target.type === 'building')) {
          this.combatSystem.applyDamage(target as Unit | Building, proj.damage);
        }
        toRemove.push(id);
      } else {
        proj.position.x += (dx / dist) * moveSpeed;
        proj.position.y += (dy / dist) * moveSpeed;
      }
    }
    for (const id of toRemove) {
      this.state.entities.delete(id);
    }
  }

  distanceBetween(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private checkVictoryConditions(): void {
    for (const player of this.state.players) {
      if (player.defeated) continue;
      const buildings = this.getPlayerBuildings(player.id);
      const units = this.getPlayerUnits(player.id);
      if (buildings.length === 0 && units.length === 0) {
        player.defeated = true;
      }
    }

    const activePlayers = this.state.players.filter(p => !p.defeated);
    const activeTeams = new Set(activePlayers.map(p => p.teamId));
    if (activeTeams.size <= 1 && activePlayers.length > 0) {
      this.state.gameOver = true;
      this.state.winner = activePlayers[0]?.id;
    }
  }

  screenToWorld(screenX: number, screenY: number): Vector2 {
    const cam = this.state.camera;
    return {
      x: (screenX / cam.zoom) + cam.x,
      y: (screenY / cam.zoom) + cam.y,
    };
  }

  worldToScreen(worldX: number, worldY: number): Vector2 {
    const cam = this.state.camera;
    return {
      x: (worldX - cam.x) * cam.zoom,
      y: (worldY - cam.y) * cam.zoom,
    };
  }

  getEntitiesInRect(rect: { x1: number; y1: number; x2: number; y2: number }): Entity[] {
    const result: Entity[] = [];
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = Math.min(rect.y1, rect.y2);
    const maxY = Math.max(rect.y1, rect.y2);

    for (const [, entity] of this.state.entities) {
      if (entity.position.x >= minX && entity.position.x <= maxX &&
          entity.position.y >= minY && entity.position.y <= maxY) {
        result.push(entity);
      }
    }
    return result;
  }

  getEntitiesAt(pos: Vector2, radius: number): Entity[] {
    const result: Entity[] = [];
    for (const [, entity] of this.state.entities) {
      if (this.distanceBetween(entity.position, pos) <= radius) {
        result.push(entity);
      }
    }
    return result;
  }
}
