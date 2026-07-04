// screens/GameOverScreen.jsx
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

const GAMEOVER_BG_IMAGE = "/skins/gameover_bg.jpg";


const ENCOURAGEMENTS = {
  win: [
    "Tu es en feu ! 🔥 Enchaîne les victoires !",
    "Inarrêtable ! Continue sur ta lancée ! ⚡",
    "Les éléments t'obéissent ! Rejoue ! 🌪️",
    "Victoire méritée ! Prouve que c'était pas un coup de chance ! 💪",
    "Personne ne peut t'arrêter ce soir ! 🌟",
    "Tu domines l'arène ! Reviens pour plus ! ⚔️",
    "Magnifique ! Tu maîtrises les éléments ! 🌊",
  ],
  lose: [
    "La revanche est à portée de main ! Rejoue ! 💥",
    "Chaque défaite t'enseigne quelque chose. Reviens plus fort ! 🛡️",
    "C'est pas fini tant que tu n'as pas rejoué ! 🔄",
    "Les grands champions se relèvent toujours ! ⚔️",
    "Une petite défaite, rien d'insurmontable. Rejoue ! 💡",
    "La prochaine victoire t'appartient ! 🌟",
    "L'arène t'attend… tu reviens ? 👊",
  ],
  draw: [
    "Égalité ! Une revanche s'impose ! ⚖️",
    "Vous êtes de force égale… pour l'instant ! 🔥",
    "Aucun vainqueur ? Ça ne peut pas rester comme ça ! ⚔️",
    "Match nul ! Décide ça en une belle ! 🎯",
    "La prochaine, il y aura un gagnant… et ce sera toi ! 💪",
  ],
};


function getRandomEncouragement(outcome) {
  const list = ENCOURAGEMENTS[outcome] || ENCOURAGEMENTS.win;
  return list[Math.floor(Math.random() * list.length)];
}


function GameOverScreen({ result, profile, opponent, onContinue, onReplay, isTournament }) {
  const outcome = typeof result === "object" ? result.outcome : result;
  const gemsEarned = typeof result === "object" ? result.gemsEarned : 0;
  const rankUpBonusEarned = typeof result === "object" ? (result.rankUpBonusEarned || 0) : 0;
  const isQuit = typeof result === "object" ? result.isQuit : false;
  const batLost = typeof result === "object" ? result.batLost : false;
  const nextOpponent = typeof result === "object" ? result.nextOpponent : null;
  const activeTournamentId = typeof result === "object" ? result.activeTournamentId : null;
  const won = outcome === "win";
  const tied = outcome === "draw";
  const pts = won ? 10 : tied ? 5 : -5;
  const rank = getRank(profile.rankPoints);
  const newPts = Math.max(0, profile.rankPoints + pts);
  const newRank = getRank(newPts);

  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), won ? 800 : 500);
    return () => clearTimeout(t);
  }, []);

  // Compute tournament prize from the saved state
  const tournamentPrize = (() => {
    if (!isTournament || !won) return null;
    if (activeTournamentId) {
      // Custom tournament
      const list = loadCustomTournaments();
      const t = list.find((x) => x.id === activeTournamentId);
      if (t && t.winnerId === profile.id) return t.participants.length * t.entryFee;
      return null; // won a round but not the final yet — no prize display
    } else {
      // Daily tournament
      const t = loadTournament();
      if (t.winnerId === profile.id) {
        const allP = [...t.participants,
          { id: "fp1" }, { id: "fp2" }, { id: "fp3" },
          { id: "fp4" }, { id: "fp5" }, { id: "fp6" }, { id: "fp7" },
        ].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i);
        return allP.length * TOURNAMENT_ENTRY_COST;
      }
      return null; // intermediate round win
    }
  })();

  // Is this an intermediate round (won but not yet champion)?
  const isIntermediateRound = isTournament && won && !tournamentPrize && nextOpponent;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "#0a0a12",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", overflow: "hidden",
    }}>
      {/* Background image — trou noir cosmique */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${GAMEOVER_BG_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }} />

      {/* Color overlay by result — plus sombre */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: won
          ? "linear-gradient(160deg, rgba(10,40,10,0.82) 0%, rgba(0,0,0,0.72) 100%)"
          : tied
          ? "linear-gradient(160deg, rgba(10,20,50,0.82) 0%, rgba(0,0,0,0.72) 100%)"
          : "linear-gradient(160deg, rgba(60,8,8,0.82) 0%, rgba(0,0,0,0.72) 100%)",
      }} />

      {/* Radial vignette — plus fort */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0,0,0,0.75) 100%)",
      }} />

      {/* Victory confetti — subtle sparkles */}
      {won && <VictoryConfetti />}

      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 14, padding: "0 20px",
        opacity: showContent ? 1 : 0,
        transition: "opacity 0.4s ease",
        overflowY: "auto", maxHeight: "100vh", paddingTop: 16, paddingBottom: 20,
      }}>

        {/* Big animated title */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div className="title-font" style={{
            fontSize: won ? 56 : 48, textAlign: "center",
            color: won ? "#5dff8a" : tied ? "#b0c8ff" : "#ff6a6a",
            textShadow: won
              ? "0 0 30px rgba(93,255,138,0.7), 0 0 60px rgba(93,255,138,0.3), 0 4px 8px rgba(0,0,0,0.8)"
              : tied
              ? "0 0 20px rgba(176,200,255,0.5), 0 4px 8px rgba(0,0,0,0.8)"
              : "0 0 30px rgba(255,106,106,0.7), 0 0 60px rgba(255,106,106,0.3), 0 4px 8px rgba(0,0,0,0.8)",
            animation: won
              ? "winTextStrike 0.7s cubic-bezier(.22,.68,0,1.2) forwards"
              : !tied ? "loseTextDrop 0.5s ease forwards"
              : "resultPop 0.5s cubic-bezier(.22,.68,0,1.2) forwards",
            lineHeight: 1.1,
          }}>
            {won ? "VICTOIRE" : tied ? "ÉGALITÉ" : isQuit ? "ABANDON" : "DÉFAITE"}
          </div>
          {won && <div style={{ fontSize: 44, marginTop: 6 }}>🏆</div>}
          {!won && !tied && <div style={{ fontSize: 36, marginTop: 6 }}>{isQuit ? "🚪" : "💀"}</div>}
          {tied && <div style={{ fontSize: 36, marginTop: 6 }}>🤝</div>}
        </div>

        {/* Player vs opponent recap */}
        <div style={{
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
          border: `1px solid ${won ? "rgba(93,255,138,0.4)" : tied ? "rgba(176,200,255,0.3)" : "rgba(255,106,106,0.4)"}`,
          borderRadius: 16, padding: "14px 18px", width: "100%",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}>
          {/* Player side */}
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 32 }}><AvatarWithFrameDark avatar={profile.avatar} frameId={profile.equippedFrame || null} rankPoints={profile.rankPoints} size={44} /></div>
            <div style={{ fontSize: 14, fontWeight: 900, marginTop: 5, color: won ? "#5dff8a" : "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>{profile.name}</div>
            {profile.title && (
              <div style={{ marginTop: 3 }}>
                <TitleDisplay title={profile.title} fontSize={10} style={{ opacity: 1 }} />
              </div>
            )}
            {won && <div style={{ fontSize: 11, color: "#5dff8a", fontWeight: 800, marginTop: 3, textShadow: "0 0 8px rgba(93,255,138,0.6)" }}>★ Gagnant</div>}
          </div>

          <div style={{ textAlign: "center", fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 900, flexShrink: 0, paddingBottom: 18, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>VS</div>

          {/* Opponent side */}
          <div style={{ textAlign: "center", flex: 1, opacity: won ? 0.75 : 1 }}>
            <div style={{ fontSize: 32 }}><AvatarWithFrameDark avatar={opponent.avatar} frameId={opponent.equippedFrame || null} rankPoints={opponent.rankPoints || 0} size={44} /></div>
            <div style={{ fontSize: 14, fontWeight: 900, marginTop: 5, color: !won && !tied ? "#ff6a6a" : "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>{opponent.name}</div>
            {opponent.title && (
              <div style={{ marginTop: 3 }}>
                <TitleDisplay title={opponent.title} fontSize={10} style={{ opacity: 1 }} />
              </div>
            )}
            {!won && !tied && <div style={{ fontSize: 11, color: "#ff6a6a", fontWeight: 800, marginTop: 3, textShadow: "0 0 8px rgba(255,106,106,0.6)" }}>★ Gagnant</div>}
          </div>
        </div>

        {/* Rank points */}
        <div style={{
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16, padding: "14px 20px", width: "100%",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>Points de rang</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: pts > 0 ? "#5dff8a" : "#ff6a6a", textShadow: pts > 0 ? "0 0 12px rgba(93,255,138,0.5)" : "0 0 12px rgba(255,106,106,0.5)" }}>
              {pts > 0 ? "+" : ""}{pts} pts
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{newPts} pts total</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, color: newRank.color, fontWeight: 800, textShadow: `0 0 10px ${newRank.color}88` }}>{newRank.icon} {newRank.name}</div>
            {newRank.name !== rank.name && (
              <div style={{ fontSize: 12, color: "#c8a0ff", marginTop: 4, fontWeight: 700, animation: "resultPop 0.5s 0.3s both" }}>🎉 Nouveau rang !
              </div>
            )}
          </div>
        </div>

        {/* Rank-up bonus */}
        {rankUpBonusEarned > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            border: `2px solid ${newRank.color}`,
            boxShadow: `0 0 20px ${newRank.color}66`,
            borderRadius: 16, padding: "14px 18px", width: "100%",
            display: "flex", alignItems: "center", gap: 14,
            animation: "resultPop 0.6s 0.4s cubic-bezier(.22,.68,0,1.2) both",
          }}>
            <div style={{ fontSize: 32 }}>{newRank.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white", marginBottom: 3, textShadow: `0 0 10px ${newRank.color}` }}>🎊 Bonus de rang !
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                1er passage en <b style={{ color: newRank.color }}>{newRank.name}</b> — bonus unique
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#5dff8a", textShadow: "0 0 12px rgba(93,255,138,0.6)" }}>
                +💎 {rankUpBonusEarned.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Quit / BAT notice */}
        {isQuit && (
          <div style={{
            background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,106,106,0.3)",
            backdropFilter: "blur(10px)",
            borderRadius: 14, padding: "12px 16px", width: "100%",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🚪</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#ff6a6a", marginBottom: 4 }}>Partie quittée</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Tu as quitté la partie en cours de route.</div>
              {batLost && (
                <div style={{ fontSize: 13, color: "#ffb060", marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
                  <span>⚡</span> Le BAT dépensé <b>n'est pas remboursé</b>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gem reward */}
        {gemsEarned > 0 && !isTournament && (
          <div style={{
            background: "rgba(93,255,138,0.1)", border: "1px solid rgba(93,255,138,0.3)",
            backdropFilter: "blur(10px)",
            borderRadius: 14, padding: "12px 18px",
            width: "100%", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ fontSize: 30 }}>💎</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#5dff8a" }}>
                +{gemsEarned} gemme{gemsEarned > 1 ? "s" : ""} gagnée{gemsEarned > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                {won ? "Récompense de victoire" : "Récompense d'égalité"}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#5dff8a", textShadow: "0 0 10px rgba(93,255,138,0.6)" }}>+{gemsEarned}</div>
          </div>
        )}

        {/* Tournament prize */}
        {isTournament && won && tournamentPrize && (
          <div style={{
            background: "rgba(255,200,60,0.1)", border: "2px solid rgba(255,200,60,0.4)",
            backdropFilter: "blur(10px)",
            borderRadius: 14, padding: "14px 20px",
            width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🏆</div>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 16, color: "#ffd060", textShadow: "0 0 16px rgba(255,200,60,0.6)" }}>Champion du Tournoi !</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#ffd060", marginTop: 6, textShadow: "0 0 20px rgba(255,200,60,0.5)" }}>+💎 {tournamentPrize}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Gemmes créditées sur ton compte</div>
          </div>
        )}

        {isTournament && !won && !tied && (
          <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 16px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              {activeTournamentId ? "Éliminé du tournoi personnalisé !" : "Éliminé du tournoi — Réessaie demain !"}
            </div>
          </div>
        )}

        {/* Intermediate round win banner */}
        {isIntermediateRound && (
          <div style={{
            background: "rgba(160,120,255,0.15)", border: "1px solid rgba(160,120,255,0.4)",
            backdropFilter: "blur(10px)",
            borderRadius: 14, padding: "12px 16px", width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#c8a0ff", marginBottom: 4, textShadow: "0 0 10px rgba(160,120,255,0.5)" }}>⚔️ Tour suivant !
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              Prochain adversaire : {nextOpponent.avatar} <b>{nextOpponent.name}</b>
            </div>
          </div>
        )}

        {/* Encouragement message — shown when not in intermediate tournament round */}
        {!isIntermediateRound && !isTournament && (
          <div style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "13px 18px", width: "100%", textAlign: "center",
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, fontStyle: "italic",
              color: won ? "rgba(93,255,138,0.9)" : tied ? "rgba(176,200,255,0.9)" : "rgba(255,180,180,0.9)",
              lineHeight: 1.5,
            }}>
              "{getRandomEncouragement(won ? "win" : tied ? "draw" : "lose")}"
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          {/* Main action (next round or return) */}
          <button style={{
            width: "100%", padding: "15px 0", border: "none", cursor: "pointer", borderRadius: 16,
            background: isIntermediateRound
              ? "linear-gradient(145deg, rgba(160,120,255,0.9), rgba(100,60,220,0.85))"
              : "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            boxShadow: isIntermediateRound
              ? "0 4px 20px rgba(160,120,255,0.4), 0 0 0 1px rgba(160,120,255,0.3)"
              : "0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)",
            color: "white",
            fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
            letterSpacing: "0.1em", textTransform: "uppercase",
            transition: "all 0.2s",
          }} onClick={onContinue}>
            {isIntermediateRound ? `⚔️ Combattre ${nextOpponent.avatar} ${nextOpponent.name}` : "Accueil"}
          </button>

          {/* Replay button — shown when not in tournament */}
          {!isTournament && (
            <button style={{
              width: "100%", padding: "15px 0", border: "none", cursor: "pointer", borderRadius: 16,
              background: won
                ? "linear-gradient(145deg, rgba(93,255,138,0.25), rgba(0,200,80,0.2))"
                : tied
                ? "linear-gradient(145deg, rgba(176,200,255,0.2), rgba(100,140,255,0.15))"
                : "linear-gradient(145deg, rgba(255,100,100,0.25), rgba(200,50,50,0.2))",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.2)",
              color: "white",
              fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
              letterSpacing: "0.1em", textTransform: "uppercase",
              transition: "all 0.2s",
            }} onClick={onReplay}>🔄 Rejouer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export { GAMEOVER_BG_IMAGE };
export default GameOverScreen;
