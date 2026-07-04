// screens/ProfileScreen.jsx
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

function ProfileScreen({ profile, onUpdate, onLogout }) {
  const rank = getRank(profile.rankPoints);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarCat, setAvatarCat] = useState("guerriers");

  // VIP video state
  const [vipVideo, setVipVideo] = useState(() => loadVipVideo());
  const [videoError, setVideoError] = useState(null);
  const [videoValidating, setVideoValidating] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const videoInputRef = useRef(null);

  async function handleVideoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset input

    setVideoError(null);
    setVideoValidating(true);

    const result = await validateVipVideo(file);
    setVideoValidating(false);

    if (!result.ok) {
      setVideoError(result.error);
      return;
    }

    // Store in localStorage
    const saved = saveVipVideo(result.dataUrl);
    if (!saved) {
      setVideoError("Erreur de sauvegarde. Fichier trop lourd pour le stockage local.");
      return;
    }

    setVipVideo(result.dataUrl);
    setVideoInfo({ duration: result.duration.toFixed(1), width: result.width, height: result.height });
  }

  function handleRemoveVideo() {
    clearVipVideo();
    setVipVideo(null);
    setVideoInfo(null);
    setVideoError(null);
  }

  function saveName() {
    if (nameInput.trim()) { const p = { ...profile, name: nameInput.trim() }; saveProfile(p); onUpdate(p); }
    setEditName(false);
  }
  function equipSkin(element, skinId) {
    const p = { ...profile, equippedSkins: { ...profile.equippedSkins, [element]: skinId } };
    saveProfile(p); onUpdate(p);
  }
  function selectAvatar(av) { const p = { ...profile, avatar: av }; saveProfile(p); onUpdate(p); setShowAvatarPicker(false); }
  function cycleTitle() {
    const ownedTitles = loadOwnedTitles();
    const ownedTitleObjects = PREMIUM_TITLES.filter((t) => ownedTitles.includes(t.id));
    const idx = ownedTitleObjects.findIndex((t) => t.label === profile.title);
    const next = ownedTitleObjects[(idx + 1) % ownedTitleObjects.length];
    if (next) { const p = { ...profile, title: next.label }; saveProfile(p); onUpdate(p); }
  }

  return (
    <div className="screen" style={{ background: NM.bg, padding: "16px", gap: 12 }}>

      {/* ── AVATAR PICKER MODAL ── */}
      {showAvatarPicker && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(200,210,220,0.92)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            background: NM.card, boxShadow: "0 2px 8px rgba(140,155,175,0.18)", flexShrink: 0,
          }}>
            <button onClick={() => setShowAvatarPicker(false)} style={{
              width: 36, height: 36, borderRadius: 12, border: "none", cursor: "pointer",
              background: NM.bg, boxShadow: NM.sm, fontSize: 16, color: "#0f1923",
            }}>✕</button>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 15, color: "#0d1825", fontWeight: 900, flex: 1 }}>Choisir un avatar
            </div>
            {/* Current avatar preview */}
            <div style={{
              width: 42, height: 42, borderRadius: "50%", background: NM.card, boxShadow: NM.out,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}><AvatarDisplay avatar={profile.avatar} size={32} /></div>
          </div>

          {/* Category tabs — horizontal scroll */}
          <div style={{
            display: "flex", gap: 6, padding: "10px 12px",
            overflowX: "auto", flexShrink: 0,
            background: NM.bg,
            scrollbarWidth: "none",
          }}>
            {AVATAR_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setAvatarCat(cat.id)} style={{
                flexShrink: 0, padding: "6px 12px", border: "none", cursor: "pointer",
                borderRadius: 20, fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 800,
                background: avatarCat === cat.id ? "linear-gradient(145deg,#5b42c0,#4433a0)" : NM.card,
                boxShadow: avatarCat === cat.id ? "3px 3px 8px rgba(91,66,192,0.3)" : NM.sm,
                color: avatarCat === cat.id ? "white" : "#0f1923",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span>{isRegionalFlag(cat.icon)
                  ? <span className="flag-emoji-sm">{cat.icon}</span>
                  : <span style={{ fontSize: 15 }}>{cat.icon}</span>
                }</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: "rgba(160,175,195,0.2)", flexShrink: 0 }} />

          {/* Avatar grid — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {AVATAR_CATEGORIES.filter((c) => c.id === avatarCat).map((cat) => (
              <div key={cat.id}>
                <div style={{ fontSize: 11, color: "#0f1923", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 10 }}>
                  {cat.icon} {cat.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cat.avatars.map((av) => {
                    const isSelected = profile.avatar === av;
                    const isFlag = isRegionalFlag(av);
                    return (
                      <button key={av} onClick={() => selectAvatar(av)} style={{
                        width: 52, height: 52,
                        borderRadius: 14, border: "none", cursor: "pointer",
                        background: NM.card,
                        boxShadow: isSelected ? `${NM.in}, 0 0 0 2px #5b42c0` : NM.sm,
                        transform: isSelected ? "scale(0.95)" : "scale(1)",
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        position: "relative",
                      }}>
                        {isFlag
                          ? <span className="flag-emoji-lg" aria-label={av}>{av}</span>
                          : <span style={{ fontSize: 26, lineHeight: 1 }}>{av}</span>
                        }
                        {isSelected && (
                          <div style={{
                            position: "absolute", top: -3, right: -3, width: 16, height: 16,
                            borderRadius: "50%", background: "#5b42c0",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: "white", fontWeight: 900,
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 800, fontFamily: "monospace" }}>— Profil —</div>
        {onLogout && (
          <button onClick={onLogout} style={{
            padding: "5px 12px", border: "none", cursor: "pointer", borderRadius: 10,
            background: NM.bg, boxShadow: NM.sm,
            fontSize: 11, fontWeight: 800, color: "#c0392b",
            fontFamily: "Rajdhani,sans-serif", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>🚪 Déconnexion</button>
        )}
      </div>

      {/* Avatar card */}
      <NmCard style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 76, height: 76, borderRadius: "50%",
          background: NM.card, boxShadow: `${NM.out}, 0 0 0 3px ${rank.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
        }}><AvatarDisplay avatar={profile.avatar} size={32} /></div>

        {/* Avatar picker — opens fullscreen modal */}
        <button onClick={() => setShowAvatarPicker(true)} style={{
          background: NM.bg, boxShadow: NM.sm, border: "none", cursor: "pointer",
          borderRadius: 20, padding: "6px 16px",
          fontSize: 13, fontWeight: 700, color: "#5b42c0",
          display: "flex", alignItems: "center", gap: 6,
        }}>✏️ Changer d’avatar
        </button>

        {/* Name */}
        {editName ? (
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
              style={{ flex: 1, background: NM.card, border: "none", borderRadius: 10,
                boxShadow: NM.in, padding: "8px 12px", color: "#0d1825",
                fontSize: 15, fontFamily: "Rajdhani,sans-serif", outline: "none" }} />
            <button onClick={saveName} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: NM.card, boxShadow: NM.sm, color: "#1a7a3f", fontWeight: 800,
              fontSize: 15, fontFamily: "Rajdhani,sans-serif",
            }}>✓</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0d1825" }}>{profile.name}</span>
            <button onClick={() => setEditName(true)} style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              background: NM.card, boxShadow: NM.sm, fontSize: 14,
            }}>✏️</button>
          </div>
        )}

        {/* Title */}
        <div onClick={cycleTitle} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, background: NM.card, boxShadow: NM.sm, fontSize: 13, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
            🏷️ <TitleDisplay title={profile.title} fontSize={12} />
          </span>
          <span style={{ fontSize: 11, color: "#0d1825" }}>▸ changer</span>
        </div>

        {/* Rank + pts */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            padding: "4px 12px", borderRadius: 20, background: NM.card, boxShadow: NM.sm,
            fontSize: 13, color: rank.color, fontWeight: 800,
          }}>{rank.icon} {rank.name}</span>
          <span style={{ fontSize: 13, color: "#0d1825", fontWeight: 700 }}>{profile.rankPoints} pts</span>
        </div>

        {/* BAT / Gems */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { icon: "⚡", val: profile.vip ? "∞" : profile.bat, label: "BAT" },
            { icon: "💎", val: profile.gems, label: "GEMMES" },
          ].map((item) => (
            <div key={item.label} style={{
              background: NM.card, boxShadow: NM.in, borderRadius: 12, padding: "8px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 16 }}>{item.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0d1825" }}>{item.val}</div>
              <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>{item.label}</div>
            </div>
          ))}
          {profile.vip && <span style={{ alignSelf: "center", padding: "4px 10px", borderRadius: 20, background: "linear-gradient(135deg, #d4960a, #b07500)", color: "white", fontSize: 11, fontWeight: 800 }}>VIP</span>}
        </div>
      </NmCard>

      {/* Stats */}
      <NmCard>
        <SectionLabel>Statistiques</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Victoires", val: profile.wins,        color: "#1a7a3f" },
            { label: "Défaites",  val: profile.losses,       color: "#c0392b" },
            { label: "Égalités",  val: profile.draws,        color: "#5a6880" },
            { label: "Parties",   val: profile.gamesPlayed,  color: "#5b42c0" },
            { label: "Ratio",     val: profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * 100) + "%" : "—", color: "#c47f00" },
          ].map((s) => (
            <div key={s.label} style={{ background: NM.card, boxShadow: NM.in, borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4, fontWeight: 800 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </NmCard>

      {/* Skins */}
      <NmCard>
        {/* ── CADRES SECTION ── */}
        {(() => {
          const ownedFrames = getOwnedFrames(profile);
          const equippedFrameId = profile.equippedFrame || null;
          return (
            <NmCard>
              <SectionLabel>🖼️ Cadres Avatar</SectionLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {/* No frame option */}
                <div onClick={() => {
                  const p = { ...profile, equippedFrame: null };
                  saveProfile(p); authSaveProfile(p); onUpdate(p);
                }} style={{
                  width: 62, height: 62, borderRadius: "50%", cursor: "pointer",
                  background: NM.bg, boxShadow: equippedFrameId === null ? NM.in : NM.sm,
                  border: equippedFrameId === null ? "2px solid #5b42c0" : "2px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0, transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 10, color: "#0d1825", textAlign: "center", lineHeight: 1.3 }}>Aucun</div>
                </div>

                {ownedFrames.map((frame) => {
                  const isEq = equippedFrameId === frame.id;
                  return (
                    <div key={frame.id} onClick={() => {
                      const p = { ...profile, equippedFrame: frame.id };
                      saveProfile(p); authSaveProfile(p); onUpdate(p);
                    }} style={{
                      width: 62, height: 62, borderRadius: "50%", cursor: "pointer",
                      background: isEq ? `${frame.bg}` : NM.card,
                      boxShadow: isEq ? NM.in : NM.sm,
                      border: frame.border,
                      outline: isEq ? `2px solid ${frame.color}` : "none",
                      outlineOffset: 2,
                      animation: frame.animation,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.15s", position: "relative",
                    }}>
                      <span style={{ fontSize: 22 }}>{frame.icon}</span>
                      <span style={{ fontSize: 8, color: frame.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{frame.name}</span>
                      {isEq && (
                        <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: frame.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 900 }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Preview */}
              {equippedFrameId && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <AvatarWithFrame avatar={profile.avatar} frameId={equippedFrameId} rankPoints={profile.rankPoints} size={52} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0d1825" }}>Cadre équipé : {getFrameById(equippedFrameId)?.name}</div>
                    <div style={{ fontSize: 11, color: "#0f1923", marginTop: 2 }}>Visible dans tous les écrans</div>
                  </div>
                </div>
              )}

              {/* Hint for locked frames */}
              <div style={{ marginTop: 10, fontSize: 11, color: "#0d1825", lineHeight: 1.5 }}>
                {'Les cadres de rang se débloquent automatiquement. Les cadres premium sont disponibles en boutique.'}
              </div>
            </NmCard>
          );
        })()}

        <SectionLabel>Skins par élément</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(ELEMENTS).map(([key, el]) => {
            const equippedId = profile.equippedSkins[key];
            const equippedBundleSkin = BUNDLE_SKIN_MAP[equippedId];
            const equippedLegacy = CARD_SKINS.find((s) => s.id === equippedId);
            const equippedLabel = equippedBundleSkin?.name || equippedLegacy?.name || "Classique";

            // All owned skins for this element: legacy + bundle
            const ownedBundleSkins = Object.values(BUNDLE_SKIN_MAP).filter(
              (s) => s.element === key && profile.ownedSkins.includes(s.id)
            );
            const ownedLegacySkins = CARD_SKINS.filter((s) => profile.ownedSkins.includes(s.id));
            const allOwned = [...ownedLegacySkins, ...ownedBundleSkins];

            return (
              <div key={key}>
                <div onClick={() => setSelectedElement(selectedElement === key ? null : key)}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: NM.card, boxShadow: NM.sm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{el.emoji}</div>
                  <span style={{ fontWeight: 800, color: el.color, fontSize: 14 }}>{el.name}</span>
                  <span style={{ fontSize: 11, color: "#0d1825", marginLeft: "auto" }}>
                    {equippedLabel} {selectedElement === key ? "▲" : "▼"}
                  </span>
                </div>

                {selectedElement === key && (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, paddingTop: 4 }}>
                    {/* Legacy skins */}
                    {ownedLegacySkins.map((skin) => {
                      const isEq = equippedId === skin.id;
                      return (
                        <div key={skin.id} onClick={() => equipSkin(key, skin.id)} style={{
                          width: 56, flexShrink: 0, borderRadius: 10, padding: "8px 4px",
                          background: NM.card, boxShadow: isEq ? NM.in : NM.sm,
                          border: isEq ? `2px solid ${el.color}` : "2px solid transparent",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
                        }}>
                          <span style={{ fontSize: 20 }}>{el.emoji}</span>
                          <span style={{ fontSize: 9, color: "#0d1825", textAlign: "center" }}>{skin.name}</span>
                          {isEq && <span style={{ fontSize: 9, color: el.color, fontWeight: 800 }}>✓ Équipé</span>}
                        </div>
                      );
                    })}

                    {/* Bundle skins for this element */}
                    {ownedBundleSkins.map((bs) => {
                      const isEq = equippedId === bs.id;
                      return (
                        <div key={bs.id} onClick={() => equipSkin(key, bs.id)} style={{
                          width: 64, height: 90, flexShrink: 0, borderRadius: 12,
                          overflow: "hidden", position: "relative", cursor: "pointer",
                          boxShadow: isEq ? `${NM.out}, 0 0 0 2px ${bs.color}, 0 0 14px ${bs.glowColor}` : `${NM.sm}, 0 0 0 1px ${bs.color}44`,
                          border: isEq ? `2px solid ${bs.color}` : "2px solid transparent",
                          transition: "all 0.2s",
                          transform: isEq ? "scale(1.05)" : "scale(1)",
                        }}>
                          {bs.image ? (
                            <img src={bs.image} alt={bs.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: NM.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ELEMENTS[key]?.emoji}</div>
                          )}
                          {/* Name overlay */}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "8px 3px 3px", textAlign: "center" }}>
                            <span style={{ fontSize: 8, color: "#fff", fontWeight: 900, textTransform: "uppercase" }}>{bs.name}</span>
                          </div>
                          {isEq && (
                            <div style={{ position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: bs.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 900, boxShadow: `0 0 6px ${bs.glowColor}` }}>✓</div>
                          )}
                        </div>
                      );
                    })}

                    {ownedBundleSkins.length === 0 && ownedLegacySkins.length === 0 && (
                      <div style={{ fontSize: 12, color: "#0d1825", padding: "8px 0", fontStyle: "italic" }}>Aucun skin possédé pour cet élément
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </NmCard>
      <div style={{ height: 8 }} />
    </div>
  );
}


export default ProfileScreen;
