"use client";

import { useState } from "react";
import MainMenu from "@/components/MainMenu";
import GameView from "@/components/GameView";
import CampaignSelect from "@/components/CampaignSelect";
import { FactionId, DifficultyLevel } from "@/game/engine/types";
import { FACTION_INFO } from "@/game/data/definitions";

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
    // For campaigns, pick a thematically appropriate enemy
    const enemyMap: Record<string, FactionId> = {
      chuds: "crusaders",
      chosen: "chads",
      crusaders: "chuds",
      chads: "chosen",
    };
    setSettings({ faction, enemyFaction: enemyMap[faction] || "chads", difficulty, missionId });
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

// ============================================================
// SKIRMISH SETUP - WC3-style faction + difficulty selection
// ============================================================

const FACTION_ICONS: Record<string, string> = {
  chuds: "\u{1F438}",
  chosen: "\u{1F3A9}",
  crusaders: "\u{2694}",
  chads: "\u{1F5FF}",
};

const FACTIONS: { id: FactionId; name: string; desc: string; playstyle: string }[] = [
  { id: "chuds", name: "The Chuds", desc: "Basement-dwelling keyboard warriors", playstyle: "Defensive / Siege" },
  { id: "chosen", name: "The Chosen", desc: "Masters of economics and media", playstyle: "Economy / Spellcasters" },
  { id: "crusaders", name: "The Crusaders", desc: "Chivalrous defenders of honor", playstyle: "Rush / Sustain" },
  { id: "chads", name: "The Chads", desc: "Pure testosterone given form", playstyle: "Aggression / Elites" },
];

const DIFFICULTIES: { id: DifficultyLevel; name: string; desc: string }[] = [
  { id: "baby", name: "Baby Mode", desc: "For those who just want to vibe" },
  { id: "casual", name: "Casual", desc: "A relaxed experience" },
  { id: "heated", name: "Heated", desc: "The standard online argument" },
  { id: "malding", name: "Malding", desc: "Prepare to lose hair" },
  { id: "touch_grass", name: "Touch Grass", desc: "You clearly don't have anything better to do" },
];

const DIFF_COLORS: Record<string, string> = {
  baby: "#6b8e6b",
  casual: "#4CAF50",
  heated: "#c4a035",
  malding: "#cc4444",
  touch_grass: "#9933cc",
};

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

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1508 0%, #0a0908 70%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #6b5a28 30%, #c4a035 50%, #6b5a28 70%, transparent 95%)" }} />

      <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "#6b5a28" }}>
        Prepare for Battle
      </div>
      <h1 className="text-3xl font-bold mb-1 shimmer-gold">Skirmish</h1>
      <div className="separator-gold mb-6" style={{ width: 200 }} />

      <div className="flex gap-10 mb-6">
        {/* Your Faction */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-3" style={{ color: "#c4a035" }}>
            Your Faction
          </h2>
          <div className="flex flex-col gap-2">
            {FACTIONS.map(f => {
              const info = FACTION_INFO[f.id];
              const selected = faction === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setFaction(f.id); if (enemy === f.id) setEnemy(FACTIONS.find(x => x.id !== f.id)?.id || "chads"); }}
                  className="px-4 py-3 rounded text-left"
                  style={{
                    background: selected
                      ? `linear-gradient(90deg, ${info.color}22, transparent)`
                      : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? `2px solid ${info.color}` : "2px solid #2a2518",
                    color: "#d4c8a0",
                    minWidth: 270,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FACTION_ICONS[f.id]}</span>
                    <span className="font-bold" style={{ color: selected ? info.color : "#d4c8a0" }}>{f.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: "#5a5030" }}>{f.desc}</span>
                  </div>
                  <span className="text-xs italic" style={{ color: "#6b5a28" }}>{f.playstyle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Enemy Faction */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-3" style={{ color: "#8b2020" }}>
            Enemy Faction
          </h2>
          <div className="flex flex-col gap-2">
            {FACTIONS.filter(f => f.id !== faction).map(f => {
              const info = FACTION_INFO[f.id];
              const selected = enemy === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setEnemy(f.id)}
                  className="px-4 py-3 rounded text-left"
                  style={{
                    background: selected
                      ? "linear-gradient(90deg, #3a181822, transparent)"
                      : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? "2px solid #8b2020" : "2px solid #2a2518",
                    color: "#d4c8a0",
                    minWidth: 270,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FACTION_ICONS[f.id]}</span>
                    <span className="font-bold" style={{ color: selected ? "#cc4444" : "#d4c8a0" }}>{f.name}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#5a5030" }}>{f.desc}</div>
                  <span className="text-xs italic" style={{ color: "#6b5a28" }}>{f.playstyle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-6">
        <h2 className="text-xs tracking-wider uppercase text-center mb-3" style={{ color: "#6b5a28" }}>
          Difficulty
        </h2>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => {
            const selected = difficulty === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wide"
                style={{
                  background: selected ? "#1e1b14" : "transparent",
                  border: selected ? `2px solid ${DIFF_COLORS[d.id]}` : "2px solid #2a2518",
                  color: selected ? DIFF_COLORS[d.id] : "#5a5030",
                  transition: "all 0.15s ease",
                }}
                title={d.desc}
              >
                {d.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center mt-2 italic" style={{ color: "#3a3220" }}>
          {DIFFICULTIES.find(d => d.id === difficulty)?.desc}
        </p>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-wc3">
          Back
        </button>
        <button onClick={() => onStart(faction, enemy, difficulty)} className="btn-wc3 btn-wc3-primary">
          Begin Battle
        </button>
      </div>
    </div>
  );
}
