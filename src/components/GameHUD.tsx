"use client";

import React, { RefObject } from "react";
import { Entity, Unit, Building, Resources, FactionId } from "@/game/engine/types";
import {
  getFactionBuildings,
  getBuildingDefinition, getUnitDefinition,
} from "@/game/data/definitions";

interface GameHUDProps {
  minimapRef: RefObject<HTMLCanvasElement | null>;
  resources: Resources;
  population: { current: number; max: number };
  gameTime: number;
  paused: boolean;
  selectedEntities: Entity[];
  faction: FactionId;
  inputMode: string;
  onTrainUnit: (unitType: string) => void;
  onBuildBuilding: (buildingType: string) => void;
  onTogglePause: () => void;
  onExit: () => void;
  onMoveCommand: () => void;
  onAttackCommand: () => void;
  onStopCommand: () => void;
  onPatrolCommand: () => void;
  onAbilityCommand: (abilityId: string) => void;
}

// =====================================================
// WC3-STYLE GAME HUD
// Top bar: resources + timer/controls (slim)
// Bottom panel: minimap | portrait+stats | 4x3 action grid
// =====================================================

export default function GameHUD({
  minimapRef,
  resources,
  population,
  gameTime,
  paused,
  selectedEntities,
  faction,
  inputMode,
  onTrainUnit,
  onBuildBuilding,
  onTogglePause,
  onExit,
  onMoveCommand,
  onAttackCommand,
  onStopCommand,
  onPatrolCommand,
  onAbilityCommand,
}: GameHUDProps) {
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);

  const selectedUnit = selectedEntities.length === 1 && selectedEntities[0].type === "unit"
    ? selectedEntities[0] as Unit : null;
  const selectedBuilding = selectedEntities.length === 1 && selectedEntities[0].type === "building"
    ? selectedEntities[0] as Building : null;

  return (
    <>
      {/* ============ TOP BAR: Resources + Timer ============ */}
      <div className="wc3-top-bar">
        <div className="wc3-top-bar-inner">
          <div className="wc3-res-bar">
            <div className="wc3-res-group">
              <div className="wc3-res-item">
                <div className="wc3-res-icon wc3-res-copium" />
                <span className="wc3-res-val" style={{ color: "#5cc0ff" }}>{Math.floor(resources.copium)}</span>
              </div>
              <div className="wc3-res-item">
                <div className="wc3-res-icon wc3-res-clout" />
                <span className="wc3-res-val" style={{ color: "#e8c840" }}>{Math.floor(resources.clout)}</span>
              </div>
              <div className="wc3-res-item">
                <div className="wc3-res-icon wc3-res-tendies" />
                <span className="wc3-res-val" style={{ color: "#e08040" }}>{Math.floor(resources.tendies)}</span>
              </div>
            </div>
            <div className="wc3-res-item">
              <div className="wc3-res-icon wc3-res-pop" />
              <span className="wc3-res-val" style={{
                color: population.current >= population.max ? "#e04040" : "#a0a080",
              }}>
                {population.current}/{population.max}
              </span>
            </div>
          </div>

          <div className="wc3-controls-col">
            <span className="wc3-timer">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            {paused && <span className="wc3-paused-badge">PAUSED</span>}
            <div className="wc3-ctrl-btns">
              <button onClick={onTogglePause} className="wc3-top-btn">
                {paused ? ">" : "||"}
              </button>
              <button onClick={onExit} className="wc3-top-btn wc3-top-btn-quit">
                X
              </button>
            </div>
          </div>
        </div>
        <div className="wc3-frame-bottom-edge" />
      </div>

      {/* ============ BOTTOM PANEL: Minimap | Portrait+Stats | Actions ============ */}
      <div className="wc3-bottom-panel">
        <div className="wc3-frame-top" />
        <div className="wc3-bottom-inner">
          {/* LEFT: Minimap */}
          <div className="wc3-minimap-area">
            <div className="wc3-minimap-border">
              <canvas
                ref={minimapRef}
                width={140}
                height={140}
                className="wc3-minimap-canvas"
              />
            </div>
          </div>

          {/* CENTER: Portrait + Stats */}
          <div className="wc3-info-center">
            {/* Portrait */}
            <div className="wc3-portrait-col">
              {selectedUnit && <UnitPortrait unit={selectedUnit} />}
              {selectedBuilding && <BuildingPortrait building={selectedBuilding} />}
              {selectedEntities.length > 1 && <MultiSelectPortrait entities={selectedEntities} />}
              {selectedEntities.length === 0 && (
                <div className="wc3-portrait-empty">
                  <div className="wc3-portrait-empty-icon">?</div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="wc3-stats-col">
              {selectedUnit && <UnitStats unit={selectedUnit} />}
              {selectedBuilding && <BuildingStats building={selectedBuilding} />}
              {selectedEntities.length > 1 && <MultiSelectGrid entities={selectedEntities} />}
              {selectedEntities.length === 0 && (
                <div className="wc3-stats-empty">
                  <ControlRow keys="WASD" desc="Camera" />
                  <ControlRow keys="LMB" desc="Select" />
                  <ControlRow keys="RMB" desc="Command" />
                  <ControlRow keys="H" desc="Stop" />
                  <ControlRow keys="A" desc="Attack" />
                  <ControlRow keys="B" desc="Build" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Action grid (4x3) */}
          <div className="wc3-action-area">
            <CommandGrid
              selectedEntities={selectedEntities}
              faction={faction}
              inputMode={inputMode}
              onTrainUnit={onTrainUnit}
              onBuildBuilding={onBuildBuilding}
              onMoveCommand={onMoveCommand}
              onAttackCommand={onAttackCommand}
              onStopCommand={onStopCommand}
              onPatrolCommand={onPatrolCommand}
              onAbilityCommand={onAbilityCommand}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================
// PORTRAIT COMPONENTS
// =====================================================
function UnitPortrait({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  if (!def) return null;
  const hpRatio = unit.hp / unit.maxHp;

  return (
    <div className="wc3-portrait">
      <div className="wc3-portrait-frame">
        <span className="wc3-portrait-icon">{def.icon}</span>
        {unit.isHero && <div className="wc3-hero-badge">Lv{unit.level}</div>}
      </div>
      <div className="wc3-portrait-name">{def.name}</div>
      <div className="wc3-hp-bar">
        <div className="wc3-hp-bar-bg">
          <div className="wc3-hp-bar-fill" style={{
            width: `${hpRatio * 100}%`,
            background: hpRatio > 0.6 ? "linear-gradient(180deg, #5a9a40, #3a7a20)"
              : hpRatio > 0.3 ? "linear-gradient(180deg, #c0a020, #908010)"
              : "linear-gradient(180deg, #c03030, #902020)",
          }} />
        </div>
        <span className="wc3-hp-text">{Math.floor(unit.hp)}/{unit.maxHp}</span>
      </div>
    </div>
  );
}

function BuildingPortrait({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  if (!def) return null;
  const hpRatio = building.hp / building.maxHp;

  return (
    <div className="wc3-portrait">
      <div className="wc3-portrait-frame wc3-portrait-frame-bldg">
        <span className="wc3-portrait-icon">{def.icon}</span>
      </div>
      <div className="wc3-portrait-name">{def.name}</div>
      <div className="wc3-hp-bar">
        <div className="wc3-hp-bar-bg">
          <div className="wc3-hp-bar-fill" style={{
            width: `${hpRatio * 100}%`,
            background: hpRatio > 0.6 ? "linear-gradient(180deg, #5a9a40, #3a7a20)"
              : hpRatio > 0.3 ? "linear-gradient(180deg, #c0a020, #908010)"
              : "linear-gradient(180deg, #c03030, #902020)",
          }} />
        </div>
        <span className="wc3-hp-text">{Math.floor(building.hp)}/{building.maxHp}</span>
      </div>
    </div>
  );
}

function MultiSelectPortrait({ entities }: { entities: Entity[] }) {
  const unitCount = entities.filter(e => e.type === "unit").length;
  const bldgCount = entities.filter(e => e.type === "building").length;
  return (
    <div className="wc3-portrait">
      <div className="wc3-portrait-frame wc3-portrait-frame-multi">
        <span className="wc3-portrait-icon" style={{ fontSize: 22 }}>{entities.length}</span>
      </div>
      <div className="wc3-portrait-name">
        {unitCount > 0 && `${unitCount} Unit${unitCount > 1 ? "s" : ""}`}
        {unitCount > 0 && bldgCount > 0 && " + "}
        {bldgCount > 0 && `${bldgCount} Bldg`}
      </div>
    </div>
  );
}

// =====================================================
// STATS COMPONENTS
// =====================================================
function UnitStats({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  return (
    <div className="wc3-stats-panel">
      <div className="wc3-stat-row">
        <div className="wc3-stat"><span className="wc3-stat-label">ATK</span><span className="wc3-stat-val" style={{ color: "#cc8844" }}>{unit.damage}</span></div>
        <div className="wc3-stat"><span className="wc3-stat-label">ARM</span><span className="wc3-stat-val" style={{ color: "#6688aa" }}>{unit.armor}</span></div>
      </div>
      <div className="wc3-stat-row">
        <div className="wc3-stat"><span className="wc3-stat-label">RNG</span><span className="wc3-stat-val" style={{ color: "#88aa66" }}>{unit.attackRange}</span></div>
        <div className="wc3-stat"><span className="wc3-stat-label">SPD</span><span className="wc3-stat-val" style={{ color: "#aa88cc" }}>{unit.speed}</span></div>
      </div>
      {unit.isHero && (
        <div className="wc3-stat-row">
          <div className="wc3-stat"><span className="wc3-stat-label">LVL</span><span className="wc3-stat-val" style={{ color: "#c4a035" }}>{unit.level}</span></div>
          <div className="wc3-stat"><span className="wc3-stat-label">XP</span><span className="wc3-stat-val" style={{ color: "#c4a035" }}>{unit.experience}/{unit.level * 100}</span></div>
        </div>
      )}
      {unit.carryingResource && (
        <div className="wc3-stat-carry">
          Carrying: {unit.carryingResource.amount} {unit.carryingResource.type}
        </div>
      )}
      {def?.description && (
        <div className="wc3-stat-desc">{def.description}</div>
      )}
    </div>
  );
}

function BuildingStats({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  return (
    <div className="wc3-stats-panel">
      <div className="wc3-stat-row">
        <div className="wc3-stat"><span className="wc3-stat-label">ARM</span><span className="wc3-stat-val" style={{ color: "#6688aa" }}>{building.armor}</span></div>
      </div>
      {building.state === "constructing" && (
        <div className="wc3-stat-carry" style={{ color: "#d0a020" }}>
          Building... {Math.floor(building.buildProgress)}%
        </div>
      )}
      {building.trainQueue.length > 0 && (
        <div className="wc3-train-queue">
          <div className="wc3-train-progress">
            Training: {Math.floor(building.trainQueue[0].progress)}%
          </div>
          <div className="wc3-train-bar">
            <div className="wc3-train-bar-fill" style={{ width: `${building.trainQueue[0].progress}%` }} />
          </div>
          {building.trainQueue.length > 1 && (
            <div className="wc3-train-queue-count">
              +{building.trainQueue.length - 1} in queue
            </div>
          )}
        </div>
      )}
      {def?.description && (
        <div className="wc3-stat-desc">{def.description}</div>
      )}
    </div>
  );
}

function MultiSelectGrid({ entities }: { entities: Entity[] }) {
  return (
    <div className="wc3-multi-grid">
      {entities.slice(0, 24).map(e => {
        const isUnit = e.type === "unit";
        const unitDef = isUnit ? getUnitDefinition((e as Unit).unitType) : null;
        const bldgDef = !isUnit ? getBuildingDefinition((e as Building).buildingType) : null;
        const icon = unitDef?.icon || bldgDef?.icon || "?";
        const hpRatio = e.hp / e.maxHp;
        return (
          <div key={e.id} className="wc3-multi-icon" title={unitDef?.name || bldgDef?.name || "Entity"}>
            <span className="wc3-multi-icon-text">{icon}</span>
            <div className="wc3-multi-hp">
              <div className="wc3-multi-hp-fill" style={{
                width: `${hpRatio * 100}%`,
                background: hpRatio > 0.5 ? "#4a8030" : hpRatio > 0.25 ? "#a08020" : "#a02020",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// COMMAND GRID (4x3)
// =====================================================
function CommandGrid({
  selectedEntities,
  faction,
  inputMode,
  onTrainUnit,
  onBuildBuilding,
  onMoveCommand,
  onAttackCommand,
  onStopCommand,
  onPatrolCommand,
  onAbilityCommand,
}: {
  selectedEntities: Entity[];
  faction: FactionId;
  inputMode: string;
  onTrainUnit: (unitType: string) => void;
  onBuildBuilding: (buildingType: string) => void;
  onMoveCommand: () => void;
  onAttackCommand: () => void;
  onStopCommand: () => void;
  onPatrolCommand: () => void;
  onAbilityCommand: (abilityId: string) => void;
}) {
  const [showBuildMenu, setShowBuildMenu] = React.useState(false);

  const selectedBuilding = selectedEntities.length === 1 && selectedEntities[0].type === "building"
    ? selectedEntities[0] as Building : null;
  const selectedUnits = selectedEntities.filter(e => e.type === "unit") as Unit[];
  const hasWorkers = selectedUnits.some(u =>
    ["chud_neet", "chosen_merchant", "crusader_simp", "chad_gym_rat"].includes(u.unitType)
  );

  const buttons: (React.ReactNode | null)[] = new Array(12).fill(null);

  // Building selected - show train options
  if (selectedBuilding && selectedBuilding.state !== "constructing") {
    const def = getBuildingDefinition(selectedBuilding.buildingType);
    if (def && def.trains.length > 0) {
      def.trains.forEach((unitId, i) => {
        if (i >= 12) return;
        const unitDef = getUnitDefinition(unitId);
        if (!unitDef) return;
        const costStr = [
          unitDef.cost.copium ? `${unitDef.cost.copium}C` : '',
          unitDef.cost.clout ? `${unitDef.cost.clout}L` : '',
          unitDef.cost.tendies ? `${unitDef.cost.tendies}T` : '',
        ].filter(Boolean).join(' ');
        buttons[i] = (
          <button
            key={unitId}
            onClick={() => onTrainUnit(unitId)}
            className="wc3-grid-btn"
            title={`${unitDef.name} - ${unitDef.description}\nCost: ${costStr}`}
          >
            <span className="wc3-grid-btn-icon">{unitDef.icon}</span>
            <span className="wc3-grid-btn-cost">{costStr}</span>
          </button>
        );
      });
    }
  }
  // Units selected
  else if (selectedUnits.length > 0) {
    if (hasWorkers && showBuildMenu) {
      buttons[0] = (
        <button key="back" onClick={() => setShowBuildMenu(false)} className="wc3-grid-btn" title="Back (ESC)">
          <CommandIcon type="back" size={24} />
          <span className="wc3-grid-btn-hotkey">ESC</span>
        </button>
      );
      const buildings = getFactionBuildings(faction);
      buildings.forEach((bdef, i) => {
        if (i + 1 >= 12) return;
        const costStr = [
          bdef.cost.copium ? `${bdef.cost.copium}C` : '',
          bdef.cost.clout ? `${bdef.cost.clout}L` : '',
          bdef.cost.tendies ? `${bdef.cost.tendies}T` : '',
        ].filter(Boolean).join(' ');
        buttons[i + 1] = (
          <button
            key={bdef.id}
            onClick={() => { onBuildBuilding(bdef.id); setShowBuildMenu(false); }}
            className="wc3-grid-btn"
            title={`${bdef.name}\nCost: ${costStr}`}
          >
            <span className="wc3-grid-btn-icon">{bdef.icon}</span>
            <span className="wc3-grid-btn-cost">{costStr}</span>
          </button>
        );
      });
    } else {
      let idx = 0;
      buttons[idx++] = (
        <button key="move" onClick={onMoveCommand}
          className={`wc3-grid-btn ${inputMode === 'move_target' ? 'wc3-grid-btn-active' : ''}`}
          title="Move (M)">
          <CommandIcon type="move" size={24} />
          <span className="wc3-grid-btn-hotkey">M</span>
        </button>
      );
      buttons[idx++] = (
        <button key="stop" onClick={onStopCommand} className="wc3-grid-btn" title="Stop/Hold (H)">
          <CommandIcon type="stop" size={24} />
          <span className="wc3-grid-btn-hotkey">H</span>
        </button>
      );
      buttons[idx++] = (
        <button key="attack" onClick={onAttackCommand}
          className={`wc3-grid-btn ${inputMode === 'attack_move' ? 'wc3-grid-btn-active' : ''}`}
          title="Attack Move (A)">
          <CommandIcon type="attack" size={24} />
          <span className="wc3-grid-btn-hotkey">A</span>
        </button>
      );
      buttons[idx++] = (
        <button key="patrol" onClick={onPatrolCommand}
          className={`wc3-grid-btn ${inputMode === 'patrol_target' ? 'wc3-grid-btn-active' : ''}`}
          title="Patrol (P)">
          <CommandIcon type="patrol" size={24} />
          <span className="wc3-grid-btn-hotkey">P</span>
        </button>
      );
      if (hasWorkers) {
        buttons[idx++] = (
          <button key="build" onClick={() => setShowBuildMenu(true)} className="wc3-grid-btn" title="Build (B)">
            <CommandIcon type="build" size={24} />
            <span className="wc3-grid-btn-hotkey">B</span>
          </button>
        );
      }

      const abilities: { id: string; name: string; icon: string; cooldown: number }[] = [];
      const seenAbilities = new Set<string>();
      for (const u of selectedUnits) {
        for (const ab of u.abilities) {
          if (!seenAbilities.has(ab.id)) {
            seenAbilities.add(ab.id);
            abilities.push({ id: ab.id, name: ab.name, icon: ab.icon, cooldown: ab.currentCooldown });
          }
        }
      }
      for (const ab of abilities) {
        if (idx >= 12) break;
        buttons[idx++] = (
          <button key={ab.id} onClick={() => onAbilityCommand(ab.id)}
            className="wc3-grid-btn" title={ab.name}>
            <span className="wc3-grid-btn-icon">{ab.icon}</span>
            <span className="wc3-grid-btn-hotkey">{ab.name.charAt(0)}</span>
            {ab.cooldown > 0 && <span className="wc3-grid-btn-cd">{Math.ceil(ab.cooldown)}</span>}
          </button>
        );
      }
    }
  }

  return (
    <div className="wc3-action-grid">
      {buttons.map((btn, i) => btn || (
        <div key={`empty-${i}`} className="wc3-grid-btn wc3-grid-btn-empty" />
      ))}
    </div>
  );
}

// =====================================================
// SVG COMMAND ICONS
// =====================================================
function CommandIcon({ type, size = 24 }: { type: string; size?: number }) {
  const s = size;
  const h = s / 2;

  switch (type) {
    case 'move':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${s*0.15},${s*0.25} ${s*0.6},${s*0.25} ${s*0.6},${s*0.1} ${s*0.9},${h} ${s*0.6},${s*0.9} ${s*0.6},${s*0.75} ${s*0.15},${s*0.75}`}
            fill="#40c040" stroke="#206020" strokeWidth="1.5" />
        </svg>
      );
    case 'stop':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={s*0.2} y={s*0.15} width={s*0.6} height={s*0.7} rx={s*0.08}
            fill="#d0a020" stroke="#806010" strokeWidth="1.5" />
          <line x1={s*0.35} y1={s*0.3} x2={s*0.35} y2={s*0.55} stroke="#806010" strokeWidth="2" strokeLinecap="round" />
          <line x1={s*0.5} y1={s*0.25} x2={s*0.5} y2={s*0.55} stroke="#806010" strokeWidth="2" strokeLinecap="round" />
          <line x1={s*0.65} y1={s*0.3} x2={s*0.65} y2={s*0.55} stroke="#806010" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'attack':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <line x1={s*0.15} y1={s*0.85} x2={s*0.85} y2={s*0.15} stroke="#e04040" strokeWidth="3" strokeLinecap="round" />
          <line x1={s*0.85} y1={s*0.85} x2={s*0.15} y2={s*0.15} stroke="#c03030" strokeWidth="3" strokeLinecap="round" />
          <polygon points={`${s*0.8},${s*0.05} ${s*0.95},${s*0.05} ${s*0.95},${s*0.2}`} fill="#e04040" />
          <polygon points={`${s*0.05},${s*0.05} ${s*0.2},${s*0.05} ${s*0.05},${s*0.2}`} fill="#c03030" />
        </svg>
      );
    case 'patrol':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <path d={`M${s*0.7},${s*0.2} A${s*0.3},${s*0.3} 0 1,1 ${s*0.3},${s*0.2}`}
            fill="none" stroke="#4090e0" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points={`${s*0.25},${s*0.1} ${s*0.35},${s*0.22} ${s*0.2},${s*0.28}`} fill="#4090e0" />
          <path d={`M${s*0.3},${s*0.8} A${s*0.3},${s*0.3} 0 1,1 ${s*0.7},${s*0.8}`}
            fill="none" stroke="#4090e0" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points={`${s*0.75},${s*0.9} ${s*0.65},${s*0.78} ${s*0.8},${s*0.72}`} fill="#4090e0" />
        </svg>
      );
    case 'build':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={s*0.43} y={s*0.35} width={s*0.14} height={s*0.55} rx={s*0.03}
            fill="#8B6914" stroke="#5a4010" strokeWidth="1" />
          <rect x={s*0.25} y={s*0.1} width={s*0.5} height={s*0.3} rx={s*0.06}
            fill="#a0a0a0" stroke="#606060" strokeWidth="1.5" />
        </svg>
      );
    case 'back':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${s*0.85},${s*0.25} ${s*0.4},${s*0.25} ${s*0.4},${s*0.1} ${s*0.1},${h} ${s*0.4},${s*0.9} ${s*0.4},${s*0.75} ${s*0.85},${s*0.75}`}
            fill="#c0c0c0" stroke="#808080" strokeWidth="1.5" />
        </svg>
      );
    default:
      return <span style={{ color: "#e8d8a0", fontSize: s * 0.6, fontWeight: 'bold' }}>{type}</span>;
  }
}

function ControlRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="wc3-control-row">
      <span className="wc3-control-key">{keys}</span>
      <span className="wc3-control-desc">{desc}</span>
    </div>
  );
}
