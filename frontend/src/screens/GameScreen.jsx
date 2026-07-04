// screens/GameScreen.jsx
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

const LOADING_BG_IMAGE = "/skins/loading_bg.jpg";


function MatchmakingScreen({ onCancel, onMatchFound }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Simulate finding a match after 3–8s
    const delay = 3000 + Math.random() * 5000;
    const t = setTimeout(() => {
      const bot = {
        id: "player_" + generateMatchId(),
        name: ["ShadowBlade", "AquaLord", "FireMaster", "EtherKnight", "TerraFury"][Math.floor(Math.random() * 5)],
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        title: TITLES[Math.floor(Math.random() * TITLES.length)],
        rankPoints: Math.floor(Math.random() * 500),
      };
      onMatchFound(bot);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 40,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Background image */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${LOADING_BG_IMAGE})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      {/* Dark vignette overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%)",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "0 24px" }}>

        {/* Pulsing sword icon */}
        <div className="pulse" style={{
          width: 110, height: 110, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          border: "2px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 50,
          boxShadow: "0 0 40px rgba(200,160,255,0.4), 0 0 80px rgba(200,160,255,0.15)",
        }}>⚔️</div>

        {/* Title + dots */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Cinzel Decorative', serif", fontSize: 20, fontWeight: 900,
            color: "white", letterSpacing: "0.06em",
            textShadow: "0 0 20px rgba(200,160,255,0.8), 0 2px 8px rgba(0,0,0,0.8)",
          }}>
            Recherche{".".repeat(dots)}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 8, letterSpacing: "0.04em" }}>En attente d'un adversaire
          </div>
        </div>

        {/* Animated dots bar */}
        <div style={{ display: "flex", gap: 10 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i < dots ? "rgba(200,160,255,0.9)" : "rgba(255,255,255,0.2)",
              boxShadow: i < dots ? "0 0 8px rgba(200,160,255,0.8)" : "none",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* 5 element chips */}
        <div style={{ display: "flex", gap: 10 }}>
          {Object.values(ELEMENTS).map((el, i) => (
            <div key={el.name} style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              border: `1px solid ${el.color}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
              boxShadow: `0 0 12px ${el.color}44`,
              animation: `pulse 2s ${i * 0.3}s ease-in-out infinite`,
            }}>{el.emoji}</div>
          ))}
        </div>

        {/* Cancel button */}
        <button onClick={onCancel} style={{
          padding: "12px 36px", border: "none", cursor: "pointer", borderRadius: 30,
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          transition: "all 0.2s",
        }}>Annuler</button>
      </div>
    </div>
  );
}


function GameScreen({ profile, opponent, isBot, onGameEnd }) {
  const [playerHp, setPlayerHp] = useState(5);
  const [opponentHp, setOpponentHp] = useState(5);
  const [selectedCard, setSelectedCard] = useState(null);
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(60);
  const [phase, setPhase] = useState("pick"); // pick | reveal | result
  const [roundResult, setRoundResult] = useState(null);
  const [showAbandon, setShowAbandon] = useState(false);
  const [history, setHistory] = useState([]); // [{round, winner, winnerCard, loserCard, isDraw, playerWon}]
  const historyRef = useRef(null);
  const timerRef = useRef(null);

  const oppRank = getRank(opponent.rankPoints);
  const pRank = getRank(profile.rankPoints);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const startTimer = useCallback(() => {
    setTimer(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function handleTimeOut() {
    if (!selectedCard) resolveRoundLocal(null, botChoice(), true);
  }

  function handleReady() {
    if (!selectedCard) return;
    clearInterval(timerRef.current);
    resolveRoundLocal(selectedCard, botChoice());
  }

  function resolveRoundLocal(playerCard, oppCard, timeout = false) {
    setPhase("reveal");
    const pCard = playerCard || "EAU";
    const outcome = timeout ? "LOSE" : resolveRound(pCard, oppCard);
    const res = { result: outcome, playerCard: pCard, oppCard };

    setTimeout(() => {
      setRoundResult(res);
      setPhase("result");

      let newPHp = playerHp;
      let newOHp = opponentHp;
      if (outcome === "WIN") newOHp--;
      else if (outcome === "LOSE") newPHp--;

      // Build history entry
      const isDraw = outcome === "DRAW";
      const playerWon = outcome === "WIN";
      const entry = {
        round: round,
        isDraw,
        playerWon,
        playerCard: pCard,
        oppCard,
        winnerName: isDraw ? null : playerWon ? profile.name : opponent.name,
        winnerCard: isDraw ? null : playerWon ? pCard : oppCard,
        loserCard: isDraw ? null : playerWon ? oppCard : pCard,
        loserName: isDraw ? null : playerWon ? opponent.name : profile.name,
        newPHp,
        newOHp,
        timeout,
      };

      setTimeout(() => {
        setHistory((h) => [...h, entry]);
        setPlayerHp(newPHp);
        setOpponentHp(newOHp);
        setRoundResult(null);
        setSelectedCard(null);

        if (newPHp <= 0 || newOHp <= 0 || round >= 5) {
          const won = newOHp <= 0 || (round >= 5 && newPHp > newOHp);
          const tied = round >= 5 && newPHp === newOHp;
          onGameEnd(tied ? "draw" : won ? "win" : "lose");
          return;
        }
        setRound((r) => r + 1);
        setPhase("pick");
      }, 2000);
    }, 500);
  }

  // Dynamic accent color based on selected element
  const accentColor = selectedCard ? ELEMENTS[selectedCard].color : "#7c7c9a";
  const accentLight = selectedCard ? ELEMENTS[selectedCard].color + "22" : "#7c7c9a22";
  const accentMid  = selectedCard ? ELEMENTS[selectedCard].color + "55" : "#7c7c9a55";

  // Neumorphic shadow helpers (light mode)
  const nmShadow = "6px 6px 14px #b8bec7, -4px -4px 10px #ffffff";
  const nmShadowInset = "inset 4px 4px 8px #b8bec7, inset -3px -3px 7px #ffffff";
  const nmBg = "#dde1e7";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: `linear-gradient(160deg, #e0e5ec 0%, #d6dbe4 100%)`,
      display: "flex", flexDirection: "column", zIndex: 40,
      transition: "background 0.6s ease",
    }}>

      {/* ── ABANDON MODAL ── */}
      {showAbandon && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(180,190,200,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: nmBg, borderRadius: 28, padding: "28px 24px",
            width: "88%", maxWidth: 320,
            boxShadow: nmShadow,
          }}>
            {/* Icon */}
            <div style={{ textAlign: "center", fontSize: 40, marginBottom: 10 }}>🚪</div>
            <h3 style={{ fontWeight: 900, fontSize: 19, marginBottom: 8, color: "#3d3d5c", textAlign: "center", fontFamily: "'Cinzel Decorative', serif" }}>Quitter la partie ?
            </h3>

            {/* Consequences list */}
            <div style={{
              background: nmBg, borderRadius: 16, padding: "12px 14px", marginBottom: 18,
              boxShadow: nmShadowInset,
            }}>
              {[
                { icon: "💀", text: "Défaite immédiate", color: "#c0392b" },
                { icon: "📉", text: "−5 points de rang", color: "#c0392b" },
                { icon: "⚡", text: "Le BAT dépensé n'est pas remboursé", color: "#b06000" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < 2 ? "1px solid #d0d5de" : "none" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => onGameEnd("quit")} style={{
                flex: 1, padding: "13px 0", borderRadius: 16, border: "none", cursor: "pointer",
                background: nmBg, boxShadow: nmShadow,
                color: "#c0392b", fontWeight: 900, fontSize: 15,
                fontFamily: "Rajdhani,sans-serif", letterSpacing: "0.06em",
              }}>Quitter
              </button>
              <button onClick={() => setShowAbandon(false)} style={{
                flex: 1, padding: "13px 0", borderRadius: 16, border: "none", cursor: "pointer",
                background: nmBg, boxShadow: nmShadowInset,
                color: "#7a8599", fontWeight: 900, fontSize: 15,
                fontFamily: "Rajdhani,sans-serif", letterSpacing: "0.06em",
              }}>Rester
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROUND RESULT OVERLAY ── */}
      {phase === "result" && roundResult && (
        <div className={roundResult.result === "LOSE" ? "lose-shake" : ""}
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: roundResult.result === "WIN"
              ? "radial-gradient(ellipse at center, rgba(220,235,210,0.97) 0%, rgba(210,220,200,0.98) 100%)"
              : roundResult.result === "LOSE"
              ? "radial-gradient(ellipse at center, rgba(240,215,215,0.97) 0%, rgba(220,210,210,0.98) 100%)"
              : "rgba(220,225,235,0.96)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 18, backdropFilter: "blur(8px)",
          }}>
          {roundResult.result === "WIN" && <BGFlash color="rgba(100,200,80,0.12)" />}
          {roundResult.result === "LOSE" && <BGFlash color="rgba(220,80,80,0.1)" />}
          {roundResult.result === "WIN" && <RoundWinEffect />}
          {roundResult.result === "LOSE" && <RoundLoseEffect />}

          <div style={{ position: "relative", zIndex: 31, textAlign: "center" }}>
            <div style={{
              fontSize: 52, fontWeight: 900, fontFamily: "'Cinzel Decorative', serif",
              color: roundResult.result === "WIN" ? "#2d7a1f" : roundResult.result === "LOSE" ? "#c0392b" : "#666",
              textShadow: roundResult.result === "WIN" ? "0 4px 20px rgba(45,122,31,0.25)" : roundResult.result === "LOSE" ? "0 4px 20px rgba(192,57,43,0.25)" : "none",
              animation: roundResult.result === "WIN" ? "winTextStrike 0.5s cubic-bezier(.22,.68,0,1.2) forwards" : roundResult.result === "LOSE" ? "loseTextDrop 0.45s ease forwards" : "resultPop 0.4s cubic-bezier(.22,.68,0,1.2) forwards",
            }}>
              {roundResult.result === "WIN" ? "GAGNÉ !" : roundResult.result === "LOSE" ? "PERDU" : "ÉGALITÉ"}
            </div>
            {roundResult.result === "WIN" && <div style={{ fontSize: 26, marginTop: 4, animation: "starBurst 0.6s 0.2s both" }}>⚡🏆⚡</div>}
            {roundResult.result === "LOSE" && <div style={{ fontSize: 22, marginTop: 4, opacity: 0.6 }}>💀</div>}
            {roundResult.result === "DRAW" && <div style={{ fontSize: 22, marginTop: 4 }}>🤝</div>}
          </div>

          {/* Cards — large format, almost half screen, skin fully visible */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", position: "relative", zIndex: 31, width: "100%", justifyContent: "center", padding: "0 12px" }}>
            {[
              { card: roundResult.playerCard, label: profile.name, isWinner: roundResult.result === "WIN", equippedSkins: profile.equippedSkins, isPlayer: true },
              { card: roundResult.oppCard,    label: opponent.name, isWinner: roundResult.result === "LOSE", equippedSkins: {}, isPlayer: false },
            ].map((side, si) => {
              const el = ELEMENTS[side.card];
              const skinId = side.equippedSkins?.[side.card];
              const bSkin = skinId ? BUNDLE_SKIN_MAP[skinId] : null;
              const cardH = side.isWinner ? 220 : 190;
              const bundle = bSkin ? SKIN_BUNDLES.find(b => b.id === bSkin.bundleId) : null;
              const rarityBorder = bundle ? getRarityBorderStyle(bundle.rarity) : {};
              const isDraw = roundResult.result === "DRAW";
              return (
                <div key={si} style={{ textAlign: "center", flex: 1, maxWidth: 160 }}>
                  {/* Winner crown */}
                  {side.isWinner && (
                    <div style={{ fontSize: 22, marginBottom: 6, animation: "resultPop 0.5s cubic-bezier(.22,.68,0,1.2) forwards" }}>👑</div>
                  )}
                  <div style={{
                    width: "100%", borderRadius: 24, margin: "0 auto", position: "relative",
                    ...(bundle ? rarityBorder : { boxShadow: "4px 4px 12px #b8bec7, -3px -3px 8px #ffffff" }),
                    transition: "all 0.35s cubic-bezier(.22,.68,0,1.2)",
                    transform: side.isWinner ? "scale(1.04) translateY(-6px)" : "scale(0.96)",
                    animation: bundle ? rarityBorder.animation : si === 1 ? "cardReveal 0.4s cubic-bezier(.22,.68,0,1.2) forwards" : "none",
                    opacity: !side.isWinner && !isDraw ? 0.65 : 1,
                  }}>
                    <div style={{ width: "100%", height: cardH, borderRadius: 24, overflow: "hidden", position: "relative", background: nmBg }}>
                    {bSkin?.image ? (
                      <>
                        <img src={bSkin.image} alt={bSkin.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                        {/* Rarity ribbon */}
                        {bundle && (
                          <div style={{
                            position: "absolute", top: 0, right: 0, zIndex: 3,
                            background: `linear-gradient(135deg, ${bundle.rarityColor}, ${bundle.rarityColor}99)`,
                            padding: "2px 8px", borderBottomLeftRadius: 10,
                            fontSize: 8, fontWeight: 900, color: "white",
                            letterSpacing: "0.1em", textTransform: "uppercase",
                          }}>{bundle.rarity}</div>
                        )}
                        {/* Bottom overlay */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.82))", padding: "24px 8px 10px", zIndex: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", textShadow: `0 0 10px ${bSkin.color}` }}>{bSkin.name}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{el?.emoji} {el?.name}</div>
                        </div>
                        {/* Winner glow ring */}
                        {side.isWinner && (
                          <div style={{ position: "absolute", inset: 0, borderRadius: 24, boxShadow: `inset 0 0 24px ${bSkin.color}88`, pointerEvents: "none", zIndex: 2 }} />
                        )}
                      </>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ fontSize: 56, filter: side.isWinner ? `drop-shadow(0 0 14px ${el?.color})` : "none" }}>{el?.emoji}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: el?.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{el?.name}</span>
                      </div>
                    )}
                  </div>{/* end inner clip */}
                </div>{/* end glow wrapper */}
                  <div style={{ fontSize: 13, color: side.isWinner ? "#0d1825" : "#0f1923", marginTop: 8, fontWeight: side.isWinner ? 800 : 600 }}>{side.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: nmBg, padding: "10px 16px",
        boxShadow: "0 4px 10px rgba(184,190,199,0.5)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0, zIndex: 5,
      }}>
        {/* Quitter btn */}
        <button onClick={() => setShowAbandon(true)} style={{
          padding: "6px 12px", borderRadius: 12, border: "none", cursor: "pointer",
          background: nmBg, boxShadow: nmShadow,
          color: "#c0392b", fontWeight: 900, fontSize: 12,
          fontFamily: "Rajdhani,sans-serif", letterSpacing: "0.08em",
          display: "flex", alignItems: "center", gap: 5,
          textTransform: "uppercase",
        }}>🚪 Quitter
        </button>

        {/* Manche indicator */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              width: i === round - 1 ? 28 : 10, height: 10, borderRadius: 6,
              background: i < round - 1 ? "#b0b8c4" : i === round - 1 ? accentColor : "#d0d5de",
              boxShadow: i === round - 1 ? `0 0 8px ${accentColor}88` : nmShadowInset,
              transition: "all 0.4s cubic-bezier(.22,.68,0,1.2)",
            }} />
          ))}
        </div>

        <div style={{
          padding: "4px 10px", borderRadius: 10,
          background: nmBg, boxShadow: nmShadowInset,
          fontSize: 11, color: "#7a8599", fontWeight: 700, letterSpacing: "0.06em",
        }}>{isBot ? "🤖" : "🌐"}</div>
      </div>

      {/* ── OPPONENT BAR ── */}
      <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
        <div style={{
          background: nmBg, borderRadius: 18, padding: "10px 14px",
          boxShadow: nmShadow,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: nmBg, boxShadow: `0 0 0 2px ${oppRank.color}, ${nmShadow}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>{opponent.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#3d3d5c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opponent.name}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: i < opponentHp ? 18 : 14, height: 8, borderRadius: 4,
                  background: i < opponentHp ? "#e05555" : "#0d1825",
                  boxShadow: i < opponentHp ? "0 2px 4px rgba(224,85,85,0.4)" : nmShadowInset,
                  transition: "all 0.4s",
                }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#7a8599", fontWeight: 700 }}>{opponentHp}/5</div>
        </div>
      </div>

      {/* ── ALBUM ART — Selected element pill with skin image support ── */}
      <div style={{ display: "flex", justifyContent: "center", padding: "6px 0", flexShrink: 0 }}>
        {(() => {
          const skinId = selectedCard ? profile.equippedSkins?.[selectedCard] : null;
          const bSkin = skinId ? BUNDLE_SKIN_MAP[skinId] : null;
          const el = selectedCard ? ELEMENTS[selectedCard] : null;
          const bSkinBundle = bSkin ? SKIN_BUNDLES.find(b => b.id === bSkin.bundleId) : null;
          const capRarity = bSkinBundle ? getRarityBorderStyle(bSkinBundle.rarity) : {};
          return (
            <div style={{
              width: 130, height: 200, borderRadius: 65,
              ...(bSkinBundle ? capRarity : { boxShadow: `8px 8px 20px #b8bec7, -6px -6px 14px #ffffff, 0 0 0 3px ${accentColor}` }),
              background: nmBg,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 6, transition: "all 0.4s ease",
              transform: selectedCard ? "scale(1.05)" : "scale(1)",
              position: "relative", overflow: "hidden",
              animation: bSkinBundle ? capRarity.animation : undefined,
            }}>
              {bSkin?.image ? (
                <>
                  <img src={bSkin.image} alt={bSkin.name}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
                  <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", textShadow: `0 0 8px ${bSkin.color}` }}>{el?.name}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1, letterSpacing: "0.06em" }}>SÉLECTIONNÉ</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 65,
                    background: `radial-gradient(circle at 50% 40%, ${accentLight} 0%, transparent 70%)`,
                    transition: "background 0.4s",
                  }} />
                  <div style={{ fontSize: 54, position: "relative", zIndex: 1, filter: selectedCard ? `drop-shadow(0 0 14px ${accentColor})` : "none", transition: "filter 0.4s" }}>
                    {selectedCard ? el?.emoji : "⚔️"}
                  </div>
                  {selectedCard ? (
                    <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 8px" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>{el?.name}</div>
                      <div style={{ fontSize: 10, color: "#7a8599", marginTop: 2, letterSpacing: "0.06em" }}>SÉLECTIONNÉ</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#0d1825", textAlign: "center", padding: "0 8px", position: "relative", zIndex: 1 }}>Choisis↓</div>
                  )}
                  <div style={{
                    position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                    width: 18, height: 18, borderRadius: "50%",
                    background: accentColor, boxShadow: `0 0 10px ${accentColor}`,
                    transition: "background 0.4s",
                  }} />
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── STRENGTHS / WEAKNESSES (shown when card selected) ── */}
      {selectedCard && (
        <div style={{ padding: "0 16px", flexShrink: 0 }}>
          <div style={{
            background: nmBg, borderRadius: 18, padding: "10px 16px",
            boxShadow: nmShadow,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#2d7a1f", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 5 }}>⚡ Fort contre</div>
              {STRENGTHS[selectedCard].map((k) => (
                <div key={k} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, marginBottom: 3, color: "#3d3d5c", fontWeight: 700 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 8, background: nmBg, boxShadow: nmShadow,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                  }}>{ELEMENTS[k].emoji}</span>
                  {ELEMENTS[k].name}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 5 }}>🛡️ Faible contre</div>
              {WEAKNESSES[selectedCard].map((k) => (
                <div key={k} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, marginBottom: 3, color: "#3d3d5c", fontWeight: 700 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 8, background: nmBg, boxShadow: nmShadow,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                  }}>{ELEMENTS[k].emoji}</span>
                  {ELEMENTS[k].name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY LOG ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0, padding: "6px 16px 0" }}>
        <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 4, flexShrink: 0 }}>📜 Historique</div>
        <div ref={historyRef} style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4,
          paddingBottom: 4,
        }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: "#0d1825", fontSize: 13, paddingTop: 8, fontStyle: "italic" }}>Aucune manche jouée…</div>
          ) : history.map((entry, i) => {
            const wEl = entry.winnerCard ? ELEMENTS[entry.winnerCard] : null;
            const lEl = entry.loserCard ? ELEMENTS[entry.loserCard] : null;
            const pEl = ELEMENTS[entry.playerCard];
            const oEl = ELEMENTS[entry.oppCard];
            const isLast = i === history.length - 1;
            let borderColor, icon, textNode;
            if (entry.isDraw) {
              borderColor = "#9aa0ad";
              icon = "🤝";
              textNode = <span><b style={{ color: "#3d3d5c" }}>{profile.name}</b> {pEl.emoji} · <b style={{ color: "#3d3d5c" }}>{opponent.name}</b> {oEl.emoji} — <span style={{ color: "#666" }}>Égalité</span></span>;
            } else {
              borderColor = entry.playerWon ? "#2d7a1f" : "#c0392b";
              icon = entry.playerWon ? "⚡" : "💀";
              textNode = <span><b style={{ color: wEl.color }}>{entry.winnerName}</b> gagne avec {wEl.emoji} <b style={{ color: wEl.color }}>{wEl.name}</b> contre {lEl.emoji} <b>{lEl.name}</b>{entry.timeout && <span style={{ color: "#0d1825", fontSize: 11 }}> (temps)</span>}</span>;
            }
            return (
              <div key={i} style={{
                background: nmBg,
                boxShadow: isLast ? `inset 3px 3px 6px #b8bec7, inset -2px -2px 5px #fff, 0 0 0 2px ${borderColor}33` : nmShadowInset,
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: 10, padding: "6px 10px",
                display: "flex", gap: 7, alignItems: "flex-start",
                animation: isLast ? "historyFadeIn 0.35s ease forwards" : "none",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1, fontWeight: 700 }}>Manche {entry.round}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.4, color: "#3d3d5c" }}>{textNode}</div>
                  <div style={{ fontSize: 11, color: "#0d1825", marginTop: 2 }}>{profile.name} {entry.newPHp}❤️ · {opponent.name} {entry.newOHp}❤️</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PLAYER HP ── */}
      <div style={{ padding: "6px 16px", flexShrink: 0 }}>
        <div style={{
          background: nmBg, borderRadius: 18, padding: "8px 14px",
          boxShadow: nmShadow,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: nmBg, boxShadow: `0 0 0 2px ${pRank.color}, ${nmShadow}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}><AvatarDisplay avatar={profile.avatar} size={32} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#3d3d5c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name} <span style={{ color: "#0d1825", fontSize: 11 }}>(Toi)</span></div>
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: i < playerHp ? 18 : 14, height: 8, borderRadius: 4,
                  background: i < playerHp ? accentColor : "#0d1825",
                  boxShadow: i < playerHp ? `0 2px 4px ${accentColor}66` : nmShadowInset,
                  transition: "all 0.4s",
                }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#7a8599", fontWeight: 700 }}>{playerHp}/5</div>
        </div>
      </div>

      {/* ── ELEMENT CARDS ── */}
      <div style={{
        padding: "6px 12px 12px",
        background: nmBg,
        boxShadow: "0 -4px 12px rgba(184,190,199,0.5)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 5 }}>
          {Object.entries(ELEMENTS).map(([k, el]) => {
            const isSel = selectedCard === k;
            const skinId = profile.equippedSkins?.[k];
            const bSkin = skinId ? BUNDLE_SKIN_MAP[skinId] : null;
            const cardColor = bSkin?.color || el.color;
            return (
              <button key={k}
                disabled={phase !== "pick"}
                onClick={() => phase === "pick" && setSelectedCard(k)}
                style={{
                  flex: 1, border: "none", cursor: phase === "pick" ? "pointer" : "default",
                  borderRadius: 14, padding: 0, overflow: "hidden", position: "relative", height: 74,
                  boxShadow: isSel
                    ? `inset 3px 3px 6px rgba(0,0,0,0.15), 0 0 0 2px ${cardColor}, 0 0 12px ${bSkin?.glowColor || cardColor + "55"}`
                    : "5px 5px 10px #b8bec7, -3px -3px 8px #ffffff",
                  transition: "all 0.25s cubic-bezier(.22,.68,0,1.2)",
                  transform: isSel ? "translateY(2px) scale(0.97)" : "scale(1)",
                  opacity: phase !== "pick" ? 0.6 : 1,
                  background: nmBg,
                }}>
                {bSkin?.image ? (
                  <>
                    <img src={bSkin.image} alt={bSkin.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, background: isSel ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 2px 4px", transition: "background 0.2s" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", textShadow: `0 0 6px ${cardColor}`, lineHeight: 1 }}>{el.name}</span>
                    </div>
                    {isSel && <div style={{ position: "absolute", inset: 0, borderRadius: 14, boxShadow: `inset 0 0 14px ${cardColor}77`, pointerEvents: "none" }} />}
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "4px" }}>
                    <span style={{ fontSize: 22, filter: isSel ? `drop-shadow(0 0 6px ${cardColor})` : "none", transition: "filter 0.3s" }}>{el.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: isSel ? cardColor : "#9aa0ad", transition: "color 0.3s" }}>{el.name}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── READY BUTTON (right-side, timer circle) ── */}
      <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
        <div style={{ position: "relative", marginRight: -3 }}>
          {/* Timer arc */}
          <svg width={76} height={76} style={{ transform: "rotate(-90deg)", filter: "drop-shadow(2px 2px 4px #b8bec7)" }}>
            <circle cx={38} cy={38} r={33} fill={nmBg} stroke="#d0d5de" strokeWidth={5} />
            <circle cx={38} cy={38} r={33} fill="none" stroke={accentColor}
              strokeWidth={5} strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 33}
              strokeDashoffset={2 * Math.PI * 33 - (timer / 60) * 2 * Math.PI * 33}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }} />
          </svg>
          <button
            disabled={!selectedCard || phase !== "pick"}
            onClick={handleReady}
            style={{
              position: "absolute", inset: 9, borderRadius: "50%",
              border: "none", cursor: selectedCard && phase === "pick" ? "pointer" : "default",
              background: nmBg,
              boxShadow: selectedCard && phase === "pick" ? nmShadow : nmShadowInset,
              color: selectedCard && phase === "pick" ? accentColor : "#9aa0ad",
              fontSize: 11, fontWeight: 900, letterSpacing: "0.06em",
              fontFamily: "Rajdhani,sans-serif",
              transition: "all 0.3s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>PRÊT</button>
        </div>
      </div>

    </div>
  );
}


export { LOADING_BG_IMAGE };
export default GameScreen;
export { MatchmakingScreen };
