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

    // Ensure spawn position is on walkable terrain
    const tileX = Math.floor(position.x / this.state.config.tileSize);
    const tileY = Math.floor(position.y / this.state.config.tileSize);
    const tile = this.state.map[tileY]?.[tileX];
    if (tile && !tile.walkable) {
      // Find nearest walkable tile
      const nearest = this.pathFinder.findNearestWalkableWorld(position);
      if (nearest) {
        position = nearest;
      }
    }

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

    // Mark tiles under building as unwalkable for pathfinding
    this.markBuildingTiles(building, false);

    return building;
  }

  removeEntity(entityId: string): void {
    const entity = this.state.entities.get(entityId);
    if (!entity) return;

    // Restore tiles if building is removed
    if (entity.type === 'building') {
      this.markBuildingTiles(entity as Building, true);
    }

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
      // Compute formation offsets for group commands
      const unitIds = cmd.entityIds.filter(id => {
        const e = this.state.entities.get(id);
        return e && e.type === 'unit';
      });
      const formationOffsets = cmd.target && unitIds.length > 1
        ? this.computeFormationOffsets(unitIds.length)
        : null;

      let unitIndex = 0;
      for (const entityId of cmd.entityIds) {
        const entity = this.state.entities.get(entityId);
        if (!entity) continue;

        if (entity.type === 'unit') {
          const offset = formationOffsets ? formationOffsets[unitIndex] : null;
          this.processUnitCommand(entity as Unit, cmd, offset);
          unitIndex++;
        } else if (entity.type === 'building') {
          this.processBuildingCommand(entity as Building, cmd);
        }
      }
    }
    this.state.commands = [];
  }

  // Compute grid offsets so units spread out around the target point
  private computeFormationOffsets(count: number): Vector2[] {
    const spacing = 40; // pixels between units
    const cols = Math.ceil(Math.sqrt(count));
    const offsets: Vector2[] = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      offsets.push({
        x: (col - (cols - 1) / 2) * spacing,
        y: (row - (Math.ceil(count / cols) - 1) / 2) * spacing,
      });
    }
    return offsets;
  }

  private processUnitCommand(unit: Unit, cmd: Command, formationOffset?: Vector2 | null): void {
    // Apply formation offset to target if applicable
    const applyOffset = (target: Vector2): Vector2 => {
      if (formationOffset) {
        return { x: target.x + formationOffset.x, y: target.y + formationOffset.y };
      }
      return target;
    };

    switch (cmd.type) {
      case 'move':
        if (cmd.target) {
          const dest = applyOffset(cmd.target);
          unit.path = this.pathFinder.findPath(unit.position, dest);
          unit.state = 'moving';
          unit.targetEntity = undefined;
        }
        break;
      case 'attack':
        if (cmd.targetEntityId) {
          unit.targetEntity = cmd.targetEntityId;
          unit.state = 'attacking';
        } else if (cmd.target) {
          const dest = applyOffset(cmd.target);
          unit.path = this.pathFinder.findPath(unit.position, dest);
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
          const dest = applyOffset(cmd.target);
          unit.state = 'patrolling';
          unit.rallyPoint = { ...unit.position };
          unit.target = dest;
          unit.path = this.pathFinder.findPath(unit.position, dest);
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

    this.updateUpkeep();
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

      // Unit separation: push apart from nearby units to prevent overlap and clustering
      const isGathering = unit.state === 'gathering' || unit.state === 'building';
      const isIdle = unit.state === 'idle';
      for (const [, other] of this.state.entities) {
        if (other.type !== 'unit' || other.id === entity.id) continue;
        const ou = other as Unit;
        if (ou.state === 'dead') continue;
        const otherGathering = ou.state === 'gathering' || ou.state === 'building';
        const dx2 = unit.position.x - ou.position.x;
        const dy2 = unit.position.y - ou.position.y;
        const rawDist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        // Hard collision: units must NEVER overlap regardless of state
        // Use a smaller hard radius for workers, larger for combat
        const hardRadius = (isGathering && otherGathering) ? 8 : 14;
        // Soft separation: gentle push to prevent clustering
        const softRadius = isGathering ? 14 : (isIdle ? 22 : 20);
        const minDist = Math.max(hardRadius, softRadius);

        if (rawDist > 0 && rawDist < minDist) {
          let nx = dx2 / rawDist;
          let ny = dy2 / rawDist;
          // If nearly overlapping, push in a deterministic direction based on IDs
          if (rawDist < 2) {
            const idHash = (unit.id.charCodeAt(0) + unit.id.length * 7) & 0xff;
            const angle = (idHash / 256) * Math.PI * 2;
            nx = Math.cos(angle);
            ny = Math.sin(angle);
          }

          let pushForce: number;
          if (rawDist < hardRadius) {
            // Hard push - prevent physical overlap, strong force
            pushForce = (hardRadius - rawDist) * 0.6;
          } else {
            // Soft push - gentle separation to avoid clustering
            const overlap = softRadius - rawDist;
            pushForce = overlap * (isGathering ? 0.1 : (isIdle ? 0.35 : 0.25));
          }

          unit.position.x += nx * pushForce;
          unit.position.y += ny * pushForce;
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

  // Mark/unmark tiles under a building as unwalkable/unbuildable
  markBuildingTiles(building: Building, restore: boolean): void {
    const tileSize = this.state.config.tileSize;
    const startTX = Math.floor(building.position.x / tileSize);
    const startTY = Math.floor(building.position.y / tileSize);
    const endTX = Math.ceil((building.position.x + building.size.x) / tileSize);
    const endTY = Math.ceil((building.position.y + building.size.y) / tileSize);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tile = this.state.map[ty]?.[tx];
        if (!tile) continue;
        if (restore) {
          // Only restore if terrain allows walking (not water/mountain)
          const terrain = tile.terrain;
          tile.walkable = terrain !== 'water' && terrain !== 'mountain';
          tile.buildable = tile.walkable && terrain !== 'swamp';
        } else {
          tile.walkable = false;
          tile.buildable = false;
        }
      }
    }
  }

  // Upkeep: drain tendies based on unit population every 10 seconds
  updateUpkeep(): void {
    if (this.state.tick % 600 !== 0) return; // ~10 sec at 60 ticks/sec
    for (const player of this.state.players) {
      if (player.defeated) continue;
      // 1 tendie per 5 population, minimum 0
      const upkeep = Math.floor(player.population / 5);
      if (upkeep > 0) {
        player.resources.tendies = Math.max(0, player.resources.tendies - upkeep);
      }
    }
  }

  getEntitiesAt(pos: Vector2, radius: number): Entity[] {
    const result: Entity[] = [];
    for (const [, entity] of this.state.entities) {
      if (entity.type === 'building') {
        // Check if click is inside building bounding box (with some margin)
        const margin = radius;
        if (pos.x >= entity.position.x - margin &&
            pos.x <= entity.position.x + entity.size.x + margin &&
            pos.y >= entity.position.y - margin &&
            pos.y <= entity.position.y + entity.size.y + margin) {
          result.push(entity);
        }
      } else {
        // Units/projectiles: distance from center
        const cx = entity.position.x + entity.size.x / 2;
        const cy = entity.position.y + entity.size.y / 2;
        if (this.distanceBetween({ x: cx, y: cy }, pos) <= radius + Math.max(entity.size.x, entity.size.y) / 2) {
          result.push(entity);
        }
      }
    }
    return result;
  }
}
