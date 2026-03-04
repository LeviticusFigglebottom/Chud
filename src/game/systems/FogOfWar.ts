import { GameEngine } from '../engine/GameEngine';
import { Unit, Building, Entity } from '../engine/types';

export class FogOfWar {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  update(): void {
    if (!this.engine.state.config.fogOfWar) return;

    const localPlayer = this.engine.state.players.find(
      p => p.id === this.engine.state.localPlayerId
    );
    if (!localPlayer) return;

    const map = this.engine.state.map;
    const tileSize = this.engine.state.config.tileSize;

    // Reset all visible tiles to explored (previously seen but not currently visible)
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x].fogState === 'visible') {
          map[y][x].fogState = 'explored';
        }
      }
    }

    // Reveal tiles around friendly units and buildings
    for (const entityId of localPlayer.entities) {
      const entity = this.engine.state.entities.get(entityId);
      if (!entity) continue;

      let sightRange: number;
      if (entity.type === 'unit') {
        sightRange = (entity as Unit).sightRange;
      } else if (entity.type === 'building') {
        sightRange = (entity as Building).sightRange;
      } else {
        continue;
      }

      const centerTX = Math.floor(entity.position.x / tileSize);
      const centerTY = Math.floor(entity.position.y / tileSize);
      const radiusTiles = Math.ceil(sightRange / tileSize);

      for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
        for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
          const tx = centerTX + dx;
          const ty = centerTY + dy;
          if (tx < 0 || ty < 0 || ty >= map.length || tx >= map[0].length) continue;

          const dist = Math.sqrt(dx * dx + dy * dy) * tileSize;
          if (dist <= sightRange) {
            map[ty][tx].fogState = 'visible';
          }
        }
      }
    }

    // Update entity visibility for rendering
    for (const [, entity] of this.engine.state.entities) {
      const tx = Math.floor(entity.position.x / tileSize);
      const ty = Math.floor(entity.position.y / tileSize);
      const tile = map[ty]?.[tx];
      entity.visible = tile ? tile.fogState === 'visible' : false;

      // Always show own entities
      const owner = this.engine.getEntityOwner(entity.id);
      if (owner && owner.id === localPlayer.id) {
        entity.visible = true;
      }
    }
  }
}
