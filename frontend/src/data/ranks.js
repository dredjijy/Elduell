import { ELEMENTS, STRENGTHS } from './elements.js';
// data/ranks.js — Rank definitions, bonuses, and helper functions
const RANKS = [
  { name: "Bronze",  min: 0,    max: 99,       color: "#8b5a20", icon: "🥉", rankUpBonus: 0 },
  { name: "Argent",  min: 100,  max: 249,       color: "#5c6e82", icon: "🥈", rankUpBonus: 500 },
  { name: "Or",      min: 250,  max: 499,       color: "#b08800", icon: "🥇", rankUpBonus: 700 },
  { name: "Platine", min: 500,  max: 799,       color: "#6b7fa0", icon: "💠", rankUpBonus: 900 },
  { name: "Diamant", min: 800,  max: 1199,      color: "#0ea5c8", icon: "💎", rankUpBonus: 1100 },
  { name: "Master",  min: 1200, max: 1999,      color: "#c0186e", icon: "👑", rankUpBonus: 1500 },
  { name: "Legend",  min: 2000, max: Infinity,  color: "#c47000", icon: "🌟", rankUpBonus: 2000 },
];

const RANK_BONUS_KEY = "elduel_rank_bonuses_claimed";
function loadClaimedRankBonuses() {
  try { return JSON.parse(localStorage.getItem(RANK_BONUS_KEY) || "[]"); } catch { return []; }
}
function saveClaimedRankBonuses(list) {
  try { localStorage.setItem(RANK_BONUS_KEY, JSON.stringify(list)); } catch {} }

function claimRankBonus(rankName) {
  // Returns the bonus amount if not yet claimed, 0 otherwise
  const claimed = loadClaimedRankBonuses();
  if (claimed.includes(rankName)) return 0;
  const rank = RANKS.find((r) => r.name === rankName);
  if (!rank || !rank.rankUpBonus) return 0;
  claimed.push(rankName);
  saveClaimedRankBonuses(claimed);
  return rank.rankUpBonus;
}

function hasClaimedRankBonus(rankName) {
  return loadClaimedRankBonuses().includes(rankName);
}

function getRank(points) {
  return RANKS.find((r) => points >= r.min && points <= r.max) || RANKS[0];
}

function resolveRound(cardA, cardB) {
  if (cardA === cardB) return "DRAW";
  if (STRENGTHS[cardA].includes(cardB)) return "WIN";
  return "LOSE";
}

function botChoice() {
  const keys = Object.keys(ELEMENTS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function generateMatchId() {
  return Math.random().toString(36).substr(2, 9);
}


export { RANKS, RANK_BONUS_KEY, loadClaimedRankBonuses, saveClaimedRankBonuses, claimRankBonus, hasClaimedRankBonus, getRank, resolveRound, botChoice, generateMatchId };
