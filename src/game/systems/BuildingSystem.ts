import { GameEngine } from '../engine/GameEngine';
import { Building, Unit, Vector2 } from '../engine/types';
import { getBuildingDefinition, getUnitDefinition } from '../data/definitions';

export class BuildingSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  update(dt: number): void {
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'building') continue;
      const building = entity as Building;

      switch (building.state) {
        case 'constructing':
          this.updateConstruction(building, dt);
          break;
        case 'training':
          this.updateTraining(building, dt);
          break;
        case 'researching':
          this.updateResearch(building, dt);
          break;
      }
    }

    // Update units in 'building' state (workers constructing buildings)
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'unit') continue;
      const unit = entity as Unit;
      if (unit.state !== 'building') continue;
      this.updateWorkerBuilding(unit, dt);
    }
  }

  private updateConstruction(building: Building, dt: number): void {
    const def = getBuildingDefinition(building.buildingType);
    if (!def) return;

    // Building constructs over time with workers nearby
    const buildRate = 100 / def.buildTime; // percent per second
    building.buildProgress += buildRate * dt;
    building.hp = Math.floor((building.buildProgress / 100) * def.hp);

    if (building.buildProgress >= 100) {
      building.buildProgress = 100;
      building.hp = def.hp;
      building.state = 'idle';

      // Apply population bonus
      const owner = this.engine.getEntityOwner(building.id);
      if (owner) {
        owner.maxPopulation += def.providesPopulation;
      }
    }
  }

  private updateTraining(building: Building, dt: number): void {
    if (building.trainQueue.length === 0) {
      building.state = 'idle';
      return;
    }

    const order = building.trainQueue[0];
    const progressRate = 100 / order.trainTime; // percent per second
    order.progress += progressRate * dt;

    if (order.progress >= 100) {
      // Spawn unit at rally point or near building
      const spawnPos = building.rallyPoint || {
        x: building.position.x + building.size.x + 20,
        y: building.position.y + building.size.y / 2,
      };

      const owner = this.engine.getEntityOwner(building.id);
      if (owner) {
        const unit = this.engine.spawnUnit(order.unitType, building.faction, {
          x: building.position.x + building.size.x + 10,
          y: building.position.y + building.size.y / 2,
        }, owner.id);

        // If there's a rally point, issue move command
        if (unit && building.rallyPoint) {
          unit.path = this.engine.pathFinder.findPath(unit.position, building.rallyPoint);
          unit.state = 'moving';
        }
      }

      building.trainQueue.shift();
      if (building.trainQueue.length === 0) {
        building.state = 'idle';
      }
    }
  }

  private updateResearch(building: Building, dt: number): void {
    if (!building.currentResearch) {
      building.state = 'idle';
      return;
    }

    const research = building.currentResearch;
    const progressRate = 100 / research.researchTime;
    research.progress += progressRate * dt;

    if (research.progress >= 100) {
      const owner = this.engine.getEntityOwner(building.id);
      if (owner) {
        owner.upgrades.push(research.upgradeId);
      }
      building.currentResearch = undefined;
      building.state = building.trainQueue.length > 0 ? 'training' : 'idle';
    }
  }

  private updateWorkerBuilding(unit: Unit, dt: number): void {
    if (!unit.target) {
      unit.state = 'idle';
      return;
    }

    // Check if we're close enough to the build site
    const dist = this.engine.distanceBetween(unit.position, unit.target);
    if (dist > 50) return; // still walking

    // Find the constructing building at this location
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'building') continue;
      const building = entity as Building;
      if (building.state !== 'constructing') continue;

      const buildDist = this.engine.distanceBetween(unit.target, building.position);
      if (buildDist < 60) {
        // Worker assists construction (speeds it up)
        const def = getBuildingDefinition(building.buildingType);
        if (def) {
          building.buildProgress += (100 / def.buildTime) * dt * 0.5; // 50% bonus
        }
        return;
      }
    }

    // No building found, go idle
    unit.state = 'idle';
    unit.target = undefined;
  }

  canPlaceBuilding(buildingType: string, position: Vector2): boolean {
    const def = getBuildingDefinition(buildingType);
    if (!def) return false;

    const tileSize = this.engine.state.config.tileSize;
    const startX = Math.floor(position.x / tileSize);
    const startY = Math.floor(position.y / tileSize);
    const tilesW = Math.ceil(def.size.x / tileSize);
    const tilesH = Math.ceil(def.size.y / tileSize);

    for (let dy = 0; dy < tilesH; dy++) {
      for (let dx = 0; dx < tilesW; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        const tile = this.engine.state.map[ty]?.[tx];
        if (!tile || !tile.buildable) return false;
      }
    }

    // Check for overlapping buildings
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'building') continue;
      const bx1 = entity.position.x;
      const by1 = entity.position.y;
      const bx2 = bx1 + entity.size.x;
      const by2 = by1 + entity.size.y;
      const px1 = position.x;
      const py1 = position.y;
      const px2 = px1 + def.size.x;
      const py2 = py1 + def.size.y;

      if (px1 < bx2 && px2 > bx1 && py1 < by2 && py2 > by1) {
        return false;
      }
    }

    return true;
  }
}
