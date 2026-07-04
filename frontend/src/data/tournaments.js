// data/tournaments.js
const TOURNAMENT_ENTRY_COST = 20; // gemmes — tournoi quotidien officiel

const TOURNAMENT_NAMES = ["Grand Tournoi de l'Éther", "Coupe des Éléments", "Duel Suprême", "Arène Céleste", "Championnat du Vide"];

const CUSTOM_TOURNAMENTS_KEY = "elduel_custom_tournaments";

function deleteCustomTournament(id) {
  const list = loadCustomTournaments();
  const updated = list.filter((t) => t.id !== id);
  try { localStorage.setItem(CUSTOM_TOURNAMENTS_KEY, JSON.stringify(updated)); } catch {}
}

function loadCustomTournaments() {
  try {
    const raw = localStorage.getItem(CUSTOM_TOURNAMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTournaments(list) {
  try { localStorage.setItem(CUSTOM_TOURNAMENTS_KEY, JSON.stringify(list)); } catch {}
}

function createCustomTournament({ name, entryFee, maxPlayers, creator }) {
  const t = {
    id: Math.random().toString(36).slice(2, 9),
    name,
    entryFee: Math.max(1, parseInt(entryFee) || 10),
    maxPlayers: Math.min(16, Math.max(2, parseInt(maxPlayers) || 8)),
    creator,
    participants: [creator], // creator auto-joins
    status: "open",        // open | running | finished
    winnerId: null,
    bracket: null,
    createdAt: Date.now(),
  };
  const list = loadCustomTournaments();
  list.unshift(t);
  // Keep max 20 custom tournaments
  saveCustomTournaments(list.slice(0, 20));
  return t;
}

function joinCustomTournament(tournamentId, player) {
  const list = loadCustomTournaments();
  const idx = list.findIndex((t) => t.id === tournamentId);
  if (idx === -1) return null;
  const t = { ...list[idx] };
  if (t.participants.some((p) => p.id === player.id)) return t; // already in
  if (t.participants.length >= t.maxPlayers) return null; // full
  if (t.status !== "open") return null;
  t.participants = [...t.participants, player];
  list[idx] = t;
  saveCustomTournaments(list);
  return t;
}

function updateCustomTournament(t) {
  const list = loadCustomTournaments();
  const idx = list.findIndex((ct) => ct.id === t.id);
  if (idx !== -1) { list[idx] = t; saveCustomTournaments(list); }
}

function getTournamentKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function loadTournament() {
  const raw = localStorage.getItem("elduel_tournament");
  if (raw) {
    const t = JSON.parse(raw);
    if (t.dayKey === getTournamentKey()) return t;
  }
  // Create new daily tournament
  const t = {
    dayKey: getTournamentKey(),
    name: TOURNAMENT_NAMES[new Date().getDate() % TOURNAMENT_NAMES.length],
    participants: [],
    bracket: null, // filled once started
    status: "open", // open | running | finished
    winnerId: null,
    prizePool: 0,
    startTime: null,
    roundResults: [], // [{roundNum, matches:[{p1,p2,winner}]}]
  };
  saveTournament(t);
  return t;
}

function saveTournament(t) {
  localStorage.setItem("elduel_tournament", JSON.stringify(t));
}

function buildBracket(participants) {
  // Shuffle and pair up. Single elimination.
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  // Pad to power of 2 if needed (add BYE)
  let size = 1;
  while (size < shuffled.length) size *= 2;
  while (shuffled.length < size) shuffled.push({ id: "BYE", name: "BYE", avatar: "👻", rankPoints: 0, isBye: true });
  return shuffled;
}

const OFFICIAL_TOURNAMENT_KEY = "elduel_official_tournament";

function loadOfficialTournament() {
  try {
    const raw = localStorage.getItem(OFFICIAL_TOURNAMENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveOfficialTournament(t) {
  try { localStorage.setItem(OFFICIAL_TOURNAMENT_KEY, JSON.stringify(t)); } catch {}
}

function getOfficialWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(20, 0, 0, 0);
  const end = new Date(now);
  end.setHours(22, 0, 0, 0);
  const startMs = start.getTime();
  const endMs   = end.getTime();
  const nowMs   = now.getTime();
  if (nowMs < startMs) return { start: startMs, end: endMs, status: "soon" };
  if (nowMs <= endMs)  return { start: startMs, end: endMs, status: "open" };
  return { start: startMs, end: endMs, status: "closed" };
}

function getOrCreateOfficialToday(fakePlayers) {
  const today = new Date().toDateString();
  let t = loadOfficialTournament();
  const win = getOfficialWindow();

  // Reset if new day
  if (!t || t.date !== today) {
    t = {
      date: today,
      status: win.status === "open" ? "open" : win.status === "closed" ? "closed" : "upcoming",
      participants: [],
      leaderboard: [],
      rewards: { 1: 500, 2: 250, 3: 100, top10: 25, participation: 5 },
    };
    fakePlayers.forEach((p) => {
      t.leaderboard.push({ ...p, score: Math.floor(Math.random() * 18), streak: 0 });
    });
    saveOfficialTournament(t);
    return t;
  }

  // Sync status with real window (fixes stale "open" after 22h)
  const correctStatus = win.status === "open" ? "open" : win.status === "closed" ? "closed" : "upcoming";
  if (t.status !== correctStatus) {
    t = { ...t, status: correctStatus };
    saveOfficialTournament(t);
  }

  return t;
}


export {
  TOURNAMENT_ENTRY_COST, TOURNAMENT_NAMES, CUSTOM_TOURNAMENTS_KEY,
  deleteCustomTournament, loadCustomTournaments, saveCustomTournaments,
  createCustomTournament, joinCustomTournament, updateCustomTournament,
  getTournamentKey, loadTournament, saveTournament, buildBracket,
  OFFICIAL_TOURNAMENT_KEY, loadOfficialTournament, saveOfficialTournament,
  getOfficialWindow, getOrCreateOfficialToday,
};
