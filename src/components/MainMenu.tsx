"use client";

import { useState, useEffect, useRef } from "react";
import { FACTION_INFO } from "@/game/data/definitions";
import { FactionId } from "@/game/engine/types";

interface MainMenuProps {
  onSkirmish: () => void;
  onCampaign: () => void;
}

const FACTION_ICONS: Record<FactionId, string> = {
  chuds: "\u{1F438}",    // frog
  chosen: "\u{1F3A9}",   // top hat
  crusaders: "\u{2694}",  // swords (single codepoint, no variation selector)
  chads: "\u{1F5FF}",    // moai
  neutral: "\u{1F465}",  // people
};

export default function MainMenu({ onSkirmish, onCampaign }: MainMenuProps) {
  const [hoveredFaction, setHoveredFaction] = useState<FactionId | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated background particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: ["#6b5a28", "#c4a035", "#8b7320", "#3a3220"][Math.floor(Math.random() * 4)],
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", handleResize); };
  }, []);

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
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #6b5a28 20%, #c4a035 50%, #6b5a28 80%, transparent 95%)" }} />

      {/* Title Block */}
      <div className="relative z-10 text-center mb-4">
        <div className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: "#6b5a28" }}>
          A Real-Time Strategy Experience
        </div>
        <h1 className="text-5xl font-bold tracking-wide shimmer-gold leading-tight" style={{ fontFamily: "inherit" }}>
          THE CHRONICALLY
        </h1>
        <h1 className="text-5xl font-bold tracking-wide shimmer-gold leading-tight" style={{ fontFamily: "inherit" }}>
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
                transition: "all 0.2s ease",
                transform: isHovered ? "scale(1.12) translateY(-4px)" : "scale(1)",
                opacity: hoveredFaction && !isHovered ? 0.4 : 1,
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
                  boxShadow: isHovered
                    ? `0 0 20px ${info.color}33, inset 0 0 15px ${info.color}11`
                    : "0 2px 4px rgba(0,0,0,0.4)",
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
        v0.1.0 &mdash; &quot;The Basement Patch&quot;
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent 5%, #3a3220 20%, #6b5a28 50%, #3a3220 80%, transparent 95%)" }} />
    </div>
  );
}
