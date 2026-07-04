import { useState, useEffect, useRef, useCallback } from 'react';

// ── Data
import { ELEMENTS, STRENGTHS, WEAKNESSES } from './data/elements.js';
import { RANKS, getRank, resolveRound, botChoice, generateMatchId, claimRankBonus, hasClaimedRankBonus } from './data/ranks.js';
import { TITLES, PREMIUM_TITLES, loadOwnedTitles, saveOwnedTitles, TitleDisplay } from './data/titles.jsx';
import { AvatarDisplay, FlagEmoji, isRegionalFlag, AVATAR_CATEGORIES, AVATARS } from './data/avatars.jsx';
import { TOURNAMENT_ENTRY_COST, TOURNAMENT_NAMES, loadTournament, saveTournament, buildBracket, loadOfficialTournament, saveOfficialTournament, getOfficialWindow, getOrCreateOfficialToday, loadCustomTournaments, saveCustomTournaments, createCustomTournament, joinCustomTournament, updateCustomTournament, deleteCustomTournament, getTournamentKey } from './data/tournaments.js';

// ── Services
import { loadProfile, saveProfile, authSaveProfile, authRegister, authLogin, authLoadSession, loadSession, saveSession, clearSession, isTutorialDone, markTutorialDone, ACCOUNTS_KEY, SESSION_KEY, TUTORIAL_KEY } from './services/profile.js';
import { backendFetch, BACKEND_URL, API_SECRET } from './services/global.js';
import { loadVipVideo, saveVipVideo, clearVipVideo, validateVipVideo, VipVideoPlayer } from './services/multiplayer.jsx';

// ── Skins
import { SKIN_BUNDLES, CARD_SKINS, INDIVIDUAL_SKINS, getIndivImage, BUNDLE_SKIN_MAP, getSkinsForElement, isBundleOwned, getBundleSkinIds, getRarityBorderStyle } from './skins/skins.js';

// ── UI
import { FRAME_RANK, FRAME_PREMIUM, ALL_FRAMES, getFrameById, getAutoFrame, getOwnedFrames, loadOwnedFrames, saveOwnedFrames, AvatarWithFrame, AvatarWithFrameDark, NmCard, SectionLabel, HpBar, TimerCircle, ElementCard, PlayerBanner, GalaxyRift, Particles, Shockwave, FloatingText, RoundWinEffect, RoundLoseEffect, VictoryConfetti, BGFlash } from './ui/UI.jsx';

// ── Screens
import AuthScreen from './screens/AuthScreen.jsx';
import TutorialScreen from './screens/TutorialScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import { MatchmakingScreen, LOADING_BG_IMAGE } from './screens/GameScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import VersusScreen, { ELEMENT_VERSUS, VERSUS_SKINS, getVersusSkin } from './screens/VersusScreen.jsx';
import GameOverScreen, { GAMEOVER_BG_IMAGE } from './screens/GameOverScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import ShopScreen from './screens/ShopScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';

const css = `
/* ── MOBILE OPTIMIZATIONS ── */
* { -webkit-tap-highlight-color: transparent; }
html, body { overscroll-behavior: none; touch-action: manipulation; }

@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

/* ── Force emoji rendering for flag spans ── */
.flag-emoji {
  font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif !important;
  font-size: 24px !important;
  line-height: 1 !important;
  display: inline-block !important;
  font-variant-emoji: emoji !important;
  font-style: normal !important;
  font-weight: normal !important;
  text-rendering: optimizeLegibility !important;
  -webkit-font-smoothing: antialiased !important;
}
.flag-emoji-sm {
  font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif !important;
  font-size: 18px !important;
  line-height: 1 !important;
  display: inline-block !important;
  font-variant-emoji: emoji !important;
}
.flag-emoji-lg {
  font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif !important;
  font-size: 30px !important;
  line-height: 1 !important;
  display: inline-block !important;
  font-variant-emoji: emoji !important;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  /* ── LIGHT NEUMORPHIC THEME ── */
  --bg:       #e0e5ec;
  --surface:  #e8ecf2;
  --card:     #edf0f5;
  --border:   rgba(160,175,195,0.35);

  /* Neumorphic shadows */
  --nm-out:   6px 6px 14px #b8bec7, -4px -4px 10px #ffffff;
  --nm-in:    inset 4px 4px 8px #b8bec7, inset -3px -3px 7px #ffffff;
  --nm-sm:    3px 3px 8px #c0c8d2, -2px -2px 6px #ffffff;

  /* Text */
  --text:     #1a2332;
  --text2:    #2d3748;

  /* Accents — adapted for light bg */
  --accent:   #5b42c0;
  --accent2:  #4f6bbf;
  --gold:     #c47f00;
  --danger:   #c0392b;
  --success:  #1a7a3f;
  --win:      #b8860b;
  --lose:     #c0392b;
  --draw:     #5a6880;
}
html, body, #root { height: 100%; width: 100%; overflow: hidden; background: var(--bg); }
.app {
  font-family: 'Rajdhani', sans-serif;
  color: var(--text);
  background: var(--bg);
  height: 100svh;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.screen { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
.title-font { font-family: 'Cinzel Decorative', serif; }

/* STARS BG */
/* GALAXY RIFT */
.stars-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  width: 100% !important; height: 100% !important;
}

/* NAV */
.nav {
  display: flex; align-items: center; justify-content: space-around;
  background: linear-gradient(145deg, #edf0f5, #dde3ea);
  border-top: 1px solid rgba(160,175,195,0.4);
  box-shadow: 0 -3px 10px rgba(140,155,175,0.15);
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
  position: relative; z-index: 10;
  flex-shrink: 0;
}
.nav-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: none; border: none; color: var(--text2);
  font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700;
  cursor: pointer; padding: 4px 12px; border-radius: 10px; transition: all 0.2s;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.nav-btn.active { color: var(--accent); }
.nav-btn .nav-icon { font-size: 20px; }

/* BUTTONS */
.btn {
  border: none; cursor: pointer; border-radius: 12px;
  font-family: 'Rajdhani', sans-serif; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  transition: all 0.2s; position: relative; overflow: hidden;
}
.btn-primary {
  background: linear-gradient(145deg, #6b52d0, #4f3fa8);
  color: white;
  box-shadow: 4px 4px 10px rgba(91,66,192,0.35), -2px -2px 6px rgba(255,255,255,0.7);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 5px 5px 14px rgba(91,66,192,0.4), -3px -3px 8px rgba(255,255,255,0.8); }
.btn-primary:active { transform: translateY(0); box-shadow: inset 3px 3px 7px rgba(40,20,100,0.3); }
.btn-gold {
  background: linear-gradient(145deg, #d4960a, #b07500);
  color: white;
  box-shadow: 4px 4px 10px rgba(180,120,0,0.3), -2px -2px 6px rgba(255,255,255,0.7);
}
.btn-ghost {
  background: linear-gradient(145deg, #edf0f5, #dde3ea);
  color: var(--text2);
  box-shadow: var(--nm-sm);
}
.btn-ghost:active { box-shadow: var(--nm-in); }
.btn-danger { background: linear-gradient(145deg, #d94030, #b02820); color: white; box-shadow: 4px 4px 10px rgba(192,57,43,0.3); }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-md { padding: 10px 20px; font-size: 14px; }
.btn-lg { padding: 14px 32px; font-size: 16px; }
.btn-xl { padding: 18px 48px; font-size: 18px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

/* CARDS */
.element-card {
  border-radius: 14px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.25s; position: relative;
  overflow: hidden; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px; user-select: none;
  background: linear-gradient(145deg, #edf0f5, #dde3ea);
  box-shadow: var(--nm-sm);
}
.element-card:active { transform: scale(0.95); box-shadow: var(--nm-in); }
.element-card.selected { box-shadow: var(--nm-in); transform: translateY(2px); }
.element-card.disabled { opacity: 0.5; cursor: not-allowed; }

/* HEALTH */
.hp-bar { display: flex; gap: 4px; align-items: center; }
.hp-dot { width: 14px; height: 8px; border-radius: 4px; transition: all 0.4s; }
.hp-dot.filled { background: var(--success); box-shadow: 0 1px 4px rgba(26,122,63,0.35); }
.hp-dot.empty { background: #c8cdd5; box-shadow: inset 2px 2px 4px rgba(140,155,175,0.3); }

/* VERSUS SCREEN */
@keyframes slideLeft { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes vsSlideLeft  { 0% { transform: translateX(-110vw) scale(0.8); opacity: 0; } 60% { transform: translateX(0) scale(1.04); opacity: 1; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes vsSlideRight { 0% { transform: translateX(110vw) scale(0.8); opacity: 0; } 60% { transform: translateX(0) scale(1.04); opacity: 1; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes vsCollide   { 0% { transform: scale(0); opacity: 0; } 30% { transform: scale(1.8); opacity: 1; } 70% { transform: scale(1.2); opacity: 0.9; } 100% { transform: scale(2.5); opacity: 0; } }
@keyframes vsFlash     { 0%,100% { opacity: 0; } 20% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes vsShake     { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-4px,2px)} 20%{transform:translate(4px,-2px)} 30%{transform:translate(-3px,1px)} 40%{transform:translate(3px,0px)} }
@keyframes vsZoom      { 0% { transform: scale(1); } 40% { transform: scale(1.04); } 100% { transform: scale(1); } }
@keyframes vsAura      { 0%,100% { box-shadow: 0 0 20px 6px var(--aura-color); } 50% { box-shadow: 0 0 40px 14px var(--aura-color); } }
@keyframes vsSkinEntry { 0% { transform: scale(0.7) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes vsNameEntry { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes vsOrb       { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.15);opacity:1} }

.slide-left { animation: slideLeft 0.7s cubic-bezier(.22,.68,0,1.2) forwards; }
.slide-right { animation: slideRight 0.7s cubic-bezier(.22,.68,0,1.2) forwards; }
.vs-appear { animation: vsAppear 0.6s 0.5s cubic-bezier(.22,.68,0,1.2) both; }
@keyframes vsAppear { 0% { opacity:0; transform: scale(3); } 60% { opacity:1; transform: scale(0.9); } 100% { opacity:1; transform: scale(1); } }

/* RESULT ANIMATION */
@keyframes resultPop { 0% { transform: scale(0) rotate(-10deg); opacity:0; } 60% { transform: scale(1.15) rotate(3deg); opacity:1; } 100% { transform: scale(1) rotate(0); opacity:1; } }
.result-pop { animation: resultPop 0.4s cubic-bezier(.22,.68,0,1.2) forwards; }

/* TIMER CIRCLE */
.timer-ring { transform-origin: center; transition: stroke-dashoffset 1s linear; }

/* SCROLLBAR */
.screen::-webkit-scrollbar { width: 3px; }
.screen::-webkit-scrollbar-track { background: transparent; }
.screen::-webkit-scrollbar-thumb { background: rgba(160,175,195,0.4); border-radius: 2px; }

/* MATCHMAKING PULSE */
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
.pulse { animation: pulse 1.8s infinite; }

/* CARD FLIP */
@keyframes cardReveal { 0%{transform:rotateY(90deg);opacity:0} 100%{transform:rotateY(0);opacity:1} }
.card-reveal { animation: cardReveal 0.4s cubic-bezier(.22,.68,0,1.2) forwards; }

/* HISTORY */
@keyframes historyFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }

/* PARTICLES / CONFETTI */
@keyframes particleFly {
  0%   { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
}
@keyframes starBurst {
  0%   { transform: scale(0) rotate(0deg); opacity:1; }
  60%  { transform: scale(1.4) rotate(20deg); opacity:1; }
  100% { transform: scale(0) rotate(40deg); opacity:0; }
}
@keyframes shockwave {
  0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.8; }
  100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
}
@keyframes winGlow {
  0%,100% { box-shadow: 5px 5px 14px rgba(180,140,0,0.25), -3px -3px 8px #fff; }
  50%      { box-shadow: 7px 7px 20px rgba(180,140,0,0.4), -4px -4px 12px #fff; }
}
@keyframes loseShake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-8px); }
  40%     { transform: translateX(8px); }
  60%     { transform: translateX(-5px); }
  80%     { transform: translateX(5px); }
}
@keyframes winTextStrike {
  0%   { letter-spacing: 0.3em; opacity:0; transform: scale(0.6); }
  60%  { letter-spacing: 0.08em; opacity:1; transform: scale(1.05); }
  100% { letter-spacing: 0.08em; opacity:1; transform: scale(1); }
}
@keyframes loseTextDrop {
  0%   { opacity:0; transform: translateY(-40px) scale(1.3); }
  70%  { opacity:1; transform: translateY(4px) scale(0.97); }
  100% { opacity:1; transform: translateY(0) scale(1); }
}
@keyframes floatUp {
  0%   { opacity:1; transform: translateY(0) scale(1); }
  100% { opacity:0; transform: translateY(-60px) scale(0.5); }
}
@keyframes bgFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes glowPulse { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.8; filter: brightness(1.4); } }
@keyframes borderPulseGold { 0%, 100% { box-shadow: 0 0 14px rgba(245,158,11,0.7), 0 0 28px rgba(245,158,11,0.3); outline-color: #f59e0b; } 50% { box-shadow: 0 0 24px rgba(251,191,36,0.9), 0 0 48px rgba(245,158,11,0.5); outline-color: #fbbf24; } }
@keyframes borderPulsePurple { 0%, 100% { box-shadow: 0 0 14px rgba(139,92,246,0.65), 0 0 28px rgba(139,92,246,0.25); outline-color: #8b5cf6; } 50% { box-shadow: 0 0 24px rgba(192,132,252,0.85), 0 0 48px rgba(139,92,246,0.4); outline-color: #c084fc; } }
@keyframes borderPulseRed { 0%, 100% { box-shadow: 0 0 14px rgba(220,38,38,0.65), 0 0 28px rgba(220,38,38,0.25); } 50% { box-shadow: 0 0 28px rgba(255,68,68,0.9), 0 0 56px rgba(220,38,38,0.5); } }
@keyframes borderRainbow {
  0%   { box-shadow: 0 0 20px rgba(255,0,128,0.8),  0 0 40px rgba(255,0,128,0.3);  outline-color: #ff0080; }
  17%  { box-shadow: 0 0 20px rgba(255,140,0,0.8),  0 0 40px rgba(255,140,0,0.3);  outline-color: #ff8c00; }
  33%  { box-shadow: 0 0 20px rgba(255,215,0,0.8),  0 0 40px rgba(255,215,0,0.3);  outline-color: #ffd700; }
  50%  { box-shadow: 0 0 20px rgba(0,255,136,0.8),  0 0 40px rgba(0,255,136,0.3);  outline-color: #00ff88; }
  67%  { box-shadow: 0 0 20px rgba(0,207,255,0.8),  0 0 40px rgba(0,207,255,0.3);  outline-color: #00cfff; }
  83%  { box-shadow: 0 0 20px rgba(168,85,247,0.8),  0 0 40px rgba(168,85,247,0.3); outline-color: #a855f7; }
  100% { box-shadow: 0 0 20px rgba(255,0,128,0.8),  0 0 40px rgba(255,0,128,0.3);  outline-color: #ff0080; }
}
@keyframes borderFire {
  0%   { box-shadow: 0 0 16px rgba(255,69,0,0.8),   0 0 32px rgba(255,69,0,0.35);   outline-color: #ff4500; }
  50%  { box-shadow: 0 0 28px rgba(255,215,0,0.9),  0 0 56px rgba(255,140,0,0.5);   outline-color: #ffd700; }
  100% { box-shadow: 0 0 16px rgba(255,69,0,0.8),   0 0 32px rgba(255,69,0,0.35);   outline-color: #ff4500; }
}
.win-glow  { animation: winGlow 1.5s ease-in-out infinite; }
.lose-shake { animation: loseShake 0.5s ease; }

/* MODAL */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(180,190,205,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; backdrop-filter: blur(6px);
}
.modal {
  background: var(--card); box-shadow: var(--nm-out);
  border-radius: 20px; padding: 24px; max-width: 340px; width: 90%;
  position: relative;
}

/* BADGE */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.badge-vip { background: linear-gradient(135deg, #d4960a, #b07500); color: white; }
.badge-rank { font-size: 12px; }

/* SHOP */
.shop-item {
  background: linear-gradient(145deg, #edf0f5, #dde3ea);
  box-shadow: var(--nm-sm);
  border-radius: 14px; padding: 14px; transition: box-shadow 0.2s;
}
.shop-item:hover { box-shadow: var(--nm-out); }

/* TOURNAMENT */
@keyframes trophy { 0%,100%{transform:scale(1) rotate(0)} 25%{transform:scale(1.1) rotate(-5deg)} 75%{transform:scale(1.1) rotate(5deg)} }
.trophy-anim { animation: trophy 1.5s infinite; }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
.prize-shimmer {
  background: linear-gradient(90deg, #c47f00, #d4960a, #e8b830, #d4960a, #c47f00);
  background-size: 200% auto;
  WebkitBackgroundClip: text;
  animation: shimmer 3s linear infinite;
}
.bracket-match {
  background: linear-gradient(145deg, #edf0f5, #dde3ea);
  box-shadow: var(--nm-sm);
  border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s;
}
.bracket-match.winner { box-shadow: var(--nm-out); border: 1px solid rgba(180,140,0,0.3); }
.bracket-player {
  padding: 8px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px;
  border-bottom: 1px solid rgba(160,175,195,0.25); color: var(--text);
}
.bracket-player:last-child { border-bottom: none; }
.bracket-player.winner { background: rgba(180,140,0,0.08); color: var(--gold); font-weight: 700; }
.bracket-player.loser { opacity: 0.4; text-decoration: line-through; }
.bracket-player.bye { opacity: 0.3; font-style: italic; }

/* SKIN PREVIEW */
.skin-card {
  border-radius: 12px; border: 2px solid rgba(160,175,195,0.3);
  box-shadow: var(--nm-sm);
  overflow: hidden; cursor: pointer; transition: all 0.2s;
  aspect-ratio: 2/3; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.skin-card.owned { border-color: rgba(26,122,63,0.5); }
.skin-card.equipped { border-color: var(--accent); box-shadow: var(--nm-out); }

/* ── AVATAR FRAMES ── */
@keyframes frameGlow    { 0%,100%{opacity:0.7} 50%{opacity:1} }
@keyframes frameShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes frameSpin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes framePulse   { 0%,100%{box-shadow:var(--fw)} 50%{box-shadow:var(--fw2)} }
@keyframes frameDiamond {
  0%,100%{box-shadow:0 0 8px 2px rgba(99,210,255,0.5),0 0 20px 4px rgba(99,210,255,0.2)}
  50%{box-shadow:0 0 16px 4px rgba(180,240,255,0.8),0 0 32px 8px rgba(99,210,255,0.3)}
}
@keyframes frameLegend {
  0%  {box-shadow:0 0 12px 3px rgba(255,215,0,0.7),0 0 24px 6px rgba(255,140,0,0.3)}
  33% {box-shadow:0 0 12px 3px rgba(255,100,255,0.7),0 0 24px 6px rgba(180,0,255,0.3)}
  66% {box-shadow:0 0 12px 3px rgba(99,210,255,0.7),0 0 24px 6px rgba(0,150,255,0.3)}
  100%{box-shadow:0 0 12px 3px rgba(255,215,0,0.7),0 0 24px 6px rgba(255,140,0,0.3)}
}
@keyframes frameFire {
  0%,100%{box-shadow:0 0 10px 3px rgba(255,80,0,0.7),0 0 20px 6px rgba(255,150,0,0.3)}
  50%    {box-shadow:0 0 18px 5px rgba(255,180,0,0.9),0 0 36px 8px rgba(255,60,0,0.4)}
}
@keyframes frameNeon {
  0%  {box-shadow:0 0 8px 2px rgba(0,255,200,0.7),0 0 16px 4px rgba(0,200,255,0.3)}
  33% {box-shadow:0 0 8px 2px rgba(255,0,200,0.7),0 0 16px 4px rgba(200,0,255,0.3)}
  66% {box-shadow:0 0 8px 2px rgba(200,255,0,0.7),0 0 16px 4px rgba(0,255,100,0.3)}
  100%{box-shadow:0 0 8px 2px rgba(0,255,200,0.7),0 0 16px 4px rgba(0,200,255,0.3)}
}
@keyframes frameGalaxy {
  0%,100%{box-shadow:0 0 12px 3px rgba(100,0,200,0.6),0 0 24px 6px rgba(50,0,150,0.3)}
  50%    {box-shadow:0 0 20px 5px rgba(200,100,255,0.7),0 0 40px 10px rgba(100,0,200,0.3)}
}
`;


// ── NM theme constants (used across screens)
const NM = {
  bg:   "#e0e5ec",
  card: "linear-gradient(145deg, #edf0f5, #dde3ea)",
  out:  "6px 6px 14px #b8bec7, -4px -4px 10px #ffffff",
  sm:   "3px 3px 8px #c0c8d2, -2px -2px 6px #ffffff",
  in:   "inset 4px 4px 8px #b8bec7, inset -3px -3px 7px #ffffff",
};

export default function App() {
  const [authProfile, setAuthProfile] = useState(() => authLoadSession());
  const [showTutorial, setShowTutorial] = useState(false);
  const [profile, setProfile] = useState(() => authLoadSession() || loadProfile());
  const [screen, setScreen] = useState("home"); // home | matchmaking | versus | game | gameover | profile | leaderboard | shop | tournament
  const [opponent, setOpponent] = useState(null);
  const [isBot, setIsBot] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isTournament, setIsTournament] = useState(false);
  const [activeTournamentId, setActiveTournamentId] = useState(null); // null = daily, string = custom id

  // BAT recharge timer
  useEffect(() => {
    const check = () => {
      if (profile.vip) return;
      const now = Date.now();
      const elapsed = now - (profile.lastBatRecharge || now);
      const cycles = Math.floor(elapsed / (24 * 3600 * 1000));
      if (cycles > 0 && profile.bat < 5) {
        const newBat = Math.min(5, profile.bat + cycles * 2);
        const p = { ...profile, bat: newBat, lastBatRecharge: now };
        saveProfile(p);
        setProfile(p);
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [profile.bat, profile.vip]);

  function handlePlayTournament(opp, tournamentOrId) {
    setOpponent(opp);
    setIsBot(false);
    setIsTournament(true);
    // Store tournament context: null = daily, string id = custom
    const tId = typeof tournamentOrId === "string" ? tournamentOrId
      : (tournamentOrId?.id || null);
    setActiveTournamentId(tId || null);
    setScreen("versus");
  }

  function handlePlayMulti() {
    if (!profile.vip && profile.bat <= 0) return;
    const p = profile.vip ? profile : { ...profile, bat: profile.bat - 1 };
    saveProfile(p);
    setProfile(p);
    setIsBot(false);
    setScreen("matchmaking");
  }

  function handlePlayBot() {
    const botProfiles = [
      { id: "bot1", name: "RoboGuard", avatar: "🤖", title: "Duelliste", rankPoints: 150 },
      { id: "bot2", name: "AutoCore", avatar: "⚙️", title: "Guerrier", rankPoints: 350 },
      { id: "bot3", name: "SynthBlade", avatar: "🦾", title: "Champion", rankPoints: 600 },
    ];
    const opp = botProfiles[Math.floor(Math.random() * botProfiles.length)];
    setOpponent(opp);
    setIsBot(true);
    setScreen("versus");
  }

  function handleMatchFound(opp) {
    setOpponent(opp);
    setScreen("versus");
  }

  function handleVersusEnd() {
    setScreen("game");
  }

  function handleGameEnd(result) {
    const isQuit = result === "quit";
    const finalResult = isQuit ? "lose" : result;
    const won = finalResult === "win";
    const tied = finalResult === "draw";
    const pts = won ? 10 : tied ? 5 : -5;
    const gemsEarned = !isTournament ? (won ? 5 : tied ? 2 : 0) : 0;
    let p = {
      ...profile,
      rankPoints: Math.max(0, profile.rankPoints + pts),
      wins: profile.wins + (won ? 1 : 0),
      losses: profile.losses + (!won && !tied ? 1 : 0),
      draws: profile.draws + (tied ? 1 : 0),
      gamesPlayed: profile.gamesPlayed + 1,
      gems: profile.gems + gemsEarned,
    };

    // ── RANK-UP BONUS ─────────────────────────────────────────
    // Check if the player just crossed into a new rank for the first time
    let rankUpBonusEarned = 0;
    const oldRank = getRank(profile.rankPoints);
    const newRankObj = getRank(p.rankPoints);
    if (newRankObj.name !== oldRank.name) {
      // Player crossed into a new rank — check if bonus was never claimed
      rankUpBonusEarned = claimRankBonus(newRankObj.name);
      if (rankUpBonusEarned > 0) {
        p = { ...p, gems: p.gems + rankUpBonusEarned };
      }
    }

    let nextOpponent = null; // if set, chain next tournament match

    // ── OFFICIAL TOURNAMENT (Duel Suprême) ────────────────────
    if (isTournament && activeTournamentId === "official") {
      const ot = loadOfficialTournament();
      if (ot) {
        const pts_score = won ? 3 : tied ? 1 : 0;
        const board = (ot.leaderboard || []).map(entry => {
          if (entry.id !== profile.id) return entry;
          const newStreak = won ? (entry.streak || 0) + 1 : 0;
          const bonus = (won && newStreak >= 3) ? 2 : 0;
          return { ...entry, score: entry.score + pts_score + bonus, streak: newStreak };
        });
        saveOfficialTournament({ ...ot, leaderboard: board });
      }
      // Official matches are standalone — no chaining
    }

    // ── DAILY TOURNAMENT ──────────────────────────────────────
    if (isTournament && !activeTournamentId && activeTournamentId !== "official") {
      const t = loadTournament();
      const allReal = [...t.participants,
        { id: "fp1", name: "ShadowBlade", avatar: "👁️", rankPoints: 820 },
        { id: "fp2", name: "AquaLord",    avatar: "🌊", rankPoints: 1200 },
        { id: "fp3", name: "FireMaster",  avatar: "🔥", rankPoints: 650 },
        { id: "fp4", name: "TerraFury",   avatar: "🐉", rankPoints: 480 },
        { id: "fp5", name: "EtherKnight", avatar: "🔮", rankPoints: 970 },
        { id: "fp6", name: "StormRider",  avatar: "⚔️", rankPoints: 340 },
        { id: "fp7", name: "VoidWalker",  avatar: "💀", rankPoints: 1450 },
      ].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i);

      if (won) {
        // Advance bracket — find next opponent
        const bracket = t.bracket || allReal;
        const playerIdx = bracket.findIndex((x) => x.id === profile.id);
        const pairIdx = playerIdx % 2 === 0 ? playerIdx + 1 : playerIdx - 1;
        const winners = [];
        for (let i = 0; i < bracket.length; i += 2) {
          const a = bracket[i], b = bracket[i + 1];
          if (!a || !b || b.isBye) { winners.push(a); continue; }
          if (a.isBye) { winners.push(b); continue; }
          if (a.id === profile.id || b.id === profile.id) winners.push(profile);
          else winners.push(a.rankPoints >= b.rankPoints ? a : b);
        }
        if (winners.length <= 1) {
          // Champion — award prize
          const prize = allReal.filter((x) => !x.isBye).length * TOURNAMENT_ENTRY_COST;
          p = { ...p, gems: p.gems + prize };
          saveTournament({ ...t, status: "finished", winnerId: profile.id });
        } else {
          // Next round: find player's new opponent
          const newBracket = buildBracket(winners);
          const newPlayerIdx = newBracket.findIndex((x) => x.id === profile.id);
          const newPairIdx = newPlayerIdx % 2 === 0 ? newPlayerIdx + 1 : newPlayerIdx - 1;
          const nextOpp = newBracket[newPairIdx];
          saveTournament({ ...t, bracket: newBracket, roundResults: [...(t.roundResults || []), { bracket: winners }] });
          if (nextOpp && !nextOpp.isBye) nextOpponent = nextOpp;
          else saveTournament({ ...t, status: "finished", winnerId: profile.id });
        }
      } else {
        saveTournament({ ...t, status: "finished", winnerId: opponent?.id || "fp1" });
      }
    }

    // ── CUSTOM TOURNAMENT ─────────────────────────────────────
    if (isTournament && activeTournamentId) {
      const list = loadCustomTournaments();
      const tIdx = list.findIndex((x) => x.id === activeTournamentId);
      if (tIdx !== -1) {
        const t = { ...list[tIdx] };
        const bracket = t.bracket || t.participants;

        if (won) {
          const winners = [];
          for (let i = 0; i < bracket.length; i += 2) {
            const a = bracket[i], b = bracket[i + 1];
            if (!a) continue;
            if (!b || b.isBye) { winners.push(a); continue; }
            if (a.isBye) { winners.push(b); continue; }
            if (a.id === profile.id || b.id === profile.id) winners.push({ id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints });
            else winners.push(a.rankPoints >= b.rankPoints ? a : b);
          }
          if (winners.length <= 1) {
            // Champion — award prize
            const prize = t.participants.length * t.entryFee;
            p = { ...p, gems: p.gems + prize };
            t.status = "finished"; t.winnerId = profile.id;
          } else {
            const newBracket = buildBracket(winners);
            const newPlayerIdx = newBracket.findIndex((x) => x.id === profile.id);
            const newPairIdx = newPlayerIdx % 2 === 0 ? newPlayerIdx + 1 : newPlayerIdx - 1;
            const nextOpp = newBracket[newPairIdx];
            t.bracket = newBracket;
            if (nextOpp && !nextOpp.isBye) nextOpponent = nextOpp;
            else { t.status = "finished"; t.winnerId = profile.id; }
          }
        } else {
          t.status = "finished"; t.winnerId = opponent?.id || t.participants.find((x) => x.id !== profile.id)?.id;
        }
        list[tIdx] = t;
        saveCustomTournaments(list);
      }
    }

    saveProfile(p);
    setProfile(p);
    setGameResult({ outcome: finalResult, gemsEarned, rankUpBonusEarned, isQuit, batLost: !isBot && !profile.vip, nextOpponent, activeTournamentId });
    setScreen("gameover");
  }

  function handleContinue() {
    const nr = gameResult?.nextOpponent;
    const tId = gameResult?.activeTournamentId;
    setOpponent(null);
    setGameResult(null);
    setIsTournament(false);
    setActiveTournamentId(null);
    // Chain next match if available
    if (nr) {
      setOpponent(nr);
      setIsBot(false);
      setIsTournament(true);
      setActiveTournamentId(tId || null);
      setScreen("versus");
    } else {
      setScreen("home");
    }
  }

  function handleReplay() {
    // Restart a match with the same opponent type (bot or online)
    const wasBot = isBot;
    const prevOpponent = opponent;
    setGameResult(null);
    setIsTournament(false);
    setActiveTournamentId(null);
    if (wasBot || !prevOpponent) {
      // Replay vs bot — pick a new random bot
      const bots = [
        { id: "bot1", name: "RoboGuard",   avatar: "🤖", rankPoints: 300, isBot: true },
        { id: "bot2", name: "SynthBlade",  avatar: "⚔️", rankPoints: 500, isBot: true },
        { id: "bot3", name: "AutoCore",    avatar: "🛡️", rankPoints: 200, isBot: true },
        { id: "bot4", name: "NeonHunter",  avatar: "👾", rankPoints: 700, isBot: true },
        { id: "bot5", name: "IronVeil",    avatar: "💀", rankPoints: 450, isBot: true },
      ];
      const newBot = bots[Math.floor(Math.random() * bots.length)];
      setOpponent(newBot);
      setIsBot(true);
      setScreen("versus");
    } else {
      // Replay online — restart matchmaking
      setOpponent(null);
      setIsBot(false);
      setScreen("matchmaking");
    }
  }

  function updateProfile(p) {
    setProfile(p);
    authSaveProfile(p);
  }

  function handleLogout() {
    clearSession();
    setAuthProfile(null);
    setScreen("home");
  }

  function handleAuthDone(p, isNew) {
    setAuthProfile(p);
    setProfile(p);
    authSaveProfile(p);
    if (isNew && !isTutorialDone()) {
      setShowTutorial(true);
    }
  }

  const navItems = [
    { id: "home", label: "Accueil", icon: "🏠" },
    { id: "tournament", label: "Tournoi", icon: "🏆" },
    { id: "leaderboard", label: "Classement", icon: "📊" },
    { id: "shop", label: "Boutique", icon: "🛒" },
    { id: "profile", label: "Profil", icon: "👤" },
  ];

  const showNav = ["home", "tournament", "leaderboard", "shop", "profile"].includes(screen);

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Auth gate */}
        {!authProfile && <AuthScreen onAuth={handleAuthDone} />}

        {/* Tutorial (new users only) */}
        {authProfile && showTutorial && (
          <TutorialScreen onDone={() => setShowTutorial(false)} />
        )}
        {screen === "matchmaking" && (
          <MatchmakingScreen
            onCancel={() => { backendFetch("/api/matchmaking/cancel", { method: "POST", body: JSON.stringify({ playerId: profile.id }) }).catch(() => {}); setScreen("home"); }}
            onMatchFound={handleMatchFound}
          />
        )}
        {screen === "versus" && opponent && (
          <VersusScreen player={profile} opponent={opponent} onDone={handleVersusEnd} />
        )}
        {screen === "game" && opponent && (
          <GameScreen profile={profile} opponent={opponent} isBot={isBot} onGameEnd={handleGameEnd} />
        )}
        {screen === "gameover" && opponent && (
          <GameOverScreen result={gameResult} profile={profile} opponent={opponent} onContinue={handleContinue} onReplay={handleReplay} isTournament={isTournament} />
        )}

        {showNav && (
          <>
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              {screen === "home" && <HomeScreen profile={profile} onPlay={handlePlayMulti} onPlayBot={handlePlayBot} />}
              {screen === "tournament" && <TournamentScreen profile={profile} onUpdate={updateProfile} onPlayTournament={handlePlayTournament} />}
              {screen === "profile" && <ProfileScreen profile={profile} onUpdate={updateProfile} onLogout={handleLogout} />}
              {screen === "leaderboard" && <LeaderboardScreen profile={profile} />}
              {screen === "shop" && <ShopScreen profile={profile} onUpdate={updateProfile} />}
            </div>
            <nav className="nav">
              {navItems.map((item) => (
                <button key={item.id}
                  className={`nav-btn ${screen === item.id ? "active" : ""}`}
                  onClick={() => setScreen(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </>
  );
}

