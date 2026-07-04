// skins/versusData.js — Versus screen data (shared between VersusScreen and ShopScreen)
const ELEMENT_VERSUS = {
  EAU:   { color: "#06b6d4", glow: "rgba(6,182,212,0.7)",   particles: ["#06b6d4","#0891b2","#a5f3fc","#bfdbfe"], label: "Vagues", symbol: "🌊" },
  FEU:   { color: "#ef4444", glow: "rgba(239,68,68,0.7)",   particles: ["#ef4444","#f97316","#fbbf24","#fde68a"], label: "Flammes", symbol: "🔥" },
  AIR:   { color: "#84cc16", glow: "rgba(132,204,22,0.7)",  particles: ["#84cc16","#a3e635","#d9f99d","#ffffff"], label: "Vent", symbol: "🌪️" },
  TERRE: { color: "#92400e", glow: "rgba(146,64,14,0.7)",   particles: ["#92400e","#b45309","#d97706","#fde68a"], label: "Roche", symbol: "🌍" },
  ETHER: { color: "#a855f7", glow: "rgba(168,85,247,0.7)",  particles: ["#a855f7","#c084fc","#e879f9","#f5d0fe"], label: "Énergie", symbol: "✨" },
};

const VERSUS_SKINS = [
  { id: "vs_default",  name: "Classique",     icon: "⚔️",  price: 0,    rarity: "COMMUN",    aura: "rgba(160,175,195,0.4)", bg: "rgba(160,175,195,0.08)", desc: "Style de base" },
  { id: "vs_shadow",   name: "Ombre",         icon: "🌑",  price: 300,  rarity: "RARE",      aura: "rgba(80,40,120,0.6)",  bg: "rgba(80,40,120,0.08)",  desc: "Silhouette sombre mystérieuse" },
  { id: "vs_flame",    name: "Inferno",        icon: "🔥",  price: 500,  rarity: "ÉPIQUE",    aura: "rgba(255,80,0,0.65)",  bg: "rgba(255,80,0,0.08)",   desc: "Aura de feu dévorante" },
  { id: "vs_cosmos",   name: "Cosmos",         icon: "🌌",  price: 800,  rarity: "LÉGENDAIRE", aura: "rgba(100,60,220,0.65)", bg: "rgba(100,60,220,0.09)", desc: "Énergie cosmique stellaire" },
  { id: "vs_neon",     name: "Cyber",          icon: "⚡",  price: 400,  rarity: "ÉPIQUE",    aura: "rgba(0,255,200,0.6)",  bg: "rgba(0,255,200,0.07)",  desc: "Interface holographique" },
  { id: "vs_divine",   name: "Divin",          icon: "👼",  price: 1200, rarity: "MYTHIQUE",  aura: "rgba(255,215,0,0.7)",  bg: "rgba(255,215,0,0.09)",  desc: "Lumière céleste suprême" },
  { id: "vs_demon",    name: "Démon",          icon: "😈",  price: 1000, rarity: "MYTHIQUE",  aura: "rgba(180,0,0,0.7)",    bg: "rgba(180,0,0,0.08)",    desc: "Ténèbres démoniaques" },
  { id: "vs_dragon",   name: "Dragon",         icon: "🐉",  price: 1500, rarity: "DIVIN",     aura: "rgba(20,160,80,0.7)",  bg: "rgba(20,160,80,0.08)",  desc: "Puissance ancestrale du Dragon" },
];

export { ELEMENT_VERSUS, VERSUS_SKINS };
