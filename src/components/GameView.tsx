"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/game/engine/GameEngine";
import { Renderer } from "@/game/engine/Renderer";
import { InputHandler } from "@/game/engine/InputHandler";
import { GameConfig, Player, FactionId, DifficultyLevel, Entity, Unit, Building, Resources } from "@/game/engine/types";
import { generateDiscourseArena, getPlayerStartPositions } from "@/game/maps/MapGenerator";
import { FACTION_INFO, getFactionBuildings, getFactionUnits, getBuildingDefinition, getUnitDefinition } from "@/game/data/definitions";
import GameHUD from "./GameHUD";

interface GameViewProps {
  settings: {
    faction: FactionId;
    enemyFaction: FactionId;
    difficulty: DifficultyLevel;
    missionId?: string;
  };
  onExit: () => void;
}

export default function GameView({ settings, onExit }: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputHandler | null>(null);
  const animFrameRef = useRef<number>(0);

  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [resources, setResources] = useState<Resources>({ copium: 0, clout: 0, tendies: 0 });
  const [population, setPopulation] = useState({ current: 0, max: 0 });
  const [gameTime, setGameTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string>("");

  const initGame = useCallback(() => {
    if (!canvasRef.current || !minimapRef.current) return;

    const canvas = canvasRef.current;
    const minimap = minimapRef.current;

    // Set canvas size
    const hudHeight = 200;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - hudHeight;
    minimap.width = 200;
    minimap.height = 200;

    const config: GameConfig = {
      mapWidth: 80,
      mapHeight: 80,
      tileSize: 32,
      startingResources: { copium: 500, clout: 200, tendies: 0 },
      maxPopulation: 100,
      fogOfWar: true,
      difficulty: settings.difficulty,
    };

    // Generate map
    const map = generateDiscourseArena(config);
    const startPositions = getPlayerStartPositions(config.mapWidth, config.mapHeight, config.tileSize);

    // Player colors
    const factionColors: Record<string, string> = {
      chuds: "#8B6914",
      chosen: "#DAA520",
      crusaders: "#FF69B4",
      chads: "#FF4500",
    };

    // Create players
    const players: Player[] = [
      {
        id: "player1",
        name: "You",
        faction: settings.faction,
        resources: { ...config.startingResources },
        population: 0,
        maxPopulation: 0,
        entities: [],
        upgrades: [],
        isAI: false,
        teamId: 1,
        color: factionColors[settings.faction] || "#00bfff",
        defeated: false,
      },
      {
        id: "player2",
        name: "Enemy",
        faction: settings.enemyFaction,
        resources: { ...config.startingResources },
        population: 0,
        maxPopulation: 0,
        entities: [],
        upgrades: [],
        isAI: true,
        teamId: 2,
        color: factionColors[settings.enemyFaction] || "#ff4444",
        defeated: false,
      },
    ];

    // Initialize engine
    const engine = new GameEngine(config, players, map);
    engineRef.current = engine;

    // Spawn starting units for each player
    const mainBuildings: Record<string, string> = {
      chuds: "chud_main",
      chosen: "chosen_main",
      crusaders: "crusader_main",
      chads: "chad_main",
    };

    const workerTypes: Record<string, string> = {
      chuds: "chud_neet",
      chosen: "chosen_merchant",
      crusaders: "crusader_simp",
      chads: "chad_gym_rat",
    };

    // Player 1 start
    const p1Pos = startPositions[0];
    engine.spawnBuilding(mainBuildings[settings.faction], settings.faction, p1Pos, "player1", true);
    for (let i = 0; i < 5; i++) {
      engine.spawnUnit(
        workerTypes[settings.faction],
        settings.faction,
        { x: p1Pos.x + 110 + (i % 3) * 25, y: p1Pos.y + 40 + Math.floor(i / 3) * 25 },
        "player1"
      );
    }

    // Player 2 (AI) start
    const p2Pos = startPositions[1];
    engine.spawnBuilding(mainBuildings[settings.enemyFaction], settings.enemyFaction, p2Pos, "player2", true);
    for (let i = 0; i < 5; i++) {
      engine.spawnUnit(
        workerTypes[settings.enemyFaction],
        settings.enemyFaction,
        { x: p2Pos.x + 110 + (i % 3) * 25, y: p2Pos.y + 40 + Math.floor(i / 3) * 25 },
        "player2"
      );
    }

    // Set camera to player start
    engine.state.camera.x = p1Pos.x - canvas.width / 2;
    engine.state.camera.y = p1Pos.y - canvas.height / 2;
    engine.state.camera.width = canvas.width;
    engine.state.camera.height = canvas.height;
    engine.state.camera.zoom = 1;

    // Initialize renderer and input
    const renderer = new Renderer(canvas, minimap);
    rendererRef.current = renderer;

    const input = new InputHandler(engine, canvas);
    inputRef.current = input;

    input.onSelectionChange = (entities) => {
      setSelectedEntities([...entities]);
    };

    // Game loop
    const gameLoop = (timestamp: number) => {
      engine.update(timestamp);
      input.updateCamera();
      renderer.render(engine.state);

      // Draw selection box
      const dragRect = input.getDragRect();
      if (dragRect) {
        const ctx = canvas.getContext("2d")!;
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 1;
        ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        ctx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
      }

      // Update UI state periodically
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
          const winPlayer = engine.state.players.find(p => p.id === engine.state.winner);
          setWinner(winPlayer?.name || "Unknown");
        }
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - hudHeight;
      engine.state.camera.width = canvas.width;
      engine.state.camera.height = canvas.height;
      renderer.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [settings]);

  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, [initGame]);

  const handleTrainUnit = (unitType: string) => {
    inputRef.current?.trainUnit(unitType);
  };

  const handleBuildBuilding = (buildingType: string) => {
    inputRef.current?.startBuildingPlacement(buildingType);
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#0a0a1a" }}>
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="flex-1"
        style={{ display: "block" }}
      />

      {/* Game HUD */}
      <GameHUD
        minimapRef={minimapRef}
        resources={resources}
        population={population}
        gameTime={gameTime}
        paused={paused}
        selectedEntities={selectedEntities}
        faction={settings.faction}
        onTrainUnit={handleTrainUnit}
        onBuildBuilding={handleBuildBuilding}
        onTogglePause={() => {
          if (engineRef.current) {
            engineRef.current.state.paused = !engineRef.current.state.paused;
          }
        }}
        onExit={onExit}
      />

      {/* Game Over overlay */}
      {gameOver && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <h1
            className="text-5xl font-bold mb-4"
            style={{ color: winner === "You" ? "#00FF00" : "#FF4444" }}
          >
            {winner === "You" ? "VICTORY" : "DEFEAT"}
          </h1>
          <p className="text-lg mb-2" style={{ color: "#888" }}>
            {winner === "You"
              ? "You have achieved digital supremacy. Your enemies have been ratio'd into oblivion."
              : "Your faction has been cancelled. Perhaps it's time to touch grass."}
          </p>
          <p className="text-sm mb-8" style={{ color: "#555" }}>
            Game time: {Math.floor(gameTime / 60)}m {Math.floor(gameTime % 60)}s
          </p>
          <button
            onClick={onExit}
            className="px-8 py-3 rounded font-bold text-lg"
            style={{ background: "#00bfff", color: "#000", border: "2px solid #00bfff" }}
          >
            Return to Menu
          </button>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !gameOver && (
        <div
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div className="text-4xl font-bold" style={{ color: "#ffd700" }}>
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
}
