"use client";

import { RefObject } from "react";
import { Entity, Unit, Building, Resources, FactionId } from "@/game/engine/types";
import {
  getFactionBuildings, getFactionUnits,
  getBuildingDefinition, getUnitDefinition,
  FACTION_INFO,
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
        height: 200,
        background: "#0d0d1a",
        borderTop: "2px solid #2a2a4e",
      }}
    >
      {/* Left: Minimap */}
      <div className="flex flex-col items-center p-2" style={{ borderRight: "1px solid #2a2a4e" }}>
        <canvas
          ref={minimapRef}
          width={200}
          height={180}
          style={{ border: "1px solid #2a2a4e", borderRadius: 2 }}
        />
      </div>

      {/* Center-left: Selection info */}
      <div className="flex-1 p-3 overflow-y-auto" style={{ minWidth: 200, borderRight: "1px solid #2a2a4e" }}>
        {selectedEntities.length === 0 && (
          <div className="text-xs" style={{ color: "#555" }}>
            No units selected. Left-click or drag to select.
          </div>
        )}

        {selectedEntities.length > 1 && (
          <div>
            <div className="text-xs mb-2" style={{ color: "#888" }}>
              {selectedEntities.length} units selected
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
                      width: 32,
                      height: 32,
                      background: "#1a1a2e",
                      border: "1px solid #2a2a4e",
                      fontSize: 14,
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

        {selectedUnit && (
          <UnitInfo unit={selectedUnit} />
        )}

        {selectedBuilding && (
          <BuildingInfo building={selectedBuilding} />
        )}
      </div>

      {/* Center-right: Command panel */}
      <div className="p-3" style={{ minWidth: 280, borderRight: "1px solid #2a2a4e" }}>
        <CommandPanel
          selectedEntities={selectedEntities}
          faction={faction}
          onTrainUnit={onTrainUnit}
          onBuildBuilding={onBuildBuilding}
        />
      </div>

      {/* Right: Resources and status */}
      <div className="p-3 flex flex-col justify-between" style={{ minWidth: 200 }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: "#00BFFF" }}>💎</span>
            <span className="text-sm font-bold" style={{ color: "#00BFFF" }}>
              {Math.floor(resources.copium)}
            </span>
            <span className="text-xs" style={{ color: "#555" }}>Copium</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: "#FFD700" }}>⭐</span>
            <span className="text-sm font-bold" style={{ color: "#FFD700" }}>
              {Math.floor(resources.clout)}
            </span>
            <span className="text-xs" style={{ color: "#555" }}>Clout</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#FF6347" }}>🍗</span>
            <span className="text-sm font-bold" style={{ color: "#FF6347" }}>
              {Math.floor(resources.tendies)}
            </span>
            <span className="text-xs" style={{ color: "#555" }}>Tendies</span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: "#888" }}>👥</span>
            <span className="text-sm" style={{
              color: population.current >= population.max ? "#FF4444" : "#888",
            }}>
              {population.current}/{population.max}
            </span>
            <span className="text-xs" style={{ color: "#555" }}>Pop</span>
          </div>

          <div className="text-xs mt-2" style={{ color: "#555" }}>
            {minutes}:{seconds.toString().padStart(2, "0")}
            {paused && <span style={{ color: "#ffd700" }}> [PAUSED]</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={onTogglePause}
            className="px-3 py-1 rounded text-xs"
            style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", color: "#888" }}
          >
            {paused ? "Resume (Space)" : "Pause (Space)"}
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1 rounded text-xs"
            style={{ background: "#2a1a1a", border: "1px solid #4e2a2a", color: "#ff4444" }}
          >
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitInfo({ unit }: { unit: Unit }) {
  const def = getUnitDefinition(unit.unitType);
  if (!def) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <div className="text-sm font-bold" style={{ color: "#e0e0e0" }}>
            {def.name}
            {unit.isHero && <span style={{ color: "#ffd700" }}> ★ Lv{unit.level}</span>}
          </div>
          <div className="text-xs" style={{ color: "#888" }}>{unit.state}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span style={{ color: "#4CAF50" }}>HP: </span>
          <span>{Math.floor(unit.hp)}/{unit.maxHp}</span>
        </div>
        <div>
          <span style={{ color: "#FF9800" }}>DMG: </span>
          <span>{unit.damage}</span>
        </div>
        <div>
          <span style={{ color: "#2196F3" }}>ARM: </span>
          <span>{unit.armor}</span>
        </div>
        <div>
          <span style={{ color: "#9C27B0" }}>SPD: </span>
          <span>{unit.speed}</span>
        </div>
        <div>
          <span style={{ color: "#FF5722" }}>RNG: </span>
          <span>{unit.attackRange}</span>
        </div>
        <div>
          <span style={{ color: "#607D8B" }}>AS: </span>
          <span>{unit.attackSpeed.toFixed(1)}/s</span>
        </div>
      </div>

      {unit.abilities.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-bold mb-1" style={{ color: "#00bfff" }}>Abilities:</div>
          {unit.abilities.map(ability => (
            <div key={ability.id} className="text-xs mb-1" style={{ color: "#aaa" }}>
              {ability.icon} {ability.name}
              {ability.currentCooldown > 0 && (
                <span style={{ color: "#ff4444" }}> ({Math.ceil(ability.currentCooldown)}s)</span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-2 italic" style={{ color: "#555" }}>{def.description}</p>
    </div>
  );
}

function BuildingInfo({ building }: { building: Building }) {
  const def = getBuildingDefinition(building.buildingType);
  if (!def) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <div className="text-sm font-bold" style={{ color: "#e0e0e0" }}>{def.name}</div>
          <div className="text-xs" style={{ color: "#888" }}>{building.state}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span style={{ color: "#4CAF50" }}>HP: </span>
          <span>{Math.floor(building.hp)}/{building.maxHp}</span>
        </div>
        <div>
          <span style={{ color: "#2196F3" }}>ARM: </span>
          <span>{def.armor}</span>
        </div>
      </div>

      {building.state === "constructing" && (
        <div className="mt-2">
          <div className="text-xs" style={{ color: "#ffd700" }}>
            Building... {Math.floor(building.buildProgress)}%
          </div>
          <div className="w-full h-2 rounded mt-1" style={{ background: "#2a2a4e" }}>
            <div
              className="h-full rounded"
              style={{ background: "#ffd700", width: `${building.buildProgress}%` }}
            />
          </div>
        </div>
      )}

      {building.trainQueue.length > 0 && (
        <div className="mt-2">
          <div className="text-xs" style={{ color: "#00bfff" }}>
            Training: {building.trainQueue[0].unitType.split("_").slice(1).join(" ")} ({Math.floor(building.trainQueue[0].progress)}%)
          </div>
          <div className="w-full h-2 rounded mt-1" style={{ background: "#2a2a4e" }}>
            <div
              className="h-full rounded"
              style={{ background: "#00bfff", width: `${building.trainQueue[0].progress}%` }}
            />
          </div>
          {building.trainQueue.length > 1 && (
            <div className="text-xs mt-1" style={{ color: "#555" }}>
              +{building.trainQueue.length - 1} in queue
            </div>
          )}
        </div>
      )}

      <p className="text-xs mt-2 italic" style={{ color: "#555" }}>{def.description}</p>
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

  // Show train buttons for selected building
  if (selectedBuilding && selectedBuilding.state !== "constructing") {
    const def = getBuildingDefinition(selectedBuilding.buildingType);
    if (!def) return null;

    return (
      <div>
        <div className="text-xs font-bold mb-2" style={{ color: "#ffd700" }}>Train Units:</div>
        <div className="grid grid-cols-3 gap-2">
          {def.trains.map(unitId => {
            const unitDef = getUnitDefinition(unitId);
            if (!unitDef) return null;
            return (
              <button
                key={unitId}
                onClick={() => onTrainUnit(unitId)}
                className="p-2 rounded text-center transition-all hover:scale-105"
                style={{
                  background: "#1a1a2e",
                  border: "1px solid #2a2a4e",
                }}
                title={`${unitDef.name}\n${unitDef.description}\nCost: ${unitDef.cost.copium || 0}💎 ${unitDef.cost.clout || 0}⭐ ${unitDef.cost.tendies || 0}🍗`}
              >
                <div className="text-lg">{unitDef.icon}</div>
                <div className="text-xs truncate" style={{ color: "#aaa" }}>{unitDef.name}</div>
                <div className="text-xs" style={{ color: "#00BFFF" }}>
                  {unitDef.cost.copium || 0}💎
                  {unitDef.cost.clout ? ` ${unitDef.cost.clout}⭐` : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Show build buttons for workers
  if (hasWorkers) {
    const buildings = getFactionBuildings(faction);

    return (
      <div>
        <div className="text-xs font-bold mb-2" style={{ color: "#ffd700" }}>Build:</div>
        <div className="grid grid-cols-3 gap-2">
          {buildings.map(bdef => (
            <button
              key={bdef.id}
              onClick={() => onBuildBuilding(bdef.id)}
              className="p-2 rounded text-center transition-all hover:scale-105"
              style={{
                background: "#1a1a2e",
                border: "1px solid #2a2a4e",
              }}
              title={`${bdef.name}\n${bdef.description}\nCost: ${bdef.cost.copium || 0}💎 ${bdef.cost.clout || 0}⭐ ${bdef.cost.tendies || 0}🍗`}
            >
              <div className="text-lg">{bdef.icon}</div>
              <div className="text-xs truncate" style={{ color: "#aaa" }}>{bdef.name}</div>
              <div className="text-xs" style={{ color: "#00BFFF" }}>
                {bdef.cost.copium || 0}💎
                {bdef.cost.clout ? ` ${bdef.cost.clout}⭐` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default - show hotkeys
  return (
    <div>
      <div className="text-xs font-bold mb-2" style={{ color: "#888" }}>Controls:</div>
      <div className="text-xs leading-relaxed" style={{ color: "#555" }}>
        <div><span style={{ color: "#888" }}>Left-click:</span> Select</div>
        <div><span style={{ color: "#888" }}>Drag:</span> Box select</div>
        <div><span style={{ color: "#888" }}>Right-click:</span> Move/Attack/Gather</div>
        <div><span style={{ color: "#888" }}>Shift+click:</span> Add to selection</div>
        <div><span style={{ color: "#888" }}>S:</span> Stop units</div>
        <div><span style={{ color: "#888" }}>Space:</span> Pause/Resume</div>
        <div><span style={{ color: "#888" }}>Ctrl+1-5:</span> Save group</div>
        <div><span style={{ color: "#888" }}>1-5:</span> Select group</div>
        <div><span style={{ color: "#888" }}>Scroll:</span> Zoom in/out</div>
        <div><span style={{ color: "#888" }}>Arrows/Edge:</span> Pan camera</div>
        <div><span style={{ color: "#888" }}>Esc:</span> Cancel action</div>
      </div>
    </div>
  );
}
