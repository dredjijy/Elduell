// data/titles.js — Title definitions and display component
import { useState } from 'react';


const CARD_SKINS = [
  { id: "default", name: "Classique", price: 0 },
  { id: "flame",   name: "Flamme",    price: 100 },
  { id: "ocean",   name: "Océan",     price: 100 },
  { id: "storm",   name: "Tempête",   price: 150 },
  { id: "earth",   name: "Ancienne Terre", price: 150 },
  { id: "cosmic",  name: "Cosmique",  price: 200 },
];

const PREMIUM_TITLES = [
  // ── FREE ────────────────────────────────────────────────────
  { id: "novice",       label: "Novice",          price: 0,       rarity: "GRATUIT",     effect: "none",     color: "#0f1923" },
  { id: "duelliste",    label: "Duelliste",        price: 0,       rarity: "GRATUIT",     effect: "none",     color: "#0f1923" },

  // ── COMMUN 50–200 ────────────────────────────────────────────
  { id: "combattant",   label: "Combattant",       price: 50,      rarity: "COMMUN",      effect: "none",     color: "#0d1825" },
  { id: "guerrier",     label: "Guerrier",         price: 100,     rarity: "COMMUN",      effect: "none",     color: "#0d1825" },
  { id: "chasseur",     label: "Chasseur",         price: 150,     rarity: "COMMUN",      effect: "none",     color: "#0d1825" },
  { id: "briseur",      label: "Briseur",          price: 200,     rarity: "COMMUN",      effect: "none",     color: "#0d1825" },

  // ── RARE 500–2000 ─────────────────────────────────────────────
  { id: "champion",     label: "Champion",         price: 500,     rarity: "RARE",        effect: "glow",     color: "#3b82f6",  glowColor: "#3b82f6" },
  { id: "vainqueur",    label: "Vainqueur",        price: 800,     rarity: "RARE",        effect: "glow",     color: "#06b6d4",  glowColor: "#06b6d4" },
  { id: "conquérant",   label: "Conquérant",       price: 1200,    rarity: "RARE",        effect: "glow",     color: "#8b5cf6",  glowColor: "#8b5cf6" },
  { id: "invaincu",     label: "Invaincu",         price: 2000,    rarity: "RARE",        effect: "glow",     color: "#10b981",  glowColor: "#10b981" },

  // ── ÉPIQUE 5000–15000 ─────────────────────────────────────────
  { id: "légende",      label: "Légende",          price: 5000,    rarity: "ÉPIQUE",      effect: "gradient", colors: ["#8b5cf6","#c084fc"] },
  { id: "immortel",     label: "Immortel",         price: 8000,    rarity: "ÉPIQUE",      effect: "gradient", colors: ["#ef4444","#f97316"] },
  { id: "seigneur",     label: "Seigneur des Duels",price: 10000,  rarity: "ÉPIQUE",      effect: "gradient", colors: ["#0ea5e9","#6366f1"] },
  { id: "maître",       label: "Maître Élémentaire",price: 15000,  rarity: "ÉPIQUE",      effect: "gradient", colors: ["#10b981","#0ea5e9"] },

  // ── LÉGENDAIRE 25000–50000 ────────────────────────────────────
  { id: "archonte",     label: "Archonte",         price: 25000,   rarity: "LÉGENDAIRE",  effect: "glowPulse", color: "#f59e0b",  glowColor: "#f59e0b" },
  { id: "divinité",     label: "Divinité",         price: 35000,   rarity: "LÉGENDAIRE",  effect: "glowPulse", color: "#c084fc",  glowColor: "#a855f7" },
  { id: "éternel",      label: "Éternel",          price: 50000,   rarity: "LÉGENDAIRE",  effect: "solidGlow", color: "#06b6d4",  glowColor: "#06b6d4",
    css: "color: #06b6d4; text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d488;" },

  // ── MYTHIQUE 75000 ────────────────────────────────────────────
  { id: "absolu",       label: "Absolu",           price: 75000,   rarity: "MYTHIQUE",    effect: "fire",
    css: "background: linear-gradient(90deg,#ff4500,#ff8c00,#ffd700); -webkit-background-clip:text; -webkit-text-fill-color:transparent; filter: drop-shadow(0 0 6px #ff6000);" },

  // ── DIVIN 100000 — rainbow animated ─────────────────────────
  { id: "transcendant", label: "Transcendant",     price: 100000,  rarity: "DIVIN",       effect: "rainbow",
    css: "background: linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#a855f7,#ff0080); background-size:200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation: rainbowShift 2s linear infinite;" },
];

const TITLES = PREMIUM_TITLES.map((t) => t.label); // legacy compat

const OWNED_TITLES_KEY = 'elduel_owned_titles';

function loadOwnedTitles() {
  try { return JSON.parse(localStorage.getItem(OWNED_TITLES_KEY) || '["novice","duelliste"]'); } catch { return ["novice","duelliste"]; }
}

function saveOwnedTitles(list) {
  try { localStorage.setItem(OWNED_TITLES_KEY, JSON.stringify(list)); } catch {} }

function TitleDisplay({ title, fontSize = 12, style = {} }) {
  if (!title) return null;
  const t = PREMIUM_TITLES.find((x) => x.label === title || x.id === title);
  if (!t || t.effect === "none") {
    return <span style={{ fontSize, fontWeight: 700, color: t?.color || "#0d1825", ...style }}>{t?.label || title}</span>;
  }
  if (t.effect === "glow") {
    return <span style={{ fontSize, fontWeight: 800, color: t.color, textShadow: `0 0 8px ${t.glowColor}88`, ...style }}>{t.label}</span>;
  }
  if (t.effect === "glowPulse") {
    return <span style={{ fontSize, fontWeight: 900, color: t.color, textShadow: `0 0 10px ${t.glowColor}, 0 0 20px ${t.glowColor}66`, animation: "glowPulse 1.8s ease-in-out infinite", ...style }}>{t.label}</span>;
  }
  if (t.effect === "solidGlow") {
    return <span style={{ fontSize, fontWeight: 900, color: t.color, textShadow: `0 0 12px ${t.glowColor}, 0 0 24px ${t.glowColor}55`, ...style }}>{t.label}</span>;
  }
  if (t.effect === "gradient" && t.colors) {
    return <span style={{ fontSize, fontWeight: 900, background: `linear-gradient(90deg, ${t.colors[0]}, ${t.colors[1]})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 4px ${t.colors[0]}88)`, ...style }}>{t.label}</span>;
  }
  if (t.effect === "fire") {
    return <span style={{ fontSize, fontWeight: 900, background: "linear-gradient(90deg,#ff4500,#ff8c00,#ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 6px #ff6000)", ...style }}>{t.label}</span>;
  }
  if (t.effect === "rainbow") {
    return <span style={{ fontSize, fontWeight: 900, background: "linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#a855f7,#ff0080)", backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "rainbowShift 2s linear infinite", ...style }}>{t.label}</span>;
  }
  return <span style={{ fontSize, fontWeight: 700, color: "#0d1825", ...style }}>{t?.label || title}</span>;
}


export { TITLES, PREMIUM_TITLES, loadOwnedTitles, saveOwnedTitles, TitleDisplay };
