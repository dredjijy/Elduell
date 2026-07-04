import { ELEMENT_VERSUS, VERSUS_SKINS } from '../skins/versusData.js';
// screens/VersusScreen.jsx
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

function getVersusSkin(profile) {
  const id = profile.equippedVersusSkin || "vs_default";
  return VERSUS_SKINS.find(s => s.id === id) || VERSUS_SKINS[0];
}

function VersusScreen({ player, opponent, onDone }) {
  const [phase, setPhase] = useState("enter"); // enter | collide | hold | done
  const [showCollision, setShowCollision] = useState(false);
  const [collisionParticles, setCollisionParticles] = useState([]);

  const pRank  = getRank(player.rankPoints);
  const oRank  = getRank(opponent.rankPoints);
  const pSkin  = getVersusSkin(player);
  const oSkin  = getVersusSkin(opponent);
  const pEl    = ELEMENT_VERSUS[Object.keys(ELEMENT_VERSUS)[Math.floor(Math.random() * 5)]];
  const oEl    = ELEMENT_VERSUS[Object.keys(ELEMENT_VERSUS)[Math.floor(Math.random() * 5)]];
  const pFrame = player.equippedFrame ? getFrameById(player.equippedFrame) : getAutoFrame(pRank.name);
  const oFrame = opponent.equippedFrame ? getFrameById(opponent.equippedFrame) : getAutoFrame(oRank.name);

  useEffect(() => {
    // Phase 1: enter (0-900ms)
    const t1 = setTimeout(() => {
      setPhase("collide");
      setShowCollision(true);
      // Generate particles
      const allColors = [...(pEl?.particles || []), ...(oEl?.particles || [])];
      const pts = Array.from({ length: 32 }, (_, i) => {
        const angle = (i / 32) * 360 + Math.random() * 15;
        const dist = 60 + Math.random() * 120;
        return {
          tx: Math.cos(angle * Math.PI / 180) * dist,
          ty: Math.sin(angle * Math.PI / 180) * dist,
          color: allColors[i % allColors.length],
          size: 4 + Math.random() * 8,
          delay: Math.random() * 0.15,
          dur: 0.6 + Math.random() * 0.4,
          rot: (Math.random() - 0.5) * 540,
          shape: Math.random() > 0.4 ? "50%" : "2px",
        };
      });
      setCollisionParticles(pts);
    }, 950);
    // Phase 2: hold (900ms-2200ms)
    const t2 = setTimeout(() => setPhase("hold"), 1200);
    // Phase 3: done
    const t3 = setTimeout(() => { setPhase("done"); onDone(); }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const playerVideo = player.vip ? loadVipVideo() : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#060810",
      overflow: "hidden",
      animation: phase === "collide" ? "vsShake 0.4s ease" : "none",
    }}>
      {/* Atmospheric bg */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 30% 50%, rgba(80,20,120,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(20,80,120,0.4) 0%, transparent 60%)",
      }} />
      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 4px)",
      }} />
      {/* Ground line */}
      <div style={{
        position: "absolute", bottom: "28%", left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 70%, transparent)",
        zIndex: 2,
      }} />

      {/* Center flash on collision */}
      {showCollision && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 52%, ${pEl?.glow || "rgba(255,255,255,0.8)"} 0%, transparent 60%)`,
          animation: "vsFlash 0.5s ease forwards",
        }} />
      )}

      {/* Collision particles */}
      {showCollision && collisionParticles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: "50%", top: "52%",
          width: p.size, height: p.size, borderRadius: p.shape,
          background: p.color, pointerEvents: "none", zIndex: 25,
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": `${p.rot}deg`,
          animation: `particleFly ${p.dur}s ${p.delay}s cubic-bezier(.22,.68,0,1) forwards`,
          transform: "translate(-50%,-50%)",
          boxShadow: `0 0 6px 2px ${p.color}88`,
        }} />
      ))}

      {/* Collision orb */}
      {showCollision && (
        <div style={{
          position: "absolute", left: "50%", top: "52%",
          transform: "translate(-50%,-50%)",
          width: 80, height: 80, borderRadius: "50%", zIndex: 22, pointerEvents: "none",
          background: `radial-gradient(circle, white 0%, ${pEl?.color || "#fff"} 40%, transparent 70%)`,
          animation: "vsCollide 0.5s ease forwards",
        }} />
      )}

      {/* Players */}
      <div style={{
        position: "relative", zIndex: 10, width: "100%", height: "100%",
        display: "flex", alignItems: "center",
        animation: phase === "collide" ? "vsZoom 0.5s ease" : "none",
      }}>

        {/* PLAYER LEFT */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          paddingBottom: "8%", paddingLeft: "4%",
          animation: "vsSlideLeft 0.9s cubic-bezier(.22,.68,0,1.2) both",
        }}>
          {/* Skin aura bg */}
          <div style={{
            position: "relative",
            width: 140, height: 180,
            marginBottom: 12,
          }}>
            {/* Aura glow */}
            <div style={{
              position: "absolute", inset: -16, borderRadius: "50%",
              background: `radial-gradient(ellipse, ${pSkin.aura} 0%, transparent 70%)`,
              animation: "vsOrb 2s ease-in-out infinite",
              "--aura-color": pSkin.aura,
            }} />
            {/* Skin / Avatar */}
            <div style={{
              width: "100%", height: "100%", borderRadius: 24,
              overflow: "hidden", position: "relative",
              background: `linear-gradient(160deg, ${pSkin.bg}, rgba(0,0,0,0.3))`,
              boxShadow: `0 0 30px 8px ${pSkin.aura}, 0 8px 32px rgba(0,0,0,0.6)`,
              animation: "vsSkinEntry 0.6s 0.3s cubic-bezier(.22,.68,0,1.2) both",
            }}>
              {playerVideo ? (
                <VipVideoPlayer dataUrl={playerVideo} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AvatarDisplay avatar={player.avatar} size={90} />
                </div>
              )}
              {/* Element badge */}
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 20 }}>{pEl?.symbol}</div>
              {/* Frame ring */}
              {pFrame && <div style={{ position: "absolute", inset: -2, borderRadius: 26, border: pFrame.border, boxShadow: pFrame.glow, animation: pFrame.animation, pointerEvents: "none" }} />}
            </div>
          </div>

          {/* Player info */}
          <div style={{ textAlign: "center", animation: "vsNameEntry 0.5s 0.7s both" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "white", textShadow: `0 0 16px ${pSkin.aura}, 0 2px 6px rgba(0,0,0,0.9)`, marginBottom: 4 }}>{player.name}</div>
            {player.title && <div style={{ marginBottom: 4 }}><TitleDisplay title={player.title} fontSize={10} /></div>}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              border: `1px solid ${pRank.color}44`, borderRadius: 20, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 12 }}>{pRank.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: pRank.color }}>{pRank.name}</span>
            </div>
            {pSkin.id !== "vs_default" && (
              <div style={{ marginTop: 5, fontSize: 10, color: pSkin.aura, fontWeight: 700, textShadow: `0 0 8px ${pSkin.aura}` }}>{pSkin.icon} {pSkin.name}</div>
            )}
          </div>
        </div>

        {/* VS CENTER */}
        <div style={{
          flexShrink: 0, textAlign: "center", zIndex: 15,
          animation: "vsAppear 0.6s 0.5s cubic-bezier(.22,.68,0,1.2) both",
        }}>
          <div style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 44, fontWeight: 900, color: "white",
            textShadow: "0 0 30px rgba(255,255,255,0.6), 0 0 60px rgba(160,120,255,0.4), 0 4px 12px rgba(0,0,0,0.9)",
            lineHeight: 1,
          }}>VS</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em", marginTop: 4 }}>DUEL</div>
        </div>

        {/* OPPONENT RIGHT */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          paddingBottom: "8%", paddingRight: "4%",
          animation: "vsSlideRight 0.9s cubic-bezier(.22,.68,0,1.2) both",
        }}>
          {/* Skin aura bg */}
          <div style={{ position: "relative", width: 140, height: 180, marginBottom: 12 }}>
            <div style={{
              position: "absolute", inset: -16, borderRadius: "50%",
              background: `radial-gradient(ellipse, ${oSkin.aura} 0%, transparent 70%)`,
              animation: "vsOrb 2s 0.3s ease-in-out infinite",
            }} />
            <div style={{
              width: "100%", height: "100%", borderRadius: 24,
              overflow: "hidden", position: "relative",
              background: `linear-gradient(160deg, ${oSkin.bg}, rgba(0,0,0,0.3))`,
              boxShadow: `0 0 30px 8px ${oSkin.aura}, 0 8px 32px rgba(0,0,0,0.6)`,
              animation: "vsSkinEntry 0.6s 0.35s cubic-bezier(.22,.68,0,1.2) both",
            }}>
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AvatarDisplay avatar={opponent.avatar} size={90} />
              </div>
              <div style={{ position: "absolute", top: 8, left: 8, fontSize: 20 }}>{oEl?.symbol}</div>
              {oFrame && <div style={{ position: "absolute", inset: -2, borderRadius: 26, border: oFrame.border, boxShadow: oFrame.glow, animation: oFrame.animation, pointerEvents: "none" }} />}
            </div>
          </div>

          {/* Opponent info */}
          <div style={{ textAlign: "center", animation: "vsNameEntry 0.5s 0.75s both" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "white", textShadow: `0 0 16px ${oSkin.aura}, 0 2px 6px rgba(0,0,0,0.9)`, marginBottom: 4 }}>{opponent.name}</div>
            {opponent.title && <div style={{ marginBottom: 4 }}><TitleDisplay title={opponent.title} fontSize={10} /></div>}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              border: `1px solid ${oRank.color}44`, borderRadius: 20, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 12 }}>{oRank.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: oRank.color }}>{oRank.name}</span>
            </div>
            {oSkin.id !== "vs_default" && (
              <div style={{ marginTop: 5, fontSize: 10, color: oSkin.aura, fontWeight: 700, textShadow: `0 0 8px ${oSkin.aura}` }}>{oSkin.icon} {oSkin.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div style={{
        position: "absolute", bottom: "6%", left: 0, right: 0,
        textAlign: "center", zIndex: 10,
        animation: "vsNameEntry 0.5s 1s both",
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          {'Que le meilleur gagne'}
        </div>
      </div>
    </div>
  );
}


export { ELEMENT_VERSUS, VERSUS_SKINS, getVersusSkin };
export default VersusScreen;
