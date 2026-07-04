// ui/UI.js — Shared UI components, frames, and visual effects
import React, { useState, useEffect, useRef } from 'react';
import { getRank } from '../data/ranks.js';
import { AvatarDisplay } from '../data/avatars.jsx';
import { ELEMENTS } from '../data/elements.js';
import { BUNDLE_SKIN_MAP } from '../skins/skinUtils.js';


// ── Neumorphic theme constants (shared across all screens)
const NM = {
  bg:   "#e0e5ec",
  card: "linear-gradient(145deg, #edf0f5, #dde3ea)",
  out:  "6px 6px 14px #b8bec7, -4px -4px 10px #ffffff",
  sm:   "3px 3px 8px #c0c8d2, -2px -2px 6px #ffffff",
  in:   "inset 4px 4px 8px #b8bec7, inset -3px -3px 7px #ffffff",
};

// ── Frame data
const FRAME_RANK = [
  {
    id: "frame_bronze",  name: "Bronze",   rank: "Bronze",
    border: "2.5px solid #cd7f32",
    glow: "0 0 8px 2px rgba(205,127,50,0.55)",
    animation: "framePulse 2.5s ease-in-out infinite",
    icon: "🥉", rarity: "COMMUN", price: 0, auto: true,
    color: "#cd7f32", bg: "rgba(205,127,50,0.08)",
  },
  {
    id: "frame_argent",  name: "Argent",   rank: "Argent",
    border: "2.5px solid #c0c0c0",
    glow: "0 0 10px 3px rgba(192,192,192,0.6)",
    animation: "frameGlow 2s ease-in-out infinite",
    icon: "🥈", rarity: "COMMUN", price: 0, auto: true,
    color: "#b0b8c8", bg: "rgba(192,192,192,0.08)",
  },
  {
    id: "frame_or",      name: "Or",       rank: "Or",
    border: "3px solid #ffd700",
    glow: "0 0 12px 3px rgba(255,215,0,0.65), 0 0 24px 6px rgba(255,180,0,0.25)",
    animation: "frameGlow 1.8s ease-in-out infinite",
    icon: "🥇", rarity: "RARE", price: 0, auto: true,
    color: "#ffd700", bg: "rgba(255,215,0,0.08)",
  },
  {
    id: "frame_platine", name: "Platine",  rank: "Platine",
    border: "3px solid #00e5ff",
    glow: "0 0 12px 3px rgba(0,229,255,0.6), 0 0 24px 6px rgba(0,180,220,0.25)",
    animation: "framePulse 2s ease-in-out infinite",
    icon: "💠", rarity: "ÉPIQUE", price: 0, auto: true,
    color: "#00e5ff", bg: "rgba(0,229,255,0.08)",
  },
  {
    id: "frame_diamant", name: "Diamant",  rank: "Diamant",
    border: "3px solid #63d2ff",
    glow: "0 0 8px 2px rgba(99,210,255,0.5)",
    animation: "frameDiamond 2s ease-in-out infinite",
    icon: "💎", rarity: "LÉGENDAIRE", price: 0, auto: true,
    color: "#63d2ff", bg: "rgba(99,210,255,0.09)",
  },
  {
    id: "frame_master",  name: "Master",   rank: "Master",
    border: "3.5px solid #a855f7",
    glow: "0 0 14px 4px rgba(168,85,247,0.65), 0 0 28px 8px rgba(120,40,200,0.25)",
    animation: "framePulse 1.6s ease-in-out infinite",
    icon: "👑", rarity: "MYTHIQUE", price: 0, auto: true,
    color: "#a855f7", bg: "rgba(168,85,247,0.09)",
  },
  {
    id: "frame_legend",  name: "Legend",   rank: "Legend",
    border: "3.5px solid #ffd700",
    glow: "0 0 12px 3px rgba(255,215,0,0.7)",
    animation: "frameLegend 3s ease-in-out infinite",
    icon: "🌟", rarity: "DIVIN", price: 0, auto: true,
    color: "#ffd700", bg: "rgba(255,215,0,0.09)",
  },
];

const FRAME_PREMIUM = [
  {
    id: "frame_galaxie",  name: "Galaxie",      icon: "🌌",
    border: "3px solid #7c3aed",
    glow: "0 0 14px 4px rgba(100,0,200,0.6)",
    animation: "frameGalaxy 2.5s ease-in-out infinite",
    rarity: "LÉGENDAIRE", price: 1500,
    color: "#7c3aed", bg: "rgba(124,58,237,0.09)",
  },
  {
    id: "frame_feu",      name: "Feu Divin",     icon: "🔥",
    border: "3px solid #ff4500",
    glow: "0 0 12px 3px rgba(255,69,0,0.7)",
    animation: "frameFire 1.5s ease-in-out infinite",
    rarity: "MYTHIQUE", price: 2000,
    color: "#ff6a00", bg: "rgba(255,106,0,0.09)",
  },
  {
    id: "frame_neon",     name: "Néon Cyber",    icon: "⚡",
    border: "2.5px solid #00ffcc",
    glow: "0 0 10px 2px rgba(0,255,200,0.7)",
    animation: "frameNeon 2s linear infinite",
    rarity: "ÉPIQUE", price: 800,
    color: "#00ffcc", bg: "rgba(0,255,200,0.07)",
  },
  {
    id: "frame_demon",    name: "Démon",         icon: "😈",
    border: "3px solid #dc2626",
    glow: "0 0 12px 3px rgba(220,38,38,0.65), 0 0 24px 6px rgba(150,0,0,0.25)",
    animation: "frameFire 2s ease-in-out infinite",
    rarity: "LÉGENDAIRE", price: 1200,
    color: "#dc2626", bg: "rgba(220,38,38,0.08)",
  },
  {
    id: "frame_ange",     name: "Ange",          icon: "👼",
    border: "3px solid #fef9c3",
    glow: "0 0 14px 4px rgba(255,250,180,0.7), 0 0 28px 8px rgba(255,220,100,0.25)",
    animation: "frameGlow 2s ease-in-out infinite",
    rarity: "LÉGENDAIRE", price: 1200,
    color: "#fbbf24", bg: "rgba(251,191,36,0.08)",
  },
  {
    id: "frame_cristal",  name: "Cristallin",    icon: "💠",
    border: "2.5px solid #a5f3fc",
    glow: "0 0 10px 2px rgba(165,243,252,0.6)",
    animation: "frameDiamond 2.5s ease-in-out infinite",
    rarity: "ÉPIQUE", price: 600,
    color: "#67e8f9", bg: "rgba(103,232,249,0.07)",
  },
  {
    id: "frame_ombre",    name: "Ombre",         icon: "🌑",
    border: "2.5px solid #374151",
    glow: "0 0 10px 3px rgba(55,65,81,0.8), inset 0 0 10px rgba(0,0,0,0.4)",
    animation: "frameGlow 3s ease-in-out infinite",
    rarity: "RARE", price: 400,
    color: "#6b7280", bg: "rgba(55,65,81,0.08)",
  },
  {
    id: "frame_tempete",  name: "Tempête",       icon: "⛈️",
    border: "3px solid #60a5fa",
    glow: "0 0 12px 3px rgba(96,165,250,0.65)",
    animation: "framePulse 1.8s ease-in-out infinite",
    rarity: "ÉPIQUE", price: 700,
    color: "#60a5fa", bg: "rgba(96,165,250,0.08)",
  },
  {
    id: "frame_dragon",   name: "Dragon",        icon: "🐉",
    border: "3.5px solid #16a34a",
    glow: "0 0 14px 4px rgba(22,163,74,0.65), 0 0 28px 8px rgba(5,150,50,0.25)",
    animation: "frameGalaxy 2s ease-in-out infinite",
    rarity: "MYTHIQUE", price: 2500,
    color: "#16a34a", bg: "rgba(22,163,74,0.09)",
  },
];

const ALL_FRAMES = [...FRAME_RANK, ...FRAME_PREMIUM];


// ── Frame helpers
function getFrameById(id) {
  return ALL_FRAMES.find(f => f.id === id) || null;
}

function getAutoFrame(rankName) {
  return FRAME_RANK.find(f => f.rank === rankName) || FRAME_RANK[0];
}

function getOwnedFrames(profile) {
  const owned = profile.ownedFrames || [];
  // Rank frames auto-unlocked
  const rankFrames = FRAME_RANK.filter(f => {
    const ranks = ["Bronze","Argent","Or","Platine","Diamant","Master","Legend"];
    const playerRankIdx = ranks.indexOf(getRank(profile.rankPoints).name);
    const frameRankIdx  = ranks.indexOf(f.rank);
    return frameRankIdx <= playerRankIdx;
  });
  return [...rankFrames, ...FRAME_PREMIUM.filter(f => owned.includes(f.id))];
}

const FRAMES_OWNED_KEY = "elduel_owned_frames";

function loadOwnedFrames() {
  try { return JSON.parse(localStorage.getItem(FRAMES_OWNED_KEY) || "[]"); } catch { return []; }
}

function saveOwnedFrames(list) {
  try { localStorage.setItem(FRAMES_OWNED_KEY, JSON.stringify(list)); } catch {}
}

function AvatarWithFrame({ avatar, frameId, rankPoints = 0, size = 48, showFrame = true }) {
  const frame = showFrame
    ? (frameId ? getFrameById(frameId) : getAutoFrame(getRank(rankPoints).name))
    : null;

  const outerSize = size + (frame ? 6 : 0);

  return (
    <div style={{
      width: outerSize, height: outerSize,
      borderRadius: "50%", position: "relative",
      flexShrink: 0, display: "inline-flex",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Frame ring */}
      {frame && (
        <div style={{
          position: "absolute", inset: -3,
          borderRadius: "50%",
          border: frame.border,
          boxShadow: frame.glow,
          animation: frame.animation,
          zIndex: 2, pointerEvents: "none",
        }} />
      )}
      {/* Avatar circle */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#e0e5ec",
        boxShadow: "2px 2px 6px #b8bec7, -1px -1px 4px #ffffff",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative", zIndex: 1,
      }}>
        <AvatarDisplay avatar={avatar} size={size * 0.62} />
      </div>
    </div>
  );
}

function AvatarWithFrameDark({ avatar, frameId, rankPoints = 0, size = 48 }) {
  const frame = frameId ? getFrameById(frameId) : getAutoFrame(getRank(rankPoints).name);

  const outerSize = size + 8;
  return (
    <div style={{
      width: outerSize, height: outerSize,
      borderRadius: "50%", position: "relative",
      flexShrink: 0, display: "inline-flex",
      alignItems: "center", justifyContent: "center",
    }}>
      {frame && (
        <div style={{
          position: "absolute", inset: -4,
          borderRadius: "50%",
          border: frame.border,
          boxShadow: frame.glow,
          animation: frame.animation,
          zIndex: 2, pointerEvents: "none",
        }} />
      )}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative", zIndex: 1,
        border: "1px solid rgba(255,255,255,0.2)",
      }}>
        <AvatarDisplay avatar={avatar} size={size * 0.62} />
      </div>
    </div>
  );
}


// ── Base UI components
function NmCard({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: NM.card, boxShadow: NM.sm,
      borderRadius: 16, padding: "14px 16px",
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase",
      letterSpacing: "0.14em", fontWeight: 900, marginBottom: 8, fontFamily: "monospace" }}>
      {children}
    </div>
  );
}


// ── Game UI components
function HpBar({ current, max = 5, color = "var(--success)" }) {
  return (
    <div className="hp-bar">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`hp-dot ${i < current ? "filled" : "empty"}`}
          style={i < current ? { background: color, boxShadow: `0 0 8px ${color}` } : {}} />
      ))}
    </div>
  );
}

function TimerCircle({ seconds, total = 60, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (seconds / total) * circ;
  const pct = seconds / total;
  const color = pct > 0.5 ? "#34d399" : pct > 0.25 ? "#fbbf24" : "#f87171";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff15" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.28} fontWeight="700" fontFamily="Rajdhani,sans-serif"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {seconds}
      </text>
    </svg>
  );
}

function ElementCard({ element, selected, onSelect, equippedSkinId = null, size = "md", disabled = false }) {
  const el = ELEMENTS[element];
  const sizes = { sm: 56, md: 64, lg: 80 };
  const s = sizes[size] || 64;
  const bundleSkin = equippedSkinId ? BUNDLE_SKIN_MAP[equippedSkinId] : null;

  const bg = bundleSkin ? bundleSkin.bgGrad : `linear-gradient(135deg, ${el.color}33, ${el.color}11)`;
  const borderColor = selected ? (bundleSkin?.color || el.color) : "transparent";
  const glow = selected ? `0 0 18px ${(bundleSkin?.color || el.color)}88` : undefined;

  return (
    <div className={`element-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
      style={{ width: s, height: s * 1.4, background: bg, borderColor, boxShadow: glow }}
      onClick={() => !disabled && onSelect && onSelect(element)}>
      <span style={{
        fontSize: s * 0.38,
        filter: bundleSkin && selected ? `drop-shadow(0 0 8px ${bundleSkin.color})` : "none",
      }}>
        {bundleSkin ? bundleSkin.emoji : el.emoji}
      </span>
      <span style={{
        fontSize: s * 0.15, fontWeight: 800,
        color: bundleSkin?.color || el.color,
        letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        {el.name}
      </span>
      {bundleSkin && (
        <span style={{ fontSize: s * 0.11, color: bundleSkin.color, opacity: 0.7 }}>
          {bundleSkin.name.split(" ")[0]}
        </span>
      )}
    </div>
  );
}

function PlayerBanner({ profile, side, animate }) {
  const rank = getRank(profile.rankPoints);
  return (
    <div className={animate ? (side === "left" ? "slide-left" : "slide-right") : ""}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", border: `3px solid ${rank.color}`,
        background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, boxShadow: `0 0 16px ${rank.color}55`
      }}><AvatarDisplay avatar={profile.avatar} size={32} /></div>
      <div style={{ fontWeight: 700, fontSize: 15, textAlign: "center" }}>{profile.name}</div>
      <div style={{ fontSize: 12, color: "var(--text2)" }}>{profile.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span>{rank.icon}</span>
        <span style={{ color: rank.color, fontSize: 13, fontWeight: 700 }}>{rank.name}</span>
      </div>
    </div>
  );
}

function GalaxyRift() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H;

    // ── Resize ──────────────────────────────────────────────
    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Star field ──────────────────────────────────────────
    const STAR_COUNT = 120;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.3 + Math.random() * 1.4,
      base: 0.2 + Math.random() * 0.7,       // base opacity
      speed: 0.4 + Math.random() * 1.8,       // twinkle speed
      phase: Math.random() * Math.PI * 2,
      color: ["#ffffff", "#e8d8ff", "#c8e0ff", "#ffd8f0", "#d0f0ff"][Math.floor(Math.random() * 5)],
    }));

    // ── Nebula blobs ────────────────────────────────────────
    const NEBULAS = [
      { cx: 0.25, cy: 0.30, rx: 0.28, ry: 0.18, col: "#7c3aed", speed: 0.00018, phase: 0 },
      { cx: 0.70, cy: 0.65, rx: 0.32, ry: 0.20, col: "#1d4ed8", speed: 0.00013, phase: 1.2 },
      { cx: 0.50, cy: 0.50, rx: 0.22, ry: 0.22, col: "#be185d", speed: 0.00022, phase: 2.5 },
      { cx: 0.15, cy: 0.75, rx: 0.20, ry: 0.14, col: "#0e7490", speed: 0.00016, phase: 0.8 },
      { cx: 0.80, cy: 0.20, rx: 0.18, ry: 0.18, col: "#6d28d9", speed: 0.00020, phase: 3.1 },
    ];

    // ── Cosmic dust particles ────────────────────────────────
    const DUST_COUNT = 40;
    const dust = Array.from({ length: DUST_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00008,
      vy: (Math.random() - 0.5) * 0.00008,
      r: 0.8 + Math.random() * 2.5,
      opacity: 0.1 + Math.random() * 0.4,
      color: ["#c084fc", "#818cf8", "#38bdf8", "#f0abfc"][Math.floor(Math.random() * 4)],
    }));

    // ── Rift shape — thin diagonal X crack like the reference ─
    // Two thin intersecting blades
    function buildRift(w, h) {
      // Primary blade: top-right to bottom-left
      const cx = w * 0.5, cy = h * 0.5;
      const blades = [
        // blade 1: NE → SW  (long)
        { ax: cx - w * 0.44, ay: cy + h * 0.38, bx: cx + w * 0.44, by: cy - h * 0.38, half: 3 },
        // blade 2: NW → SE  (shorter)
        { ax: cx - w * 0.20, ay: cy - h * 0.32, bx: cx + w * 0.22, by: cy + h * 0.28, half: 2.2 },
      ];
      return blades;
    }

    // ── Draw a single blade as a clipping path ───────────────
    function bladePath(ctx, blade) {
      const { ax, ay, bx, by, half } = blade;
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len, ny = dx / len; // normal
      ctx.beginPath();
      ctx.moveTo(ax + nx * half, ay + ny * half);
      ctx.lineTo(bx + nx * half, by + ny * half);
      ctx.lineTo(bx - nx * half, by - ny * half);
      ctx.lineTo(ax - nx * half, ay - ny * half);
      ctx.closePath();
    }

    // ── Edge glow along a blade ──────────────────────────────
    function drawBladeGlow(ctx, blade, t) {
      const { ax, ay, bx, by, half } = blade;
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len, ny = dx / len;

      // Pulsing glow intensity
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.0008);

      // Left edge glow
      const gl = ctx.createLinearGradient(ax, ay, bx, by);
      gl.addColorStop(0,   `rgba(192,132,252,0)`);
      gl.addColorStop(0.3, `rgba(192,132,252,${0.35 * pulse})`);
      gl.addColorStop(0.7, `rgba(129,140,248,${0.4 * pulse})`);
      gl.addColorStop(1,   `rgba(129,140,248,0)`);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax + nx * (half + 6), ay + ny * (half + 6));
      ctx.lineTo(bx + nx * (half + 6), by + ny * (half + 6));
      ctx.lineTo(bx + nx * half,        by + ny * half);
      ctx.lineTo(ax + nx * half,        ay + ny * half);
      ctx.closePath();
      ctx.fillStyle = gl;
      ctx.fill();

      // Right edge glow
      ctx.beginPath();
      ctx.moveTo(ax - nx * (half + 6), ay - ny * (half + 6));
      ctx.lineTo(bx - nx * (half + 6), by - ny * (half + 6));
      ctx.lineTo(bx - nx * half,        by - ny * half);
      ctx.lineTo(ax - nx * half,        ay - ny * half);
      ctx.closePath();
      ctx.fillStyle = gl;
      ctx.fill();
      ctx.restore();
    }

    // ── Main render loop ─────────────────────────────────────
    function render(ts) {
      const t = ts;
      timeRef.current = t;
      ctx.clearRect(0, 0, W, H);

      const blades = buildRift(W, H);

      // ── 1. DARK BACKGROUND (outside rift) ──────────────────
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, W, H);

      // Subtle outer ambient purple haze
      const outerGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.7);
      outerGrad.addColorStop(0, "rgba(30,20,60,0.35)");
      outerGrad.addColorStop(1, "transparent");
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 2. GALAXY INSIDE RIFT (clip to blades) ─────────────
      blades.forEach((blade) => {
        ctx.save();
        bladePath(ctx, blade);
        ctx.clip();

        // Deep space base
        ctx.fillStyle = "#02010a";
        ctx.fillRect(0, 0, W, H);

        // Animated nebulas
        NEBULAS.forEach((neb) => {
          const ox = Math.sin(t * neb.speed + neb.phase) * W * 0.04;
          const oy = Math.cos(t * neb.speed * 0.7 + neb.phase) * H * 0.03;
          const cx2 = neb.cx * W + ox;
          const cy2 = neb.cy * H + oy;
          const rx = neb.rx * W;
          const ry = neb.ry * H;

          const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(rx, ry));
          const alpha = (0.15 + 0.08 * Math.sin(t * neb.speed * 3 + neb.phase)).toFixed(3);
          grad.addColorStop(0, neb.col + "55");
          grad.addColorStop(0.4, neb.col + "22");
          grad.addColorStop(1, "transparent");

          ctx.save();
          ctx.scale(1, ry / rx);
          ctx.beginPath();
          ctx.arc(cx2, cy2 * (rx / ry), rx, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        });

        // Deep core glow
        const coreX = W * (0.48 + 0.04 * Math.sin(t * 0.0003));
        const coreY = H * (0.50 + 0.03 * Math.cos(t * 0.0004));
        const coreGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, W * 0.35);
        coreGrad.addColorStop(0, "rgba(255,255,255,0.06)");
        coreGrad.addColorStop(0.3, "rgba(180,140,255,0.08)");
        coreGrad.addColorStop(0.7, "rgba(80,60,160,0.05)");
        coreGrad.addColorStop(1, "transparent");
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, W, H);

        // Twinkling stars
        stars.forEach((s) => {
          const twinkle = s.base + (1 - s.base) * 0.5 * (1 + Math.sin(t * s.speed * 0.001 + s.phase));
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
          ctx.fillStyle = s.color + Math.round(twinkle * 255).toString(16).padStart(2, "0");
          ctx.fill();

          // Cross sparkle for bright stars
          if (s.r > 1.1 && twinkle > 0.7) {
            const sparkLen = s.r * 3 * twinkle;
            const alpha = (twinkle * 0.5).toFixed(2);
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x * W - sparkLen, s.y * H);
            ctx.lineTo(s.x * W + sparkLen, s.y * H);
            ctx.moveTo(s.x * W, s.y * H - sparkLen);
            ctx.lineTo(s.x * W, s.y * H + sparkLen);
            ctx.stroke();
          }
        });

        // Drifting cosmic dust
        dust.forEach((d) => {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0) d.x = 1;
          if (d.x > 1) d.x = 0;
          if (d.y < 0) d.y = 1;
          if (d.y > 1) d.y = 0;
          const grad2 = ctx.createRadialGradient(d.x * W, d.y * H, 0, d.x * W, d.y * H, d.r * 2);
          grad2.addColorStop(0, d.color + Math.round(d.opacity * 255).toString(16).padStart(2, "0"));
          grad2.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(d.x * W, d.y * H, d.r * 2, 0, Math.PI * 2);
          ctx.fillStyle = grad2;
          ctx.fill();
        });

        // Depth fog — dark edges inside rift
        const fogGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.05, W * 0.5, H * 0.5, W * 0.6);
        fogGrad.addColorStop(0, "transparent");
        fogGrad.addColorStop(0.85, "rgba(2,1,10,0.3)");
        fogGrad.addColorStop(1, "rgba(2,1,10,0.7)");
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, W, H);

        ctx.restore();
      });

      // ── 3. RIFT EDGE GLOW ──────────────────────────────────
      blades.forEach((blade) => drawBladeGlow(ctx, blade, t));

      // ── 4. COSMIC LIGHT LEAK — subtle ambient bleed ────────
      const leakPulse = 0.04 + 0.02 * Math.sin(t * 0.0005);
      blades.forEach((blade) => {
        const { ax, ay, bx, by } = blade;
        const midX = (ax + bx) / 2, midY = (ay + by) / 2;
        const leak = ctx.createRadialGradient(midX, midY, 0, midX, midY, 60);
        leak.addColorStop(0, `rgba(192,132,252,${leakPulse})`);
        leak.addColorStop(1, "transparent");
        ctx.fillStyle = leak;
        ctx.fillRect(0, 0, W, H);
      });

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="stars-bg"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}


// ── Particle & effect components
function Particles({ count = 24, colors, size = 10, spread = 220 }) {
  const items = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + Math.random() * 20;
    const dist = spread * 0.4 + Math.random() * spread * 0.6;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist - 60;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = Math.random() * 0.3;
    const duration = 0.7 + Math.random() * 0.5;
    const rot = (Math.random() - 0.5) * 720;
    const s = size * (0.5 + Math.random() * 0.8);
    const shape = Math.random() > 0.5 ? "50%" : "2px";
    return { tx, ty, color, delay, duration, rot, s, shape };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30, overflow: "hidden" }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "40%",
          width: p.s, height: p.s,
          borderRadius: p.shape,
          background: p.color,
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": `${p.rot}deg`,
          animation: `particleFly ${p.duration}s ${p.delay}s cubic-bezier(.22,.68,0,1) forwards`,
          transform: "translate(-50%,-50%)",
        }} />
      ))}
    </div>
  );
}

function Shockwave({ color }) {
  return (
    <div style={{
      position: "absolute", left: "50%", top: "40%", zIndex: 25,
      width: 80, height: 80, borderRadius: "50%",
      border: `3px solid ${color}`,
      animation: "shockwave 0.6s ease-out forwards",
      pointerEvents: "none",
    }} />
  );
}

function FloatingText({ text, color }) {
  return (
    <div style={{
      position: "absolute", left: "50%", top: "35%",
      transform: "translateX(-50%)",
      fontSize: 22, fontWeight: 900,
      color, textShadow: `0 0 20px ${color}`,
      animation: "floatUp 1.2s ease-out forwards",
      pointerEvents: "none", zIndex: 35,
      fontFamily: "'Cinzel Decorative', serif",
      whiteSpace: "nowrap",
    }}>{text}</div>
  );
}

function RoundWinEffect() {
  return (
    <>
      <Particles count={28}
        colors={["#fbbf24", "#f59e0b", "#fde68a", "#fff", "#c084fc"]}
        size={9} spread={200} />
      <Shockwave color="#fbbf2488" />
      <FloatingText text="⚡ MANCHE GAGNÉE !" color="#fbbf24" />
    </>
  );
}

function RoundLoseEffect() {
  return (
    <>
      <Particles count={16}
        colors={["#f87171", "#dc2626", "#450a0a", "#94a3b8"]}
        size={7} spread={160} />
      <Shockwave color="#f8717188" />
    </>
  );
}

function VictoryConfetti() {
  // Subtle sparkle particles only — no spinning rays
  const items = Array.from({ length: 30 }, (_, i) => {
    const tx = (Math.random() - 0.5) * 400;
    const ty = -80 - Math.random() * 300;
    const delay = Math.random() * 0.6;
    const duration = 1.0 + Math.random() * 0.8;
    const w = 3 + Math.random() * 5;
    const color = ["#5dff8a","#c8a0ff","#60e0ff","#ffd060"][Math.floor(Math.random() * 4)];
    return { tx, ty, delay, duration, w, color };
  });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55, overflow: "hidden" }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${30 + Math.random() * 40}%`, top: "50%",
          width: p.w, height: p.w,
          background: p.color, borderRadius: "50%",
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": "0deg",
          animation: `particleFly ${p.duration}s ${p.delay}s ease-out forwards`,
          opacity: 0.8,
        }} />
      ))}
    </div>
  );
}

function BGFlash({ color }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 18,
      background: color, borderRadius: "inherit",
      animation: "bgFlash 0.25s ease-out forwards",
      pointerEvents: "none",
    }} />
  );
}


export {
  NM,
  FRAME_RANK, FRAME_PREMIUM, ALL_FRAMES,
  getFrameById, getAutoFrame, getOwnedFrames,
  FRAMES_OWNED_KEY, loadOwnedFrames, saveOwnedFrames,
  AvatarWithFrame, AvatarWithFrameDark,
  NmCard, SectionLabel,
  HpBar, TimerCircle, ElementCard, PlayerBanner, GalaxyRift,
  Particles, Shockwave, FloatingText,
  RoundWinEffect, RoundLoseEffect, VictoryConfetti, BGFlash,
};
