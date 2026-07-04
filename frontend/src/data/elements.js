// data/elements.js — Game element definitions and relationships
const ELEMENTS = {
  EAU: { name: "Eau", emoji: "💧", color: "#3b82f6" },
  FEU: { name: "Feu", emoji: "🔥", color: "#ef4444" },
  AIR: { name: "Air", emoji: "🌪️", color: "#5a9a00" },
  TERRE: { name: "Terre", emoji: "🌍", color: "#92400e" },
  ETHER: { name: "Éther", emoji: "✨", color: "#a855f7" },
};

const STRENGTHS = {
  EAU:   ["FEU",   "TERRE"],
  FEU:   ["AIR",   "ETHER"],
  AIR:   ["EAU",   "TERRE"],
  TERRE: ["FEU",   "ETHER"],
  ETHER: ["EAU",   "AIR"],
};

const WEAKNESSES = {
  EAU:   ["AIR",   "ETHER"],
  FEU:   ["EAU",   "TERRE"],
  AIR:   ["FEU",   "ETHER"],
  TERRE: ["EAU",   "AIR"],
  ETHER: ["FEU",   "TERRE"],
};


export { ELEMENTS, STRENGTHS, WEAKNESSES };
