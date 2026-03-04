import { Vector2, Tile } from './types';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class PathFinder {
  private grid: Tile[][];
  private tileSize: number;
  private width: number;
  private height: number;

  constructor(grid: Tile[][], tileSize: number) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.height = grid.length;
    this.width = grid[0]?.length || 0;
  }

  findPath(start: Vector2, end: Vector2): Vector2[] {
    const startTile = this.worldToTile(start);
    const endTile = this.worldToTile(end);

    // Clamp to grid bounds
    startTile.x = Math.max(0, Math.min(this.width - 1, startTile.x));
    startTile.y = Math.max(0, Math.min(this.height - 1, startTile.y));
    endTile.x = Math.max(0, Math.min(this.width - 1, endTile.x));
    endTile.y = Math.max(0, Math.min(this.height - 1, endTile.y));

    if (!this.isWalkable(endTile.x, endTile.y)) {
      // Find nearest walkable tile to destination
      const nearest = this.findNearestWalkable(endTile);
      if (!nearest) return [end]; // just try to go there directly
      endTile.x = nearest.x;
      endTile.y = nearest.y;
    }

    if (startTile.x === endTile.x && startTile.y === endTile.y) {
      return [end];
    }

    // A* pathfinding
    const open: PathNode[] = [];
    const closed = new Set<string>();
    const startNode: PathNode = {
      x: startTile.x, y: startTile.y,
      g: 0, h: this.heuristic(startTile, endTile),
      f: 0, parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    const maxIterations = 1000;
    let iterations = 0;

    while (open.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[lowestIdx].f) lowestIdx = i;
      }
      const current = open.splice(lowestIdx, 1)[0];
      const key = `${current.x},${current.y}`;

      if (current.x === endTile.x && current.y === endTile.y) {
        return this.reconstructPath(current, end);
      }

      closed.add(key);

      // Check all 8 neighbors
      const neighbors = [
        { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
      ];

      for (const n of neighbors) {
        const nx = current.x + n.x;
        const ny = current.y + n.y;
        const nKey = `${nx},${ny}`;

        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
        if (!this.isWalkable(nx, ny)) continue;
        if (closed.has(nKey)) continue;

        // Diagonal check - don't cut corners
        if (n.x !== 0 && n.y !== 0) {
          if (!this.isWalkable(current.x + n.x, current.y) ||
              !this.isWalkable(current.x, current.y + n.y)) continue;
        }

        const moveCost = (n.x !== 0 && n.y !== 0) ? 1.414 : 1;
        const g = current.g + moveCost;
        const h = this.heuristic({ x: nx, y: ny }, endTile);

        const existing = open.find(o => o.x === nx && o.y === ny);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = current;
          }
        } else {
          open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
        }
      }
    }

    // No path found, return direct line
    return [end];
  }

  private heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
    // Octile distance
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  }

  private reconstructPath(node: PathNode, finalTarget: Vector2): Vector2[] {
    const path: Vector2[] = [];
    let current: PathNode | null = node;

    while (current) {
      path.unshift(this.tileToWorld(current.x, current.y));
      current = current.parent;
    }

    // Remove start position, add exact end position
    if (path.length > 0) path.shift();
    if (path.length > 0) {
      path[path.length - 1] = { ...finalTarget };
    } else {
      path.push({ ...finalTarget });
    }

    return this.smoothPath(path);
  }

  private smoothPath(path: Vector2[]): Vector2[] {
    if (path.length <= 2) return path;

    // Simple path smoothing - remove unnecessary waypoints
    const smoothed: Vector2[] = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const prev = smoothed[smoothed.length - 1];
      const next = path[i + 1];
      // Keep waypoint if direction changes significantly
      const dx1 = path[i].x - prev.x;
      const dy1 = path[i].y - prev.y;
      const dx2 = next.x - path[i].x;
      const dy2 = next.y - path[i].y;
      const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
      if (cross > 0.1) {
        smoothed.push(path[i]);
      }
    }
    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  private worldToTile(pos: Vector2): { x: number; y: number } {
    return {
      x: Math.floor(pos.x / this.tileSize),
      y: Math.floor(pos.y / this.tileSize),
    };
  }

  private tileToWorld(tx: number, ty: number): Vector2 {
    return {
      x: tx * this.tileSize + this.tileSize / 2,
      y: ty * this.tileSize + this.tileSize / 2,
    };
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.grid[y]?.[x]?.walkable ?? false;
  }

  private findNearestWalkable(pos: { x: number; y: number }): { x: number; y: number } | null {
    for (let radius = 1; radius < 10; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }
}
