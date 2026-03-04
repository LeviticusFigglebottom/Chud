"use client";

import { useState } from "react";
import { FACTION_INFO } from "@/game/data/definitions";
import { FactionId } from "@/game/engine/types";

interface MainMenuProps {
  onSkirmish: () => void;
  onCampaign: () => void;
  onTutorial: () => void;
}

const FACTION_ICONS: Record<FactionId, string> = {
  chuds: "CH",
  chosen: "TH",
  crusaders: "CR",
  chads: "GC",
  neutral: "--",
};

export default function MainMenu({ onSkirmish, onCampaign, onTutorial }: MainMenuProps) {
  const [hoveredFaction, setHoveredFaction] = useState<FactionId | null>(null);

  const factionEntries: { id: FactionId; icon: string }[] = [
    { id: "chuds", icon: FACTION_ICONS.chuds },
    { id: "chosen", icon: FACTION_ICONS.chosen },
    { id: "crusaders", icon: FACTION_ICONS.crusaders },
    { id: "chads", icon: FACTION_ICONS.chads },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center h-full relative"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #1a1508 0%, #0a0908 60%, #050504 100%)" }}
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #6b5a28 20%, #c4a035 50%, #6b5a28 80%, transparent 95%)" }} />

      {/* Title Block */}
      <div className="relative z-10 text-center mb-4">
        <div className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: "#6b5a28" }}>
          A Real-Time Strategy Experience
        </div>
        <h1 className="text-5xl font-bold tracking-wide leading-tight" style={{ color: "#c4a035" }}>
          THE CHRONICALLY
        </h1>
        <h1 className="text-5xl font-bold tracking-wide leading-tight" style={{ color: "#c4a035" }}>
          ONLINE WARS
        </h1>
        <div className="separator-gold mt-4 mx-auto" style={{ width: 300 }} />
        <p className="text-xs mt-3 italic" style={{ color: "#5a5030" }}>
          &quot;No grass was touched in the making of this game.&quot;
        </p>
      </div>

      {/* Faction Medallions */}
      <div className="flex gap-5 my-6 relative z-10">
        {factionEntries.map(f => {
          const info = FACTION_INFO[f.id];
          const isHovered = hoveredFaction === f.id;
          return (
            <div
              key={f.id}
              className="flex flex-col items-center cursor-pointer"
              style={{
                transition: "all 0.15s ease",
                opacity: hoveredFaction && !isHovered ? 0.5 : 1,
              }}
              onMouseEnter={() => setHoveredFaction(f.id)}
              onMouseLeave={() => setHoveredFaction(null)}
            >
              <div
                className="text-3xl flex items-center justify-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: isHovered
                    ? `radial-gradient(circle, ${info.color}22 0%, #1a1710 70%)`
                    : "radial-gradient(circle, #1e1b14 0%, #12100a 100%)",
                  border: `2px solid ${isHovered ? info.color : "#3a3220"}`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  transition: "all 0.2s ease",
                }}
              >
                {f.icon}
              </div>
              <span
                className="text-xs font-bold mt-2 tracking-wide uppercase"
                style={{ color: isHovered ? info.color : "#5a5030", transition: "color 0.2s" }}
              >
                {info.name.replace("The ", "")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hovered faction description */}
      <div className="relative z-10 text-center mb-6" style={{ height: 64, maxWidth: 480 }}>
        {hoveredFaction ? (
          <div style={{ animation: "fadeIn 0.15s ease" }}>
            <p className="text-sm leading-relaxed" style={{ color: FACTION_INFO[hoveredFaction].color }}>
              {FACTION_INFO[hoveredFaction].description}
            </p>
            <p className="text-xs mt-1 italic" style={{ color: "#5a5030" }}>
              {FACTION_INFO[hoveredFaction].motto}
            </p>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "#3a3220" }}>
            Hover over a faction to learn their ways.
          </p>
        )}
      </div>

      {/* Main Menu Buttons */}
      <div className="flex flex-col gap-3 relative z-10" style={{ minWidth: 280 }}>
        <button onClick={onTutorial} className="btn-wc3 text-center">
          Tutorial
        </button>
        <button onClick={onCampaign} className="btn-wc3 btn-wc3-primary text-center">
          Campaign
        </button>
        <button onClick={onSkirmish} className="btn-wc3 text-center">
          Skirmish
        </button>
        <button disabled className="btn-wc3 text-center">
          Multiplayer
        </button>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 text-xs relative z-10" style={{ color: "#2a2518" }}>
        v0.1.0 -- &quot;The Basement Patch&quot;
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #3a3220 20%, #6b5a28 50%, #3a3220 80%, transparent 95%)" }} />
    </div>
  );
}
