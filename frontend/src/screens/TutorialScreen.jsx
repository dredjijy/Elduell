// screens/TutorialScreen.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ELEMENTS, STRENGTHS, WEAKNESSES } from '../data/elements.js';
import { RANKS, getRank, resolveRound, botChoice, generateMatchId, claimRankBonus, hasClaimedRankBonus } from '../data/ranks.js';
import { TITLES, PREMIUM_TITLES, loadOwnedTitles, saveOwnedTitles, TitleDisplay } from '../data/titles.jsx';
import { AvatarDisplay, FlagEmoji, isRegionalFlag, AVATAR_CATEGORIES, AVATARS } from '../data/avatars.jsx';
import { TOURNAMENT_ENTRY_COST, TOURNAMENT_NAMES, loadTournament, saveTournament, buildBracket, loadOfficialTournament, saveOfficialTournament, getOfficialWindow, getOrCreateOfficialToday, loadCustomTournaments, saveCustomTournaments, createCustomTournament, joinCustomTournament, updateCustomTournament, deleteCustomTournament, getTournamentKey } from '../data/tournaments.js';
import { loadProfile, saveProfile, authSaveProfile, authRegister, authLogin, authLoadSession, loadSession, saveSession, clearSession, isTutorialDone, markTutorialDone } from '../services/profile.js';
import { backendFetch, BACKEND_URL } from '../services/global.js';
import { loadVipVideo, VipVideoPlayer } from '../services/multiplayer.jsx';
import { SKIN_BUNDLES, CARD_SKINS, INDIVIDUAL_SKINS, getIndivImage, BUNDLE_SKIN_MAP, getSkinsForElement, isBundleOwned, getBundleSkinIds, getRarityBorderStyle } from '../skins/skins.js';
import { FRAME_RANK, FRAME_PREMIUM, ALL_FRAMES, getFrameById, getAutoFrame, getOwnedFrames, AvatarWithFrame, AvatarWithFrameDark, NmCard, SectionLabel, HpBar, TimerCircle, ElementCard, PlayerBanner, GalaxyRift, Particles, Shockwave, FloatingText, RoundWinEffect, RoundLoseEffect, VictoryConfetti, BGFlash } from '../ui/UI.jsx';

const TUTORIAL_STEPS = [
  {
    icon: "⚔️",
    title: "Bienvenue dans ELDUEL !",
    text: "Un duel en temps réel où tu dois choisir le bon élément pour vaincre ton adversaire. Apprends les bases en 4 étapes.",
    highlight: null,
  },
  {
    icon: "🌊🔥🌪️🌍✨",
    title: "Les 5 Éléments",
    text: "Chaque manche, tu choisis un élément. Certains sont forts contre d'autres. Connais tes forces et faiblesses pour gagner !",
    table: [
      { el: "💧 Eau", beats: "🔥 Feu · 🌍 Terre" },
      { el: "🔥 Feu", beats: "🌪️ Air · ✨ Éther" },
      { el: "🌪️ Air", beats: "💧 Eau · 🌍 Terre" },
      { el: "🌍 Terre", beats: "🔥 Feu · ✨ Éther" },
      { el: "✨ Éther", beats: "💧 Eau · 🌪️ Air" },
    ],
  },
  {
    icon: "❤️",
    title: "Points de Vie & Rounds",
    text: "Chaque joueur a 5 HP. Chaque manche perdue retire 1 HP. La partie se joue en 5 rounds maximum. Celui qui perd tous ses HP en premier a perdu !",
    highlight: "5 HP · 5 rounds max",
  },
  {
    icon: "🏆",
    title: "Victoire & Récompenses",
    text: "Gagne des parties pour monter dans le classement, gagner des gemmes 💎 et débloquer des skins épiques dans la boutique !",
    highlight: "+10 pts victoire · +5 gemmes",
  },
];


function TutorialScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 998,
      background: "linear-gradient(160deg, #0d0d20 0%, #1a0830 60%, #0a180a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
    }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {TUTORIAL_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4, transition: "all 0.3s",
            background: i <= step ? "rgba(160,120,255,0.9)" : "rgba(255,255,255,0.2)",
            boxShadow: i === step ? "0 0 10px rgba(160,120,255,0.6)" : "none",
          }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 380,
        background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)",
        borderRadius: 24, padding: "32px 24px",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        animation: "resultPop 0.35s cubic-bezier(.22,.68,0,1.2)",
      }}>
        {/* Icon */}
        <div style={{ textAlign: "center", fontSize: 48, marginBottom: 16 }}>{current.icon}</div>

        {/* Title */}
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 18, fontWeight: 900,
          color: "white", textAlign: "center", marginBottom: 12,
          textShadow: "0 0 20px rgba(160,120,255,0.5)",
        }}>{current.title}</div>

        {/* Text */}
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, textAlign: "center", marginBottom: 16 }}>
          {current.text}
        </div>

        {/* Table (step 1) */}
        {current.table && (
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {current.table.map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                borderBottom: i < current.table.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "white", minWidth: 80 }}>{row.el}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>bat</span>
                <span style={{ fontSize: 13, color: "rgba(93,255,138,0.85)", fontWeight: 700 }}>{row.beats}</span>
              </div>
            ))}
          </div>
        )}

        {/* Highlight pill */}
        {current.highlight && (
          <div style={{
            textAlign: "center", marginBottom: 16,
            padding: "8px 20px", borderRadius: 20, display: "inline-block",
            background: "rgba(160,120,255,0.2)", border: "1px solid rgba(160,120,255,0.4)",
            fontSize: 14, fontWeight: 800, color: "#c8a0ff",
            width: "100%",
          }}>{current.highlight}</div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)} style={{
              flex: 1, padding: "12px 0", border: "none", cursor: "pointer", borderRadius: 14,
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
              fontFamily: "Rajdhani,sans-serif", fontSize: 14, fontWeight: 800,
            }}>← Précédent</button>
          )}
          <button onClick={() => { if (isLast) { markTutorialDone(); onDone(); } else setStep(s => s+1); }} style={{
            flex: 2, padding: "13px 0", border: "none", cursor: "pointer", borderRadius: 14,
            background: isLast
              ? "linear-gradient(145deg, rgba(93,255,138,0.7), rgba(0,180,80,0.6))"
              : "linear-gradient(145deg, rgba(160,120,255,0.85), rgba(80,40,200,0.8))",
            boxShadow: isLast ? "0 4px 16px rgba(93,255,138,0.3)" : "0 4px 16px rgba(120,80,255,0.4)",
            color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {isLast ? "🚀 Commencer à jouer !" : "Suivant →"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        Étape {step + 1} sur {TUTORIAL_STEPS.length}
      </div>
    </div>
  );
}


export default TutorialScreen;
