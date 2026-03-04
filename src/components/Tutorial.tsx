"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GameEngine } from "@/game/engine/GameEngine";
import { Renderer } from "@/game/engine/Renderer";
import { InputHandler } from "@/game/engine/InputHandler";
import { GameConfig, Player, Tile } from "@/game/engine/types";
import { generateDiscourseArena, getPlayerStartPositions } from "@/game/maps/MapGenerator";

// =====================================================
// TUTORIAL - Step-by-step guided walkthrough
// =====================================================

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  highlight?: "minimap" | "resources" | "selection" | "commands" | "map";
  checkComplete?: (engine: GameEngine) => boolean;
  autoComplete?: number; // auto-advance after N seconds
  onEnter?: (engine: GameEngine) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome, Commander",
    description: "Welcome to The Chronically Online Wars. This tutorial will teach you the basics of commanding your faction to victory.",
    instruction: "Press NEXT to continue.",
    autoComplete: 0,
  },
  {
    id: "camera",
    title: "Camera Controls",
    description: "Move your view by moving the mouse to the edge of the screen, or use WASD / Arrow Keys. Scroll the mouse wheel to zoom in and out.",
    instruction: "Try moving the camera around, then press NEXT.",
    highlight: "map",
    autoComplete: 0,
  },
  {
    id: "select_units",
    title: "Selecting Units",
    description: "Left-click on a unit to select it. You can also click and drag to box-select multiple units. Hold Shift to add to your selection.",
    instruction: "Try selecting one of your workers (the small figures near your base).",
    highlight: "selection",
    checkComplete: (engine) => {
      return engine.state.selectedEntities.length > 0;
    },
  },
  {
    id: "move_units",
    title: "Moving Units",
    description: "With units selected, right-click on the ground to move them there. Your units will pathfind around obstacles automatically.",
    instruction: "Select a worker and right-click somewhere nearby to move them.",
    checkComplete: (engine) => {
      for (const [, e] of engine.state.entities) {
        if (e.type === "unit") {
          const unit = e as import("@/game/engine/types").Unit;
          const owner = engine.getEntityOwner(unit.id);
          if (owner && !owner.isAI && unit.state === "moving") return true;
        }
      }
      return false;
    },
  },
  {
    id: "gather_resources",
    title: "Gathering Resources",
    description: "Your economy runs on three resources: Copium (blue crystals), Clout (golden trees), and Tendies (rare chicken). Workers gather resources when you right-click on a resource node.",
    instruction: "Select a worker and right-click on a blue Copium crystal or golden Clout tree nearby.",
    highlight: "resources",
    checkComplete: (engine) => {
      for (const [, e] of engine.state.entities) {
        if (e.type === "unit") {
          const unit = e as import("@/game/engine/types").Unit;
          const owner = engine.getEntityOwner(unit.id);
          if (owner && !owner.isAI && unit.state === "gathering") return true;
        }
      }
      return false;
    },
  },
  {
    id: "select_building",
    title: "Buildings and Training",
    description: "Click on your main building (the large structure) to select it. The command panel at the bottom-right will show what units it can train.",
    instruction: "Click on your main building to select it.",
    highlight: "commands",
    checkComplete: (engine) => {
      for (const id of engine.state.selectedEntities) {
        const e = engine.state.entities.get(id);
        if (e && e.type === "building") return true;
      }
      return false;
    },
  },
  {
    id: "train_unit",
    title: "Training Workers",
    description: "With your main building selected, click on a unit icon in the command panel to queue training. Workers cost 50 Copium. You can queue multiple units.",
    instruction: "Train a new worker from your main building.",
    checkComplete: (engine) => {
      for (const [, e] of engine.state.entities) {
        if (e.type === "building") {
          const bld = e as import("@/game/engine/types").Building;
          const owner = engine.getEntityOwner(bld.id);
          if (owner && !owner.isAI && bld.trainQueue.length > 0) return true;
        }
      }
      return false;
    },
  },
  {
    id: "build_structure",
    title: "Constructing Buildings",
    description: "Select a worker and look at the command panel. It shows buildings your faction can construct. Click a building button, then click on the map to place it.",
    instruction: "Select a worker and try building a supply structure (Tendie Stand / Investment Portfolio / Simp Barracks / Protein Locker).",
    highlight: "commands",
    autoComplete: 0,
  },
  {
    id: "minimap",
    title: "The Minimap",
    description: "The minimap in the bottom-left shows the entire battlefield. Click on it to jump your camera to that location. Colored dots show units and buildings.",
    instruction: "Try clicking on the minimap to move your view.",
    highlight: "minimap",
    autoComplete: 0,
  },
  {
    id: "combat",
    title: "Combat",
    description: "To attack enemies, select your military units and right-click on an enemy. Units will auto-attack nearby enemies. Press S to stop a unit. Use control groups (Ctrl+1-5 to assign, 1-5 to recall) to manage your army.",
    instruction: "Press NEXT when ready.",
    autoComplete: 0,
  },
  {
    id: "pause",
    title: "Pausing the Game",
    description: "Press Space to pause/resume the game at any time. This gives you time to think and issue commands. Use the Pause button in the bottom-right corner.",
    instruction: "Press NEXT when ready.",
    autoComplete: 0,
  },
  {
    id: "complete",
    title: "Tutorial Complete!",
    description: "You now know the basics. Build your economy, train an army, and crush your enemies. Remember: the key to victory is balancing economy and military. Good luck, Commander!",
    instruction: "Press FINISH to return to the main menu, or keep playing to practice.",
    autoComplete: 0,
  },
];

interface TutorialProps {
  onExit: () => void;
}

export default function Tutorial({ onExit }: TutorialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputHandler | null>(null);
  const animFrameRef = useRef<number>(0);

  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [resources, setResources] = useState({ copium: 0, clout: 0, tendies: 0 });
  const [population, setPopulation] = useState({ current: 0, max: 0 });

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const initGame = useCallback(() => {
    if (!canvasRef.current || !minimapRef.current) return;

    const canvas = canvasRef.current;
    const minimap = minimapRef.current;

    const hudHeight = 220; // extra for tutorial panel
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - hudHeight;
    minimap.width = 160;
    minimap.height = 160;

    const config: GameConfig = {
      mapWidth: 80,
      mapHeight: 80,
      tileSize: 32,
      startingResources: { copium: 800, clout: 400, tendies: 50 },
      maxPopulation: 100,
      fogOfWar: false, // No fog in tutorial for easier learning
      difficulty: "baby",
    };

    const map = generateDiscourseArena(config);
    const startPositions = getPlayerStartPositions(config.mapWidth, config.mapHeight, config.tileSize);

    const players: Player[] = [
      {
        id: "player1",
        name: "You",
        faction: "chuds",
        resources: { ...config.startingResources },
        population: 0,
        maxPopulation: 0,
        entities: [],
        upgrades: [],
        isAI: false,
        teamId: 1,
        color: "#8B6914",
        defeated: false,
      },
      {
        id: "player2",
        name: "Training Dummy",
        faction: "chads",
        resources: { copium: 9999, clout: 9999, tendies: 9999 },
        population: 0,
        maxPopulation: 100,
        entities: [],
        upgrades: [],
        isAI: false, // No AI in tutorial
        teamId: 2,
        color: "#FF4500",
        defeated: false,
      },
    ];

    const engine = new GameEngine(config, players, map);
    engineRef.current = engine;

    // Spawn player base + workers
    const p1Pos = startPositions[0];
    engine.spawnBuilding("chud_main", "chuds", p1Pos, "player1", true);
    for (let i = 0; i < 5; i++) {
      engine.spawnUnit(
        "chud_neet",
        "chuds",
        { x: p1Pos.x + 110 + (i % 3) * 25, y: p1Pos.y + 40 + Math.floor(i / 3) * 25 },
        "player1"
      );
    }

    // Spawn some enemy units for later combat practice
    const p2Pos = startPositions[1];
    engine.spawnBuilding("chad_main", "chads", p2Pos, "player2", true);
    for (let i = 0; i < 3; i++) {
      engine.spawnUnit(
        "chad_gym_rat",
        "chads",
        { x: p2Pos.x + 110 + (i % 3) * 25, y: p2Pos.y + 40 },
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

    // Game loop
    const gameLoop = (timestamp: number) => {
      engine.update(timestamp);
      input.updateCamera();
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
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

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
      input.destroy();
    };
  }, []);

  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, [initGame]);

  // Check step completion
  useEffect(() => {
    if (!step) return;
    if (step.autoComplete !== undefined) {
      setStepCompleted(true);
      return;
    }

    const interval = setInterval(() => {
      if (engineRef.current && step.checkComplete) {
        if (step.checkComplete(engineRef.current)) {
          setStepCompleted(true);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentStep, step]);

  // Execute onEnter for step
  useEffect(() => {
    if (step?.onEnter && engineRef.current) {
      step.onEnter(engineRef.current);
    }
    setStepCompleted(step?.autoComplete !== undefined);
  }, [currentStep, step]);

  const advanceStep = () => {
    if (isLastStep) {
      onExit();
      return;
    }
    setCurrentStep(prev => prev + 1);
    setStepCompleted(false);
  };

  const highlightStyle = (area: string) => {
    if (step?.highlight === area) {
      return {
        boxShadow: "0 0 12px 3px rgba(196,160,53,0.5), inset 0 0 8px rgba(196,160,53,0.15)",
        border: "2px solid #c4a035",
      };
    }
    return {};
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#0a0908" }}>
      {/* Game canvas */}
      <canvas ref={canvasRef} className="flex-1" style={{ display: "block" }} />

      {/* Tutorial + HUD panel */}
      <div
        className="flex"
        style={{
          height: 220,
          background: "linear-gradient(180deg, #1a1710 0%, #0f0e0a 100%)",
          borderTop: "2px solid #6b5a28",
        }}
      >
        {/* Minimap */}
        <div className="flex flex-col items-center p-2" style={{ borderRight: "1px solid #3a3220", ...highlightStyle("minimap") }}>
          <canvas
            ref={minimapRef}
            width={160}
            height={160}
            style={{
              border: "2px solid #6b5a28",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Tutorial panel */}
        <div
          className="flex-1 p-4 overflow-y-auto"
          style={{ borderRight: "1px solid #3a3220", maxWidth: 480 }}
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs tracking-wider uppercase" style={{ color: "#6b5a28" }}>
              Step {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <div className="flex-1 h-1 rounded" style={{ background: "#1a1710" }}>
              <div
                className="h-full rounded"
                style={{
                  width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%`,
                  background: "linear-gradient(90deg, #6b5a28, #c4a035)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-base font-bold mb-1" style={{ color: "#c4a035" }}>
            {step?.title}
          </h2>

          {/* Description */}
          <p className="text-xs leading-relaxed mb-2" style={{ color: "#b0a480" }}>
            {step?.description}
          </p>

          {/* Instruction */}
          <div
            className="text-xs px-3 py-2 rounded mb-3"
            style={{
              background: stepCompleted
                ? "linear-gradient(90deg, rgba(74,122,48,0.2), transparent)"
                : "linear-gradient(90deg, rgba(196,160,53,0.1), transparent)",
              border: stepCompleted ? "1px solid #4a7a30" : "1px solid #3a3220",
              color: stepCompleted ? "#8abc6a" : "#8a7e60",
            }}
          >
            {stepCompleted && !isLastStep
              ? "Done! Press NEXT to continue."
              : step?.instruction}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onExit} className="btn-wc3 text-xs py-1 px-3">
              Exit Tutorial
            </button>
            <button
              onClick={advanceStep}
              className="btn-wc3 btn-wc3-primary text-xs py-1 px-3"
              disabled={!stepCompleted}
              style={{ opacity: stepCompleted ? 1 : 0.4 }}
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {/* Resources panel */}
        <div className="p-3 flex flex-col justify-between" style={{ minWidth: 160, ...highlightStyle("resources") }}>
          <div>
            <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#6b5a28" }}>
              Resources
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "#4da6ff", fontSize: 12 }}>C</span>
              <span className="text-sm font-bold" style={{ color: "#4da6ff" }}>{Math.floor(resources.copium)}</span>
              <span className="text-xs" style={{ color: "#3a3220" }}>Copium</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "#c4a035", fontSize: 12 }}>*</span>
              <span className="text-sm font-bold" style={{ color: "#c4a035" }}>{Math.floor(resources.clout)}</span>
              <span className="text-xs" style={{ color: "#3a3220" }}>Clout</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "#cc6644", fontSize: 12 }}>T</span>
              <span className="text-sm font-bold" style={{ color: "#cc6644" }}>{Math.floor(resources.tendies)}</span>
              <span className="text-xs" style={{ color: "#3a3220" }}>Tendies</span>
            </div>

            <div className="separator-gold my-2" />

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#5a5030" }}>Pop:</span>
              <span className="text-sm font-bold" style={{ color: "#8a7e60" }}>
                {population.current} / {population.max}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
