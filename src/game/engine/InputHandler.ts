import { GameEngine } from './GameEngine';
import { Vector2, Entity, Unit, Building, Command, FactionId } from './types';
import { getBuildingDefinition } from '../data/definitions';

export type InputMode = 'normal' | 'building_placement' | 'ability_target' | 'attack_move' | 'patrol_target';

interface DragState {
  active: boolean;
  startScreen: Vector2;
  currentScreen: Vector2;
}

export class InputHandler {
  private engine: GameEngine;
  private canvas: HTMLCanvasElement;
  private mode: InputMode = 'normal';
  private pendingBuildingType: string | null = null;
  private pendingAbilityId: string | null = null;
  private drag: DragState = { active: false, startScreen: { x: 0, y: 0 }, currentScreen: { x: 0, y: 0 } };
  private keysDown = new Set<string>();
  private edgeScrollSpeed = 15;
  private edgeScrollMargin = 20;
  private mouseScreenPos: Vector2 = { x: 0, y: 0 };

  // Callback for UI updates
  onSelectionChange?: (entities: Entity[]) => void;
  onModeChange?: (mode: InputMode) => void;

  constructor(engine: GameEngine, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onRightClick(e); });
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left click
      if (this.mode === 'building_placement' && this.pendingBuildingType) {
        this.placeBuildingAtMouse(e);
        return;
      }

      if (this.mode === 'ability_target') {
        this.useAbilityAtMouse(e);
        return;
      }

      if (this.mode === 'attack_move') {
        this.attackMoveAtMouse(e);
        return;
      }

      if (this.mode === 'patrol_target') {
        this.patrolAtMouse(e);
        return;
      }

      // Start box selection
      this.drag.active = true;
      this.drag.startScreen = { x: e.offsetX, y: e.offsetY };
      this.drag.currentScreen = { x: e.offsetX, y: e.offsetY };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseScreenPos = { x: e.offsetX, y: e.offsetY };

    if (this.drag.active) {
      this.drag.currentScreen = { x: e.offsetX, y: e.offsetY };
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 && this.drag.active) {
      this.drag.active = false;

      const dx = Math.abs(this.drag.currentScreen.x - this.drag.startScreen.x);
      const dy = Math.abs(this.drag.currentScreen.y - this.drag.startScreen.y);

      if (dx < 5 && dy < 5) {
        // Click select
        this.clickSelect(e);
      } else {
        // Box select
        this.boxSelect();
      }
    }
  }

  private onRightClick(e: MouseEvent): void {
    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const selected = this.getSelectedEntities();

    if (selected.length === 0) return;

    // Check what we right-clicked on
    const clickedEntities = this.engine.getEntitiesAt(worldPos, 20);
    const clickedEnemy = clickedEntities.find(entity => {
      const owner = this.engine.getEntityOwner(entity.id);
      const localPlayer = this.engine.state.players.find(p => p.id === this.engine.state.localPlayerId);
      return owner && localPlayer && owner.teamId !== localPlayer.teamId;
    });

    // Check if clicked on a resource
    const tileX = Math.floor(worldPos.x / this.engine.state.config.tileSize);
    const tileY = Math.floor(worldPos.y / this.engine.state.config.tileSize);
    const tile = this.engine.state.map[tileY]?.[tileX];
    const hasResource = tile?.resource && tile.resource.amount > 0;

    const unitIds = selected.filter(e => e.type === 'unit').map(e => e.id);
    const buildingIds = selected.filter(e => e.type === 'building').map(e => e.id);

    if (clickedEnemy && unitIds.length > 0) {
      // Attack command
      this.engine.issueCommand({
        type: 'attack',
        entityIds: unitIds,
        targetEntityId: clickedEnemy.id,
        queued: this.keysDown.has('Shift'),
      });
    } else if (hasResource && unitIds.length > 0) {
      // Gather command
      this.engine.issueCommand({
        type: 'gather',
        entityIds: unitIds,
        target: worldPos,
        queued: this.keysDown.has('Shift'),
      });
    } else if (unitIds.length > 0) {
      // Move command
      this.engine.issueCommand({
        type: 'move',
        entityIds: unitIds,
        target: worldPos,
        queued: this.keysDown.has('Shift'),
      });
    }

    // Set rally point for buildings
    if (buildingIds.length > 0) {
      this.engine.issueCommand({
        type: 'rally',
        entityIds: buildingIds,
        target: worldPos,
      });
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const cam = this.engine.state.camera;
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    cam.zoom = Math.max(0.5, Math.min(3, cam.zoom + delta));
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keysDown.add(e.key);

    switch (e.key) {
      case 'Escape':
        this.cancelMode();
        break;
      case 'h':
      case 'H':
        // Stop/Hold position
        this.issueStopCommand();
        break;
      case 'm':
      case 'M':
        // Move mode (click to move)
        this.startMoveMode();
        break;
      case 'a':
      case 'A':
        // Only attack-move when not used for camera (handled: A/a is in keysDown for camera)
        // Attack-move activates on keydown, camera uses keysDown in updateCamera
        // We'll let both coexist - A press triggers attack mode, holding A scrolls camera
        if (!this.keysDown.has('a') && !this.keysDown.has('A')) {
          this.startAttackMove();
        }
        break;
      case 'p':
      case 'P':
        this.startPatrolMode();
        break;
      case ' ':
        // Pause/unpause
        this.engine.state.paused = !this.engine.state.paused;
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        // Control groups
        if (e.ctrlKey) {
          this.saveControlGroup(parseInt(e.key));
        } else {
          this.loadControlGroup(parseInt(e.key));
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key);
  }

  private clickSelect(e: MouseEvent): void {
    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const entities = this.engine.getEntitiesAt(worldPos, 20);

    if (!this.keysDown.has('Shift')) {
      this.clearSelection();
    }

    if (entities.length > 0) {
      // Prefer own units
      const localPlayer = this.engine.state.players.find(p => p.id === this.engine.state.localPlayerId);
      const ownEntity = entities.find(entity => localPlayer?.entities.includes(entity.id));
      const target = ownEntity || entities[0];

      target.selected = true;
      if (!this.engine.state.selectedEntities.includes(target.id)) {
        this.engine.state.selectedEntities.push(target.id);
      }
    }

    this.notifySelectionChange();
  }

  private boxSelect(): void {
    const worldStart = this.engine.screenToWorld(this.drag.startScreen.x, this.drag.startScreen.y);
    const worldEnd = this.engine.screenToWorld(this.drag.currentScreen.x, this.drag.currentScreen.y);

    if (!this.keysDown.has('Shift')) {
      this.clearSelection();
    }

    const entities = this.engine.getEntitiesInRect({
      x1: worldStart.x, y1: worldStart.y,
      x2: worldEnd.x, y2: worldEnd.y,
    });

    // Only select own units (not buildings, not enemies)
    const localPlayer = this.engine.state.players.find(p => p.id === this.engine.state.localPlayerId);
    for (const entity of entities) {
      if (entity.type !== 'unit') continue;
      if (!localPlayer?.entities.includes(entity.id)) continue;

      entity.selected = true;
      if (!this.engine.state.selectedEntities.includes(entity.id)) {
        this.engine.state.selectedEntities.push(entity.id);
      }
    }

    this.notifySelectionChange();
  }

  private clearSelection(): void {
    for (const id of this.engine.state.selectedEntities) {
      const entity = this.engine.state.entities.get(id);
      if (entity) entity.selected = false;
    }
    this.engine.state.selectedEntities = [];
  }

  private getSelectedEntities(): Entity[] {
    return this.engine.state.selectedEntities
      .map(id => this.engine.state.entities.get(id))
      .filter((e): e is Entity => !!e);
  }

  issueStopCommand(): void {
    const selected = this.getSelectedEntities();
    const unitIds = selected.filter(e => e.type === 'unit').map(e => e.id);
    if (unitIds.length > 0) {
      this.engine.issueCommand({ type: 'stop', entityIds: unitIds });
    }
  }

  // Building placement mode
  startBuildingPlacement(buildingType: string): void {
    this.mode = 'building_placement';
    this.pendingBuildingType = buildingType;
    this.onModeChange?.('building_placement');
  }

  private placeBuildingAtMouse(e: MouseEvent): void {
    if (!this.pendingBuildingType) return;

    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const localPlayer = this.engine.state.players.find(p => p.id === this.engine.state.localPlayerId);
    if (!localPlayer) return;

    const def = getBuildingDefinition(this.pendingBuildingType);
    if (!def) return;

    // Check if can afford and place
    if (!this.engine.resourceSystem.canAfford(localPlayer, def.cost)) return;
    if (!this.engine.buildingSystem.canPlaceBuilding(this.pendingBuildingType, worldPos)) return;

    this.engine.resourceSystem.deductCost(localPlayer, def.cost);
    this.engine.spawnBuilding(this.pendingBuildingType, localPlayer.faction, worldPos, localPlayer.id, false);

    // Send selected workers to build
    const selectedUnits = this.getSelectedEntities().filter(e => e.type === 'unit');
    const workerIds = selectedUnits.map(u => u.id);
    if (workerIds.length > 0) {
      this.engine.issueCommand({
        type: 'build',
        entityIds: workerIds,
        target: worldPos,
        buildingType: this.pendingBuildingType,
      });
    }

    this.cancelMode();
  }

  // Move mode
  startMoveMode(): void {
    this.mode = 'normal'; // move is just right-click, so we stay in normal
    this.onModeChange?.('normal');
  }

  // Attack-move mode
  startAttackMove(): void {
    const selected = this.getSelectedEntities();
    if (selected.some(e => e.type === 'unit')) {
      this.mode = 'attack_move';
      this.onModeChange?.('attack_move');
    }
  }

  private attackMoveAtMouse(e: MouseEvent): void {
    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const selected = this.getSelectedEntities();
    const unitIds = selected.filter(e => e.type === 'unit').map(e => e.id);

    // Check if clicked on an enemy
    const clickedEntities = this.engine.getEntitiesAt(worldPos, 20);
    const localPlayer = this.engine.state.players.find(p => p.id === this.engine.state.localPlayerId);
    const clickedEnemy = clickedEntities.find(entity => {
      const owner = this.engine.getEntityOwner(entity.id);
      return owner && localPlayer && owner.teamId !== localPlayer.teamId;
    });

    if (clickedEnemy && unitIds.length > 0) {
      this.engine.issueCommand({
        type: 'attack',
        entityIds: unitIds,
        targetEntityId: clickedEnemy.id,
      });
    } else if (unitIds.length > 0) {
      // Attack-move to location
      this.engine.issueCommand({
        type: 'attack',
        entityIds: unitIds,
        target: worldPos,
      });
    }
    this.cancelMode();
  }

  // Patrol mode
  startPatrolMode(): void {
    const selected = this.getSelectedEntities();
    if (selected.some(e => e.type === 'unit')) {
      this.mode = 'patrol_target';
      this.onModeChange?.('patrol_target');
    }
  }

  private patrolAtMouse(e: MouseEvent): void {
    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const selected = this.getSelectedEntities();
    const unitIds = selected.filter(e => e.type === 'unit').map(e => e.id);

    if (unitIds.length > 0) {
      this.engine.issueCommand({
        type: 'patrol',
        entityIds: unitIds,
        target: worldPos,
      });
    }
    this.cancelMode();
  }

  // Ability targeting mode
  startAbilityTarget(abilityId: string): void {
    this.mode = 'ability_target';
    this.pendingAbilityId = abilityId;
    this.onModeChange?.('ability_target');
  }

  private useAbilityAtMouse(e: MouseEvent): void {
    const worldPos = this.engine.screenToWorld(e.offsetX, e.offsetY);
    const selectedUnits = this.getSelectedEntities().filter(e => e.type === 'unit').map(e => e.id);

    if (selectedUnits.length > 0 && this.pendingAbilityId) {
      this.engine.issueCommand({
        type: 'ability',
        entityIds: selectedUnits,
        target: worldPos,
        abilityId: this.pendingAbilityId,
      });
    }
    this.cancelMode();
  }

  cancelMode(): void {
    this.mode = 'normal';
    this.pendingBuildingType = null;
    this.pendingAbilityId = null;
    this.onModeChange?.('normal');
  }

  // Train a unit from selected building
  trainUnit(unitType: string): void {
    const selected = this.getSelectedEntities();
    const buildings = selected.filter(e => e.type === 'building').map(e => e.id);
    if (buildings.length > 0) {
      this.engine.issueCommand({
        type: 'train',
        entityIds: buildings,
        unitType,
      });
    }
  }

  // Camera movement (WASD + Arrow keys only, no edge scrolling)
  updateCamera(): void {
    const cam = this.engine.state.camera;
    const speed = this.edgeScrollSpeed / cam.zoom;

    // Arrow key + WASD scrolling
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('a') || this.keysDown.has('A')) cam.x -= speed;
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('d') || this.keysDown.has('D')) cam.x += speed;
    if (this.keysDown.has('ArrowUp') || this.keysDown.has('w') || this.keysDown.has('W')) cam.y -= speed;
    if (this.keysDown.has('ArrowDown') || this.keysDown.has('s') || this.keysDown.has('S')) cam.y += speed;

    // Clamp camera
    const maxX = this.engine.state.config.mapWidth * this.engine.state.config.tileSize - cam.width / cam.zoom;
    const maxY = this.engine.state.config.mapHeight * this.engine.state.config.tileSize - cam.height / cam.zoom;
    cam.x = Math.max(0, Math.min(maxX, cam.x));
    cam.y = Math.max(0, Math.min(maxY, cam.y));
  }

  // Control groups
  private controlGroups: Map<number, string[]> = new Map();

  private saveControlGroup(num: number): void {
    this.controlGroups.set(num, [...this.engine.state.selectedEntities]);
  }

  private loadControlGroup(num: number): void {
    const group = this.controlGroups.get(num);
    if (!group) return;

    this.clearSelection();
    for (const id of group) {
      const entity = this.engine.state.entities.get(id);
      if (entity) {
        entity.selected = true;
        this.engine.state.selectedEntities.push(id);
      }
    }
    this.notifySelectionChange();
  }

  private notifySelectionChange(): void {
    this.onSelectionChange?.(this.getSelectedEntities());
  }

  // Get drag rect for rendering selection box
  getDragRect(): { x: number; y: number; w: number; h: number } | null {
    if (!this.drag.active) return null;
    return {
      x: Math.min(this.drag.startScreen.x, this.drag.currentScreen.x),
      y: Math.min(this.drag.startScreen.y, this.drag.currentScreen.y),
      w: Math.abs(this.drag.currentScreen.x - this.drag.startScreen.x),
      h: Math.abs(this.drag.currentScreen.y - this.drag.startScreen.y),
    };
  }

  getMode(): InputMode { return this.mode; }

  destroy(): void {
    // Could remove event listeners here if needed
  }
}
