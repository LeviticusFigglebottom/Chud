"use client";

import { useState, Component, ReactNode } from "react";
import MainMenu from "@/components/MainMenu";
import GameView from "@/components/GameView";
import CampaignSelect from "@/components/CampaignSelect";
import Tutorial from "@/components/Tutorial";
import { FactionId, DifficultyLevel } from "@/game/engine/types";
import { FACTION_INFO } from "@/game/data/definitions";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#1a0000", color: "#ff4444", padding: 40, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          <h1 style={{ color: "#ff6666" }}>Runtime Error</h1>
          <p><strong>{this.state.error.message}</strong></p>
          <pre style={{ color: "#cc8888", fontSize: 12, maxHeight: 400, overflow: "auto" }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: "8px 16px", background: "#333", color: "#fff", border: "1px solid #666", cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Screen = "menu" | "campaign" | "skirmish" | "game" | "tutorial";

interface GameSettings {
  faction: FactionId;
  enemyFaction: FactionId;
  difficulty: DifficultyLevel;
  missionId?: string;
  mapSize?: 'small' | 'medium' | 'large';
  mapType?: 'random' | 'discourse_arena' | 'river_crossing' | 'island_chains';
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<GameSettings>({
    faction: "chuds",
    enemyFaction: "chads",
    difficulty: "heated",
  });

  const startSkirmish = (faction: FactionId, enemy: FactionId, difficulty: DifficultyLevel, mapSize?: 'small' | 'medium' | 'large', mapType?: string) => {
    setSettings({ faction, enemyFaction: enemy, difficulty, mapSize: mapSize || 'medium', mapType: (mapType || 'random') as GameSettings['mapType'] });
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
    <ErrorBoundary>
    <main className="w-screen h-screen overflow-hidden">
      {screen === "menu" && (
        <MainMenu
          onSkirmish={() => setScreen("skirmish")}
          onCampaign={() => setScreen("campaign")}
          onTutorial={() => setScreen("tutorial")}
        />
      )}
      {screen === "tutorial" && (
        <Tutorial onExit={() => setScreen("menu")} />
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
    </ErrorBoundary>
  );
}

// ============================================================
// SKIRMISH SETUP - WC3-style faction + difficulty selection
// ============================================================

const FACTION_ICONS: Record<string, string> = {
  chuds: "CH",
  chosen: "TH",
  crusaders: "CR",
  chads: "GC",
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

const MAP_SIZES: { id: 'small' | 'medium' | 'large'; name: string; desc: string }[] = [
  { id: 'small', name: 'Small', desc: '60x60 - Quick battles' },
  { id: 'medium', name: 'Medium', desc: '80x80 - Standard size' },
  { id: 'large', name: 'Large', desc: '120x120 - Epic warfare' },
];

const MAP_TYPES: { id: string; name: string; desc: string }[] = [
  { id: 'random', name: 'Random', desc: 'Procedurally generated map' },
  { id: 'discourse_arena', name: 'Discourse Arena', desc: 'Circular arena with center meme zone' },
  { id: 'river_crossing', name: 'River Crossing', desc: 'River with bridge chokepoints' },
  { id: 'island_chains', name: 'Island Chains', desc: 'Islands connected by land bridges' },
];

function SkirmishSetup({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (faction: FactionId, enemy: FactionId, difficulty: DifficultyLevel, mapSize?: 'small' | 'medium' | 'large', mapType?: string) => void;
}) {
  const [faction, setFaction] = useState<FactionId>("chuds");
  const [enemy, setEnemy] = useState<FactionId>("chads");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("heated");
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [mapType, setMapType] = useState('random');

  return (
    <div
      className="flex flex-col items-center h-full overflow-y-auto"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #1a1508 0%, #0a0908 70%)",
        paddingTop: 32,
        paddingBottom: 32,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #6b5a28 30%, #c4a035 50%, #6b5a28 70%, transparent 95%)" }} />

      <div className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: "#6b5a28" }}>
        Prepare for Battle
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "#c4a035" }}>Skirmish</h1>
      <div className="separator-gold mb-4" style={{ width: 180 }} />

      <div className="flex gap-8 mb-4">
        {/* Your Faction */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-2" style={{ color: "#c4a035" }}>
            Your Faction
          </h2>
          <div className="flex flex-col gap-1">
            {FACTIONS.map(f => {
              const info = FACTION_INFO[f.id];
              const selected = faction === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setFaction(f.id); if (enemy === f.id) setEnemy(FACTIONS.find(x => x.id !== f.id)?.id || "chads"); }}
                  className="px-3 py-2 rounded text-left"
                  style={{
                    background: selected
                      ? `linear-gradient(90deg, ${info.color}22, transparent)`
                      : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? `1px solid ${info.color}` : "1px solid #2a2518",
                    color: "#d4c8a0",
                    minWidth: 240,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: info.color, minWidth: 20 }}>{FACTION_ICONS[f.id]}</span>
                    <span className="text-sm font-bold" style={{ color: selected ? info.color : "#d4c8a0" }}>{f.name}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a5030" }}>{f.playstyle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Enemy Faction */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-2" style={{ color: "#8b2020" }}>
            Enemy Faction
          </h2>
          <div className="flex flex-col gap-1">
            {FACTIONS.filter(f => f.id !== faction).map(f => {
              const info = FACTION_INFO[f.id];
              const selected = enemy === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setEnemy(f.id)}
                  className="px-3 py-2 rounded text-left"
                  style={{
                    background: selected
                      ? "linear-gradient(90deg, #3a181822, transparent)"
                      : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? "1px solid #8b2020" : "1px solid #2a2518",
                    color: "#d4c8a0",
                    minWidth: 240,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: info.color, minWidth: 20 }}>{FACTION_ICONS[f.id]}</span>
                    <span className="text-sm font-bold" style={{ color: selected ? "#cc4444" : "#d4c8a0" }}>{f.name}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a5030" }}>{f.playstyle}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Settings Row */}
      <div className="flex gap-6 mb-4">
        {/* Map Type */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-2" style={{ color: "#6b5a28" }}>
            Map
          </h2>
          <div className="flex flex-col gap-1">
            {MAP_TYPES.map(m => {
              const selected = mapType === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMapType(m.id)}
                  className="px-3 py-1.5 rounded text-left"
                  style={{
                    background: selected ? "linear-gradient(90deg, #2a3a1822, transparent)" : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? "1px solid #6b8e6b" : "1px solid #2a2518",
                    color: selected ? "#8abc6a" : "#5a5030",
                    minWidth: 200,
                  }}
                >
                  <span className="text-xs font-bold">{m.name}</span>
                  <div className="text-xs mt-0.5" style={{ color: "#3a3220" }}>{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Size */}
        <div>
          <h2 className="text-xs tracking-wider uppercase text-center mb-2" style={{ color: "#6b5a28" }}>
            Map Size
          </h2>
          <div className="flex flex-col gap-1">
            {MAP_SIZES.map(s => {
              const selected = mapSize === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setMapSize(s.id)}
                  className="px-3 py-1.5 rounded text-left"
                  style={{
                    background: selected ? "linear-gradient(90deg, #2a3a1822, transparent)" : "linear-gradient(180deg, #1e1b14, #12100a)",
                    border: selected ? "1px solid #6b8e6b" : "1px solid #2a2518",
                    color: selected ? "#8abc6a" : "#5a5030",
                    minWidth: 160,
                  }}
                >
                  <span className="text-xs font-bold">{s.name}</span>
                  <div className="text-xs mt-0.5" style={{ color: "#3a3220" }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-4">
        <h2 className="text-xs tracking-wider uppercase text-center mb-2" style={{ color: "#6b5a28" }}>
          Difficulty
        </h2>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => {
            const selected = difficulty === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide"
                style={{
                  background: selected ? "#1e1b14" : "transparent",
                  border: selected ? `1px solid ${DIFF_COLORS[d.id]}` : "1px solid #2a2518",
                  color: selected ? DIFF_COLORS[d.id] : "#5a5030",
                }}
                title={d.desc}
              >
                {d.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center mt-1 italic" style={{ color: "#3a3220" }}>
          {DIFFICULTIES.find(d => d.id === difficulty)?.desc}
        </p>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-wc3">
          Back
        </button>
        <button onClick={() => onStart(faction, enemy, difficulty, mapSize, mapType)} className="btn-wc3 btn-wc3-primary">
          Begin Battle
        </button>
      </div>
    </div>
  );
}
