"use client";

import { useState, useEffect } from "react";
import { FACTION_INFO } from "@/game/data/definitions";
import { FactionId } from "@/game/engine/types";

interface MainMenuProps {
  onSkirmish: () => void;
  onCampaign: () => void;
}

export default function MainMenu({ onSkirmish, onCampaign }: MainMenuProps) {
  const [hoveredFaction, setHoveredFaction] = useState<FactionId | null>(null);
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const factionPreviews: { id: FactionId; icon: string }[] = [
    { id: "chuds", icon: "🐸" },
    { id: "chosen", icon: "🎩" },
    { id: "crusaders", icon: "⚔️" },
    { id: "chads", icon: "🗿" },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center h-full relative"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #1a0a3e 0%, #0a0a1a 70%)`,
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              background: `hsla(${(animPhase + i * 18) % 360}, 70%, 60%, 0.3)`,
              left: `${10 + (i * 4.3) % 80}%`,
              top: `${5 + (i * 7.1 + animPhase * 0.1) % 90}%`,
              transition: "top 0.5s ease",
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div className="mb-2 text-center relative z-10">
        <h1
          className="text-5xl font-bold tracking-wider"
          style={{
            background: `linear-gradient(90deg, #00bfff, #ff00ff, #ffd700, #00ff88)`,
            backgroundSize: "300% 100%",
            backgroundPosition: `${animPhase}% 0%`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
          }}
        >
          THE CHRONICALLY ONLINE WARS
        </h1>
        <p className="text-sm mt-2" style={{ color: "#666" }}>
          A Real-Time Strategy Game About Touching Grass (or Not)
        </p>
      </div>

      {/* Faction parade */}
      <div className="flex gap-6 my-8 relative z-10">
        {factionPreviews.map(f => {
          const info = FACTION_INFO[f.id];
          return (
            <div
              key={f.id}
              className="flex flex-col items-center cursor-pointer transition-all"
              style={{
                transform: hoveredFaction === f.id ? "scale(1.15)" : "scale(1)",
                opacity: hoveredFaction && hoveredFaction !== f.id ? 0.5 : 1,
              }}
              onMouseEnter={() => setHoveredFaction(f.id)}
              onMouseLeave={() => setHoveredFaction(null)}
            >
              <div
                className="text-4xl mb-2 rounded-full flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  background: hoveredFaction === f.id ? info.color + "33" : "#1a1a2e",
                  border: `2px solid ${hoveredFaction === f.id ? info.color : "#2a2a4e"}`,
                }}
              >
                {f.icon}
              </div>
              <span className="text-xs font-bold" style={{ color: info.color }}>
                {info.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hovered faction info */}
      <div className="h-16 mb-6 text-center relative z-10" style={{ maxWidth: 500 }}>
        {hoveredFaction && (
          <>
            <p className="text-sm" style={{ color: FACTION_INFO[hoveredFaction].color }}>
              {FACTION_INFO[hoveredFaction].description}
            </p>
            <p className="text-xs mt-1 italic" style={{ color: "#666" }}>
              {FACTION_INFO[hoveredFaction].motto}
            </p>
          </>
        )}
      </div>

      {/* Menu buttons */}
      <div className="flex flex-col gap-3 relative z-10">
        <MenuButton onClick={onCampaign} primary>
          Campaign
        </MenuButton>
        <MenuButton onClick={onSkirmish}>
          Skirmish
        </MenuButton>
        <MenuButton onClick={() => {}} disabled>
          Multiplayer (Coming Soon)
        </MenuButton>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-xs" style={{ color: "#333" }}>
        v0.1.0 - "The Basement Patch" | No grass was touched in the making of this game
      </div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="px-12 py-3 rounded font-bold text-lg transition-all"
      style={{
        background: disabled ? "#1a1a2e" : primary ? "#00bfff" : "#1a1a2e",
        color: disabled ? "#444" : primary ? "#000" : "#e0e0e0",
        border: `2px solid ${disabled ? "#222" : primary ? "#00bfff" : "#2a2a4e"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        minWidth: 250,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
