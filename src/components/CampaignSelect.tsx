"use client";

import { useState } from "react";
import { FactionId, DifficultyLevel } from "@/game/engine/types";
import { CAMPAIGNS, CampaignChapter } from "@/game/campaign/campaigns";
import { FACTION_INFO } from "@/game/data/definitions";

const FACTION_ICONS: Record<string, string> = {
  chuds: "🐸",
  chosen: "🏦",
  crusaders: "🛡",
  chads: "💪",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  baby: "#6b8e6b",
  casual: "#4CAF50",
  heated: "#c4a035",
  malding: "#cc4444",
  touch_grass: "#9933cc",
};

interface CampaignSelectProps {
  onBack: () => void;
  onStartMission: (faction: FactionId, missionId: string, difficulty: DifficultyLevel) => void;
}

export default function CampaignSelect({ onBack, onStartMission }: CampaignSelectProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignChapter | null>(null);
  const [selectedMissionIdx, setSelectedMissionIdx] = useState(0);

  if (!selectedCampaign) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1508 0%, #0a0908 70%)" }}
      >
        {/* Top border */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #6b5a28 30%, #c4a035 50%, #6b5a28 70%, transparent 95%)" }} />

        <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "#6b5a28" }}>
          Choose Your Path
        </div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#c4a035" }}>Campaign</h1>
        <div className="separator-gold mb-6" style={{ width: 200 }} />
        <p className="text-sm mb-8" style={{ color: "#5a5030" }}>
          Each faction tells their side of The Great Online War.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8" style={{ maxWidth: 720 }}>
          {CAMPAIGNS.map(campaign => {
            const info = FACTION_INFO[campaign.faction];
            if (!info) return null;
            const icon = FACTION_ICONS[campaign.faction] || "?";
            return (
              <button
                key={campaign.id}
                onClick={() => { setSelectedCampaign(campaign); setSelectedMissionIdx(0); }}
                className="faction-card p-5 rounded text-left"
                style={{
                  background: "linear-gradient(180deg, #1e1b14 0%, #12100a 100%)",
                  border: "2px solid #3a3220",
                  transition: "all 0.2s ease",
                  minWidth: 320,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = info.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3a3220"; }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="text-2xl flex items-center justify-center rounded-full"
                    style={{
                      width: 48, height: 48,
                      background: "radial-gradient(circle, #1e1b14, #0f0e0a)",
                      border: `1px solid ${info.color}66`,
                    }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: info.color }}>
                      {campaign.name}
                    </h2>
                    <span className="text-xs" style={{ color: "#5a5030" }}>
                      {info.name} -- {campaign.missions.length} Missions
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#8a7e60" }}>
                  {campaign.description}
                </p>
              </button>
            );
          })}
        </div>

        <button onClick={onBack} className="btn-wc3">
          Back
        </button>
      </div>
    );
  }

  const info = FACTION_INFO[selectedCampaign.faction];
  if (!info) {
    setSelectedCampaign(null);
    return null;
  }
  const mission = selectedCampaign.missions[selectedMissionIdx];
  if (!mission) {
    setSelectedMissionIdx(0);
    return null;
  }
  const icon = FACTION_ICONS[selectedCampaign.faction] || "?";

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1508 0%, #0a0908 70%)" }}
    >
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent 5%, ${info.color}66 30%, ${info.color} 50%, ${info.color}66 70%, transparent 95%)` }} />

      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-2xl mb-1">{icon}</div>
        <h1 className="text-2xl font-bold" style={{ color: info.color }}>
          {selectedCampaign.name}
        </h1>
        <span className="text-xs tracking-wide uppercase" style={{ color: "#5a5030" }}>
          {info.name} Campaign
        </span>
      </div>

      {/* Mission list + details */}
      <div className="flex gap-6 mb-6">
        {/* Mission list */}
        <div className="flex flex-col gap-2" style={{ minWidth: 220 }}>
          <h3 className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: "#6b5a28" }}>
            Missions
          </h3>
          {selectedCampaign.missions.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setSelectedMissionIdx(idx)}
              className="px-4 py-2 rounded text-left text-sm"
              style={{
                background: selectedMissionIdx === idx
                  ? `linear-gradient(90deg, ${info.color}22, transparent)`
                  : "transparent",
                border: selectedMissionIdx === idx
                  ? `1px solid ${info.color}88`
                  : "1px solid #2a2518",
                color: selectedMissionIdx === idx ? info.color : "#8a7e60",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ color: info.color, marginRight: 8 }}>{idx + 1}.</span>
              {m.name}
            </button>
          ))}
        </div>

        {/* Mission briefing panel */}
        <div
          className="parchment p-6 rounded"
          style={{ maxWidth: 460, minHeight: 300 }}
        >
          <h2 className="text-lg font-bold mb-1" style={{ color: info.color }}>
            {mission.name}
          </h2>
          <div className="separator-gold mb-3" />

          <p className="text-sm mb-4 leading-relaxed" style={{ color: "#b0a480" }}>
            {mission.briefing}
          </p>

          {/* Objectives */}
          <h3 className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#c4a035" }}>
            Objectives
          </h3>
          <ul className="mb-4">
            {mission.objectives.map(obj => (
              <li key={obj.id} className="text-xs mb-1 flex items-start gap-2" style={{ color: "#d4c8a0" }}>
                <span style={{ color: obj.required ? "#c4a035" : "#5a5030" }}>
                  {obj.required ? "*" : "o"}
                </span>
                {obj.description}
              </li>
            ))}
          </ul>

          {/* Side quests hint */}
          {mission.sideQuests.length > 0 && (
            <div className="text-xs mb-2 italic" style={{ color: "#6b5a28" }}>
              {mission.sideQuests.length} hidden side quest{mission.sideQuests.length > 1 ? "s" : ""} await discovery...
            </div>
          )}

          {/* Secrets hint */}
          {mission.secrets.length > 0 && (
            <div className="text-xs italic" style={{ color: "#3a3220" }}>
              Rumors speak of {mission.secrets.length} secret{mission.secrets.length > 1 ? "s" : ""} hidden in this region.
            </div>
          )}

          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid #2a2518" }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: "#5a5030" }}>Difficulty:</span>
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: DIFFICULTY_COLORS[mission.difficulty] || "#888" }}
            >
              {mission.difficulty.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="btn-wc3"
        >
          Back
        </button>
        <button
          onClick={() => onStartMission(selectedCampaign.faction, mission.id, mission.difficulty)}
          className="btn-wc3 btn-wc3-primary"
        >
          Begin Mission
        </button>
      </div>
    </div>
  );
}
