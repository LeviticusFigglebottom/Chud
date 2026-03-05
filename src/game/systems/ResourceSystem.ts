import { GameEngine } from '../engine/GameEngine';
import { Unit, Building, Player, Resources, ResourceType, Vector2 } from '../engine/types';
import { getBuildingDefinition } from '../data/definitions';

export class ResourceSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  update(dt: number): void {
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'unit') continue;
      const unit = entity as Unit;
      if (unit.state !== 'gathering') continue;

      this.processGathering(unit, dt);
    }
  }

  private processGathering(unit: Unit, dt: number): void {
    const owner = this.engine.getEntityOwner(unit.id);
    if (!owner) return;

    if (unit.carryingResource && unit.carryingResource.amount > 0) {
      // Find nearest resource drop-off building
      const dropOff = this.findNearestDropOff(unit, owner);
      if (!dropOff) return;

      // Check if unit is close to any edge of the building
      const margin = 25;
      const nearBuilding = unit.position.x >= dropOff.position.x - margin &&
                          unit.position.x <= dropOff.position.x + dropOff.size.x + margin &&
                          unit.position.y >= dropOff.position.y - margin &&
                          unit.position.y <= dropOff.position.y + dropOff.size.y + margin;

      if (nearBuilding) {
        // Drop off resources
        const type = unit.carryingResource.type;
        owner.resources[type] += unit.carryingResource.amount;
        unit.carryingResource = undefined;

        // Go back to resource
        if (unit.target) {
          unit.path = this.engine.pathFinder.findPath(unit.position, unit.target);
        }
      } else if (unit.path.length === 0) {
        // Path to a spread point on the nearest edge of the building
        // Each worker targets a different edge point based on their ID hash
        const dest = this.getDropOffPoint(unit, dropOff);
        unit.path = this.engine.pathFinder.findPath(unit.position, dest);
      }
    } else {
      // Find resource to gather
      if (!unit.target) return;

      const dist = this.engine.distanceBetween(unit.position, unit.target);
      if (dist < 40) {
        // Gather from resource node on the map
        const tileX = Math.floor(unit.target.x / this.engine.state.config.tileSize);
        const tileY = Math.floor(unit.target.y / this.engine.state.config.tileSize);
        const tile = this.engine.state.map[tileY]?.[tileX];

        if (tile?.resource && tile.resource.amount > 0) {
          const gatherAmount = Math.min(10, tile.resource.amount);
          tile.resource.amount -= gatherAmount;
          unit.carryingResource = { type: tile.resource.type, amount: gatherAmount };

          // Head back to base - path to spread point on building edge
          const dropOff = this.findNearestDropOff(unit, owner);
          if (dropOff) {
            const dest = this.getDropOffPoint(unit, dropOff);
            unit.path = this.engine.pathFinder.findPath(unit.position, dest);
          }
        } else {
          // Resource depleted - find nearest available resource of same type
          const depletedType = tile?.resource?.type;
          const nearest = this.findNearestResourceOfType(unit.position, depletedType);
          if (nearest) {
            unit.target = nearest;
            unit.path = this.engine.pathFinder.findPath(unit.position, nearest);
          } else {
            unit.state = 'idle';
            unit.target = undefined;
          }
        }
      }
    }
  }

  // Compute a spread destination on the building perimeter so workers don't all converge on same spot
  private getDropOffPoint(unit: Unit, building: Building): Vector2 {
    // Hash unit ID to get a consistent offset per worker
    let hash = 0;
    for (let i = 0; i < unit.id.length; i++) {
      hash = ((hash << 5) - hash + unit.id.charCodeAt(i)) | 0;
    }
    // Pick a point along the building perimeter
    const perimeter = 2 * (building.size.x + building.size.y);
    const offset = ((hash & 0x7fffffff) % Math.floor(perimeter));
    const margin = 10; // How far outside the building edge to target

    let px: number, py: number;
    if (offset < building.size.x) {
      // Top edge
      px = building.position.x + offset;
      py = building.position.y - margin;
    } else if (offset < building.size.x + building.size.y) {
      // Right edge
      px = building.position.x + building.size.x + margin;
      py = building.position.y + (offset - building.size.x);
    } else if (offset < 2 * building.size.x + building.size.y) {
      // Bottom edge
      px = building.position.x + building.size.x - (offset - building.size.x - building.size.y);
      py = building.position.y + building.size.y + margin;
    } else {
      // Left edge
      px = building.position.x - margin;
      py = building.position.y + building.size.y - (offset - 2 * building.size.x - building.size.y);
    }
    return { x: px, y: py };
  }

  private findNearestDropOff(unit: Unit, owner: Player): Building | null {
    let nearest: Building | null = null;
    let nearestDist = Infinity;

    for (const entityId of owner.entities) {
      const entity = this.engine.state.entities.get(entityId);
      if (!entity || entity.type !== 'building') continue;
      const building = entity as Building;
      const def = getBuildingDefinition(building.buildingType);
      if (!def?.isResourceDrop) continue;
      if (building.state === 'constructing' || building.state === 'destroyed') continue;

      // Use center of building for distance calculation
      const center = {
        x: building.position.x + building.size.x / 2,
        y: building.position.y + building.size.y / 2,
      };
      const dist = this.engine.distanceBetween(unit.position, center);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = building;
      }
    }
    return nearest;
  }

  private findNearestResourceOfType(from: Vector2, type?: string): Vector2 | null {
    const map = this.engine.state.map;
    const tileSize = this.engine.state.config.tileSize;
    let nearest: Vector2 | null = null;
    let nearestDist = Infinity;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const res = map[y][x].resource;
        if (!res || res.amount <= 0) continue;
        if (type && res.type !== type) continue;
        const pos = { x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 };
        const dist = this.engine.distanceBetween(from, pos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = pos;
        }
      }
    }
    return nearest;
  }

  canAfford(player: Player, cost: Partial<Resources>): boolean {
    if (cost.copium && player.resources.copium < cost.copium) return false;
    if (cost.clout && player.resources.clout < cost.clout) return false;
    if (cost.tendies && player.resources.tendies < cost.tendies) return false;
    return true;
  }

  deductCost(player: Player, cost: Partial<Resources>): void {
    if (cost.copium) player.resources.copium -= cost.copium;
    if (cost.clout) player.resources.clout -= cost.clout;
    if (cost.tendies) player.resources.tendies -= cost.tendies;
  }
}
