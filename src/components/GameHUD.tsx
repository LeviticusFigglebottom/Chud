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
// Top: resource bar
// Bottom: minimap | info panel | command grid
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
      {/* ============ TOP RESOURCE BAR ============ */}
      <div className="wc3-top-bar">
        <div className="wc3-top-bar-inner">
          {/* Resources */}
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

          {/* Population */}
          <div className="wc3-res-item">
            <div className="wc3-res-icon wc3-res-pop" />
            <span className="wc3-res-val" style={{
              color: population.current >= population.max ? "#e04040" : "#a0a080",
            }}>
              {population.current}/{population.max}
            </span>
          </div>

          {/* Timer & Controls */}
          <div className="wc3-top-right">
            <span className="wc3-timer">
              {minutes}:{seconds.toString().padStart(2, "0")}
              {paused && <span style={{ color: "#e8c840" }}> PAUSED</span>}
            </span>
            <button onClick={onTogglePause} className="wc3-top-btn">
              {paused ? "||>" : "||"}
            </button>
            <button onClick={onExit} className="wc3-top-btn wc3-top-btn-quit">
              X
            </button>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM PANEL ============ */}
      <div className="wc3-bottom-panel">
        {/* Stone frame top edge */}
        <div className="wc3-frame-top" />

        <div className="wc3-bottom-inner">
          {/* === MINIMAP SECTION === */}
          <div className="wc3-minimap-frame">
            <div className="wc3-minimap-border">
              <canvas
                ref={minimapRef}
                width={176}
                height={176}
                className="wc3-minimap-canvas"
              />
            </div>
          </div>

          {/* === CENTER: INFO / PORTRAIT === */}
          <div className="wc3-info-panel">
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

            {selectedUnit && <UnitInfoWC3 unit={selectedUnit} />}
            {selectedBuilding && <BuildingInfoWC3 building={selectedBuilding} />}
          </div>

          {/* === COMMAND PANEL (right) === */}
          <div className="wc3-cmd-panel">
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
        </div>
      </div>
    </>
  );
}

// =====================================================
// WC3 UNIT INFO
// =====================================================
function UnitInfoWC3({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  if (!def) return null;

  const hpRatio = unit.hp / unit.maxHp;

  return (
    <div className="wc3-unit-info">
      {/* Portrait area */}
      <div className="wc3-portrait-row">
        <div className="wc3-portrait">
          <span className="wc3-portrait-icon">{def.icon}</span>
          {unit.isHero && <div className="wc3-portrait-hero-badge">Lv{unit.level}</div>}
        </div>
        <div className="wc3-portrait-name-area">
          <div className="wc3-unit-name">
            {def.name}
            {unit.isHero && <span className="wc3-hero-tag">[HERO]</span>}
          </div>
          <div className="wc3-unit-state">{unit.state}</div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="wc3-hp-bar-container">
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

      {/* Stats */}
      <div className="wc3-stats-grid">
        <StatBox label="ATK" value={`${unit.damage}`} color="#cc8844" />
        <StatBox label="ARM" value={`${unit.armor}`} color="#6688aa" />
        <StatBox label="SPD" value={`${unit.speed}`} color="#88aa66" />
        <StatBox label="RNG" value={`${unit.attackRange}`} color="#aa6666" />
      </div>

      {/* Abilities */}
      {unit.abilities.length > 0 && (
        <div className="wc3-abilities">
          {unit.abilities.map(ability => (
            <div key={ability.id} className="wc3-ability-item" title={ability.name}>
              <span className="wc3-ability-icon">{ability.icon}</span>
              {ability.currentCooldown > 0 && (
                <span className="wc3-ability-cd">{Math.ceil(ability.currentCooldown)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// WC3 BUILDING INFO
// =====================================================
function BuildingInfoWC3({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  if (!def) return null;

  const hpRatio = building.hp / building.maxHp;

  return (
    <div className="wc3-unit-info">
      {/* Portrait area */}
      <div className="wc3-portrait-row">
        <div className="wc3-portrait wc3-portrait-building">
          <span className="wc3-portrait-icon">{def.icon}</span>
        </div>
        <div className="wc3-portrait-name-area">
          <div className="wc3-unit-name">{def.name}</div>
          <div className="wc3-unit-state">{building.state}</div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="wc3-hp-bar-container">
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

      {/* Construction progress */}
      {building.state === "constructing" && (
        <div className="wc3-progress-section">
          <div className="wc3-progress-label">Building... {Math.floor(building.buildProgress)}%</div>
          <div className="wc3-hp-bar-bg">
            <div className="wc3-hp-bar-fill" style={{
              width: `${building.buildProgress}%`,
              background: "linear-gradient(180deg, #d0a020, #a08010)",
            }} />
          </div>
        </div>
      )}

      {/* Training progress */}
      {building.trainQueue.length > 0 && (
        <div className="wc3-progress-section">
          <div className="wc3-progress-label">
            Training: {building.trainQueue[0].unitType.split("_").slice(1).join(" ")}
          </div>
          <div className="wc3-hp-bar-bg">
            <div className="wc3-hp-bar-fill" style={{
              width: `${building.trainQueue[0].progress}%`,
              background: "linear-gradient(180deg, #4090d0, #2070b0)",
            }} />
          </div>
          {building.trainQueue.length > 1 && (
            <div className="wc3-queue-count">+{building.trainQueue.length - 1} queued</div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// WC3 COMMAND PANEL (right side - grid of buttons)
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
    if (!def || def.trains.length === 0) return <EmptyGrid />;

    return (
      <div className="wc3-cmd-grid-wrapper">
        <div className="wc3-cmd-grid">
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
          {Array.from({ length: Math.max(0, 12 - def.trains.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="wc3-cmd-btn wc3-cmd-btn-empty" />
          ))}
        </div>
      </div>
    );
  }

  // Units selected - show action buttons + abilities
  if (selectedUnits.length > 0) {
    // Worker build menu mode
    if (hasWorkers && showBuildMenu) {
      const buildings = getFactionBuildings(faction);
      return (
        <div className="wc3-cmd-grid-wrapper">
          <div className="wc3-cmd-grid">
            <ActionButton icon="<" label="Back" hotkey="" onClick={() => setShowBuildMenu(false)}
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
            {Array.from({ length: Math.max(0, 11 - getFactionBuildings(faction).length) }).map((_, i) => (
              <div key={`empty-${i}`} className="wc3-cmd-btn wc3-cmd-btn-empty" />
            ))}
          </div>
        </div>
      );
    }

    // Collect all unique abilities from selected units
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

    const actionButtons: React.ReactNode[] = [
      <ActionButton key="move" icon="M" label="Move" hotkey="M" onClick={onMoveCommand}
        active={false} tooltip="Move (M) - Right-click to move" />,
      <ActionButton key="stop" icon="H" label="Stop" hotkey="H" onClick={onStopCommand}
        active={false} tooltip="Stop/Hold (H)" />,
      <ActionButton key="attack" icon="A" label="Attack" hotkey="A" onClick={onAttackCommand}
        active={inputMode === 'attack_move'} tooltip="Attack Move (A) - Click target or ground" />,
      <ActionButton key="patrol" icon="P" label="Patrol" hotkey="P" onClick={onPatrolCommand}
        active={inputMode === 'patrol_target'} tooltip="Patrol (P) - Click destination" />,
    ];

    // Add build button for workers
    if (hasWorkers) {
      actionButtons.push(
        <ActionButton key="build" icon="B" label="Build" hotkey="B" onClick={() => setShowBuildMenu(true)}
          active={false} tooltip="Open Build Menu" />
      );
    }

    // Add abilities
    for (const ab of abilities) {
      actionButtons.push(
        <ActionButton key={ab.id} icon={ab.icon} label={ab.name} hotkey=""
          onClick={() => onAbilityCommand(ab.id)}
          active={false}
          tooltip={ab.name}
          cooldown={ab.cooldown > 0 ? Math.ceil(ab.cooldown) : undefined} />
      );
    }

    // Fill to 12
    const totalSlots = 12;
    const emptyCount = Math.max(0, totalSlots - actionButtons.length);

    return (
      <div className="wc3-cmd-grid-wrapper">
        <div className="wc3-cmd-grid">
          {actionButtons}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <div key={`empty-${i}`} className="wc3-cmd-btn wc3-cmd-btn-empty" />
          ))}
        </div>
      </div>
    );
  }

  return <EmptyGrid />;
}

function EmptyGrid() {
  return (
    <div className="wc3-cmd-grid-wrapper">
      <div className="wc3-cmd-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="wc3-cmd-btn wc3-cmd-btn-empty" />
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  icon, label, hotkey, onClick, active, tooltip, cooldown,
}: {
  icon: string; label: string; hotkey: string;
  onClick: () => void; active: boolean; tooltip: string;
  cooldown?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`wc3-cmd-btn ${active ? 'wc3-cmd-btn-active' : ''}`}
      title={tooltip}
    >
      <div className="wc3-cmd-btn-icon">{icon}</div>
      <div className="wc3-cmd-btn-cost">{hotkey || label}</div>
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
      className="wc3-cmd-btn"
      title={tooltip}
    >
      <div className="wc3-cmd-btn-icon">{icon}</div>
      <div className="wc3-cmd-btn-cost">{costStr}</div>
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="wc3-stat-box">
      <span className="wc3-stat-label">{label}</span>
      <span className="wc3-stat-value" style={{ color }}>{value}</span>
    </div>
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
