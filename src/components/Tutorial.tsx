"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GameEngine } from "@/game/engine/GameEngine";
import { Renderer } from "@/game/engine/Renderer";
import { InputHandler } from "@/game/engine/InputHandler";
import { GameConfig, Player, Entity } from "@/game/engine/types";
import { generateDiscourseArena, getPlayerStartPositions } from "@/game/maps/MapGenerator";
import GameHUD from "./GameHUD";

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
  autoComplete?: number;
  onEnter?: (engine: GameEngine) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome, Commander",
    description: "Welcome to The Chronically Online Wars. This tutorial will teach you the basics of commanding your faction to ultimate victory.",
    instruction: "Press NEXT to begin training.",
    autoComplete: 0,
  },
  {
    id: "camera",
    title: "Camera Controls",
    description: "Move your view with WASD or Arrow keys. Scroll mouse wheel to zoom. The minimap (bottom-left) lets you click to jump anywhere on the battlefield.",
    instruction: "Move the camera around with WASD, then press NEXT.",
    highlight: "map",
    autoComplete: 0,
  },
  {
    id: "select_units",
    title: "Selecting Units",
    description: "Left-click a unit to select it. Click-drag to box-select multiple units. Hold Shift to add to selection. Ctrl+1-5 saves control groups, 1-5 recalls them.",
    instruction: "Select one of your workers near your base.",
    highlight: "selection",
    checkComplete: (engine) => engine.state.selectedEntities.length > 0,
  },
  {
    id: "move_units",
    title: "Moving Units",
    description: "With units selected, right-click on the ground to issue a move order. Units pathfind around buildings and terrain automatically.",
    instruction: "Right-click somewhere to move your selected units.",
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
    description: "Your economy needs Copium (blue crystals), Clout (golden trees), and Tendies (rare food). Right-click a resource node with a worker to begin gathering. Workers automatically shuttle between the resource and your nearest base.",
    instruction: "Right-click a Copium crystal or Clout tree with a worker selected.",
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
    title: "Your Main Building",
    description: "Click your main base building to select it. The bottom-right panel shows available actions: units you can train. Each unit has a cost shown below its icon.",
    instruction: "Left-click your main building (the large structure).",
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
    title: "Training Units",
    description: "With your building selected, click a unit icon in the action grid (bottom-right) to queue training. You can queue multiple units. Workers cost 50 Copium. Military units cost more and need advanced buildings.",
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
    description: "Select a worker and click the Build button (hammer icon) or press B. A grid overlay shows valid placement in green and invalid in red. Click to place, then workers will construct it. Buildings provide population cap, training options, and tech.",
    instruction: "Select a worker, press B, and place a building on a green tile.",
    highlight: "commands",
    checkComplete: (engine) => {
      let playerBuildings = 0;
      for (const [, e] of engine.state.entities) {
        if (e.type === "building") {
          const owner = engine.getEntityOwner(e.id);
          if (owner && !owner.isAI) playerBuildings++;
        }
      }
      return playerBuildings >= 2; // Must have placed at least one new building
    },
  },
  {
    id: "upkeep",
    title: "Upkeep & Economy",
    description: "Your army consumes Tendies as upkeep. For every 5 population, 1 Tendie is consumed every 10 seconds. Keep your economy strong! Gather all three resources to sustain a large army.",
    instruction: "Press NEXT to continue.",
    autoComplete: 0,
  },
  {
    id: "patrol",
    title: "Patrol & Defense",
    description: "Select units and press P, then click to set a patrol route. Units will walk back and forth and engage enemies they encounter. Use this to guard your base perimeter while you focus elsewhere.",
    instruction: "Select a worker or unit, press P, and click a location to patrol.",
    checkComplete: (engine) => {
      for (const [, e] of engine.state.entities) {
        if (e.type === "unit") {
          const unit = e as import("@/game/engine/types").Unit;
          const owner = engine.getEntityOwner(unit.id);
          if (owner && !owner.isAI && unit.state === "patrolling") return true;
        }
      }
      return false;
    },
  },
  {
    id: "attack_move",
    title: "Attack-Move",
    description: "Press A then click the ground to issue an attack-move. Units will walk to the target, automatically engaging any enemies on the way. This is the safest way to advance across the map.",
    instruction: "Select units, press A, then click the ground to attack-move.",
    checkComplete: (engine) => {
      for (const [, e] of engine.state.entities) {
        if (e.type === "unit") {
          const unit = e as import("@/game/engine/types").Unit;
          const owner = engine.getEntityOwner(unit.id);
          if (owner && !owner.isAI && (unit.state === "attacking" || unit.state === "moving") && unit.path.length > 0) return true;
        }
      }
      return false;
    },
  },
  {
    id: "combat_engage",
    title: "Engage the Enemy!",
    description: "Enemy units are on the map! Right-click an enemy unit to focus-fire them, or use attack-move to engage automatically. Use your hero's special abilities for a tactical edge.",
    instruction: "Defeat at least one enemy unit.",
    checkComplete: (engine) => {
      // Check if any enemy unit has died
      const enemy = engine.state.players.find(p => p.isAI || p.id === "player2");
      if (enemy) {
        let enemyUnitCount = 0;
        for (const eid of enemy.entities) {
          const e = engine.state.entities.get(eid);
          if (e && e.type === "unit") enemyUnitCount++;
        }
        return enemyUnitCount < 3; // Started with 3 enemy workers
      }
      return false;
    },
  },
  {
    id: "hero_abilities",
    title: "Hero Units",
    description: "Your Hero is a powerful unique unit. Select them and check the action grid for special abilities. Heroes gain XP from combat and level up, becoming even stronger. Protect them!",
    instruction: "Press NEXT when you're ready to graduate.",
    autoComplete: 0,
  },
  {
    id: "complete",
    title: "Tutorial Complete!",
    description: "You've mastered the basics: economy, building, combat, and tactics. Now go forth and conquer in Campaign or Skirmish mode! Remember: expand your base, maintain upkeep, and crush your enemies.",
    instruction: "Press FINISH to return to menu, or keep practicing.",
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
  const [gameTime, setGameTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [inputMode, setInputMode] = useState("normal");

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

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

    const config: GameConfig = {
      mapWidth: 80,
      mapHeight: 80,
      tileSize: 32,
      startingResources: { copium: 800, clout: 400, tendies: 50 },
      maxPopulation: 100,
      fogOfWar: false,
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
        isAI: true,
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

    // Spawn player hero
    engine.spawnUnit(
      "chud_pepe_lord",
      "chuds",
      { x: p1Pos.x + 50, y: p1Pos.y + 110 },
      "player1"
    );

    // Spawn some enemy units for combat practice
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

    // Selection callback
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
      renderer.placementPreview = input.getPlacementPreview();
      renderer.render(engine.state);

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

      if (engine.state.tick % 5 === 0) {
        const localPlayer = engine.state.players.find(p => p.id === engine.state.localPlayerId);
        if (localPlayer) {
          setResources({ ...localPlayer.resources });
          setPopulation({ current: localPlayer.population, max: localPlayer.maxPopulation });
        }
        setGameTime(engine.state.time);
        setPaused(engine.state.paused);
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

  return (
    <div className="w-full h-full flex flex-col relative" style={{ background: "#0a0908" }}>
      {/* GameHUD top panel (minimap + resources + info) */}
      <GameHUD
        minimapRef={minimapRef}
        resources={resources}
        population={population}
        gameTime={gameTime}
        paused={paused}
        selectedEntities={selectedEntities}
        faction="chuds"
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

      {/* Game canvas */}
      <canvas ref={canvasRef} id="game-canvas" className="flex-1" style={{ display: "block", marginBottom: 200 }} />

      {/* Tutorial floating panel - overlaid on the game */}
      <div className="tutorial-overlay">
        <div className="tutorial-step-indicator">
          Step {currentStep + 1}/{TUTORIAL_STEPS.length}
        </div>
        <div className="tutorial-progress-bar">
          <div
            className="tutorial-progress-fill"
            style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>
        <h3 className="tutorial-title">{step?.title}</h3>
        <p className="tutorial-desc">{step?.description}</p>
        <div className={`tutorial-instruction ${stepCompleted ? 'tutorial-instruction-done' : ''}`}>
          {stepCompleted && !isLastStep
            ? "Done! Press NEXT to continue."
            : step?.instruction}
        </div>
        <div className="tutorial-buttons">
          <button onClick={onExit} className="btn-wc3" style={{ fontSize: 11, padding: "4px 12px" }}>
            Exit
          </button>
          <button
            onClick={advanceStep}
            className="btn-wc3 btn-wc3-primary"
            disabled={!stepCompleted}
            style={{ fontSize: 11, padding: "4px 12px", opacity: stepCompleted ? 1 : 0.4 }}
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
