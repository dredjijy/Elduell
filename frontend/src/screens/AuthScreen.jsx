// screens/AuthScreen.jsx
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

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * 10)]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%", padding: "12px 16px", border: "none", borderRadius: 14,
    background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
    color: "white", fontSize: 15, fontFamily: "Rajdhani,sans-serif", fontWeight: 600,
    outline: "none", boxSizing: "border-box",
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)",
  };

  function handleSubmit() {
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const result = mode === "register"
        ? authRegister(username, password, avatar)
        : authLogin(username, password);
      setLoading(false);
      if (!result.ok) { setError(result.error); return; }
      onAuth(result.profile, mode === "register");
    }, 300);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", overflow: "hidden",
    }}>
      {/* Stars background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({length: 40}).map((_,i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
            width: 2, height: 2, borderRadius: "50%",
            background: `rgba(255,255,255,${0.2+Math.random()*0.6})`,
            animation: `glowPulse ${1.5+Math.random()*2}s ${Math.random()*2}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32, position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 38, fontWeight: 900,
          background: "linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#a855f7,#ff0080)",
          backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "rainbowShift 3s linear infinite",
        }}>ELDUEL</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: "0.2em" }}>
          {'JEU DE DUELS ÉLÉMENTAIRES'}
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 380, position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)",
        borderRadius: 24, padding: "28px 24px",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 }}>
          {[["login","🔑 Connexion"],["register","✨ Inscription"]].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m); setError(null); }} style={{
              flex: 1, padding: "9px 0", border: "none", cursor: "pointer", borderRadius: 11,
              background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
              boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
              color: mode === m ? "white" : "rgba(255,255,255,0.5)",
              fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.2s",
            }}>{l}</button>
          ))}
        </div>

        {/* Avatar picker (register only) */}
        {mode === "register" && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 8 }}>Avatar</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {AVATARS.slice(0, 10).map((av) => (
                <button key={av} onClick={() => setAvatar(av)} style={{
                  width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
                  fontSize: 20, background: avatar === av ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                  outline: avatar === av ? "2px solid rgba(255,255,255,0.6)" : "none",
                  transition: "all 0.15s",
                }}>{av}</button>
              ))}
            </div>
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 6 }}>
              {mode === "register" ? "Pseudo (unique)" : "Pseudo"}
            </div>
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="ton_pseudo" maxLength={20}
              style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 6 }}>Mot de passe</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={mode === "register" ? "min 4 caractères" : "••••••••"} maxLength={32}
              style={inputStyle} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#ff8080", marginBottom: 12, fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "14px 0", border: "none", cursor: loading ? "default" : "pointer",
          borderRadius: 14, marginTop: 4,
          background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(145deg, rgba(160,120,255,0.85), rgba(80,40,200,0.8))",
          boxShadow: loading ? "none" : "0 4px 20px rgba(120,80,255,0.4)",
          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
          letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "..." : mode === "register" ? "Créer mon compte" : "Se connecter"}
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", position: "relative", zIndex: 1 }}>
        {'Données stockées localement sur cet appareil'}
      </div>
    </div>
  );
}


export default AuthScreen;
