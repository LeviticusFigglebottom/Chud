import {
  GameState, Entity, Unit, Building, Projectile,
  Camera, Tile, Vector2, FactionId,
} from './types';
import { FACTION_INFO } from '../data/definitions';
import { getUnitDefinition, getBuildingDefinition } from '../data/definitions';

// =====================================================
// ENHANCED RENDERER - Detailed procedural graphics
// =====================================================

// --- Color palettes ---
const TERRAIN_BASE: Record<string, string[]> = {
  grass:        ['#3d7a2e', '#4a8c3a', '#3f7532', '#488537', '#447e34'],
  dirt:         ['#7a6240', '#8B7355', '#7e6844', '#85704d', '#6e5838'],
  water:        ['#1a4a7a', '#2055a0', '#1d4f8a', '#235b95', '#18467a'],
  mountain:     ['#5a5a5a', '#6B6B6B', '#636363', '#585858', '#707070'],
  swamp:        ['#3a5028', '#4a5e32', '#3e5430', '#465a34', '#344a22'],
  meme_zone:    ['#5a1a6e', '#6e2480', '#621e74', '#7B2D8B', '#521668'],
  cursed_ground:['#3C1F1F', '#442424', '#382020', '#4a2828', '#341a1a'],
};

const FACTION_PALETTE: Record<string, { primary: string; secondary: string; accent: string; dark: string }> = {
  chuds:     { primary: '#8B4513', secondary: '#6b3410', accent: '#c4a035', dark: '#3a2008' },
  chosen:    { primary: '#DAA520', secondary: '#b8900a', accent: '#FFD700', dark: '#4a3800' },
  crusaders: { primary: '#FF69B4', secondary: '#cc4488', accent: '#FFB6C1', dark: '#5a1030' },
  chads:     { primary: '#FF4500', secondary: '#cc3800', accent: '#FF8C00', dark: '#5a1a00' },
  neutral:   { primary: '#888888', secondary: '#666666', accent: '#aaaaaa', dark: '#333333' },
};

// Per-unit-type color overrides for distinct visual identity
const UNIT_TYPE_COLORS: Record<string, Partial<typeof FACTION_PALETTE.chuds>> = {
  // Chuds
  chud_neet:             { primary: '#8B6530', secondary: '#6b4520', accent: '#a08040' },
  chud_keyboard_warrior: { primary: '#A0522D', secondary: '#804020', accent: '#cc8844' },
  chud_doomer:           { primary: '#2F2F3F', secondary: '#1a1a2a', accent: '#6060a0' },
  chud_reddit_mod:       { primary: '#CC4500', secondary: '#993300', accent: '#FF6633' },
  chud_pepe_lord:        { primary: '#4CAF50', secondary: '#2E7D32', accent: '#81C784' },
  // Chosen
  chosen_merchant:       { primary: '#DAA520', secondary: '#B8900A', accent: '#FFD700' },
  chosen_lawyer:         { primary: '#808890', secondary: '#606870', accent: '#C0C8D0' },
  chosen_media_mogul:    { primary: '#4169E1', secondary: '#2040A0', accent: '#6090FF' },
  chosen_space_laser:    { primary: '#9400D3', secondary: '#6A00A0', accent: '#C060FF' },
  chosen_rothschild:     { primary: '#FFD700', secondary: '#CCA000', accent: '#FFEE44' },
  // Crusaders
  crusader_simp:         { primary: '#FF69B4', secondary: '#CC4488', accent: '#FFB0D0' },
  crusader_paladin:      { primary: '#B0B0C0', secondary: '#808898', accent: '#D0D0E0' },
  crusader_egirl_healer: { primary: '#DA70D6', secondary: '#AA40A6', accent: '#EE90EA' },
  crusader_mega_simp:    { primary: '#FF1493', secondary: '#CC0070', accent: '#FF60B0' },
  crusader_chad_thundercock: { primary: '#FFD700', secondary: '#CCA000', accent: '#FFE844' },
  // Chads
  chad_gym_rat:          { primary: '#FF8C00', secondary: '#CC6600', accent: '#FFB040' },
  chad_bro:              { primary: '#FF4500', secondary: '#CC2200', accent: '#FF7744' },
  chad_protein_shaker:   { primary: '#32CD32', secondary: '#20A020', accent: '#60EE60' },
  chad_sigma:            { primary: '#4B0082', secondary: '#300060', accent: '#8040C0' },
  chad_gigachad:         { primary: '#DAA520', secondary: '#B08010', accent: '#FFCC44' },
};

const FOG_COLORS = {
  hidden: 'rgba(0, 0, 0, 0.95)',
  explored: 'rgba(0, 0, 0, 0.55)',
  visible: 'rgba(0, 0, 0, 0)',
};

// --- Seeded hash for consistent per-tile variation ---
function tileHash(x: number, y: number, salt: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

  // Pre-rendered terrain cache
  private terrainCache: HTMLCanvasElement | null = null;
  private terrainCacheDirty = true;
  private cachedMapW = 0;
  private cachedMapH = 0;

  // Animation state
  private animTime = 0;
  private waterFrame = 0;

  // Building placement preview
  placementPreview: { buildingType: string; worldPos: Vector2; canPlace: boolean } | null = null;

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d')!;
  }

  render(state: GameState): void {
    const { ctx, canvas } = this;
    const cam = state.camera;

    this.animTime += 0.016;
    this.waterFrame = Math.floor(this.animTime * 3) % 8;

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    this.renderTerrain(state);
    this.renderEntities(state);
    this.renderBuildingPlacementPreview(state);
    this.renderSelectionBoxes(state);
    this.renderFogOfWar(state);

    ctx.restore();

    this.renderMinimap(state);
  }

  // =====================================================
  // TERRAIN RENDERING
  // =====================================================
  private renderTerrain(state: GameState): void {
    const { ctx } = this;
    const { map, config, camera } = state;
    const ts = config.tileSize;

    const startX = Math.max(0, Math.floor(camera.x / ts) - 1);
    const startY = Math.max(0, Math.floor(camera.y / ts) - 1);
    const endX = Math.min(config.mapWidth, Math.ceil((camera.x + camera.width / camera.zoom) / ts) + 1);
    const endY = Math.min(config.mapHeight, Math.ceil((camera.y + camera.height / camera.zoom) / ts) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map[y]?.[x];
        if (!tile) continue;

        const px = x * ts;
        const py = y * ts;
        const h = tileHash(x, y);

        this.drawTerrainTile(ctx, tile, px, py, ts, x, y, h);

        // Resources
        if (tile.resource && tile.resource.amount > 0) {
          this.drawResource(ctx, tile, px, py, ts, x, y);
        }

        // Decorations
        if (tile.decoration) {
          this.drawDecoration(ctx, tile.decoration, px, py, ts, h);
        }
      }
    }
  }

  private drawTerrainTile(ctx: CanvasRenderingContext2D, tile: Tile, px: number, py: number, ts: number, tx: number, ty: number, h: number): void {
    const palette = TERRAIN_BASE[tile.terrain] || TERRAIN_BASE.grass;
    const baseIdx = Math.floor(h * palette.length);

    // Base fill
    ctx.fillStyle = palette[baseIdx % palette.length];
    ctx.fillRect(px, py, ts, ts);

    switch (tile.terrain) {
      case 'grass':
        this.drawGrassDetail(ctx, px, py, ts, tx, ty);
        break;
      case 'dirt':
        this.drawDirtDetail(ctx, px, py, ts, tx, ty);
        break;
      case 'water':
        this.drawWaterDetail(ctx, px, py, ts, tx, ty);
        break;
      case 'mountain':
        this.drawMountainDetail(ctx, px, py, ts, tx, ty, h);
        break;
      case 'swamp':
        this.drawSwampDetail(ctx, px, py, ts, tx, ty);
        break;
      case 'meme_zone':
        this.drawMemeZoneDetail(ctx, px, py, ts, tx, ty);
        break;
      case 'cursed_ground':
        this.drawCursedGroundDetail(ctx, px, py, ts, tx, ty);
        break;
    }

    // Subtle tile edge (very subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, ts, ts);
  }

  private drawGrassDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Grass blades
    ctx.strokeStyle = '#5a9e48';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const gx = px + tileHash(tx, ty, i * 10) * ts;
      const gy = py + tileHash(tx, ty, i * 10 + 1) * ts;
      const h = 3 + tileHash(tx, ty, i * 10 + 2) * 5;
      const lean = (tileHash(tx, ty, i * 10 + 3) - 0.5) * 4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + lean, gy - h);
      ctx.stroke();
    }
    // Darker patches
    const patchCount = Math.floor(tileHash(tx, ty, 99) * 3);
    for (let i = 0; i < patchCount; i++) {
      ctx.fillStyle = 'rgba(30,80,20,0.2)';
      const cx = px + tileHash(tx, ty, 200 + i) * ts;
      const cy = py + tileHash(tx, ty, 300 + i) * ts;
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + tileHash(tx, ty, 400 + i) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDirtDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Pebbles
    for (let i = 0; i < 4; i++) {
      const sx = px + tileHash(tx, ty, i * 7) * ts;
      const sy = py + tileHash(tx, ty, i * 7 + 1) * ts;
      const r = 1 + tileHash(tx, ty, i * 7 + 2) * 2;
      ctx.fillStyle = tileHash(tx, ty, i * 7 + 3) > 0.5 ? '#6a5838' : '#9a8868';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cracks
    if (tileHash(tx, ty, 50) > 0.6) {
      ctx.strokeStyle = 'rgba(60,40,20,0.3)';
      ctx.lineWidth = 0.7;
      const cx = px + ts * 0.3;
      const cy = py + ts * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ts * 0.4, cy + ts * 0.2);
      ctx.lineTo(cx + ts * 0.5, cy - ts * 0.1);
      ctx.stroke();
    }
  }

  private drawWaterDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Animated wave highlights
    const waveOffset = (this.animTime * 0.5 + tx * 0.3 + ty * 0.2) % (Math.PI * 2);
    const brightness = 0.1 + Math.sin(waveOffset) * 0.08;

    ctx.fillStyle = `rgba(100,180,255,${brightness})`;
    ctx.fillRect(px, py, ts, ts);

    // Wave lines
    ctx.strokeStyle = `rgba(140,200,255,${0.15 + Math.sin(waveOffset + 1) * 0.1})`;
    ctx.lineWidth = 1;
    const wy = py + ts * 0.3 + Math.sin(waveOffset) * 3;
    ctx.beginPath();
    ctx.moveTo(px, wy);
    ctx.quadraticCurveTo(px + ts * 0.5, wy + 4, px + ts, wy - 1);
    ctx.stroke();

    const wy2 = py + ts * 0.7 + Math.sin(waveOffset + 2) * 3;
    ctx.beginPath();
    ctx.moveTo(px, wy2);
    ctx.quadraticCurveTo(px + ts * 0.5, wy2 - 3, px + ts, wy2 + 2);
    ctx.stroke();

    // Foam dots
    if (tileHash(tx, ty, 88) > 0.7) {
      ctx.fillStyle = 'rgba(200,230,255,0.2)';
      ctx.beginPath();
      ctx.arc(px + ts * 0.5 + Math.sin(waveOffset * 0.5) * 3, py + ts * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMountainDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number, h: number): void {
    // Rocky triangular peak
    const peakH = ts * (0.5 + h * 0.3);
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.moveTo(px + ts * 0.2, py + ts);
    ctx.lineTo(px + ts * 0.5 + (h - 0.5) * 6, py + ts - peakH);
    ctx.lineTo(px + ts * 0.8, py + ts);
    ctx.closePath();
    ctx.fill();

    // Snow cap
    if (h > 0.4) {
      ctx.fillStyle = '#c8c8c8';
      ctx.beginPath();
      ctx.moveTo(px + ts * 0.35, py + ts - peakH * 0.6);
      ctx.lineTo(px + ts * 0.5 + (h - 0.5) * 6, py + ts - peakH);
      ctx.lineTo(px + ts * 0.65, py + ts - peakH * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // Shadow side
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(px + ts * 0.5 + (h - 0.5) * 6, py + ts - peakH);
    ctx.lineTo(px + ts * 0.8, py + ts);
    ctx.lineTo(px + ts * 0.55, py + ts);
    ctx.closePath();
    ctx.fill();

    // Rock outcrops
    ctx.fillStyle = '#555';
    for (let i = 0; i < 2; i++) {
      const rx = px + tileHash(tx, ty, 60 + i) * ts * 0.8 + ts * 0.1;
      const ry = py + ts * 0.7 + tileHash(tx, ty, 70 + i) * ts * 0.25;
      ctx.beginPath();
      ctx.arc(rx, ry, 2 + tileHash(tx, ty, 80 + i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSwampDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Murky water patches
    ctx.fillStyle = 'rgba(30,50,20,0.3)';
    const pools = Math.floor(tileHash(tx, ty, 30) * 3) + 1;
    for (let i = 0; i < pools; i++) {
      const sx = px + tileHash(tx, ty, i * 5 + 100) * ts;
      const sy = py + tileHash(tx, ty, i * 5 + 101) * ts;
      const r = 3 + tileHash(tx, ty, i * 5 + 102) * 5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bubbles (animated)
    if (tileHash(tx, ty, 55) > 0.6) {
      const bx = px + tileHash(tx, ty, 56) * ts;
      const by = py + tileHash(tx, ty, 57) * ts;
      const bubbleR = 1.5 + Math.sin(this.animTime * 2 + tx + ty) * 0.5;
      ctx.strokeStyle = 'rgba(80,100,60,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(bx, by, bubbleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dead grass/reed
    ctx.strokeStyle = '#5a6838';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rx = px + tileHash(tx, ty, 40 + i) * ts;
      const ry = py + tileHash(tx, ty, 41 + i) * ts;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 2, ry - 6);
      ctx.stroke();
    }
  }

  private drawMemeZoneDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Glowing pulse
    const pulse = 0.1 + Math.sin(this.animTime * 1.5 + tx * 0.5 + ty * 0.3) * 0.08;
    ctx.fillStyle = `rgba(160,60,200,${pulse})`;
    ctx.fillRect(px, py, ts, ts);

    // Rune-like symbols
    ctx.strokeStyle = `rgba(200,120,255,${0.2 + pulse})`;
    ctx.lineWidth = 1;
    const cx = px + ts / 2;
    const cy = py + ts / 2;
    const r = ts * 0.3;

    // Rune circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner cross pattern
    const runeType = Math.floor(tileHash(tx, ty, 0) * 4);
    ctx.beginPath();
    if (runeType === 0) {
      ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx + r * 0.5, cy);
      ctx.moveTo(cx, cy - r * 0.5); ctx.lineTo(cx, cy + r * 0.5);
    } else if (runeType === 1) {
      ctx.moveTo(cx - r * 0.5, cy - r * 0.5); ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
      ctx.moveTo(cx + r * 0.5, cy - r * 0.5); ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
    } else if (runeType === 2) {
      for (let a = 0; a < 3; a++) {
        const angle = (a / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.6, cy + Math.sin(angle) * r * 0.6);
      }
    } else {
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Sparkle particles
    if (tileHash(tx, ty, 77) > 0.5) {
      const sparkX = px + (tileHash(tx, ty, 78) + Math.sin(this.animTime + tx) * 0.1) * ts;
      const sparkY = py + (tileHash(tx, ty, 79) + Math.cos(this.animTime + ty) * 0.1) * ts;
      ctx.fillStyle = `rgba(220,180,255,${0.3 + Math.sin(this.animTime * 3) * 0.2})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCursedGroundDetail(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number): void {
    // Dark cracks
    ctx.strokeStyle = 'rgba(80,20,20,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x1 = px + tileHash(tx, ty, i * 3) * ts;
      const y1 = py + tileHash(tx, ty, i * 3 + 1) * ts;
      const x2 = px + tileHash(tx, ty, i * 3 + 50) * ts;
      const y2 = py + tileHash(tx, ty, i * 3 + 51) * ts;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Red glow spots
    if (tileHash(tx, ty, 90) > 0.6) {
      const gx = px + tileHash(tx, ty, 91) * ts;
      const gy = py + tileHash(tx, ty, 92) * ts;
      const glow = 0.15 + Math.sin(this.animTime * 0.8 + tx + ty) * 0.1;
      ctx.fillStyle = `rgba(150,30,30,${glow})`;
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =====================================================
  // RESOURCE RENDERING
  // =====================================================
  private drawResource(ctx: CanvasRenderingContext2D, tile: Tile, px: number, py: number, ts: number, tx: number, ty: number): void {
    const res = tile.resource!;
    const fillRatio = res.amount / res.maxAmount;

    if (res.type === 'copium') {
      this.drawCopiumCrystal(ctx, px, py, ts, tx, ty, fillRatio);
    } else if (res.type === 'clout') {
      this.drawCloutNode(ctx, px, py, ts, tx, ty, fillRatio);
    } else {
      this.drawTendiesNode(ctx, px, py, ts, tx, ty, fillRatio);
    }
  }

  private drawCopiumCrystal(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number, fill: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2;
    const glow = 0.2 + Math.sin(this.animTime * 2 + tx) * 0.1;

    // Glow
    ctx.fillStyle = `rgba(0,150,255,${glow * fill})`;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Main crystal
    const crystals = [
      { dx: 0, dy: 0, h: ts * 0.4, w: ts * 0.12 },
      { dx: -ts * 0.12, dy: ts * 0.05, h: ts * 0.28, w: ts * 0.08 },
      { dx: ts * 0.1, dy: ts * 0.08, h: ts * 0.32, w: ts * 0.09 },
    ];

    for (const c of crystals) {
      const bx = cx + c.dx;
      const by = cy + c.dy;
      // Crystal body
      ctx.fillStyle = `rgba(40,160,240,${0.7 * fill + 0.3})`;
      ctx.beginPath();
      ctx.moveTo(bx - c.w, by + c.h * 0.3);
      ctx.lineTo(bx, by - c.h * 0.7);
      ctx.lineTo(bx + c.w, by + c.h * 0.3);
      ctx.lineTo(bx, by + c.h * 0.3);
      ctx.closePath();
      ctx.fill();

      // Highlight edge
      ctx.strokeStyle = `rgba(150,220,255,${0.5 * fill + 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(bx - c.w, by + c.h * 0.3);
      ctx.lineTo(bx, by - c.h * 0.7);
      ctx.stroke();
    }
  }

  private drawCloutNode(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number, fill: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2;

    // Golden glow
    const glow = 0.15 + Math.sin(this.animTime * 1.5 + ty) * 0.08;
    ctx.fillStyle = `rgba(255,215,0,${glow * fill})`;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Tree trunk
    ctx.fillStyle = '#5C4318';
    ctx.fillRect(cx - 2, cy + 2, 4, ts * 0.3);

    // Golden canopy (multiple layers)
    const colors = ['#B8860B', '#DAA520', '#FFD700'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = fill * 0.7 + 0.3;
      ctx.beginPath();
      ctx.arc(cx + (i - 1) * 3, cy - 2 - i * 2, ts * (0.2 - i * 0.02), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Sparkle
    ctx.fillStyle = `rgba(255,255,200,${0.4 + Math.sin(this.animTime * 3 + tx + ty) * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTendiesNode(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number, fill: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2;

    // Warm glow
    const glow = 0.15 + Math.sin(this.animTime * 1.8 + tx + ty) * 0.08;
    ctx.fillStyle = `rgba(255,100,50,${glow * fill})`;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Chicken nugget shapes
    const nuggets = [
      { dx: 0, dy: -2, rx: 5, ry: 3.5 },
      { dx: -4, dy: 3, rx: 4, ry: 3 },
      { dx: 5, dy: 2, rx: 4.5, ry: 3 },
    ];

    for (const n of nuggets) {
      // Shadow
      ctx.fillStyle = 'rgba(80,30,10,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx + n.dx, cy + n.dy + 2, n.rx, n.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nugget body
      ctx.fillStyle = `rgba(220,160,60,${fill * 0.7 + 0.3})`;
      ctx.beginPath();
      ctx.ellipse(cx + n.dx, cy + n.dy, n.rx, n.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crispy highlight
      ctx.strokeStyle = `rgba(255,200,100,${fill * 0.5 + 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx + n.dx - 1, cy + n.dy - 1, n.rx * 0.5, 0, Math.PI);
      ctx.stroke();
    }
  }

  // =====================================================
  // DECORATION RENDERING
  // =====================================================
  private drawDecoration(ctx: CanvasRenderingContext2D, type: string, px: number, py: number, ts: number, h: number): void {
    switch (type) {
      case 'tree': this.drawTree(ctx, px, py, ts, h); break;
      case 'bush': this.drawBush(ctx, px, py, ts, h); break;
      case 'flowers': this.drawFlowers(ctx, px, py, ts, h); break;
      case 'rocks': this.drawRocks(ctx, px, py, ts, h); break;
      case 'mushrooms': this.drawMushrooms(ctx, px, py, ts, h); break;
      case 'bones': this.drawBones(ctx, px, py, ts, h); break;
      case 'fallen_log': this.drawFallenLog(ctx, px, py, ts, h); break;
      case 'reeds': this.drawReeds(ctx, px, py, ts, h); break;
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const cx = px + ts / 2;
    const base = py + ts * 0.85;

    // Trunk
    const trunkW = 3 + h * 2;
    ctx.fillStyle = '#4a3218';
    ctx.fillRect(cx - trunkW / 2, base - ts * 0.35, trunkW, ts * 0.35);

    // Trunk bark lines
    ctx.strokeStyle = '#3a2510';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 1, base); ctx.lineTo(cx - 1, base - ts * 0.3);
    ctx.moveTo(cx + 1, base - ts * 0.1); ctx.lineTo(cx + 1, base - ts * 0.25);
    ctx.stroke();

    // Canopy layers (triangles like a pine tree)
    const layers = [
      { y: base - ts * 0.35, w: ts * 0.35, color: '#1a4a12' },
      { y: base - ts * 0.52, w: ts * 0.28, color: '#226618' },
      { y: base - ts * 0.68, w: ts * 0.2, color: '#2a7a20' },
    ];

    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(cx - layer.w, layer.y + ts * 0.15);
      ctx.lineTo(cx, layer.y - ts * 0.05);
      ctx.lineTo(cx + layer.w, layer.y + ts * 0.15);
      ctx.closePath();
      ctx.fill();
    }

    // Shadow on right side of canopy
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx, layers[0].y - ts * 0.05);
    ctx.lineTo(cx + layers[0].w, layers[0].y + ts * 0.15);
    ctx.lineTo(cx, layers[0].y + ts * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  private drawBush(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2 + 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, ts * 0.22, ts * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bush body (overlapping circles)
    const parts = [
      { dx: -3, dy: 0, r: ts * 0.14, color: '#2a5a1a' },
      { dx: 3, dy: -1, r: ts * 0.13, color: '#326820' },
      { dx: 0, dy: -3, r: ts * 0.15, color: '#3a7828' },
    ];

    for (const p of parts) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + p.dx, cy + p.dy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight spot
    ctx.fillStyle = 'rgba(100,180,60,0.2)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const colors = ['#e04080', '#e0e040', '#8040e0', '#40a0e0', '#e08040'];
    for (let i = 0; i < 4; i++) {
      const fx = px + (0.2 + h * 0.1 + i * 0.18) * ts;
      const fy = py + (0.3 + (i % 2) * 0.4) * ts;
      // Stem
      ctx.strokeStyle = '#3a7020';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      // Petals
      ctx.fillStyle = colors[(i + Math.floor(h * 5)) % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Center
      ctx.fillStyle = '#e0e060';
      ctx.beginPath();
      ctx.arc(fx, fy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRocks(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2 + 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, ts * 0.2, ts * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rocks
    const rocks = [
      { dx: -3, dy: 0, rx: 5, ry: 4, c: '#808080' },
      { dx: 4, dy: 1, rx: 4, ry: 3, c: '#707070' },
      { dx: 0, dy: -2, rx: 3.5, ry: 3, c: '#909090' },
    ];
    for (const r of rocks) {
      ctx.fillStyle = r.c;
      ctx.beginPath();
      ctx.ellipse(cx + r.dx, cy + r.dy, r.rx, r.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(cx + r.dx - 1, cy + r.dy - 1, r.rx * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMushrooms(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const spots = [
      { dx: ts * 0.3, dy: ts * 0.5 },
      { dx: ts * 0.6, dy: ts * 0.4 },
      { dx: ts * 0.45, dy: ts * 0.7 },
    ];
    for (const s of spots) {
      const mx = px + s.dx;
      const my = py + s.dy;
      // Stem
      ctx.fillStyle = '#d0c8a0';
      ctx.fillRect(mx - 1, my - 2, 2, 4);
      // Cap
      ctx.fillStyle = h > 0.5 ? '#c03030' : '#a06030';
      ctx.beginPath();
      ctx.arc(mx, my - 3, 3.5, Math.PI, 0);
      ctx.fill();
      // Dots on cap
      ctx.fillStyle = '#e0e0d0';
      ctx.beginPath();
      ctx.arc(mx - 1, my - 4, 0.8, 0, Math.PI * 2);
      ctx.arc(mx + 1.5, my - 3.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBones(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2;
    ctx.strokeStyle = '#c0b890';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // Bone 1
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 2);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.stroke();
    // Bone ends
    ctx.fillStyle = '#c0b890';
    for (const [bx, by] of [[cx - 6, cy - 2], [cx + 6, cy + 2]]) {
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1, 1.5, 0, Math.PI * 2);
      ctx.arc(bx + 1, by + 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bone 2 (crossing)
    if (h > 0.3) {
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 4);
      ctx.lineTo(cx + 4, cy - 4);
      ctx.stroke();
    }
  }

  private drawFallenLog(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const cx = px + ts / 2;
    const cy = py + ts / 2 + 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, ts * 0.35, ts * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // Log body
    ctx.fillStyle = '#5a4020';
    ctx.beginPath();
    ctx.ellipse(cx, cy, ts * 0.32, ts * 0.08, h * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Bark texture
    ctx.strokeStyle = '#3a2810';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const lx = cx - ts * 0.2 + i * ts * 0.15;
      ctx.beginPath();
      ctx.moveTo(lx, cy - 2);
      ctx.lineTo(lx, cy + 2);
      ctx.stroke();
    }
    // End ring
    ctx.strokeStyle = '#6a5030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx + ts * 0.3, cy, ts * 0.04, ts * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawReeds(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, h: number): void {
    const sway = Math.sin(this.animTime * 1.5 + px * 0.1) * 2;
    for (let i = 0; i < 5; i++) {
      const rx = px + (0.2 + i * 0.15) * ts;
      const ry = py + ts * 0.85;
      const rh = 8 + h * 6 + i * 1.5;
      ctx.strokeStyle = i % 2 === 0 ? '#6a7840' : '#5a6830';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + sway, ry - rh * 0.6, rx + sway * 1.2, ry - rh);
      ctx.stroke();
      // Cattail tip on some
      if (i % 2 === 0) {
        ctx.fillStyle = '#5a3820';
        ctx.beginPath();
        ctx.ellipse(rx + sway * 1.2, ry - rh - 2, 1.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // =====================================================
  // ENTITY RENDERING
  // =====================================================
  private renderEntities(state: GameState): void {
    const sortedEntities: Entity[] = [];
    for (const [, entity] of state.entities) {
      if (!entity.visible) continue;
      sortedEntities.push(entity);
    }
    // Sort by y position for depth, buildings first
    sortedEntities.sort((a, b) => {
      const order = { building: 0, unit: 1, projectile: 2, effect: 3 };
      const orderDiff = (order[a.type] || 0) - (order[b.type] || 0);
      if (orderDiff !== 0) return orderDiff;
      return a.position.y - b.position.y;
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

  // =====================================================
  // BUILDING RENDERING
  // =====================================================
  private renderBuilding(building: Building, state: GameState): void {
    const { ctx } = this;
    const owner = state.players.find(p => p.entities.includes(building.id));
    const palette = FACTION_PALETTE[owner?.faction || 'neutral'];
    const color = owner?.color || '#888';

    const x = building.position.x;
    const y = building.position.y;
    const w = building.size.x;
    const h = building.size.y;
    const isConstructing = building.state === 'constructing';

    ctx.globalAlpha = isConstructing ? 0.4 + (building.buildProgress / 200) : 1;

    const def = getBuildingDefinition(building.buildingType);
    const isMain = def?.isResourceDrop && (def?.trains.length || 0) > 0 && w >= 80;

    if (isMain) {
      this.drawMainBuilding(ctx, x, y, w, h, palette, building);
    } else if (w >= 64) {
      this.drawLargeBuilding(ctx, x, y, w, h, palette, building);
    } else {
      this.drawSmallBuilding(ctx, x, y, w, h, palette, building);
    }

    ctx.globalAlpha = 1;

    // Selection highlight
    if (building.selected) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
    }

    // HP bar
    if (building.hp < building.maxHp || isConstructing) {
      this.renderHpBar(x, y - 10, w, building.hp, building.maxHp);
    }

    // Build progress bar
    if (isConstructing) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y + h + 3, w, 5);
      ctx.fillStyle = '#c4a035';
      ctx.fillRect(x + 1, y + h + 4, (w - 2) * (building.buildProgress / 100), 3);
    }

    // Training progress
    if (building.trainQueue.length > 0) {
      const progress = building.trainQueue[0].progress;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y + h + 3, w, 5);
      ctx.fillStyle = '#00BFFF';
      ctx.fillRect(x + 1, y + h + 4, (w - 2) * (progress / 100), 3);
    }

    // Building label
    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      (def?.name || building.buildingType.split('_').slice(1).join(' ')).substring(0, 14),
      x + w / 2, y + h / 2 + 3
    );
  }

  private drawMainBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pal: typeof FACTION_PALETTE.chuds, building: Building): void {
    // Foundation shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 4, y + h - 4, w, 8);

    // Stone foundation
    ctx.fillStyle = '#4a4035';
    ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
    ctx.strokeStyle = '#3a3028';
    ctx.lineWidth = 1;
    // Foundation stone lines
    for (let i = 0; i < 4; i++) {
      const sy = y + h * 0.7 + i * (h * 0.075);
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke();
    }

    // Main walls
    const wallGrad = ctx.createLinearGradient(x, y, x + w, y);
    wallGrad.addColorStop(0, pal.dark);
    wallGrad.addColorStop(0.5, pal.primary);
    wallGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x + 4, y + h * 0.15, w - 8, h * 0.55);

    // Roof
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + h * 0.18);
    ctx.lineTo(x + w / 2, y - 4);
    ctx.lineTo(x + w + 4, y + h * 0.18);
    ctx.closePath();
    ctx.fill();

    // Roof shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 4);
    ctx.lineTo(x + w + 4, y + h * 0.18);
    ctx.lineTo(x + w / 2, y + h * 0.18);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = '#2a1a0a';
    const doorW = w * 0.15;
    const doorH = h * 0.22;
    ctx.fillRect(x + w / 2 - doorW / 2, y + h * 0.48, doorW, doorH);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x + w / 2 - 1, y + h * 0.48 + doorH * 0.4, 2, 3);

    // Windows
    ctx.fillStyle = '#3a5a8a';
    const winSize = 6;
    ctx.fillRect(x + w * 0.25 - winSize / 2, y + h * 0.32, winSize, winSize);
    ctx.fillRect(x + w * 0.75 - winSize / 2, y + h * 0.32, winSize, winSize);
    // Window glow
    ctx.fillStyle = `rgba(255,200,100,${0.2 + Math.sin(this.animTime + building.position.x) * 0.1})`;
    ctx.fillRect(x + w * 0.25 - winSize / 2, y + h * 0.32, winSize, winSize);
    ctx.fillRect(x + w * 0.75 - winSize / 2, y + h * 0.32, winSize, winSize);

    // Faction banner
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x + w / 2 - 3, y + h * 0.05, 6, 14);
    ctx.fillStyle = pal.primary;
    ctx.fillRect(x + w / 2 - 2, y + h * 0.05 + 2, 4, 10);

    // Battlements/towers at corners
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x - 2, y + h * 0.1, 10, h * 0.2);
    ctx.fillRect(x + w - 8, y + h * 0.1, 10, h * 0.2);

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y + h * 0.15, w, h * 0.85);
  }

  private drawLargeBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pal: typeof FACTION_PALETTE.chuds, building: Building): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, y + h - 2, w, 6);

    // Base
    ctx.fillStyle = '#4a4035';
    ctx.fillRect(x, y + h * 0.75, w, h * 0.25);

    // Walls
    const wallGrad = ctx.createLinearGradient(x, y, x, y + h);
    wallGrad.addColorStop(0, pal.primary);
    wallGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x + 2, y + h * 0.2, w - 4, h * 0.55);

    // Roof
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h * 0.22);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w + 2, y + h * 0.22);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x + w / 2 - 5, y + h * 0.55, 10, h * 0.2);

    // Windows
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(x + w * 0.25 - 3, y + h * 0.35, 5, 5);
    ctx.fillRect(x + w * 0.75 - 3, y + h * 0.35, 5, 5);

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + h * 0.2, w, h * 0.8);
  }

  private drawSmallBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pal: typeof FACTION_PALETTE.chuds, building: Building): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 2, y + h - 2, w, 5);

    // Simple structure
    ctx.fillStyle = pal.primary;
    ctx.fillRect(x, y + h * 0.3, w, h * 0.7);

    // Roof
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h * 0.32);
    ctx.lineTo(x + w / 2, y + h * 0.05);
    ctx.lineTo(x + w + 2, y + h * 0.32);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x + w / 2 - 4, y + h * 0.6, 8, h * 0.35);

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + h * 0.3, w, h * 0.7);
  }

  // =====================================================
  // UNIT RENDERING
  // =====================================================
  private renderUnit(unit: Unit, state: GameState): void {
    const { ctx } = this;
    const owner = state.players.find(p => p.entities.includes(unit.id));
    const palette = FACTION_PALETTE[owner?.faction || 'neutral'];
    const color = owner?.color || '#888';

    const x = unit.position.x;
    const y = unit.position.y;
    const radius = unit.size.x / 2;

    // Death
    if (unit.state === 'dead') {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, radius, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Walking bob animation
    const bob = (unit.state === 'moving' || unit.state === 'patrolling')
      ? Math.sin(this.animTime * 8 + unit.position.x) * 1.5 : 0;

    // Attack flash
    const isAttacking = unit.state === 'attacking' && unit.attackCooldown > unit.attackSpeed * 0.7;
    const attackFlash = isAttacking ? 0.3 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.8, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const unitDef = getUnitDefinition(unit.unitType);

    // Unit-type-specific drawing with unique colors and details per type
    const unitColors = UNIT_TYPE_COLORS[unit.unitType];
    const drawPalette = unitColors ? { ...palette, ...unitColors } : palette;

    if (unit.isHero) {
      this.drawHeroUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
    } else {
      // Dispatch by specific unit type for unique silhouettes
      switch (unit.unitType) {
        // Workers
        case 'chud_neet':
        case 'chosen_merchant':
        case 'crusader_simp':
        case 'chad_gym_rat':
          this.drawWorkerUnit(ctx, x, y + bob, radius, drawPalette, unit);
          break;
        // Melee
        case 'chud_keyboard_warrior':
        case 'crusader_paladin':
        case 'chad_bro':
          this.drawMeleeUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
          break;
        // Ranged/Caster
        case 'chud_doomer':
        case 'chosen_lawyer':
        case 'chosen_media_mogul':
        case 'chad_protein_shaker':
        case 'crusader_egirl_healer':
          this.drawRangedUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
          break;
        // Siege/Elite
        case 'chud_reddit_mod':
        case 'chosen_space_laser':
        case 'crusader_mega_simp':
        case 'chad_sigma':
          this.drawSiegeUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
          break;
        default: {
          // Fallback category-based
          const isWorker = unitDef && !unitDef.isHero && unitDef.damage <= 12;
          const isRanged = unitDef && unitDef.attackRange > 100;
          const isSiege = unitDef && unitDef.populationCost >= 4;
          if (isWorker) this.drawWorkerUnit(ctx, x, y + bob, radius, drawPalette, unit);
          else if (isSiege) this.drawSiegeUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
          else if (isRanged) this.drawRangedUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
          else this.drawMeleeUnit(ctx, x, y + bob, radius, drawPalette, unit, attackFlash);
        }
      }
    }

    // Unit name label (visible when selected or hovered nearby)
    if (unit.selected && unitDef) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(unitDef.name, x, y + radius + 12 + bob);
    }

    // Selection ring
    if (unit.selected) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.ellipse(x, y + radius * 0.5, radius + 3, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Direction indicator
    if (unit.path.length > 0 && (unit.state === 'moving' || unit.state === 'patrolling')) {
      const target = unit.path[0];
      const angle = Math.atan2(target.y - y, target.x - x);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (radius + 2), y + Math.sin(angle) * (radius + 2));
      ctx.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8));
      ctx.stroke();
    }

    // HP bar
    if (unit.hp < unit.maxHp) {
      this.renderHpBar(x - radius, y - radius - 10, radius * 2, unit.hp, unit.maxHp);
    }

    // Carrying resource indicator
    if (unit.carryingResource) {
      const resColors = { copium: '#00BFFF', clout: '#FFD700', tendies: '#FF6347' };
      ctx.fillStyle = resColors[unit.carryingResource.type];
      ctx.beginPath();
      ctx.arc(x + radius * 0.6, y - radius * 0.6 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Hero level badge
    if (unit.isHero && unit.level > 1) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${unit.level}`, x, y - radius - 14);
    }
  }

  private drawHeroUnit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: typeof FACTION_PALETTE.chuds, unit: Unit, flash: number): void {
    const hr = r * 1.2;

    // Hero glow aura
    ctx.fillStyle = `rgba(255,215,0,${0.08 + Math.sin(this.animTime * 2) * 0.04})`;
    ctx.beginPath();
    ctx.arc(x, y, hr + 6, 0, Math.PI * 2);
    ctx.fill();

    // Cape
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.moveTo(x - hr * 0.4, y - hr * 0.3);
    ctx.quadraticCurveTo(x - hr * 0.8, y + hr * 0.5 + Math.sin(this.animTime * 3) * 2, x - hr * 0.2, y + hr);
    ctx.lineTo(x + hr * 0.2, y + hr);
    ctx.quadraticCurveTo(x + hr * 0.3, y + hr * 0.3, x + hr * 0.4, y - hr * 0.3);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(x - hr * 0.35, y + hr * 0.5);
    ctx.lineTo(x - hr * 0.25, y - hr * 0.15);
    ctx.lineTo(x + hr * 0.25, y - hr * 0.15);
    ctx.lineTo(x + hr * 0.35, y + hr * 0.5);
    ctx.closePath();
    ctx.fill();

    // Shoulders
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x - hr * 0.4, y - hr * 0.2, hr * 0.8, hr * 0.12);

    // Head
    ctx.fillStyle = '#d4aa70';
    ctx.beginPath();
    ctx.arc(x, y - hr * 0.35, hr * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Crown/helmet
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(x - hr * 0.2, y - hr * 0.45);
    ctx.lineTo(x - hr * 0.15, y - hr * 0.65);
    ctx.lineTo(x, y - hr * 0.55);
    ctx.lineTo(x + hr * 0.15, y - hr * 0.65);
    ctx.lineTo(x + hr * 0.2, y - hr * 0.45);
    ctx.closePath();
    ctx.fill();

    // Weapon (right side)
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + hr * 0.4, y);
    ctx.lineTo(x + hr * 0.7, y - hr * 0.6);
    ctx.stroke();
    // Weapon head
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(x + hr * 0.7, y - hr * 0.65, 3, 0, Math.PI * 2);
    ctx.fill();

    // Attack flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${flash})`;
      ctx.beginPath();
      ctx.arc(x, y, hr + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawWorkerUnit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: typeof FACTION_PALETTE.chuds, unit: Unit): void {
    // Body (squat figure)
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.5);
    ctx.lineTo(x - r * 0.3, y - r * 0.1);
    ctx.lineTo(x + r * 0.3, y - r * 0.1);
    ctx.lineTo(x + r * 0.4, y + r * 0.5);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#d4aa70';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hat/cap
    ctx.fillStyle = pal.secondary;
    ctx.fillRect(x - r * 0.25, y - r * 0.42, r * 0.5, r * 0.12);

    // Tool (pickaxe)
    ctx.strokeStyle = '#8a7040';
    ctx.lineWidth = 1.5;
    const toolAngle = unit.state === 'gathering'
      ? Math.sin(this.animTime * 4) * 0.5 : 0.3;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.3, y + r * 0.1);
    ctx.lineTo(
      x + r * 0.3 + Math.cos(-0.8 + toolAngle) * r * 0.6,
      y + r * 0.1 + Math.sin(-0.8 + toolAngle) * r * 0.6
    );
    ctx.stroke();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawMeleeUnit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: typeof FACTION_PALETTE.chuds, unit: Unit, flash: number): void {
    // Body (sturdier)
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.5);
    ctx.lineTo(x - r * 0.35, y - r * 0.2);
    ctx.lineTo(x + r * 0.35, y - r * 0.2);
    ctx.lineTo(x + r * 0.4, y + r * 0.5);
    ctx.closePath();
    ctx.fill();

    // Shoulders/armor
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x - r * 0.4, y - r * 0.2, r * 0.8, r * 0.15);

    // Head
    ctx.fillStyle = '#d4aa70';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.32, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.37, r * 0.16, Math.PI, Math.PI * 2);
    ctx.fill();

    // Shield (left)
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.45, y + r * 0.05, r * 0.12, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Sword (right)
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    const swingAngle = flash > 0 ? -1.2 : -0.6;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.35, y);
    ctx.lineTo(
      x + r * 0.35 + Math.cos(swingAngle) * r * 0.7,
      y + Math.sin(swingAngle) * r * 0.7
    );
    ctx.stroke();

    // Attack flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${flash * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawRangedUnit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: typeof FACTION_PALETTE.chuds, unit: Unit, flash: number): void {
    // Body (slimmer)
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.5);
    ctx.lineTo(x - r * 0.25, y - r * 0.15);
    ctx.lineTo(x + r * 0.25, y - r * 0.15);
    ctx.lineTo(x + r * 0.3, y + r * 0.5);
    ctx.closePath();
    ctx.fill();

    // Cloak/robe
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.35, y - r * 0.1);
    ctx.lineTo(x - r * 0.5, y + r * 0.5);
    ctx.lineTo(x + r * 0.5, y + r * 0.5);
    ctx.lineTo(x + r * 0.35, y - r * 0.1);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#d4aa70';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.28, r * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.32, r * 0.2, Math.PI * 0.8, Math.PI * 2.2);
    ctx.closePath();
    ctx.fill();

    // Staff/bow
    ctx.strokeStyle = '#8a6a30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.2, y + r * 0.4);
    ctx.lineTo(x + r * 0.15, y - r * 0.6);
    ctx.stroke();

    // Staff orb
    ctx.fillStyle = flash > 0 ? '#fff' : pal.accent;
    ctx.beginPath();
    ctx.arc(x + r * 0.15, y - r * 0.65, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Attack flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(200,150,255,${flash * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawSiegeUnit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: typeof FACTION_PALETTE.chuds, unit: Unit, flash: number): void {
    const sr = r * 1.1;

    // Body (bulky)
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(x - sr * 0.5, y + sr * 0.5);
    ctx.lineTo(x - sr * 0.45, y - sr * 0.25);
    ctx.lineTo(x + sr * 0.45, y - sr * 0.25);
    ctx.lineTo(x + sr * 0.5, y + sr * 0.5);
    ctx.closePath();
    ctx.fill();

    // Armor plates
    ctx.fillStyle = pal.primary;
    ctx.fillRect(x - sr * 0.4, y - sr * 0.2, sr * 0.8, sr * 0.25);
    ctx.fillRect(x - sr * 0.35, y + sr * 0.1, sr * 0.7, sr * 0.15);

    // Head
    ctx.fillStyle = '#d4aa70';
    ctx.beginPath();
    ctx.arc(x, y - sr * 0.35, sr * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Heavy helmet
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(x, y - sr * 0.4, sr * 0.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x - 1, y - sr * 0.55, 2, sr * 0.12); // helmet crest

    // Weapon (large)
    ctx.fillStyle = '#888';
    ctx.save();
    ctx.translate(x + sr * 0.4, y - sr * 0.1);
    ctx.rotate(flash > 0 ? -0.8 : -0.3);
    ctx.fillRect(-2, -sr * 0.5, 4, sr * 0.6);
    // Weapon head
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-5, -sr * 0.5, 10, 6);
    ctx.restore();

    // Attack flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,200,100,${flash * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, sr + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, sr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // =====================================================
  // PROJECTILE RENDERING
  // =====================================================
  private renderProjectile(proj: Projectile): void {
    const { ctx } = this;
    const x = proj.position.x;
    const y = proj.position.y;

    // Trail
    const angle = Math.atan2(proj.targetPos.y - y, proj.targetPos.x - x);
    const trailLen = 8;
    ctx.strokeStyle = 'rgba(255,120,40,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(angle) * trailLen, y - Math.sin(angle) * trailLen);
    ctx.stroke();

    // Glow
    ctx.fillStyle = 'rgba(255,150,50,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#FF6644';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#FFcc88';
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // =====================================================
  // UI ELEMENTS
  // =====================================================
  private renderHpBar(x: number, y: number, width: number, hp: number, maxHp: number): void {
    const { ctx } = this;
    const ratio = hp / maxHp;
    const barHeight = 4;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 1, y - 1, width + 2, barHeight + 2);

    // Bar
    ctx.fillStyle = ratio > 0.6 ? '#4CAF50' : ratio > 0.3 ? '#FF9800' : '#F44336';
    ctx.fillRect(x, y, width * ratio, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 1, y - 1, width + 2, barHeight + 2);
  }

  // Building placement ghost with green/red tile grid
  private renderBuildingPlacementPreview(state: GameState): void {
    if (!this.placementPreview) return;
    const { ctx } = this;
    const { buildingType, worldPos, canPlace } = this.placementPreview;
    const def = getBuildingDefinition(buildingType);
    if (!def) return;

    const tileSize = state.config.tileSize;
    const bw = def.size.x;
    const bh = def.size.y;
    const bx = worldPos.x;
    const by = worldPos.y;

    // Draw tile grid overlay
    const startTX = Math.floor(bx / tileSize);
    const startTY = Math.floor(by / tileSize);
    const endTX = Math.ceil((bx + bw) / tileSize);
    const endTY = Math.ceil((by + bh) / tileSize);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tile = state.map[ty]?.[tx];
        const tileOk = tile && tile.buildable;
        ctx.fillStyle = tileOk ? 'rgba(0, 200, 0, 0.25)' : 'rgba(200, 0, 0, 0.35)';
        ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        ctx.strokeStyle = tileOk ? 'rgba(0, 200, 0, 0.5)' : 'rgba(200, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
      }
    }

    // Draw building ghost
    ctx.globalAlpha = canPlace ? 0.6 : 0.35;
    ctx.fillStyle = canPlace ? '#2a5a20' : '#5a2020';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = canPlace ? '#40c040' : '#c04040';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);

    // Draw icon
    ctx.globalAlpha = canPlace ? 0.8 : 0.5;
    ctx.fillStyle = '#d4c8a0';
    ctx.font = `bold ${Math.min(bw, bh) * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, bx + bw / 2, by + bh / 2);
    ctx.textBaseline = 'alphabetic';

    ctx.globalAlpha = 1;
  }

  private renderSelectionBoxes(state: GameState): void {
    const { ctx } = this;

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
        ctx.fillRect(building.rallyPoint.x - 1, building.rallyPoint.y - 12, 2, 14);
        ctx.fillStyle = '#00CC00';
        ctx.beginPath();
        ctx.moveTo(building.rallyPoint.x + 1, building.rallyPoint.y - 12);
        ctx.lineTo(building.rallyPoint.x + 9, building.rallyPoint.y - 9);
        ctx.lineTo(building.rallyPoint.x + 1, building.rallyPoint.y - 6);
        ctx.closePath();
        ctx.fill();
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

  // =====================================================
  // MINIMAP
  // =====================================================
  private renderMinimap(state: GameState): void {
    const { minimapCtx: ctx, minimapCanvas: canvas } = this;
    const { map, config, entities, camera, players } = state;

    const scaleX = canvas.width / (config.mapWidth * config.tileSize);
    const scaleY = canvas.height / (config.mapHeight * config.tileSize);

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Terrain
    const tilePxW = canvas.width / config.mapWidth;
    const tilePxH = canvas.height / config.mapHeight;
    const MINI_TERRAIN_COLORS: Record<string, string> = {
      grass: '#3d6a2e', dirt: '#7a6240', water: '#1a4a7a',
      mountain: '#5a5a5a', swamp: '#3a5028', meme_zone: '#5a1a6e', cursed_ground: '#3C1F1F',
    };

    for (let y = 0; y < config.mapHeight; y += 2) {
      for (let x = 0; x < config.mapWidth; x += 2) {
        const tile = map[y]?.[x];
        if (!tile) continue;
        if (tile.fogState === 'hidden') continue;

        ctx.fillStyle = MINI_TERRAIN_COLORS[tile.terrain] || '#333';
        ctx.fillRect(x * tilePxW, y * tilePxH, tilePxW * 2, tilePxH * 2);

        if (tile.resource) {
          const resColors = { copium: '#00BFFF', clout: '#FFD700', tendies: '#FF6347' };
          ctx.fillStyle = resColors[tile.resource.type];
          ctx.fillRect(x * tilePxW, y * tilePxH, tilePxW * 2, tilePxH * 2);
        }
      }
    }

    // Entities
    for (const [, entity] of entities) {
      if (!entity.visible && state.config.fogOfWar) continue;
      const owner = players.find(p => p.entities.includes(entity.id));
      ctx.fillStyle = owner?.color || '#888';

      const ex = entity.position.x * scaleX;
      const ey = entity.position.y * scaleY;
      const size = entity.type === 'building' ? 3 : entity.type === 'unit' ? 2 : 1;
      ctx.fillRect(ex - size / 2, ey - size / 2, size, size);
    }

    // Camera viewport
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      camera.x * scaleX,
      camera.y * scaleY,
      (camera.width / camera.zoom) * scaleX,
      (camera.height / camera.zoom) * scaleY,
    );
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
