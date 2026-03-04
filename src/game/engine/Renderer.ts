import {
  GameState, Entity, Unit, Building, Projectile,
  Camera, Tile, Vector2, FactionId,
} from './types';
import { FACTION_INFO } from '../data/definitions';

const TERRAIN_COLORS: Record<string, string> = {
  grass: '#4a7c3f',
  dirt: '#8B7355',
  water: '#2E5090',
  mountain: '#6B6B6B',
  swamp: '#5C6B3C',
  meme_zone: '#7B2D8B',
  cursed_ground: '#3C1F1F',
};

const FOG_COLORS = {
  hidden: 'rgba(0, 0, 0, 0.95)',
  explored: 'rgba(0, 0, 0, 0.55)',
  visible: 'rgba(0, 0, 0, 0)',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d')!;
  }

  render(state: GameState): void {
    const { ctx, canvas } = this;
    const cam = state.camera;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    this.renderTerrain(state);
    this.renderEntities(state);
    this.renderSelectionBoxes(state);
    this.renderFogOfWar(state);

    ctx.restore();

    this.renderMinimap(state);
  }

  private renderTerrain(state: GameState): void {
    const { ctx } = this;
    const { map, config, camera } = state;
    const tileSize = config.tileSize;

    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(camera.x / tileSize) - 1);
    const startY = Math.max(0, Math.floor(camera.y / tileSize) - 1);
    const endX = Math.min(config.mapWidth, Math.ceil((camera.x + camera.width / camera.zoom) / tileSize) + 1);
    const endY = Math.min(config.mapHeight, Math.ceil((camera.y + camera.height / camera.zoom) / tileSize) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map[y]?.[x];
        if (!tile) continue;

        const px = x * tileSize;
        const py = y * tileSize;

        // Base terrain
        ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#333';
        ctx.fillRect(px, py, tileSize, tileSize);

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, tileSize, tileSize);

        // Resources
        if (tile.resource && tile.resource.amount > 0) {
          const resourceColors = { copium: '#00BFFF', clout: '#FFD700', tendies: '#FF6347' };
          ctx.fillStyle = resourceColors[tile.resource.type] || '#fff';
          const size = tileSize * 0.6;
          const offset = (tileSize - size) / 2;

          if (tile.resource.type === 'copium') {
            // Crystal-like shape
            ctx.beginPath();
            ctx.moveTo(px + tileSize / 2, py + offset);
            ctx.lineTo(px + tileSize - offset, py + tileSize / 2);
            ctx.lineTo(px + tileSize / 2, py + tileSize - offset);
            ctx.lineTo(px + offset, py + tileSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0088CC';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (tile.resource.type === 'clout') {
            // Round node
            ctx.beginPath();
            ctx.arc(px + tileSize / 2, py + tileSize / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#CC9900';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // Star shape for tendies
            this.drawStar(ctx, px + tileSize / 2, py + tileSize / 2, 5, size / 2, size / 4);
            ctx.fillStyle = '#FF6347';
            ctx.fill();
          }
        }

        // Decorations
        if (tile.decoration === 'tree') {
          ctx.fillStyle = '#2d5a1e';
          ctx.beginPath();
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#5C3317';
          ctx.fillRect(px + tileSize / 2 - 2, py + tileSize / 2 + 4, 4, 8);
        } else if (tile.decoration === 'bush') {
          ctx.fillStyle = '#3a6b2a';
          ctx.beginPath();
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderEntities(state: GameState): void {
    const { ctx } = this;

    // Sort entities: buildings first, then units, then projectiles
    const sortedEntities: Entity[] = [];
    for (const [, entity] of state.entities) {
      if (!entity.visible) continue;
      sortedEntities.push(entity);
    }
    sortedEntities.sort((a, b) => {
      const order = { building: 0, unit: 1, projectile: 2, effect: 3 };
      return (order[a.type] || 0) - (order[b.type] || 0);
    });

    for (const entity of sortedEntities) {
      if (entity.type === 'building') {
        this.renderBuilding(entity as Building, state);
      } else if (entity.type === 'unit') {
        this.renderUnit(entity as Unit, state);
      } else if (entity.type === 'projectile') {
        this.renderProjectile(entity as Projectile);
      }
    }
  }

  private renderBuilding(building: Building, state: GameState): void {
    const { ctx } = this;
    const owner = state.players.find(p => p.entities.includes(building.id));
    const color = owner?.color || '#888';

    const x = building.position.x;
    const y = building.position.y;
    const w = building.size.x;
    const h = building.size.y;

    // Building body
    ctx.fillStyle = color;
    ctx.globalAlpha = building.state === 'constructing' ? 0.5 + (building.buildProgress / 200) : 1;
    ctx.fillRect(x, y, w, h);

    // Building border
    ctx.strokeStyle = building.selected ? '#00FF00' : '#000';
    ctx.lineWidth = building.selected ? 2 : 1;
    ctx.strokeRect(x, y, w, h);

    ctx.globalAlpha = 1;

    // HP bar
    if (building.hp < building.maxHp) {
      this.renderHpBar(x, y - 8, w, building.hp, building.maxHp);
    }

    // Build progress bar
    if (building.state === 'constructing') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y + h + 2, w, 4);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x, y + h + 2, w * (building.buildProgress / 100), 4);
    }

    // Training progress
    if (building.trainQueue.length > 0) {
      const progress = building.trainQueue[0].progress;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y + h + 2, w, 4);
      ctx.fillStyle = '#00BFFF';
      ctx.fillRect(x, y + h + 2, w * (progress / 100), 4);
    }

    // Building label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(building.buildingType.split('_').slice(1).join(' '), x + w / 2, y + h / 2 + 4);
  }

  private renderUnit(unit: Unit, state: GameState): void {
    const { ctx } = this;
    const owner = state.players.find(p => p.entities.includes(unit.id));
    const color = owner?.color || '#888';

    const x = unit.position.x;
    const y = unit.position.y;
    const radius = unit.size.x / 2;

    // Death animation
    if (unit.state === 'dead') {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Unit body - heroes are larger and have a glow
    if (unit.isHero) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    if (unit.isHero) {
      // Hero: diamond shape
      ctx.moveTo(x, y - radius * 1.3);
      ctx.lineTo(x + radius * 1.3, y);
      ctx.lineTo(x, y + radius * 1.3);
      ctx.lineTo(x - radius * 1.3, y);
      ctx.closePath();
    } else {
      // Regular: circle
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Unit border
    ctx.strokeStyle = unit.selected ? '#00FF00' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = unit.selected ? 2 : 1;
    ctx.stroke();

    // Faction marker (small inner circle)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (show where unit is heading)
    if (unit.path.length > 0 && unit.state === 'moving') {
      const target = unit.path[0];
      const angle = Math.atan2(target.y - y, target.x - x);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      ctx.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8));
      ctx.stroke();
    }

    // HP bar
    if (unit.hp < unit.maxHp) {
      this.renderHpBar(x - radius, y - radius - 8, radius * 2, unit.hp, unit.maxHp);
    }

    // Carrying resource indicator
    if (unit.carryingResource) {
      const resColors = { copium: '#00BFFF', clout: '#FFD700', tendies: '#FF6347' };
      ctx.fillStyle = resColors[unit.carryingResource.type];
      ctx.beginPath();
      ctx.arc(x + radius * 0.7, y - radius * 0.7, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hero level badge
    if (unit.isHero && unit.level > 1) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${unit.level}`, x, y - radius - 12);
    }
  }

  private renderProjectile(proj: Projectile): void {
    const { ctx } = this;
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(proj.position.x, proj.position.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FF8800';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderHpBar(x: number, y: number, width: number, hp: number, maxHp: number): void {
    const { ctx } = this;
    const ratio = hp / maxHp;
    const barHeight = 4;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y, width, barHeight);

    ctx.fillStyle = ratio > 0.6 ? '#4CAF50' : ratio > 0.3 ? '#FF9800' : '#F44336';
    ctx.fillRect(x, y, width * ratio, barHeight);
  }

  private renderSelectionBoxes(state: GameState): void {
    const { ctx } = this;

    // Render rally points
    for (const [, entity] of state.entities) {
      if (entity.type !== 'building' || !entity.selected) continue;
      const building = entity as Building;
      if (building.rallyPoint) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(building.position.x + building.size.x / 2, building.position.y + building.size.y / 2);
        ctx.lineTo(building.rallyPoint.x, building.rallyPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rally flag
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(building.rallyPoint.x - 2, building.rallyPoint.y - 10, 2, 12);
        ctx.fillStyle = '#00CC00';
        ctx.fillRect(building.rallyPoint.x, building.rallyPoint.y - 10, 8, 5);
      }
    }
  }

  private renderFogOfWar(state: GameState): void {
    if (!state.config.fogOfWar) return;

    const { ctx } = this;
    const { map, config } = state;
    const tileSize = config.tileSize;
    const cam = state.camera;

    const startX = Math.max(0, Math.floor(cam.x / tileSize) - 1);
    const startY = Math.max(0, Math.floor(cam.y / tileSize) - 1);
    const endX = Math.min(config.mapWidth, Math.ceil((cam.x + cam.width / cam.zoom) / tileSize) + 1);
    const endY = Math.min(config.mapHeight, Math.ceil((cam.y + cam.height / cam.zoom) / tileSize) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map[y]?.[x];
        if (!tile) continue;

        ctx.fillStyle = FOG_COLORS[tile.fogState];
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  private renderMinimap(state: GameState): void {
    const { minimapCtx: ctx, minimapCanvas: canvas } = this;
    const { map, config, entities, camera, players } = state;

    const scaleX = canvas.width / (config.mapWidth * config.tileSize);
    const scaleY = canvas.height / (config.mapHeight * config.tileSize);

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Terrain (simplified)
    const tilePxW = canvas.width / config.mapWidth;
    const tilePxH = canvas.height / config.mapHeight;
    for (let y = 0; y < config.mapHeight; y += 2) {
      for (let x = 0; x < config.mapWidth; x += 2) {
        const tile = map[y]?.[x];
        if (!tile) continue;
        if (tile.fogState === 'hidden') continue;

        ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#333';
        ctx.fillRect(x * tilePxW, y * tilePxH, tilePxW * 2, tilePxH * 2);

        if (tile.resource) {
          const resColors = { copium: '#00BFFF', clout: '#FFD700', tendies: '#FF6347' };
          ctx.fillStyle = resColors[tile.resource.type];
          ctx.fillRect(x * tilePxW, y * tilePxH, tilePxW * 2, tilePxH * 2);
        }
      }
    }

    // Entities as dots
    for (const [, entity] of entities) {
      if (!entity.visible && state.config.fogOfWar) continue;
      const owner = players.find(p => p.entities.includes(entity.id));
      ctx.fillStyle = owner?.color || '#888';

      const ex = entity.position.x * scaleX;
      const ey = entity.position.y * scaleY;
      const size = entity.type === 'building' ? 3 : entity.type === 'unit' ? 2 : 1;
      ctx.fillRect(ex - size / 2, ey - size / 2, size, size);
    }

    // Camera viewport rectangle
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      camera.x * scaleX,
      camera.y * scaleY,
      (camera.width / camera.zoom) * scaleX,
      (camera.height / camera.zoom) * scaleY,
    );
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
