// services/profile.js
// Auth + profil — backend Supabase via API, fallback localStorage

import { backendFetch, BACKEND_CONFIGURED } from './global.js';

// ── Constants ─────────────────────────────────────────────────
export const ACCOUNTS_KEY  = 'elduel_accounts';
export const SESSION_KEY   = 'elduel_session';
export const TUTORIAL_KEY  = 'elduel_tutorial_done';
const PROFILE_TOKEN_KEY    = 'elduel_token';

// ── Local session token ───────────────────────────────────────
export function getStoredToken() {
  try { return localStorage.getItem(PROFILE_TOKEN_KEY); } catch { return null; }
}
function storeToken(token) {
  try { localStorage.setItem(PROFILE_TOKEN_KEY, token); } catch {}
}
function clearToken() {
  try { localStorage.removeItem(PROFILE_TOKEN_KEY); } catch {}
}

// ── Tutorial ──────────────────────────────────────────────────
export function isTutorialDone() {
  return localStorage.getItem(TUTORIAL_KEY) === '1';
}
export function markTutorialDone() {
  localStorage.setItem(TUTORIAL_KEY, '1');
}

// ── Password hash (FNV-1a — identique au backend) ─────────────
export function hashPassword(pw) {
  let h = 0x811c9dc5;
  for (let i = 0; i < pw.length; i++) {
    h ^= pw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ════════════════════════════════════════════════════════════════
// AUTH — Backend Supabase si disponible, sinon localStorage
// ════════════════════════════════════════════════════════════════

export async function authRegister(username, password, avatar) {
  const slug = username.trim().toLowerCase();
  if (slug.length < 3)              return { ok: false, error: 'Pseudo trop court (min 3 caractères).' };
  if (slug.length > 20)             return { ok: false, error: 'Pseudo trop long (max 20 caractères).' };
  if (!/^[a-z0-9_]+$/.test(slug))   return { ok: false, error: 'Pseudo invalide — lettres, chiffres et _ uniquement.' };
  if (password.length < 4)          return { ok: false, error: 'Mot de passe trop court (min 4 caractères).' };

  if (BACKEND_CONFIGURED) {
    const data = await backendFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, avatar }),
    });
    if (!data) return { ok: false, error: 'Serveur indisponible. Réessaie.' };
    if (!data.ok) return { ok: false, error: data.error };
    storeToken(data.token);
    saveProfile(data.player);
    return { ok: true, profile: normalizeProfile(data.player) };
  }

  // ── Fallback localStorage ──────────────────────────────────
  const accounts = loadAccounts();
  if (accounts[slug]) return { ok: false, error: 'Ce pseudo est déjà pris.' };

  const profileId = generateId();
  const newProfile = makeDefaultProfile({ profileId, username, avatar });
  localStorage.setItem('elduel_profile_' + profileId, JSON.stringify(newProfile));
  accounts[slug] = { passwordHash: hashPassword(password), profileId, username: username.trim() };
  saveAccounts(accounts);
  saveSession({ username: slug, profileId, displayName: username.trim() });
  return { ok: true, profile: newProfile };
}

export async function authLogin(username, password) {
  if (BACKEND_CONFIGURED) {
    const data = await backendFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (!data) return { ok: false, error: 'Serveur indisponible. Réessaie.' };
    if (!data.ok) return { ok: false, error: data.error };
    storeToken(data.token);
    saveProfile(data.player);
    return { ok: true, profile: normalizeProfile(data.player) };
  }

  // ── Fallback localStorage ──────────────────────────────────
  const accounts = loadAccounts();
  const slug = username.trim().toLowerCase();
  const acc = accounts[slug];
  if (!acc) return { ok: false, error: 'Compte introuvable.' };
  if (acc.passwordHash !== hashPassword(password)) return { ok: false, error: 'Mot de passe incorrect.' };
  const raw = localStorage.getItem('elduel_profile_' + acc.profileId);
  if (!raw) return { ok: false, error: 'Profil introuvable.' };
  const profile = JSON.parse(raw);
  saveSession({ username: slug, profileId: acc.profileId, displayName: acc.username });
  return { ok: true, profile };
}

export async function authLoadSession() {
  // Try backend token first
  if (BACKEND_CONFIGURED) {
    const token = getStoredToken();
    if (token) {
      const data = await backendFetch('/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      if (data?.ok && data.player) {
        saveProfile(data.player);
        return normalizeProfile(data.player);
      }
      clearToken();
      return null;
    }
    return null;
  }

  // ── Fallback localStorage ──────────────────────────────────
  const session = loadSession();
  if (!session) return null;
  const raw = localStorage.getItem('elduel_profile_' + session.profileId);
  if (!raw) { clearSession(); return null; }
  return JSON.parse(raw);
}

export async function authLogout(profile) {
  if (BACKEND_CONFIGURED) {
    const token = getStoredToken();
    await backendFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ token, playerId: profile?.id }),
    });
    clearToken();
    return;
  }
  clearSession();
}

export async function authSaveProfile(p) {
  saveProfile(p);  // always local
  if (BACKEND_CONFIGURED && p?.id) {
    // Sync to backend (non-blocking)
    backendFetch(`/api/player/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        avatar: p.avatar, title: p.title, rank_points: p.rankPoints,
        gems: p.gems, bat: p.bat, wins: p.wins, losses: p.losses,
        draws: p.draws, games_played: p.gamesPlayed,
        equipped_frame: p.equippedFrame,
        equipped_versus_skin: p.equippedVersusSkin,
        equipped_skins: p.equippedSkins,
        owned_skins: p.ownedSkins,
        owned_frames: p.ownedFrames,
        owned_versus_skins: p.ownedVersusSkins,
        last_bat_recharge: p.lastBatRecharge,
      }),
    }).catch(console.warn);
  }
}

// ── Local profile helpers ─────────────────────────────────────
export function loadProfile() {
  try {
    const raw = localStorage.getItem('elduel_profile');
    if (raw) return JSON.parse(raw);
  } catch {}
  return makeDefaultProfile({});
}

export function saveProfile(p) {
  try { localStorage.setItem('elduel_profile', JSON.stringify(p)); } catch {}
}

// ── localStorage auth fallback helpers ───────────────────────
export function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); } catch { return {}; }
}
export function saveAccounts(a) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); } catch {}
}
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function saveSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Profile normalizer (Supabase snake_case → camelCase) ──────
function normalizeProfile(p) {
  if (!p) return null;
  return {
    id:                p.id,
    name:              p.username || p.name,
    avatar:            p.avatar || '⚔️',
    title:             p.title || 'Novice',
    rankPoints:        p.rank_points ?? p.rankPoints ?? 0,
    gems:              p.gems ?? 50,
    bat:               p.bat ?? 5,
    vip:               p.vip ?? false,
    wins:              p.wins ?? 0,
    losses:            p.losses ?? 0,
    draws:             p.draws ?? 0,
    gamesPlayed:       p.games_played ?? p.gamesPlayed ?? 0,
    equippedFrame:     p.equipped_frame ?? p.equippedFrame ?? null,
    equippedVersusSkin: p.equipped_versus_skin ?? p.equippedVersusSkin ?? 'vs_default',
    equippedSkins:     p.equipped_skins ?? p.equippedSkins ?? { EAU:'default',FEU:'default',AIR:'default',TERRE:'default',ETHER:'default' },
    ownedSkins:        p.owned_skins ?? p.ownedSkins ?? ['default'],
    ownedFrames:       p.owned_frames ?? p.ownedFrames ?? [],
    ownedVersusSkins:  p.owned_versus_skins ?? p.ownedVersusSkins ?? ['vs_default'],
    lastBatRecharge:   p.last_bat_recharge ?? p.lastBatRecharge ?? Date.now(),
  };
}

function makeDefaultProfile({ profileId, username, avatar }) {
  return {
    id: profileId || generateId(),
    name: username ? username.trim() : 'Joueur' + Math.floor(Math.random() * 9999),
    avatar: avatar || '⚔️',
    title: 'Novice',
    rankPoints: 0, gems: 50, bat: 5, vip: false,
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
    equippedFrame: null, equippedVersusSkin: 'vs_default',
    equippedSkins: { EAU:'default',FEU:'default',AIR:'default',TERRE:'default',ETHER:'default' },
    ownedSkins: ['default'], ownedFrames: [], ownedVersusSkins: ['vs_default'],
    lastBatRecharge: Date.now(),
  };
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
