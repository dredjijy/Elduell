// screens/TournamentScreen.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ELEMENTS, STRENGTHS, WEAKNESSES } from '../data/elements.js';
import { RANKS, getRank, resolveRound, botChoice, generateMatchId, claimRankBonus, hasClaimedRankBonus } from '../data/ranks.js';
import { TITLES, PREMIUM_TITLES, loadOwnedTitles, saveOwnedTitles, TitleDisplay } from '../data/titles.jsx';
import { AvatarDisplay, FlagEmoji, isRegionalFlag, AVATAR_CATEGORIES, AVATARS } from '../data/avatars.jsx';
import { TOURNAMENT_ENTRY_COST, TOURNAMENT_NAMES, loadTournament, saveTournament, buildBracket, loadOfficialTournament, saveOfficialTournament, getOfficialWindow, getOrCreateOfficialToday, loadCustomTournaments, saveCustomTournaments, createCustomTournament, joinCustomTournament, updateCustomTournament, deleteCustomTournament, getTournamentKey } from '../data/tournaments.js';
import { loadProfile, saveProfile, authSaveProfile } from '../services/profile.js';
import { backendFetch } from '../services/global.js';
import { loadVipVideo, saveVipVideo, clearVipVideo, validateVipVideo, VipVideoPlayer } from '../services/multiplayer.jsx';
import { SKIN_BUNDLES, CARD_SKINS, INDIVIDUAL_SKINS, getIndivImage, BUNDLE_SKIN_MAP, getSkinsForElement, isBundleOwned, getBundleSkinIds, getRarityBorderStyle } from '../skins/skins.js';
import { NM, FRAME_RANK, FRAME_PREMIUM, ALL_FRAMES, getFrameById, getAutoFrame, getOwnedFrames, loadOwnedFrames, saveOwnedFrames, AvatarWithFrame, AvatarWithFrameDark, NmCard, SectionLabel, HpBar, TimerCircle, ElementCard, PlayerBanner, GalaxyRift, Particles, Shockwave, FloatingText, RoundWinEffect, RoundLoseEffect, VictoryConfetti, BGFlash } from '../ui/UI.jsx';;

function CustomTournamentsTab({ profile, onUpdate, onPlayTournament }) {
  const [view, setView] = useState("list"); // list | create | detail
  const [tournaments, setTournaments] = useState(loadCustomTournaments);
  const [selected, setSelected] = useState(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formFee, setFormFee] = useState("50");
  const [formMax, setFormMax] = useState("8");
  const [formError, setFormError] = useState(null);

  function refresh() { setTournaments(loadCustomTournaments()); }

  function handleCreate() {
    setFormError(null);
    const fee = parseInt(formFee);
    const max = parseInt(formMax);
    if (!formName.trim()) return setFormError("Donne un nom à ton tournoi.");
    if (isNaN(fee) || fee < 1) return setFormError("La mise doit être au moins 1 gemme.");
    if (fee > profile.gems) return setFormError(`Tu n'as que ${profile.gems} 💎.`);
    if (isNaN(max) || max < 2 || max > 16) return setFormError("Entre 2 et 16 joueurs.");

    const creator = { id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints, title: profile.title };
    const t = createCustomTournament({ name: formName.trim(), entryFee: fee, maxPlayers: max, creator });

    // Deduct gems from creator
    const p = { ...profile, gems: profile.gems - fee };
    saveProfile(p); onUpdate(p);

    refresh();
    setSelected(t);
    setView("detail");
    setFormName(""); setFormFee("50"); setFormMax("8");
  }

  function handleJoin(t) {
    if (profile.gems < t.entryFee) return;
    const player = { id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints, title: profile.title };
    const updated = joinCustomTournament(t.id, player);
    if (!updated) return;
    const p = { ...profile, gems: profile.gems - t.entryFee };
    saveProfile(p); onUpdate(p);
    refresh();
    setSelected(updated);
    setView("detail");
  }

  function handleStart(t) {    const allP = [...t.participants];
    while (allP.length < 4) {
      const bots = [
        { id: `bot${allP.length}`, name: ["ArcaneWolf","NeonSaber","VoidMage","StormKing"][allP.length % 4], avatar: ["🐺","⚡","🌀","🌪️"][allP.length % 4], rankPoints: 400 + Math.random() * 600, isBye: false },
      ];
      allP.push(...bots);
    }
    const bracket = buildBracket(allP);
    const updated = { ...t, status: "running", bracket, startTime: Date.now() };
    updateCustomTournament(updated);
    refresh();
    setSelected(updated);
    // Start playing if player is in bracket
    if (bracket.some((p) => p.id === profile.id)) {
      const oppIdx = bracket.findIndex((p) => p.id === profile.id) % 2 === 0
        ? bracket.findIndex((p) => p.id === profile.id) + 1
        : bracket.findIndex((p) => p.id === profile.id) - 1;
      const opp = bracket[oppIdx] || bracket[0];
      onPlayTournament(opp, updated.id);
    }
  }

  function handleDissolve(t) {
    // Only allowed if tournament hasn't started yet
    if (t.status !== "open") return;
    // Refund all participants (stored in localStorage under their profile)
    t.participants.forEach((p) => {
      const profileKey = "elduel_profile_" + p.id;
      const raw = localStorage.getItem(profileKey);
      if (raw) {
        try {
          const pData = JSON.parse(raw);
          pData.gems = (pData.gems || 0) + t.entryFee;
          localStorage.setItem(profileKey, JSON.stringify(pData));
        } catch {}
      }
    });
    // Also refund current player in live state
    const refundedGems = profile.gems + t.entryFee;
    const updatedProfile = { ...profile, gems: refundedGems };
    saveProfile(updatedProfile);
    authSaveProfile(updatedProfile);
    onUpdate(updatedProfile);
    // Delete the tournament
    deleteCustomTournament(t.id);
    refresh();
    setView("list");
    setSelected(null);
  }

  const getRank = (pts) => RANKS.find((r) => pts >= r.min && pts <= r.max) || RANKS[0];

  // ── LIST VIEW ──
  if (view === "list") {
    const myTourneys = tournaments.filter((t) => t.participants.some((p) => p.id === profile.id));
    const openTourneys = tournaments.filter((t) => t.status === "open" && !t.participants.some((p) => p.id === profile.id));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Create button */}
        <button onClick={() => setView("create")} style={{
          width: "100%", padding: "14px 0", border: "none", cursor: "pointer", borderRadius: 16,
          background: "linear-gradient(145deg, #5b42c0, #4433a0)",
          boxShadow: "4px 4px 12px rgba(91,66,192,0.35), -2px -2px 6px rgba(255,255,255,0.8)",
          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>⚔️ Créer un tournoi</button>

        {/* My tournaments */}
        {myTourneys.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 800, fontFamily: "monospace", marginBottom: 6 }}>Mes tournois
            </div>
            {myTourneys.map((t) => <TourneyCard key={t.id} t={t} isMine onPress={() => { setSelected(t); setView("detail"); }} profile={profile} onJoin={handleJoin} />)}
          </div>
        )}

        {/* Open tournaments */}
        {openTourneys.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 800, fontFamily: "monospace", marginBottom: 6 }}>Tournois ouverts
            </div>
            {openTourneys.map((t) => <TourneyCard key={t.id} t={t} onPress={() => { setSelected(t); setView("detail"); }} profile={profile} onJoin={handleJoin} />)}
          </div>
        )}

        {myTourneys.length === 0 && openTourneys.length === 0 && (
          <div style={{
            background: NM.card, boxShadow: NM.in, borderRadius: 16, padding: "28px 20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏟️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1825", marginBottom: 6 }}>Aucun tournoi en cours</div>
            <div style={{ fontSize: 13, color: "#0d1825" }}>Crée le premier et attends que d'autres joueurs rejoignent !</div>
          </div>
        )}
      </div>
    );
  }

  // ── CREATE VIEW ──
  if (view === "create") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setView("list")} style={{
            width: 36, height: 36, borderRadius: 12, border: "none", cursor: "pointer",
            background: NM.bg, boxShadow: NM.sm, fontSize: 16, color: "#0d1825",
          }}>←</button>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 15, color: "#0d1825", fontWeight: 900 }}>Nouveau tournoi
          </div>
        </div>

        <NmCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <div style={{ fontSize: 11, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 6, fontFamily: "monospace" }}>Nom du tournoi
            </div>
            <input value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="ex: Tournoi des Élus"
              maxLength={30}
              style={{
                width: "100%", padding: "10px 14px", border: "none", borderRadius: 12, outline: "none",
                background: NM.card, boxShadow: NM.in,
                color: "#0d1825", fontSize: 15, fontFamily: "Rajdhani,sans-serif", fontWeight: 700,
                boxSizing: "border-box",
              }} />
          </div>

          {/* Entry fee */}
          <div>
            <div style={{ fontSize: 11, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 6, fontFamily: "monospace" }}>
              Mise d'entrée (gemmes)
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {[10, 25, 50, 100, 250, 500].map((v) => (
                <button key={v} onClick={() => setFormFee(String(v))} style={{
                  padding: "6px 12px", border: "none", cursor: "pointer", borderRadius: 10,
                  background: formFee === String(v) ? "linear-gradient(145deg, #5b42c0, #4433a0)" : NM.bg,
                  boxShadow: formFee === String(v) ? "3px 3px 8px rgba(91,66,192,0.3)" : NM.sm,
                  color: formFee === String(v) ? "white" : "#0f1923",
                  fontSize: 13, fontWeight: 800, fontFamily: "Rajdhani,sans-serif",
                }}>💎 {v}</button>
              ))}
            </div>
            <input value={formFee} onChange={(e) => setFormFee(e.target.value.replace(/\D/, ""))}
              placeholder="Mise personnalisée…"
              style={{
                width: "100%", padding: "10px 14px", border: "none", borderRadius: 12, outline: "none",
                background: NM.card, boxShadow: NM.in,
                color: "#0d1825", fontSize: 15, fontFamily: "Rajdhani,sans-serif", fontWeight: 700,
                boxSizing: "border-box",
              }} />
            {formFee && parseInt(formFee) > 0 && (
              <div style={{ fontSize: 12, color: "#5b42c0", marginTop: 5, fontWeight: 700 }}>
                Cagnotte max ({formMax} joueurs) : 💎 {(parseInt(formFee) || 0) * (parseInt(formMax) || 8)}
              </div>
            )}
          </div>

          {/* Max players */}
          <div>
            <div style={{ fontSize: 11, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 6, fontFamily: "monospace" }}>Nombre max de joueurs
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[4, 8, 16].map((v) => (
                <button key={v} onClick={() => setFormMax(String(v))} style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer", borderRadius: 12,
                  background: formMax === String(v) ? "linear-gradient(145deg, #5b42c0, #4433a0)" : NM.bg,
                  boxShadow: formMax === String(v) ? "3px 3px 8px rgba(91,66,192,0.3)" : NM.sm,
                  color: formMax === String(v) ? "white" : "#0f1923",
                  fontSize: 15, fontWeight: 900, fontFamily: "Rajdhani,sans-serif",
                }}>{v} 👤</button>
              ))}
            </div>
          </div>

          {/* Error */}
          {formError && (
            <div style={{
              background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)",
              borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#c0392b", fontWeight: 700,
            }}>⚠️ {formError}</div>
          )}

          {/* Summary */}
          <div style={{
            background: NM.card, boxShadow: NM.in, borderRadius: 12, padding: "10px 14px",
            fontSize: 13, color: "#0d1825", lineHeight: 1.7,
          }}>
            Tu seras automatiquement inscrit et <b style={{ color: "#c0392b" }}>💎 {formFee || "?"}</b> gemmes te seront déduites.<br />
            Le gagnant remporte <b style={{ color: "#1a7a3f" }}>💎 {(parseInt(formFee) || 0) * (parseInt(formMax) || 8)}</b> gemmes au total.
          </div>

          {/* Create button */}
          <button onClick={handleCreate} style={{
            width: "100%", padding: "14px 0", border: "none", cursor: "pointer", borderRadius: 14,
            background: profile.gems >= (parseInt(formFee) || 0)
              ? "linear-gradient(145deg, #5b42c0, #4433a0)"
              : NM.card,
            boxShadow: profile.gems >= (parseInt(formFee) || 0)
              ? "4px 4px 12px rgba(91,66,192,0.35), -2px -2px 6px rgba(255,255,255,0.8)"
              : NM.in,
            color: profile.gems >= (parseInt(formFee) || 0) ? "white" : "#0d1825",
            fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
            letterSpacing: "0.08em", textTransform: "uppercase",
            opacity: profile.gems >= (parseInt(formFee) || 0) ? 1 : 0.6,
          }}>
            🏆 Créer — 💎 {formFee || "?"} gemmes
          </button>
        </NmCard>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (view === "detail" && selected) {
    const t = tournaments.find((x) => x.id === selected.id) || selected;
    const isCreator = t.creator.id === profile.id;
    const isParticipant = t.participants.some((p) => p.id === profile.id);
    const isFull = t.participants.length >= t.maxPlayers;
    const prizePool = t.participants.length * t.entryFee;
    const canJoin = !isParticipant && !isFull && t.status === "open" && profile.gems >= t.entryFee;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { setView("list"); refresh(); }} style={{
            width: 36, height: 36, borderRadius: 12, border: "none", cursor: "pointer",
            background: NM.bg, boxShadow: NM.sm, fontSize: 16, color: "#0d1825",
          }}>←</button>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 14, color: "#0d1825", fontWeight: 900, flex: 1 }}>
            {t.name}
          </div>
          <div style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.1em",
            background: t.status === "open" ? "rgba(26,122,63,0.12)" : t.status === "running" ? "rgba(91,66,192,0.12)" : "rgba(160,175,195,0.15)",
            color: t.status === "open" ? "#1a7a3f" : t.status === "running" ? "#5b42c0" : "#0f1923",
          }}>{t.status === "open" ? "Ouvert" : t.status === "running" ? "En cours" : "Terminé"}</div>
        </div>

        {/* Prize pool card */}
        <div style={{
          background: NM.card, boxShadow: NM.out, borderRadius: 18, padding: "16px 20px",
          textAlign: "center", border: "1px solid rgba(91,66,192,0.2)",
        }}>
          <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "monospace", marginBottom: 5 }}>Cagnotte</div>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 36, fontWeight: 900, color: "#5b42c0", lineHeight: 1 }}>
            💎 {prizePool}
          </div>
          <div style={{ fontSize: 12, color: "#0d1825", marginTop: 5 }}>
            {t.participants.length}/{t.maxPlayers} joueurs · 💎 {t.entryFee} mise
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#5b42c0", marginTop: 6, background: "rgba(91,66,192,0.07)", borderRadius: 8, padding: "3px 10px", display: "inline-block" }}>🥇 Le gagnant remporte TOUT
          </div>
        </div>

        {/* Participants */}
        <NmCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(160,175,195,0.2)", display: "flex", justifyContent: "space-between" }}>
            <SectionLabel>Participants</SectionLabel>
            <span style={{ fontSize: 12, color: "#5b42c0", fontWeight: 800 }}>{t.participants.length}/{t.maxPlayers}</span>
          </div>
          {t.participants.map((p, i) => {
            const rank = getRank(p.rankPoints);
            const isMe = p.id === profile.id;
            const isCreatorP = p.id === t.creator.id;
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                borderBottom: i < t.participants.length - 1 ? "1px solid rgba(160,175,195,0.18)" : "none",
                background: isMe ? "rgba(91,66,192,0.05)" : "transparent",
              }}>
                <span style={{ fontSize: 12, color: "#0d1825", width: 18, textAlign: "center", fontWeight: 700 }}>#{i + 1}</span>
                <AvatarWithFrame avatar={p.avatar} frameId={p.equippedFrame || null} rankPoints={p.rankPoints || 0} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isMe ? "#5b42c0" : "#0d1825" }}>
                    {p.name}{isMe && " (Toi)"}{isCreatorP && " 👑"}
                  </div>
                  <div style={{ fontSize: 11, color: rank.color, fontWeight: 700 }}>{rank.icon} {rank.name}</div>
                </div>
              </div>
            );
          })}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, t.maxPlayers - t.participants.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
              borderBottom: i < t.maxPlayers - t.participants.length - 1 ? "1px solid rgba(160,175,195,0.1)" : "none",
              opacity: 0.4,
            }}>
              <span style={{ fontSize: 12, color: "#0d1825", width: 18, textAlign: "center" }}>#{t.participants.length + i + 1}</span>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: NM.card, boxShadow: NM.in, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#0d1825" }}>?</div>
              <span style={{ fontSize: 13, color: "#0d1825", fontWeight: 600, fontStyle: "italic" }}>En attente…</span>
            </div>
          ))}
        </NmCard>

        {/* Actions */}
        {t.status === "open" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {canJoin && (
              <button onClick={() => handleJoin(t)} style={{
                width: "100%", padding: "14px 0", border: "none", cursor: "pointer", borderRadius: 14,
                background: "linear-gradient(145deg, #5b42c0, #4433a0)",
                boxShadow: "4px 4px 12px rgba(91,66,192,0.35), -2px -2px 6px rgba(255,255,255,0.8)",
                color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>💎 {t.entryFee} — Rejoindre</button>
            )}
            {!isParticipant && !canJoin && t.status === "open" && (
              <div style={{
                background: NM.card, boxShadow: NM.in, borderRadius: 12, padding: "10px 14px",
                fontSize: 13, color: "#0d1825", textAlign: "center", fontWeight: 600,
              }}>
                {isFull ? "Tournoi complet" : `💎 ${t.entryFee} requis (tu as ${profile.gems})`}
              </div>
            )}
            {isParticipant && (
              <div style={{
                background: NM.card, boxShadow: NM.in, borderRadius: 12, padding: "10px 14px",
                fontSize: 14, color: "#1a7a3f", textAlign: "center", fontWeight: 800,
              }}>✅ Tu es inscrit !</div>
            )}
            {(isCreator || isParticipant) && t.participants.length >= 2 && (
              <button onClick={() => handleStart(t)} style={{
                width: "100%", padding: "12px 0", border: "none", cursor: "pointer", borderRadius: 14,
                background: NM.bg, boxShadow: NM.sm,
                color: "#0d1825", fontFamily: "Rajdhani,sans-serif", fontSize: 14, fontWeight: 900,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>🏁 Lancer maintenant ({t.participants.length} joueurs)</button>
            )}

            {/* Dissoudre — créateur uniquement, tournoi pas encore lancé */}
            {isCreator && (
              <div style={{
                marginTop: 4, padding: "10px 14px", borderRadius: 12,
                background: NM.bg, boxShadow: NM.in,
                border: "1px solid rgba(192,57,43,0.15)",
              }}>
                <div style={{ fontSize: 11, color: "#0f1923", marginBottom: 8, lineHeight: 1.4 }}>
                  En dissolvant, toutes les mises sont remboursées à chaque joueur inscrit.
                </div>
                <button onClick={() => handleDissolve(t)} style={{
                  width: "100%", padding: "11px 0", border: "none", cursor: "pointer", borderRadius: 11,
                  background: NM.card, boxShadow: NM.sm,
                  color: "#c0392b", fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 900,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>🗑️ Dissoudre le tournoi</button>
              </div>
            )}
          </div>
        )}

        {t.status === "running" && !t.winnerId && isParticipant && (
          <NmCard style={{ textAlign: "center" }}>
            <div style={{ color: "#5b42c0", fontWeight: 800, fontSize: 15 }}>⚔️ Tournoi en cours…</div>
          </NmCard>
        )}

        {t.status === "finished" && t.winnerId && (
          <NmCard style={{ textAlign: "center", border: `1px solid rgba(91,66,192,0.25)` }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 16, color: "#5b42c0", marginBottom: 6 }}>
              {t.winnerId === profile.id ? "Tu as gagné !" : "Tournoi terminé"}
            </div>
            {(() => {
              const winner = t.participants.find((p) => p.id === t.winnerId);
              return winner ? (
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1825" }}>
                  {winner.avatar} {winner.name} remporte <span style={{ color: "#5b42c0" }}>💎 {t.participants.length * t.entryFee}</span>
                </div>
              ) : null;
            })()}
          </NmCard>
        )}
      </div>
    );
  }

  return null;
}

function TourneyCard({ t, profile, onPress, onJoin, isMine }) {
  const isFull = t.participants.length >= t.maxPlayers;
  const isParticipant = t.participants.some((p) => p.id === profile.id);
  const prizePool = t.participants.length * t.entryFee;
  const statusColor = t.status === "open" ? "#1a7a3f" : t.status === "running" ? "#5b42c0" : "#0d1825";
  const statusLabel = t.status === "open" ? "Ouvert" : t.status === "running" ? "En cours" : "Terminé";

  return (
    <div onClick={onPress} style={{
      background: NM.card, boxShadow: isParticipant ? NM.in : NM.out,
      borderRadius: 16, padding: "12px 14px", cursor: "pointer", marginBottom: 8,
      border: `1px solid ${isParticipant ? "rgba(91,66,192,0.25)" : "rgba(160,175,195,0.2)"}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: NM.bg, boxShadow: NM.sm,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>🏆</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0d1825", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.name} {isMine && "👑"}
        </div>
        <div style={{ fontSize: 11, color: "#0d1825", marginTop: 2 }}>
          {t.participants.length}/{t.maxPlayers} joueurs · 💎 {t.entryFee} mise
        </div>
        <div style={{ fontSize: 11, color: statusColor, fontWeight: 700, marginTop: 1 }}>{statusLabel}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#5b42c0" }}>💎 {prizePool}</div>
        <div style={{ fontSize: 10, color: "#0d1825" }}>cagnotte</div>
        {!isParticipant && t.status === "open" && !isFull && (
          <div style={{ fontSize: 10, color: "#5b42c0", fontWeight: 700, marginTop: 3 }}>Rejoindre ›</div>
        )}
      </div>
    </div>
  );
}

function OfficialTournamentTab({ profile, onUpdate, onPlayTournament }) {
  const fakePlayers = [
    { id: "fp1", name: "ShadowBlade", avatar: "👁️", rankPoints: 820, vip: false },
    { id: "fp2", name: "AquaLord",    avatar: "🌊", rankPoints: 1200, vip: true  },
    { id: "fp3", name: "FireMaster",  avatar: "🔥", rankPoints: 650,  vip: false },
    { id: "fp4", name: "TerraFury",   avatar: "🐉", rankPoints: 480,  vip: false },
    { id: "fp5", name: "EtherKnight", avatar: "🔮", rankPoints: 970,  vip: true  },
    { id: "fp6", name: "StormRider",  avatar: "⚔️", rankPoints: 340,  vip: false },
    { id: "fp7", name: "VoidWalker",  avatar: "💀", rankPoints: 1450, vip: false },
    { id: "fp8", name: "NeonSaber",   avatar: "⚡", rankPoints: 780,  vip: true  },
    { id: "fp9", name: "ArcaneWolf",  avatar: "🐺", rankPoints: 560,  vip: false },
  ];

  const [official, setOfficial] = useState(() => getOrCreateOfficialToday(fakePlayers));
  const [window_, setWindow_] = useState(getOfficialWindow);
  const [timer, setTimer] = useState("");

  // Live countdown
  useEffect(() => {
    const tick = () => {
      const win = getOfficialWindow();
      setWindow_(win);
      const now = Date.now();

      // Timer countdown
      const target = win.status === "soon" ? win.start : win.status === "open" ? win.end : null;
      if (!target) {
        setTimer("");
      } else {
        const diff = Math.max(0, target - now);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimer(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      }

      // Sync official tournament status with real window status
      setOfficial(prev => {
        const correctStatus = win.status === "open" ? "open"
          : win.status === "closed" ? "closed"
          : "upcoming";
        if (prev.status === correctStatus) return prev;
        const updated = { ...prev, status: correctStatus };
        saveOfficialTournament(updated);
        return updated;
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []); // empty deps — runs once, self-contained via setOfficial functional update

  const isRegistered = official.participants.some(p => p.id === profile.id);
  const myEntry = official.leaderboard.find(p => p.id === profile.id);
  const myScore = myEntry?.score || 0;

  // Before tournament opens — reset scores display to 0 (pre-tournament ranking)
  const isSoon = official.status === "upcoming";

  // Sorted leaderboard
  const fullBoard = [...official.leaderboard].map(p => ({
    ...p,
    score: isSoon ? 0 : p.score,  // Show 0 pts before tournament starts
  }));
  if (isRegistered && !fullBoard.find(p => p.id === profile.id)) {
    fullBoard.push({ id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints, vip: profile.vip, score: 0, streak: 0 });
  }
  // Before start: sort by rankPoints. During/after: sort by score
  fullBoard.sort((a, b) => isSoon ? b.rankPoints - a.rankPoints : b.score - a.score);
  const myRank = fullBoard.findIndex(p => p.id === profile.id) + 1;

  function handleRegister() {
    if (isRegistered || official.status !== "open") return;
    const newEntry = { id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints, vip: profile.vip, score: 0, streak: 0 };
    const updated = {
      ...official,
      participants: [...official.participants, { id: profile.id, name: profile.name }],
      leaderboard: [...official.leaderboard, newEntry],
    };
    saveOfficialTournament(updated);
    setOfficial(updated);
  }

  function handlePlayMatch() {
    if (!isRegistered || !onPlayTournament) return;
    // Pick a random opponent from fakePlayers
    const opp = fakePlayers[Math.floor(Math.random() * fakePlayers.length)];
    // Pass a special tournamentId so App knows to update official score on game end
    onPlayTournament(opp, "official");
  }

  function awardMatchResult(result) {
    // Called externally after match ends: result = "WIN"|"LOSE"|"DRAW"
    if (!isRegistered) return;
    const board = official.leaderboard.map(p => {
      if (p.id !== profile.id) return p;
      const pts = result === "WIN" ? 3 : result === "DRAW" ? 1 : 0;
      const newStreak = result === "WIN" ? (p.streak || 0) + 1 : 0;
      const bonus = (result === "WIN" && newStreak >= 3) ? 2 : 0;
      return { ...p, score: p.score + pts + bonus, streak: newStreak };
    });
    const updated = { ...official, leaderboard: board };
    saveOfficialTournament(updated);
    setOfficial(updated);
  }

  // Status colors/labels
  const statusCfg = {
    upcoming: { color: "#5b42c0", bg: "rgba(91,66,192,0.12)", label: "Bientôt", icon: "🕐" },
    open:     { color: "#1a7a3f", bg: "rgba(26,122,63,0.12)", label: "En cours", icon: "⚡" },
    closed:   { color: "#c0392b", bg: "rgba(192,57,43,0.10)", label: "Terminé",  icon: "🏁" },
  };
  const sc = statusCfg[official.status] || statusCfg.upcoming;

  // Medal
  const medal = (rank) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const reward = (rank) => {
    const base = rank === 1 ? 500 : rank === 2 ? 250 : rank === 3 ? 100 : rank <= 10 ? 25 : 5;
    return profile.vip ? Math.floor(base * 1.1) : base;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Hero banner ── */}
      <div style={{
        borderRadius: 20, overflow: "hidden", position: "relative",
        background: "linear-gradient(135deg, #0d0820 0%, #1a0535 50%, #0a1520 100%)",
        padding: "20px 18px 18px",
        boxShadow: "0 4px 20px rgba(91,66,192,0.25)",
      }}>
        {/* Stars */}
        {[...Array(12)].map((_,i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i*37+11)%100}%`, top: `${(i*53+7)%100}%`,
            width: 2, height: 2, borderRadius: "50%",
            background: `rgba(255,255,255,${0.3+Math.random()*0.5})`,
            animation: `glowPulse ${1.5+i*0.3}s ${i*0.2}s ease-in-out infinite`,
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>⚔️</span>
            <div>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 18, fontWeight: 900, color: "white", textShadow: "0 0 20px rgba(160,120,255,0.8)" }}>DUEL SUPRÊME</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 1 }}>Tournoi Officiel Quotidien</div>
            </div>
          </div>

          {/* Status + timer */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              padding: "4px 12px", borderRadius: 20,
              background: sc.bg, border: `1px solid ${sc.color}44`,
              fontSize: 12, fontWeight: 800, color: sc.color,
            }}>{sc.icon} {sc.label}</div>
            {timer && (
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 900, color: "white", letterSpacing: "0.08em", textShadow: "0 0 10px rgba(160,120,255,0.6)" }}>
                {official.status === "soon" ? "Ouverture dans " : "Ferme dans "}{timer}
              </div>
            )}
            {official.status === "closed" && !timer && (
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Prochain tournoi à 20h00</div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Participants", value: official.participants.length + fakePlayers.length },
              { label: "Cagnotte", value: `💎 ${(official.participants.length + fakePlayers.length) * 10}` },
              { label: "Fenêtre", value: "20h — 22h" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12,
                padding: "8px 6px", textAlign: "center",
              }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>{value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── My status ── */}
      {isRegistered && (
        <div style={{
          background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          border: "1px solid rgba(91,66,192,0.2)",
        }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: NM.bg, boxShadow: NM.in, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            <AvatarDisplay avatar={profile.avatar} size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0d1825" }}>Mon score : <b style={{ color: "#5b42c0", fontSize: 16 }}>{myScore} pts</b></div>
            <div style={{ fontSize: 11, color: "#0f1923", marginTop: 2 }}>Rang actuel : <b>{medal(myRank)}</b> · Récompense estimée : <b style={{ color: "#c47f00" }}>💎 {reward(myRank)}</b></div>
          </div>
          {profile.vip && <div style={{ fontSize: 11, background: "linear-gradient(135deg,#d4960a,#b07500)", color: "white", padding: "3px 8px", borderRadius: 8, fontWeight: 800 }}>VIP +10%</div>}
        </div>
      )}

      {/* ── CTA ── */}
      {official.status === "open" && !isRegistered && (
        <button onClick={handleRegister} style={{
          width: "100%", padding: "16px 0", border: "none", cursor: "pointer", borderRadius: 16,
          background: "linear-gradient(145deg, rgba(91,66,192,0.9), rgba(68,48,160,0.85))",
          boxShadow: "0 4px 20px rgba(91,66,192,0.4), -2px -2px 6px rgba(255,255,255,0.8)",
          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 16, fontWeight: 900,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>⚔️ S'inscrire — Gratuit</button>
      )}
      {official.status === "upcoming" && (
        <div style={{ background: NM.card, boxShadow: NM.in, borderRadius: 14, padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#0f1923", fontWeight: 700 }}>Le tournoi ouvre à <b style={{ color: "#5b42c0" }}>20h00</b></div>
          <div style={{ fontSize: 12, color: "#0d1825", marginTop: 4 }}>Reviens ce soir pour t'inscrire et jouer</div>
        </div>
      )}
      {official.status === "open" && isRegistered && (
        <button onClick={handlePlayMatch} style={{
          width: "100%", padding: "14px 0", border: "none", cursor: "pointer", borderRadius: 14,
          background: "linear-gradient(145deg, #1a7a3f, #166a35)",
          boxShadow: "0 4px 16px rgba(26,122,63,0.35), -2px -2px 6px rgba(255,255,255,0.8)",
          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>⚡ Jouer un match tournoi (+3 pts)</button>
      )}

      {/* ── Points system ── */}
      <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0d1825", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Système de points</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Victoire", pts: "+3 pts", color: "#1a7a3f" },
            { label: "Égalité",  pts: "+1 pt",  color: "#5b42c0" },
            { label: "Défaite",  pts: "0 pt",   color: "#0d1825" },
            { label: "3 victoires d'affilée", pts: "+2 pts bonus", color: "#c47f00" },
          ].map(({ label, pts, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: "#0d1825", fontWeight: 600 }}>{label}</span>
              <span style={{ color, fontWeight: 900, fontSize: 14 }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rewards ── */}
      <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0d1825", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>
          Récompenses {profile.vip ? <span style={{ color: "#c47f00", fontSize: 10 }}>(VIP +10%)</span> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "🥇 1ère place", gems: 500 },
            { label: "🥈 2ème place", gems: 250 },
            { label: "🥉 3ème place", gems: 100 },
            { label: "🎖️ Top 10",     gems: 25  },
            { label: "🎟️ Participation", gems: 5 },
          ].map(({ label, gems }) => {
            const final = profile.vip ? Math.floor(gems * 1.1) : gems;
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "#0d1825", fontWeight: 600 }}>{label}</span>
                <span style={{ color: "#c47f00", fontWeight: 900 }}>💎 {final}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live leaderboard TOP 10 ── */}
      <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(160,175,195,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>📊 {isSoon ? "Classement Pré-Tournoi" : "Classement Live"}</div>
          <div style={{ fontSize: 10, color: "#0d1825", fontFamily: "monospace" }}>{isSoon ? "par rang" : "TOP 10"}</div>
        </div>
        {fullBoard.slice(0, 10).map((p, i) => {
          const isMe = p.id === profile.id;
          const rank = getRank ? getRank(p.rankPoints) : { color: "#0f1923", icon: "🥉", name: "Bronze" };
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
              borderBottom: i < 9 ? "1px solid rgba(160,175,195,0.12)" : "none",
              background: isMe ? "rgba(91,66,192,0.07)" : i < 3 ? `rgba(196,127,0,0.0${3-i})` : "transparent",
            }}>
              <span style={{ fontSize: i < 3 ? 16 : 11, width: 22, textAlign: "center", fontWeight: 700, color: "#0f1923" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
              </span>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: NM.bg, boxShadow: NM.sm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                <AvatarDisplay avatar={p.avatar} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isMe ? 900 : 700, color: isMe ? "#5b42c0" : "#0d1825", display: "flex", alignItems: "center", gap: 4 }}>
                  {p.name}{isMe && " (Toi)"}
                  {p.vip && <span style={{ fontSize: 10, background: "linear-gradient(135deg,#d4960a,#b07500)", color: "white", padding: "1px 5px", borderRadius: 6, fontWeight: 900 }}>VIP</span>}
                </div>
                <div style={{ fontSize: 10, color: "#0d1825", marginTop: 1 }}>{p.rankPoints} pts rang</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: i < 3 ? "#c47f00" : "#5b42c0", flexShrink: 0 }}>
                {isSoon ? p.rankPoints : p.score} <span style={{ fontSize: 10, color: "#0d1825" }}>{isSoon ? "rk" : "pts"}</span>
              </div>
            </div>
          );
        })}
        {fullBoard.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#0d1825" }}>Aucun participant pour l'instant</div>
        )}
      </div>

    </div>
  );
}

function TournamentScreen({ profile, onUpdate, onPlayTournament }) {
  const [tab, setTab] = useState("officiel"); // officiel | custom

  // Keep old daily tournament logic for CUSTOM bracket
  const [tournament, setTournament] = useState(loadTournament);
  const [showConfirm, setShowConfirm] = useState(false);

  const isRegistered = tournament.participants.some((p) => p.id === profile.id);
  const canRegister = !isRegistered && tournament.status === "open" && profile.gems >= TOURNAMENT_ENTRY_COST;
  const prizePool = tournament.participants.length * TOURNAMENT_ENTRY_COST;

  const fakePlayers = [
    { id: "fp1", name: "ShadowBlade", avatar: "👁️", rankPoints: 820, title: "Champion" },
    { id: "fp2", name: "AquaLord", avatar: "🌊", rankPoints: 1200, title: "Légende" },
    { id: "fp3", name: "FireMaster", avatar: "🔥", rankPoints: 650, title: "Guerrier" },
    { id: "fp4", name: "TerraFury", avatar: "🐉", rankPoints: 480, title: "Combattant" },
    { id: "fp5", name: "EtherKnight", avatar: "🔮", rankPoints: 970, title: "Champion" },
    { id: "fp6", name: "StormRider", avatar: "⚔️", rankPoints: 340, title: "Duelliste" },
    { id: "fp7", name: "VoidWalker", avatar: "💀", rankPoints: 1450, title: "Légende" },
  ];

  function refreshTournament() { setTournament(loadTournament()); }

  function handleRegister() {
    if (!canRegister) return;
    const updatedProfile = { ...profile, gems: profile.gems - TOURNAMENT_ENTRY_COST };
    saveProfile(updatedProfile); onUpdate(updatedProfile);
    const t = { ...tournament };
    if (!t.participants.some((p) => p.id === profile.id)) {
      t.participants.push({ id: profile.id, name: profile.name, avatar: profile.avatar, rankPoints: profile.rankPoints, title: profile.title });
    }
    t.prizePool = t.participants.length * TOURNAMENT_ENTRY_COST;
    saveTournament(t); setTournament(t); setShowConfirm(false);
  }

  function handleStartTournament() {
    const allParticipants = [...tournament.participants];
    for (const fp of fakePlayers) {
      if (!allParticipants.find((p) => p.id === fp.id)) allParticipants.push(fp);
    }
    const bracket = buildBracket(allParticipants);
    const t = { ...tournament, participants: allParticipants, bracket, status: "running", startTime: Date.now(), prizePool: allParticipants.filter((p) => !p.isBye).length * TOURNAMENT_ENTRY_COST, roundResults: [] };
    saveTournament(t); setTournament(t);
    const playerInBracket = bracket.findIndex((p) => p.id === profile.id);
    if (playerInBracket >= 0) {
      const oppIdx = playerInBracket % 2 === 0 ? playerInBracket + 1 : playerInBracket - 1;
      const opp = bracket[oppIdx] || bracket[0];
      if (opp && !opp.isBye) onPlayTournament(opp, null);
    }
  }

  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayParticipants = tournament.participants.length > 0
    ? [...tournament.participants, ...fakePlayers.slice(0, Math.max(0, 4 - tournament.participants.length))]
    : fakePlayers.slice(0, 4);
  const allForBracket = [...tournament.participants, ...fakePlayers].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  const winner = tournament.winnerId ? allForBracket.find((p) => p.id === tournament.winnerId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: NM.bg, overflow: "hidden" }}>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>🏆</div>
            <h3 style={{ fontWeight: 900, fontSize: 17, marginBottom: 8, textAlign: "center", color: "#0d1825" }}>S'inscrire au tournoi ?</h3>
            <p style={{ color: "#0d1825", fontSize: 14, textAlign: "center", marginBottom: 16, lineHeight: 1.6 }}>
              Coût : <b style={{ color: "#c47f00" }}>💎 {TOURNAMENT_ENTRY_COST} gemmes</b><br />
              Cagnotte actuelle : <b style={{ color: "#c47f00" }}>💎 {(displayParticipants.length + 1) * TOURNAMENT_ENTRY_COST}</b>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleRegister} style={{ flex: 1, padding: "12px 0", border: "none", cursor: "pointer", borderRadius: 14, background: "linear-gradient(145deg, #d4960a, #b07500)", boxShadow: "3px 3px 8px rgba(180,120,0,0.3)", color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900 }}>Confirmer</button>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "12px 0", border: "none", cursor: "pointer", borderRadius: 14, background: NM.card, boxShadow: NM.in, color: "#0d1825", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY HEADER ── */}
      <div style={{ flexShrink: 0, padding: "12px 16px 0", background: NM.bg }}>
        {/* Main tabs */}
        <div style={{ display: "flex", background: NM.card, boxShadow: NM.in, borderRadius: 16, padding: 4, gap: 3, marginBottom: 10 }}>
          {[
            { id: "officiel", label: "⚔️ Officiel", sub: "Duel Suprême" },
            { id: "custom",   label: "🏆 Custom",   sub: "Tes tournois" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 13, border: "none", cursor: "pointer",
              fontFamily: "Rajdhani,sans-serif", fontWeight: 800, transition: "all 0.2s",
              background: tab === t.id ? (t.id === "officiel" ? "linear-gradient(145deg, rgba(91,66,192,0.85), rgba(68,48,160,0.8))" : NM.bg) : "transparent",
              boxShadow: tab === t.id ? (t.id === "officiel" ? "0 2px 8px rgba(91,66,192,0.3)" : NM.sm) : "none",
              color: tab === t.id ? (t.id === "officiel" ? "white" : "#0d1825") : "#0d1825",
            }}>
              <div style={{ fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1, letterSpacing: "0.06em" }}>{t.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(160,175,195,0.2)" }} />
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "14px 16px 24px",
        display: "flex", flexDirection: "column", gap: 12,
        scrollbarWidth: "thin", scrollbarColor: "rgba(160,175,195,0.4) transparent",
      }}>

        {/* OFFICIEL tab */}
        {tab === "officiel" && (
          <OfficialTournamentTab profile={profile} onUpdate={onUpdate} onPlayTournament={onPlayTournament} />
        )}

        {/* CUSTOM tab — keeps all old logic */}
        {tab === "custom" && (<>
          <CustomTournamentsTab profile={profile} onUpdate={onUpdate} onPlayTournament={onPlayTournament} />

          {/* Old daily tournament section (DUEL SUPRÊME quotidien bracket) */}
          <div style={{ height: 1, background: "rgba(160,175,195,0.25)", margin: "4px 0" }} />
          <div style={{ fontSize: 11, color: "#0d1825", textAlign: "center", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>Tournoi Quotidien Officiel (Bracket)</div>

          {/* Prize pool */}
          <div style={{ background: NM.card, boxShadow: NM.out, borderRadius: 18, padding: "16px 20px", textAlign: "center", border: "1px solid rgba(196,127,0,0.2)" }}>
            <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "monospace", marginBottom: 6 }}>CAGNOTTE TOTALE</div>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 42, fontWeight: 900, color: "#c47f00", lineHeight: 1 }}>
              💎 {(displayParticipants.length) * TOURNAMENT_ENTRY_COST}
            </div>
            <div style={{ fontSize: 13, color: "#0d1825", marginTop: 5 }}>{displayParticipants.length} inscrits × {TOURNAMENT_ENTRY_COST} gemmes</div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#c47f00", background: "rgba(196,127,0,0.08)", borderRadius: 8, padding: "4px 10px", display: "inline-block" }}>🥇 Le gagnant remporte TOUT</div>
          </div>

          {/* Winner banner */}
          {tournament.status === "finished" && winner && (
            <NmCard style={{ textAlign: "center", border: "2px solid rgba(196,127,0,0.35)" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{winner.id === profile.id ? "🎉" : "🏆"}</div>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 18, color: "#c47f00", marginBottom: 6 }}>{winner.id === profile.id ? "Tu as gagné !" : "Tournoi terminé"}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1825" }}>{winner.avatar} <b>{winner.name}</b> remporte{" "}<span style={{ color: "#c47f00" }}>💎 {allForBracket.filter((p) => !p.isBye).length * TOURNAMENT_ENTRY_COST}</span></div>
              {winner.id === profile.id && <div style={{ marginTop: 8, fontSize: 13, color: "#1a7a3f", fontWeight: 700 }}>✅ Gemmes créditées !</div>}
              <div style={{ marginTop: 8, fontSize: 12, color: "#0d1825" }}>Prochain tournoi : <b style={{ color: "#5b42c0" }}>{countdown}</b></div>
            </NmCard>
          )}

          {/* Rules */}
          <NmCard>
            <SectionLabel>Règles</SectionLabel>
            {[
              { icon: "💎", text: `Inscription : ${TOURNAMENT_ENTRY_COST} gemmes` },
              { icon: "🏆", text: "Le gagnant remporte toute la cagnotte" },
              { icon: "⚔️", text: "Élimination directe — même règles qu'un duel" },
              { icon: "📅", text: "1 tournoi par jour, réinitialisé à minuit" },
              { icon: "🎯", text: "Inscription unique — 1 seule chance par jour" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 0", borderBottom: i < 4 ? "1px solid rgba(160,175,195,0.2)" : "none" }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: 14, color: "#0d1825", fontWeight: 600 }}>{r.text}</span>
              </div>
            ))}
          </NmCard>

          {/* Participants */}
          <NmCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(160,175,195,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SectionLabel>Participants</SectionLabel>
              <span style={{ fontSize: 12, color: "#5b42c0", fontWeight: 800 }}>{displayParticipants.length} inscrits</span>
            </div>
            {displayParticipants.slice(0, 8).map((p, i) => {
              const pr = getRank(p.rankPoints);
              const isMe = p.id === profile.id;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < Math.min(displayParticipants.length, 8) - 1 ? "1px solid rgba(160,175,195,0.2)" : "none", background: isMe ? "rgba(91,66,192,0.06)" : "transparent" }}>
                  <span style={{ fontSize: 12, color: "#0d1825", width: 18, textAlign: "center", fontWeight: 700 }}>#{i + 1}</span>
                  <AvatarWithFrame avatar={p.avatar} frameId={p.equippedFrame || null} rankPoints={p.rankPoints || 0} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: isMe ? 800 : 600, color: isMe ? "#5b42c0" : "#0d1825" }}>{p.name}{isMe && " (Toi)"}</div>
                    <div style={{ fontSize: 11, color: pr.color, fontWeight: 700 }}>{pr.icon} {pr.name}</div>
                  </div>
                </div>
              );
            })}
          </NmCard>

          {/* Actions */}
          {tournament.status === "open" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!isRegistered ? (
                <button disabled={profile.gems < TOURNAMENT_ENTRY_COST} onClick={() => setShowConfirm(true)} style={{ width: "100%", padding: "15px 0", border: "none", cursor: profile.gems >= TOURNAMENT_ENTRY_COST ? "pointer" : "default", borderRadius: 16, background: profile.gems >= TOURNAMENT_ENTRY_COST ? "linear-gradient(145deg, #d4960a, #b07500)" : NM.card, boxShadow: profile.gems >= TOURNAMENT_ENTRY_COST ? "4px 4px 10px rgba(180,120,0,0.3), -2px -2px 6px rgba(255,255,255,0.8)" : NM.in, color: profile.gems >= TOURNAMENT_ENTRY_COST ? "white" : "#0d1825", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", opacity: profile.gems < TOURNAMENT_ENTRY_COST ? 0.6 : 1 }}>
                  💎 S'inscrire — {TOURNAMENT_ENTRY_COST} gemmes
                  {profile.gems < TOURNAMENT_ENTRY_COST && <span style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Pas assez de gemmes</span>}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: NM.card, boxShadow: NM.in, borderRadius: 14, padding: "12px 16px", textAlign: "center", color: "#1a7a3f", fontWeight: 800, fontSize: 15, border: "1px solid rgba(26,122,63,0.25)" }}>✅ Tu es inscrit ! En attente du début…</div>
                  <button onClick={handleStartTournament} style={{ width: "100%", padding: "14px 0", border: "none", cursor: "pointer", borderRadius: 14, background: "linear-gradient(145deg, #6b52d0, #4f3fa8)", boxShadow: "4px 4px 10px rgba(91,66,192,0.3), -2px -2px 6px rgba(255,255,255,0.8)", color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>🏁 Lancer le tournoi maintenant</button>
                </div>
              )}
              <div style={{ textAlign: "center", fontSize: 13, color: "#0d1825" }}>Prochain reset : <b style={{ color: "#5b42c0" }}>{countdown}</b></div>
            </div>
          )}

          {tournament.status === "running" && !tournament.winnerId && (
            <NmCard style={{ textAlign: "center", border: "1px solid rgba(91,66,192,0.25)" }}>
              <div style={{ color: "#5b42c0", fontWeight: 800, fontSize: 15 }}>⚔️ Tournoi en cours…</div>
              <div style={{ fontSize: 13, color: "#0d1825", marginTop: 4 }}>Tes matchs s'enchaînent automatiquement</div>
            </NmCard>
          )}
        </>)}

      </div>{/* end scrollable content */}
    </div>
  );
}


export default TournamentScreen;
