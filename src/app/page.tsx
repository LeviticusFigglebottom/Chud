"use client";

import { useState } from "react";
import MainMenu from "@/components/MainMenu";
import GameView from "@/components/GameView";
import CampaignSelect from "@/components/CampaignSelect";
import { FactionId, DifficultyLevel } from "@/game/engine/types";

type Screen = "menu" | "campaign" | "skirmish" | "game";

interface GameSettings {
  faction: FactionId;
  enemyFaction: FactionId;
  difficulty: DifficultyLevel;
  missionId?: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<GameSettings>({
    faction: "chuds",
    enemyFaction: "chads",
    difficulty: "heated",
  });

  const startSkirmish = (faction: FactionId, enemy: FactionId, difficulty: DifficultyLevel) => {
    setSettings({ faction, enemyFaction: enemy, difficulty });
    setScreen("game");
  };

  const startMission = (faction: FactionId, missionId: string, difficulty: DifficultyLevel) => {
    setSettings({ faction, enemyFaction: "neutral", difficulty, missionId });
    setScreen("game");
  };

  return (
    <main className="w-screen h-screen overflow-hidden">
      {screen === "menu" && (
        <MainMenu
          onSkirmish={() => setScreen("skirmish")}
          onCampaign={() => setScreen("campaign")}
        />
      )}
      {screen === "campaign" && (
        <CampaignSelect
          onBack={() => setScreen("menu")}
          onStartMission={startMission}
        />
      )}
      {screen === "skirmish" && (
        <SkirmishSetup
          onBack={() => setScreen("menu")}
          onStart={startSkirmish}
        />
      )}
      {screen === "game" && (
        <GameView
          settings={settings}
          onExit={() => setScreen("menu")}
        />
      )}
    </main>
  );
}

function SkirmishSetup({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (faction: FactionId, enemy: FactionId, difficulty: DifficultyLevel) => void;
}) {
  const [faction, setFaction] = useState<FactionId>("chuds");
  const [enemy, setEnemy] = useState<FactionId>("chads");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("heated");

  const factions: { id: FactionId; name: string; emoji: string; desc: string }[] = [
    { id: "chuds", name: "The Chuds", emoji: "🐸", desc: "Defensive turtlers with powerful siege" },
    { id: "chosen", name: "The Chosen", emoji: "🎩", desc: "Economic powerhouse with magic units" },
    { id: "crusaders", name: "The Crusaders", emoji: "⚔️", desc: "Aggressive rush with healing sustain" },
    { id: "chads", name: "The Chads", emoji: "🗿", desc: "Fast rushdown with elite warriors" },
  ];

  const difficulties: { id: DifficultyLevel; name: string; desc: string }[] = [
    { id: "baby", name: "Baby Mode", desc: "For those who just want to vibe" },
    { id: "casual", name: "Casual", desc: "A relaxed experience" },
    { id: "heated", name: "Heated", desc: "The standard online argument" },
    { id: "malding", name: "Malding", desc: "Prepare to lose hair" },
    { id: "touch_grass", name: "Touch Grass", desc: "You clearly don't have anything better to do" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)" }}>
      <h1 className="text-3xl font-bold mb-8" style={{ color: "#00bfff" }}>Skirmish Setup</h1>

      <div className="flex gap-12 mb-8">
        <div>
          <h2 className="text-lg mb-3 text-center" style={{ color: "#ffd700" }}>Your Faction</h2>
          <div className="flex flex-col gap-2">
            {factions.map(f => (
              <button
                key={f.id}
                onClick={() => setFaction(f.id)}
                className="px-4 py-3 rounded text-left transition-all"
                style={{
                  background: faction === f.id ? "#2a2a5e" : "#1a1a2e",
                  border: faction === f.id ? "2px solid #00bfff" : "2px solid #2a2a4e",
                  color: "#e0e0e0",
                  minWidth: "260px",
                }}
              >
                <span className="text-lg mr-2">{f.emoji}</span>
                <span className="font-bold">{f.name}</span>
                <span className="block text-xs mt-1" style={{ color: "#888" }}>{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg mb-3 text-center" style={{ color: "#ff4444" }}>Enemy Faction</h2>
          <div className="flex flex-col gap-2">
            {factions.filter(f => f.id !== faction).map(f => (
              <button
                key={f.id}
                onClick={() => setEnemy(f.id)}
                className="px-4 py-3 rounded text-left transition-all"
                style={{
                  background: enemy === f.id ? "#3e1a1a" : "#1a1a2e",
                  border: enemy === f.id ? "2px solid #ff4444" : "2px solid #2a2a4e",
                  color: "#e0e0e0",
                  minWidth: "260px",
                }}
              >
                <span className="text-lg mr-2">{f.emoji}</span>
                <span className="font-bold">{f.name}</span>
                <span className="block text-xs mt-1" style={{ color: "#888" }}>{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg mb-3 text-center" style={{ color: "#ffd700" }}>Difficulty</h2>
        <div className="flex gap-2">
          {difficulties.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className="px-4 py-2 rounded transition-all"
              style={{
                background: difficulty === d.id ? "#2a2a5e" : "#1a1a2e",
                border: difficulty === d.id ? "2px solid #00bfff" : "2px solid #2a2a4e",
                color: "#e0e0e0",
              }}
              title={d.desc}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-8 py-3 rounded font-bold transition-all"
          style={{ background: "#2a2a4e", color: "#888", border: "2px solid #2a2a4e" }}
        >
          Back
        </button>
        <button
          onClick={() => onStart(faction, enemy, difficulty)}
          className="px-8 py-3 rounded font-bold transition-all"
          style={{ background: "#00bfff", color: "#000", border: "2px solid #00bfff" }}
        >
          Start Battle
        </button>
      </div>
    </div>
  );
}
