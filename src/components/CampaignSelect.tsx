"use client";

import { useState } from "react";
import { FactionId, DifficultyLevel } from "@/game/engine/types";
import { CAMPAIGNS, CampaignChapter } from "@/game/campaign/campaigns";
import { FACTION_INFO } from "@/game/data/definitions";

interface CampaignSelectProps {
  onBack: () => void;
  onStartMission: (faction: FactionId, missionId: string, difficulty: DifficultyLevel) => void;
}

export default function CampaignSelect({ onBack, onStartMission }: CampaignSelectProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignChapter | null>(null);
  const [selectedMissionIdx, setSelectedMissionIdx] = useState(0);

  const factionIcons: Record<string, string> = {
    chuds: "🐸",
    chosen: "🎩",
    crusaders: "⚔️",
    chads: "🗿",
  };

  if (!selectedCampaign) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)" }}
      >
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#ffd700" }}>
          Campaign Mode
        </h1>
        <p className="text-sm mb-8" style={{ color: "#666" }}>
          Choose your faction and wage war across the internet
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {CAMPAIGNS.map(campaign => {
            const info = FACTION_INFO[campaign.faction];
            return (
              <button
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className="p-6 rounded-lg text-left transition-all hover:scale-105"
                style={{
                  background: "#1a1a2e",
                  border: `2px solid ${info.color}44`,
                  minWidth: 320,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{factionIcons[campaign.faction]}</span>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: info.color }}>
                      {campaign.name}
                    </h2>
                    <span className="text-xs" style={{ color: "#888" }}>
                      {info.name} - {campaign.missions.length} Missions
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#aaa" }}>
                  {campaign.description}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="px-8 py-3 rounded font-bold"
          style={{ background: "#2a2a4e", color: "#888", border: "2px solid #2a2a4e" }}
        >
          Back
        </button>
      </div>
    );
  }

  const info = FACTION_INFO[selectedCampaign.faction];
  const mission = selectedCampaign.missions[selectedMissionIdx];

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)" }}
    >
      <h1 className="text-2xl font-bold mb-1" style={{ color: info.color }}>
        {factionIcons[selectedCampaign.faction]} {selectedCampaign.name}
      </h1>
      <p className="text-xs mb-6" style={{ color: "#666" }}>
        {info.name} Campaign
      </p>

      {/* Mission list */}
      <div className="flex gap-8 mb-6">
        <div className="flex flex-col gap-2" style={{ minWidth: 200 }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: "#888" }}>Missions</h3>
          {selectedCampaign.missions.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setSelectedMissionIdx(idx)}
              className="px-4 py-2 rounded text-left text-sm transition-all"
              style={{
                background: selectedMissionIdx === idx ? "#2a2a5e" : "#1a1a2e",
                border: selectedMissionIdx === idx ? `2px solid ${info.color}` : "2px solid #2a2a4e",
                color: "#e0e0e0",
              }}
            >
              <span style={{ color: info.color }}>{idx + 1}.</span> {m.name}
            </button>
          ))}
        </div>

        {/* Mission details */}
        <div
          className="p-6 rounded-lg"
          style={{ background: "#1a1a2e", border: "2px solid #2a2a4e", maxWidth: 450 }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: info.color }}>
            {mission.name}
          </h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: "#aaa" }}>
            {mission.briefing}
          </p>

          <h3 className="text-xs font-bold mb-2" style={{ color: "#ffd700" }}>Objectives:</h3>
          <ul className="mb-4">
            {mission.objectives.map(obj => (
              <li key={obj.id} className="text-xs mb-1" style={{ color: "#ccc" }}>
                {obj.required ? "★" : "○"} {obj.description}
              </li>
            ))}
          </ul>

          {mission.sideQuests.length > 0 && (
            <>
              <h3 className="text-xs font-bold mb-2" style={{ color: "#00bfff" }}>
                Side Quests: {mission.sideQuests.length} hidden
              </h3>
            </>
          )}

          {mission.secrets.length > 0 && (
            <p className="text-xs italic" style={{ color: "#666" }}>
              {mission.secrets.length} secret(s) to discover...
            </p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs" style={{ color: "#888" }}>Difficulty:</span>
            <span className="text-xs font-bold" style={{
              color: mission.difficulty === "casual" ? "#4CAF50" :
                     mission.difficulty === "heated" ? "#FF9800" :
                     mission.difficulty === "malding" ? "#F44336" : "#888",
            }}>
              {mission.difficulty.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="px-6 py-2 rounded font-bold"
          style={{ background: "#2a2a4e", color: "#888", border: "2px solid #2a2a4e" }}
        >
          Back
        </button>
        <button
          onClick={() => onStartMission(selectedCampaign.faction, mission.id, mission.difficulty)}
          className="px-8 py-2 rounded font-bold"
          style={{ background: info.color, color: "#000", border: `2px solid ${info.color}` }}
        >
          Start Mission
        </button>
      </div>
    </div>
  );
}
