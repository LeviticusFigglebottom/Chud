"use client";

import { RefObject } from "react";
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
  onTrainUnit: (unitType: string) => void;
  onBuildBuilding: (buildingType: string) => void;
  onTogglePause: () => void;
  onExit: () => void;
}

export default function GameHUD({
  minimapRef,
  resources,
  population,
  gameTime,
  paused,
  selectedEntities,
  faction,
  onTrainUnit,
  onBuildBuilding,
  onTogglePause,
  onExit,
}: GameHUDProps) {
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);

  const selectedUnit = selectedEntities.length === 1 && selectedEntities[0].type === "unit"
    ? selectedEntities[0] as Unit : null;
  const selectedBuilding = selectedEntities.length === 1 && selectedEntities[0].type === "building"
    ? selectedEntities[0] as Building : null;

  return (
    <div
      className="flex"
      style={{
        height: 190,
        background: "linear-gradient(180deg, #1a1710 0%, #0f0e0a 100%)",
        borderTop: "2px solid #6b5a28",
        boxShadow: "inset 0 1px 0 rgba(196,160,53,0.1), 0 -4px 12px rgba(0,0,0,0.5)",
      }}
    >
      {/* === MINIMAP === */}
      <div className="flex flex-col items-center p-2" style={{ borderRight: "1px solid #3a3220" }}>
        <canvas
          ref={minimapRef}
          width={176}
          height={176}
          style={{
            border: "2px solid #6b5a28",
            borderRadius: 2,
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.5), 0 0 4px rgba(107,90,40,0.3)",
          }}
        />
      </div>

      {/* === SELECTION INFO === */}
      <div className="flex-1 p-3 overflow-y-auto" style={{ minWidth: 220, borderRight: "1px solid #3a3220" }}>
        {selectedEntities.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs italic text-center" style={{ color: "#3a3220" }}>
              Select units or buildings to view details.
            </div>
          </div>
        )}

        {selectedEntities.length > 1 && (
          <div>
            <div className="text-xs font-bold mb-2 tracking-wider uppercase" style={{ color: "#6b5a28" }}>
              {selectedEntities.length} Units Selected
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedEntities.slice(0, 24).map(e => {
                const isUnit = e.type === "unit";
                const unitDef = isUnit ? getUnitDefinition((e as Unit).unitType) : null;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-center rounded"
                    style={{
                      width: 34, height: 34,
                      background: "linear-gradient(180deg, #1e1b14, #12100a)",
                      border: "1px solid #3a3220",
                      fontSize: 15,
                    }}
                    title={unitDef?.name || "Unit"}
                  >
                    {unitDef?.icon || "?"}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedUnit && <UnitInfo unit={selectedUnit} />}
        {selectedBuilding && <BuildingInfo building={selectedBuilding} />}
      </div>

      {/* === COMMAND PANEL === */}
      <div className="p-3" style={{ minWidth: 300, borderRight: "1px solid #3a3220" }}>
        <CommandPanel
          selectedEntities={selectedEntities}
          faction={faction}
          onTrainUnit={onTrainUnit}
          onBuildBuilding={onBuildBuilding}
        />
      </div>

      {/* === RESOURCES & STATUS === */}
      <div className="p-3 flex flex-col justify-between" style={{ minWidth: 180 }}>
        <div>
          {/* Resources */}
          <ResourceRow icon="C" value={Math.floor(resources.copium)} label="Copium" color="#4da6ff" />
          <ResourceRow icon="*" value={Math.floor(resources.clout)} label="Clout" color="#c4a035" />
          <ResourceRow icon="T" value={Math.floor(resources.tendies)} label="Tendies" color="#cc6644" />

          <div className="separator-gold my-2" />

          {/* Population */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#5a5030" }}>Pop:</span>
            <span className="text-sm font-bold resource-display" style={{
              color: population.current >= population.max ? "#8b2020" : "#8a7e60",
            }}>
              {population.current} / {population.max}
            </span>
          </div>

          {/* Timer */}
          <div className="text-xs mt-1 resource-display" style={{ color: "#3a3220" }}>
            {minutes}:{seconds.toString().padStart(2, "0")}
            {paused && <span style={{ color: "#c4a035" }}> [PAUSED]</span>}
          </div>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-1">
          <button onClick={onTogglePause} className="btn-wc3 text-xs py-1 px-2">
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={onExit} className="btn-wc3 btn-wc3-danger text-xs py-1 px-2">
            Surrender
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Subcomponents =====

function ResourceRow({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span className="text-sm font-bold resource-display" style={{ color, minWidth: 40 }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "#3a3220" }}>{label}</span>
    </div>
  );
}

function UnitInfo({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  if (!def) return null;

  const hpRatio = unit.hp / unit.maxHp;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl flex items-center justify-center rounded"
          style={{ width: 36, height: 36, background: "#12100a", border: "1px solid #3a3220" }}>
          {def.icon}
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: "#d4c8a0" }}>
            {def.name}
            {unit.isHero && <span style={{ color: "#c4a035" }}> \u2605 Lv{unit.level}</span>}
          </div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "#5a5030" }}>{unit.state}</div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="w-full h-2 rounded" style={{ background: "#1a1710", border: "1px solid #3a3220" }}>
          <div className="h-full rounded" style={{
            width: `${hpRatio * 100}%`,
            background: hpRatio > 0.6 ? "#4a7a30" : hpRatio > 0.3 ? "#8b7320" : "#8b2020",
            transition: "width 0.2s",
          }} />
        </div>
        <div className="text-xs mt-1" style={{ color: "#5a5030" }}>
          {Math.floor(unit.hp)} / {unit.maxHp}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
        <StatItem label="DMG" value={String(unit.damage)} color="#cc8844" />
        <StatItem label="ARM" value={String(unit.armor)} color="#6688aa" />
        <StatItem label="SPD" value={String(unit.speed)} color="#88aa66" />
        <StatItem label="RNG" value={String(unit.attackRange)} color="#aa6666" />
        <StatItem label="AS" value={`${unit.attackSpeed.toFixed(1)}/s`} color="#8866aa" />
      </div>

      {/* Abilities */}
      {unit.abilities.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: "#6b5a28" }}>
            Abilities
          </div>
          {unit.abilities.map(ability => (
            <div key={ability.id} className="text-xs mb-1 flex items-center gap-1" style={{ color: "#8a7e60" }}>
              <span>{ability.icon}</span>
              <span>{ability.name}</span>
              {ability.currentCooldown > 0 && (
                <span style={{ color: "#8b2020" }}>({Math.ceil(ability.currentCooldown)}s)</span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-2 italic" style={{ color: "#3a3220" }}>{def.description}</p>
    </div>
  );
}

function BuildingInfo({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  if (!def) return null;

  const hpRatio = building.hp / building.maxHp;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl flex items-center justify-center rounded"
          style={{ width: 36, height: 36, background: "#12100a", border: "1px solid #3a3220" }}>
          {def.icon}
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: "#d4c8a0" }}>{def.name}</div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "#5a5030" }}>{building.state}</div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="w-full h-2 rounded" style={{ background: "#1a1710", border: "1px solid #3a3220" }}>
          <div className="h-full rounded" style={{
            width: `${hpRatio * 100}%`,
            background: hpRatio > 0.6 ? "#4a7a30" : hpRatio > 0.3 ? "#8b7320" : "#8b2020",
          }} />
        </div>
        <div className="text-xs mt-1" style={{ color: "#5a5030" }}>
          {Math.floor(building.hp)} / {building.maxHp}
        </div>
      </div>

      {/* Construction progress */}
      {building.state === "constructing" && (
        <div className="mb-2">
          <div className="text-xs mb-1" style={{ color: "#c4a035" }}>
            Constructing... {Math.floor(building.buildProgress)}%
          </div>
          <div className="w-full h-2 rounded" style={{ background: "#1a1710", border: "1px solid #3a3220" }}>
            <div className="h-full rounded" style={{ background: "#c4a035", width: `${building.buildProgress}%` }} />
          </div>
        </div>
      )}

      {/* Training progress */}
      {building.trainQueue.length > 0 && (
        <div className="mb-2">
          <div className="text-xs mb-1" style={{ color: "#4da6ff" }}>
            Training: {building.trainQueue[0].unitType.split("_").slice(1).join(" ")} ({Math.floor(building.trainQueue[0].progress)}%)
          </div>
          <div className="w-full h-2 rounded" style={{ background: "#1a1710", border: "1px solid #3a3220" }}>
            <div className="h-full rounded" style={{ background: "#4da6ff", width: `${building.trainQueue[0].progress}%` }} />
          </div>
          {building.trainQueue.length > 1 && (
            <div className="text-xs mt-1" style={{ color: "#3a3220" }}>
              +{building.trainQueue.length - 1} queued
            </div>
          )}
        </div>
      )}

      <p className="text-xs mt-1 italic" style={{ color: "#3a3220" }}>{def.description}</p>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <span className="font-bold" style={{ color }}>{label}: </span>
      <span style={{ color: "#8a7e60" }}>{value}</span>
    </div>
  );
}

function CommandPanel({
  selectedEntities,
  faction,
  onTrainUnit,
  onBuildBuilding,
}: {
  selectedEntities: Entity[];
  faction: FactionId;
  onTrainUnit: (unitType: string) => void;
  onBuildBuilding: (buildingType: string) => void;
}) {
  const selectedBuilding = selectedEntities.length === 1 && selectedEntities[0].type === "building"
    ? selectedEntities[0] as Building : null;
  const selectedUnits = selectedEntities.filter(e => e.type === "unit") as Unit[];
  const hasWorkers = selectedUnits.some(u =>
    ["chud_neet", "chosen_merchant", "crusader_simp", "chad_gym_rat"].includes(u.unitType)
  );

  // Building selected - show train options
  if (selectedBuilding && selectedBuilding.state !== "constructing") {
    const def = getBuildingDefinition(selectedBuilding.buildingType);
    if (!def || def.trains.length === 0) return <DefaultControls />;

    return (
      <div>
        <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#6b5a28" }}>
          Train Units
        </div>
        <div className="grid grid-cols-3 gap-2">
          {def.trains.map(unitId => {
            const unitDef = getUnitDefinition(unitId);
            if (!unitDef) return null;
            return (
              <CommandButton
                key={unitId}
                icon={unitDef.icon}
                name={unitDef.name}
                cost={`${unitDef.cost.copium || 0}`}
                costExtra={unitDef.cost.clout ? `${unitDef.cost.clout}` : undefined}
                onClick={() => onTrainUnit(unitId)}
                tooltip={unitDef.description}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Workers selected - show build options
  if (hasWorkers) {
    const buildings = getFactionBuildings(faction);
    return (
      <div>
        <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#6b5a28" }}>
          Construct Buildings
        </div>
        <div className="grid grid-cols-3 gap-2">
          {buildings.map(bdef => (
            <CommandButton
              key={bdef.id}
              icon={bdef.icon}
              name={bdef.name}
              cost={`${bdef.cost.copium || 0}`}
              costExtra={bdef.cost.clout ? `${bdef.cost.clout}` : undefined}
              onClick={() => onBuildBuilding(bdef.id)}
              tooltip={bdef.description}
            />
          ))}
        </div>
      </div>
    );
  }

  return <DefaultControls />;
}

function CommandButton({
  icon, name, cost, costExtra, onClick, tooltip,
}: {
  icon: string; name: string; cost: string; costExtra?: string;
  onClick: () => void; tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded text-center"
      style={{
        background: "linear-gradient(180deg, #1e1b14, #12100a)",
        border: "1px solid #3a3220",
        transition: "all 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6b5a28"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3a3220"; }}
      title={tooltip}
    >
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div className="text-xs truncate mt-1" style={{ color: "#8a7e60" }}>{name}</div>
      <div className="text-xs" style={{ color: "#4da6ff" }}>
        {cost}c
        {costExtra && <span style={{ color: "#c4a035" }}> {costExtra}*</span>}
      </div>
    </button>
  );
}

function DefaultControls() {
  return (
    <div>
      <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#6b5a28" }}>
        Commands
      </div>
      <div className="text-xs leading-loose" style={{ color: "#5a5030" }}>
        <ControlRow keys="LMB" desc="Select" />
        <ControlRow keys="Drag" desc="Box Select" />
        <ControlRow keys="RMB" desc="Move / Attack / Gather" />
        <ControlRow keys="Shift" desc="Add to Selection" />
        <ControlRow keys="S" desc="Stop" />
        <ControlRow keys="Space" desc="Pause / Resume" />
        <ControlRow keys="Ctrl+#" desc="Save Group" />
        <ControlRow keys="1-5" desc="Recall Group" />
        <ControlRow keys="Scroll" desc="Zoom" />
        <ControlRow keys="Esc" desc="Cancel" />
      </div>
    </div>
  );
}

function ControlRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-bold" style={{ color: "#6b5a28", minWidth: 50 }}>{keys}</span>
      <span>{desc}</span>
    </div>
  );
}
