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
// Top: minimap | resources + unit info | controls
// Bottom: command grid (slim bar)
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
      {/* ============ TOP PANEL: Minimap + Resources + Info ============ */}
      <div className="wc3-top-panel">
        <div className="wc3-frame-bottom-edge" />

        <div className="wc3-top-inner">
          {/* === MINIMAP SECTION === */}
          <div className="wc3-minimap-frame-top">
            <div className="wc3-minimap-border">
              <canvas
                ref={minimapRef}
                width={140}
                height={140}
                className="wc3-minimap-canvas"
              />
            </div>
          </div>

          {/* === CENTER: Resources + Unit/Building Info === */}
          <div className="wc3-center-panel">
            {/* Resource row */}
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

            {/* Info area below resources */}
            <div className="wc3-info-area">
              {selectedEntities.length === 0 && (
                <div className="wc3-info-empty">
                  <div className="wc3-info-empty-text">No selection</div>
                  <div className="wc3-info-controls">
                    <ControlRow keys="WASD" desc="Camera" />
                    <ControlRow keys="LMB" desc="Select" />
                    <ControlRow keys="RMB" desc="Command" />
                    <ControlRow keys="H" desc="Stop" />
                    <ControlRow keys="Space" desc="Pause" />
                    <ControlRow keys="Ctrl+#" desc="Group" />
                  </div>
                </div>
              )}

              {selectedEntities.length > 1 && (
                <div className="wc3-multi-select">
                  <div className="wc3-multi-header">
                    {selectedEntities.length} Units
                  </div>
                  <div className="wc3-multi-grid">
                    {selectedEntities.slice(0, 24).map(e => {
                      const isUnit = e.type === "unit";
                      const unitDef = isUnit ? getUnitDefinition((e as Unit).unitType) : null;
                      const u = e as Unit;
                      const hpRatio = u.hp / u.maxHp;
                      return (
                        <div key={e.id} className="wc3-multi-icon" title={unitDef?.name || "Unit"}>
                          <span className="wc3-multi-icon-text">{unitDef?.icon || "?"}</span>
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
                </div>
              )}

              {selectedUnit && <UnitInfoCompact unit={selectedUnit} />}
              {selectedBuilding && <BuildingInfoCompact building={selectedBuilding} />}
            </div>
          </div>

          {/* === RIGHT: Timer & Controls === */}
          <div className="wc3-controls-col">
            <span className="wc3-timer">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            {paused && <span className="wc3-paused-badge">PAUSED</span>}
            <div className="wc3-ctrl-btns">
              <button onClick={onTogglePause} className="wc3-top-btn">
                {paused ? "||>" : "||"}
              </button>
              <button onClick={onExit} className="wc3-top-btn wc3-top-btn-quit">
                X
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM COMMAND BAR ============ */}
      <div className="wc3-bottom-cmd-bar">
        <div className="wc3-frame-top" />
        <CommandPanelWC3
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
    </>
  );
}

// =====================================================
// COMPACT UNIT INFO (for top panel)
// =====================================================
function UnitInfoCompact({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  if (!def) return null;

  const hpRatio = unit.hp / unit.maxHp;

  return (
    <div className="wc3-compact-info">
      <div className="wc3-compact-row">
        <div className="wc3-portrait-sm">
          <span className="wc3-portrait-icon-sm">{def.icon}</span>
          {unit.isHero && <div className="wc3-hero-badge-sm">Lv{unit.level}</div>}
        </div>
        <div className="wc3-compact-details">
          <div className="wc3-compact-name">
            {def.name}
            {unit.isHero && <span className="wc3-hero-tag">[HERO]</span>}
          </div>
          <div className="wc3-hp-bar-sm">
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
          <div className="wc3-compact-stats">
            <span style={{ color: "#cc8844" }}>ATK:{unit.damage}</span>
            <span style={{ color: "#6688aa" }}>ARM:{unit.armor}</span>
            <span style={{ color: "#88aa66" }}>SPD:{unit.speed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// COMPACT BUILDING INFO (for top panel)
// =====================================================
function BuildingInfoCompact({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  if (!def) return null;

  const hpRatio = building.hp / building.maxHp;

  return (
    <div className="wc3-compact-info">
      <div className="wc3-compact-row">
        <div className="wc3-portrait-sm wc3-portrait-building">
          <span className="wc3-portrait-icon-sm">{def.icon}</span>
        </div>
        <div className="wc3-compact-details">
          <div className="wc3-compact-name">{def.name}</div>
          <div className="wc3-hp-bar-sm">
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
          {building.state === "constructing" && (
            <div className="wc3-compact-stats">
              <span style={{ color: "#d0a020" }}>Building... {Math.floor(building.buildProgress)}%</span>
            </div>
          )}
          {building.trainQueue.length > 0 && (
            <div className="wc3-compact-stats">
              <span style={{ color: "#4090d0" }}>
                Training: {Math.floor(building.trainQueue[0].progress)}%
                {building.trainQueue.length > 1 && ` (+${building.trainQueue.length - 1})`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// WC3 COMMAND PANEL (bottom bar - horizontal grid)
// =====================================================
function CommandPanelWC3({
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

  // Building selected - show train options
  if (selectedBuilding && selectedBuilding.state !== "constructing") {
    const def = getBuildingDefinition(selectedBuilding.buildingType);
    if (!def || def.trains.length === 0) return <EmptyBar />;

    return (
      <div className="wc3-cmd-bar-inner">
        {def.trains.map(unitId => {
          const unitDef = getUnitDefinition(unitId);
          if (!unitDef) return null;
          return (
            <CmdButton
              key={unitId}
              icon={unitDef.icon}
              name={unitDef.name}
              cost={unitDef.cost}
              onClick={() => onTrainUnit(unitId)}
              tooltip={`${unitDef.name} - ${unitDef.description}`}
            />
          );
        })}
      </div>
    );
  }

  // Units selected - show action buttons + abilities
  if (selectedUnits.length > 0) {
    // Worker build menu mode
    if (hasWorkers && showBuildMenu) {
      const buildings = getFactionBuildings(faction);
      return (
        <div className="wc3-cmd-bar-inner">
          <ActionButton iconType="back" label="Back" hotkey="" onClick={() => setShowBuildMenu(false)}
            active={false} tooltip="Return to actions" />
          {buildings.map(bdef => (
            <CmdButton
              key={bdef.id}
              icon={bdef.icon}
              name={bdef.name}
              cost={bdef.cost}
              onClick={() => { onBuildBuilding(bdef.id); setShowBuildMenu(false); }}
              tooltip={`${bdef.name} - ${bdef.description}`}
            />
          ))}
        </div>
      );
    }

    const actionButtons: React.ReactNode[] = [
      <ActionButton key="move" iconType="move" label="Move" hotkey="M" onClick={onMoveCommand}
        active={inputMode === 'move_target'} tooltip="Move (M)" />,
      <ActionButton key="stop" iconType="stop" label="Stop" hotkey="H" onClick={onStopCommand}
        active={false} tooltip="Stop/Hold (H)" />,
      <ActionButton key="attack" iconType="attack" label="Attack" hotkey="A" onClick={onAttackCommand}
        active={inputMode === 'attack_move'} tooltip="Attack Move (A)" />,
      <ActionButton key="patrol" iconType="patrol" label="Patrol" hotkey="P" onClick={onPatrolCommand}
        active={inputMode === 'patrol_target'} tooltip="Patrol (P)" />,
    ];

    if (hasWorkers) {
      actionButtons.push(
        <ActionButton key="build" iconType="build" label="Build" hotkey="B" onClick={() => setShowBuildMenu(true)}
          active={false} tooltip="Open Build Menu (B)" />
      );
    }

    // Add abilities
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
      actionButtons.push(
        <ActionButton key={ab.id} icon={ab.icon} label={ab.name} hotkey=""
          onClick={() => onAbilityCommand(ab.id)}
          active={false}
          tooltip={ab.name}
          cooldown={ab.cooldown > 0 ? Math.ceil(ab.cooldown) : undefined} />
      );
    }

    return (
      <div className="wc3-cmd-bar-inner">
        {actionButtons}
      </div>
    );
  }

  return <EmptyBar />;
}

function EmptyBar() {
  return (
    <div className="wc3-cmd-bar-inner">
      <div className="wc3-cmd-bar-empty">Select a unit or building</div>
    </div>
  );
}

// SVG icon paths for WC3-style command buttons
function CommandIcon({ type, size = 24 }: { type: string; size?: number }) {
  const s = size;
  const h = s / 2;
  const color = "#e8d8a0";

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
      return <span style={{ color, fontSize: s * 0.6, fontWeight: 'bold' }}>{type}</span>;
  }
}

function ActionButton({
  iconType, icon, label, hotkey, onClick, active, tooltip, cooldown,
}: {
  iconType?: string; icon?: string; label: string; hotkey: string;
  onClick: () => void; active: boolean; tooltip: string;
  cooldown?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`wc3-cmd-btn-bar ${active ? 'wc3-cmd-btn-active' : ''}`}
      title={tooltip}
    >
      <div className="wc3-cmd-btn-icon">
        {iconType ? <CommandIcon type={iconType} size={28} /> : (icon || label)}
      </div>
      <div className="wc3-cmd-btn-label">{hotkey || label}</div>
      {cooldown !== undefined && cooldown > 0 && (
        <div className="wc3-cmd-btn-cooldown">{cooldown}</div>
      )}
    </button>
  );
}

function CmdButton({
  icon, name, cost, onClick, tooltip,
}: {
  icon: string; name: string; cost: { copium?: number; clout?: number; tendies?: number };
  onClick: () => void; tooltip: string;
}) {
  const costStr = [
    cost.copium ? `${cost.copium}C` : '',
    cost.clout ? `${cost.clout}L` : '',
    cost.tendies ? `${cost.tendies}T` : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      onClick={onClick}
      className="wc3-cmd-btn-bar"
      title={tooltip}
    >
      <div className="wc3-cmd-btn-icon">{icon}</div>
      <div className="wc3-cmd-btn-label">{costStr}</div>
    </button>
  );
}

function ControlRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="wc3-control-row">
      <span className="wc3-control-key">{keys}</span>
      <span className="wc3-control-desc">{desc}</span>
    </div>
  );
}
