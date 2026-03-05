"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/game/engine/GameEngine";
import { Renderer } from "@/game/engine/Renderer";
import { InputHandler } from "@/game/engine/InputHandler";
import { GameConfig, Player, FactionId, DifficultyLevel, Entity, Resources } from "@/game/engine/types";
import { generateDiscourseArena, generateRiverCrossing, generateIslandChains, generateRandomMap, getPlayerStartPositions, getMapDimensions } from "@/game/maps/MapGenerator";
import GameHUD from "./GameHUD";

interface GameViewProps {
  settings: {
    faction: FactionId;
    enemyFaction: FactionId;
    difficulty: DifficultyLevel;
    missionId?: string;
    mapSize?: 'small' | 'medium' | 'large';
    mapType?: 'random' | 'discourse_arena' | 'river_crossing' | 'island_chains';
  };
  onExit: () => void;
}

const FACTION_COLORS: Record<string, string> = {
  chuds: "#8B6914",
  chosen: "#DAA520",
  crusaders: "#FF69B4",
  chads: "#FF4500",
  neutral: "#888888",
};

const MAIN_BUILDINGS: Record<string, string> = {
  chuds: "chud_main",
  chosen: "chosen_main",
  crusaders: "crusader_main",
  chads: "chad_main",
};

const WORKER_TYPES: Record<string, string> = {
  chuds: "chud_neet",
  chosen: "chosen_merchant",
  crusaders: "crusader_simp",
  chads: "chad_gym_rat",
};

const HERO_TYPES: Record<string, string> = {
  chuds: "chud_pepe_lord",
  chosen: "chosen_rothschild",
  crusaders: "crusader_chad_thundercock",
  chads: "chad_gigachad",
};

export default function GameView({ settings, onExit }: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputHandler | null>(null);
  const animFrameRef = useRef<number>(0);

  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [resources, setResources] = useState<Resources>({ copium: 0, clout: 0, tendies: 0 });
  const [population, setPopulation] = useState({ current: 0, max: 0 });
  const [gameTime, setGameTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [inputMode, setInputMode] = useState("normal");

  const initGame = useCallback(() => {
    if (!canvasRef.current || !minimapRef.current) return;

    const canvas = canvasRef.current;
    const minimap = minimapRef.current;

    const topBarHeight = 32;
    const bottomPanelHeight = 200;
    const hudHeight = topBarHeight + bottomPanelHeight;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - hudHeight;
    minimap.width = 140;
    minimap.height = 140;

    const mapDims = getMapDimensions(settings.mapSize || 'medium');
    const config: GameConfig = {
      mapWidth: mapDims.width,
      mapHeight: mapDims.height,
      tileSize: 32,
      startingResources: { copium: 500, clout: 200, tendies: 0 },
      maxPopulation: 100,
      fogOfWar: true,
      difficulty: settings.difficulty,
    };

    let map: ReturnType<typeof generateDiscourseArena>;
    switch (settings.mapType) {
      case 'discourse_arena':
        map = generateDiscourseArena(config);
        break;
      case 'river_crossing':
        map = generateRiverCrossing(config);
        break;
      case 'island_chains':
        map = generateIslandChains(config);
        break;
      default:
        map = generateRandomMap(config);
        break;
    }
    const startPositions = getPlayerStartPositions(config.mapWidth, config.mapHeight, config.tileSize);

    // Validate factions - fallback to safe defaults
    const playerFaction = MAIN_BUILDINGS[settings.faction] ? settings.faction : "chuds";
    const enemyFaction = MAIN_BUILDINGS[settings.enemyFaction] ? settings.enemyFaction : "chads";

    const players: Player[] = [
      {
        id: "player1",
        name: "You",
        faction: playerFaction,
        resources: { ...config.startingResources },
        population: 0,
        maxPopulation: 0,
        entities: [],
        upgrades: [],
        isAI: false,
        teamId: 1,
        color: FACTION_COLORS[playerFaction] || "#00bfff",
        defeated: false,
      },
      {
        id: "player2",
        name: "Enemy",
        faction: enemyFaction,
        resources: { ...config.startingResources },
        population: 0,
        maxPopulation: 0,
        entities: [],
        upgrades: [],
        isAI: true,
        teamId: 2,
        color: FACTION_COLORS[enemyFaction] || "#ff4444",
        defeated: false,
      },
    ];

    const engine = new GameEngine(config, players, map);
    engineRef.current = engine;

    // Spawn starting bases, workers, and hero
    const p1Pos = startPositions[0];
    engine.spawnBuilding(MAIN_BUILDINGS[playerFaction], playerFaction, p1Pos, "player1", true);
    for (let i = 0; i < 5; i++) {
      engine.spawnUnit(
        WORKER_TYPES[playerFaction],
        playerFaction,
        { x: p1Pos.x + 110 + (i % 3) * 25, y: p1Pos.y + 40 + Math.floor(i / 3) * 25 },
        "player1"
      );
    }
    // Spawn faction hero
    if (HERO_TYPES[playerFaction]) {
      engine.spawnUnit(
        HERO_TYPES[playerFaction],
        playerFaction,
        { x: p1Pos.x + 50, y: p1Pos.y + 110 },
        "player1"
      );
    }

    const p2Pos = startPositions[1];
    engine.spawnBuilding(MAIN_BUILDINGS[enemyFaction], enemyFaction, p2Pos, "player2", true);
    for (let i = 0; i < 5; i++) {
      engine.spawnUnit(
        WORKER_TYPES[enemyFaction],
        enemyFaction,
        { x: p2Pos.x + 110 + (i % 3) * 25, y: p2Pos.y + 40 + Math.floor(i / 3) * 25 },
        "player2"
      );
    }
    // Spawn enemy hero
    if (HERO_TYPES[enemyFaction]) {
      engine.spawnUnit(
        HERO_TYPES[enemyFaction],
        enemyFaction,
        { x: p2Pos.x + 50, y: p2Pos.y + 110 },
        "player2"
      );
    }

    // Camera
    engine.state.camera.x = p1Pos.x - canvas.width / 2;
    engine.state.camera.y = p1Pos.y - canvas.height / 2;
    engine.state.camera.width = canvas.width;
    engine.state.camera.height = canvas.height;
    engine.state.camera.zoom = 1;

    const renderer = new Renderer(canvas, minimap);
    const input = new InputHandler(engine, canvas);
    inputRef.current = input;

    input.onSelectionChange = (entities) => {
      setSelectedEntities([...entities]);
    };

    input.onModeChange = (mode) => {
      setInputMode(mode);
    };

    // Game loop
    const gameLoop = (timestamp: number) => {
      engine.update(timestamp);
      input.updateCamera();
      // Pass placement preview to renderer before drawing
      renderer.placementPreview = input.getPlacementPreview();
      renderer.render(engine.state);

      // Selection box overlay
      const dragRect = input.getDragRect();
      if (dragRect) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.strokeStyle = "#c4a035";
          ctx.lineWidth = 1;
          ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
          ctx.fillStyle = "rgba(196, 160, 53, 0.08)";
          ctx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
        }
      }

      // Sync UI state
      if (engine.state.tick % 5 === 0) {
        const localPlayer = engine.state.players.find(p => p.id === engine.state.localPlayerId);
        if (localPlayer) {
          setResources({ ...localPlayer.resources });
          setPopulation({ current: localPlayer.population, max: localPlayer.maxPopulation });
        }
        setGameTime(engine.state.time);
        setPaused(engine.state.paused);

        if (engine.state.gameOver) {
          setGameOver(true);
          const wp = engine.state.players.find(p => p.id === engine.state.winner);
          setWinner(wp?.name || "Unknown");
        }
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - topBarHeight - bottomPanelHeight;
      engine.state.camera.width = canvas.width;
      engine.state.camera.height = canvas.height;
      renderer.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
      input.destroy();
    };
  }, [settings]);

  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, [initGame]);

  return (
    <div className="w-full h-full flex flex-col relative" style={{ background: "#0a0908" }}>
      <GameHUD
        minimapRef={minimapRef}
        resources={resources}
        population={population}
        gameTime={gameTime}
        paused={paused}
        selectedEntities={selectedEntities}
        faction={settings.faction}
        inputMode={inputMode}
        onTrainUnit={(unitType) => inputRef.current?.trainUnit(unitType)}
        onBuildBuilding={(buildingType) => inputRef.current?.startBuildingPlacement(buildingType)}
        onTogglePause={() => {
          if (engineRef.current) {
            engineRef.current.state.paused = !engineRef.current.state.paused;
          }
        }}
        onExit={onExit}
        onMoveCommand={() => inputRef.current?.startMoveMode()}
        onAttackCommand={() => inputRef.current?.startAttackMove()}
        onStopCommand={() => inputRef.current?.issueStopCommand()}
        onPatrolCommand={() => inputRef.current?.startPatrolMode()}
        onAbilityCommand={(abilityId) => inputRef.current?.startAbilityTarget(abilityId)}
      />

      <canvas ref={canvasRef} id="game-canvas" className="flex-1" style={{ display: "block" }} />

      {/* Victory / Defeat overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50"
          style={{ background: "rgba(5,5,4,0.9)" }}>
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2"
              style={{ color: winner === "You" ? "#c4a035" : "#8b2020" }}>
              {winner === "You" ? "VICTORY" : "DEFEAT"}
            </h1>
            <div className="separator-gold mx-auto mb-4" style={{ width: 200 }} />
            <p className="text-base mb-2" style={{ color: "#8a7e60" }}>
              {winner === "You"
                ? "Your enemies have been ratio'd into digital oblivion."
                : "Your faction has been cancelled. Perhaps it is time to touch grass."}
            </p>
            <p className="text-xs mb-8" style={{ color: "#3a3220" }}>
              Battle duration: {Math.floor(gameTime / 60)}m {Math.floor(gameTime % 60)}s
            </p>
            <button onClick={onExit} className="btn-wc3 btn-wc3-primary">
              Return to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{ background: "rgba(5,5,4,0.5)" }}>
          <div className="text-4xl font-bold tracking-wider" style={{ color: "#c4a035" }}>
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
}
