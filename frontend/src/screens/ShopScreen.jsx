/* eslint-disable import/first */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ELEMENTS, STRENGTHS, WEAKNESSES } from '../data/elements.js';
import { RANKS, getRank, resolveRound, botChoice, generateMatchId, claimRankBonus, hasClaimedRankBonus } from '../data/ranks.js';
import { TITLES, PREMIUM_TITLES, loadOwnedTitles, saveOwnedTitles, TitleDisplay } from '../data/titles.jsx';
import { AvatarDisplay, FlagEmoji, isRegionalFlag, AVATAR_CATEGORIES, AVATARS } from '../data/avatars.jsx';
import { TOURNAMENT_ENTRY_COST, TOURNAMENT_NAMES, loadTournament, saveTournament, buildBracket, loadOfficialTournament, saveOfficialTournament, getOfficialWindow, getOrCreateOfficialToday, loadCustomTournaments, saveCustomTournaments, createCustomTournament, joinCustomTournament, updateCustomTournament, deleteCustomTournament, getTournamentKey } from '../data/tournaments.js';
import { loadProfile, saveProfile, authSaveProfile } from '../services/profile.js';
import { BACKEND_URL, BACKEND_CONFIGURED, backendFetch } from '../services/global.js';
import { loadVipVideo, saveVipVideo, clearVipVideo, validateVipVideo, VipVideoPlayer } from '../services/multiplayer.jsx';
import { SKIN_BUNDLES, CARD_SKINS, INDIVIDUAL_SKINS, getIndivImage, BUNDLE_SKIN_MAP, getSkinsForElement, isBundleOwned, getBundleSkinIds, getRarityBorderStyle } from '../skins/skins.js';
import { NM, FRAME_RANK, FRAME_PREMIUM, ALL_FRAMES, getFrameById, getAutoFrame, getOwnedFrames, loadOwnedFrames, saveOwnedFrames, AvatarWithFrame, AvatarWithFrameDark, NmCard, SectionLabel, HpBar, TimerCircle, ElementCard, PlayerBanner, GalaxyRift, Particles, Shockwave, FloatingText, RoundWinEffect, RoundLoseEffect, VictoryConfetti, BGFlash } from '../ui/UI.jsx';;
import { VERSUS_SKINS } from '../skins/versusData.js';


const TITLE_RARITIES = {
  GRATUIT:    { color: "#1a7a3f", bg: "rgba(26,122,63,0.1)",     label: "Gratuit"    },
  COMMUN:     { color: "#4a5568", bg: "rgba(74,85,104,0.1)",     label: "Commun"     },
  RARE:       { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",    label: "Rare"       },
  ÉPIQUE:     { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",    label: "Épique"     },
  LÉGENDAIRE: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",    label: "Légendaire" },
  MYTHIQUE:   { color: "#dc2626", bg: "rgba(220,38,38,0.1)",     label: "Mythique"   },
};

function SkinCardDisplay({ skinId, elementKey, size = 64, equipped = false }) {
  const el = ELEMENTS[elementKey];
  const bundleSkin = BUNDLE_SKIN_MAP[skinId];

  if (bundleSkin && bundleSkin.image) {
    return (
      <div style={{
        width: size, height: size * 1.4, borderRadius: size * 0.18,
        overflow: "hidden", position: "relative",
        boxShadow: equipped
          ? `${NM.out}, 0 0 0 3px ${bundleSkin.color}, 0 0 20px ${bundleSkin.glowColor}`
          : NM.sm,
        border: equipped ? `2px solid ${bundleSkin.color}` : "2px solid rgba(160,175,195,0.3)",
        transition: "all 0.3s",
      }}>
        <img src={bundleSkin.image} alt={bundleSkin.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {/* Element label overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
          padding: "6px 4px 3px", textAlign: "center",
        }}>
          <span style={{ fontSize: size * 0.13, fontWeight: 900, color: "#fff",
            textTransform: "uppercase", letterSpacing: "0.05em",
            textShadow: `0 0 6px ${bundleSkin.color}` }}>{el?.name}</span>
        </div>
        {equipped && (
          <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16,
            borderRadius: "50%", background: bundleSkin.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "white", fontWeight: 900,
            boxShadow: `0 0 6px ${bundleSkin.glowColor}` }}>✓</div>
        )}
      </div>
    );
  }

  // Legacy skin fallback
  return (
    <div style={{
      width: size, height: size * 1.4, borderRadius: size * 0.18,
      background: NM.card, boxShadow: equipped ? `${NM.in}, 0 0 0 2px ${el?.color}` : NM.sm,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 3,
      border: equipped ? `2px solid ${el?.color}` : "2px solid transparent",
    }}>
      <span style={{ fontSize: size * 0.38 }}>{el?.emoji}</span>
      <span style={{ fontSize: size * 0.13, fontWeight: 800, color: el?.color,
        textTransform: "uppercase", letterSpacing: "0.04em" }}>{el?.name}</span>
    </div>
  );
}

function BundlePreviewModal({ bundle, profile, onClose, onBuy, onEquip }) {
  const [idx, setIdx] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [animDir, setAnimDir] = useState(null); // "left"|"right"|null
  const owned = isBundleOwned(bundle.id, profile.ownedSkins);
  const isFree = bundle.price === 0;
  const canBuy = !owned && (isFree || profile.gems >= bundle.price);
  const skin = bundle.skins[idx];
  const elKey = skin.element;
  const equippedSkinId = profile.equippedSkins[elKey];
  const isEquipped = equippedSkinId === skin.id;
  const skinOwned = profile.ownedSkins.includes(skin.id);

  function go(dir) {
    setAnimDir(dir);
    setTimeout(() => {
      setIdx((i) => (i + (dir === "right" ? 1 : -1) + bundle.skins.length) % bundle.skins.length);
      setAnimDir(null);
    }, 160);
  }

  function handleTouchStart(e) { setTouchStart(e.touches[0].clientX); }
  function handleTouchEnd(e) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) go(diff > 0 ? "right" : "left");
    setTouchStart(null);
  }

  // Key navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") go("right");
      if (e.key === "ArrowLeft")  go("left");
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const statusLabel = isEquipped ? "ÉQUIPÉ" : skinOwned ? "DÉBLOQUÉ" : "VERROUILLÉ";
  const statusColor = isEquipped ? "#1a7a3f" : skinOwned ? "#5b42c0" : "#0d1825";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(200,210,220,0.92)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column",
    }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", background: NM.card, boxShadow: "0 2px 8px rgba(140,155,175,0.18)",
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 12, border: "none", cursor: "pointer",
          background: NM.bg, boxShadow: NM.sm,
          fontSize: 16, color: "#0d1825",
        }}>✕</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 15, color: "#0d1825", fontWeight: 900 }}>
            {bundle.icon} {bundle.name}
          </div>
          <div style={{ fontSize: 10, color: bundle.rarityColor, textTransform: "uppercase",
            letterSpacing: "0.15em", fontWeight: 800, fontFamily: "monospace" }}>
            {bundle.rarity}
          </div>
        </div>
        <div style={{
          padding: "4px 12px", borderRadius: 20,
          background: isFree ? "rgba(26,122,63,0.15)" : NM.bg,
          boxShadow: isFree ? "none" : NM.in,
          fontSize: 13, fontWeight: 800,
          color: isFree ? "#1a7a3f" : "#c47f00",
          border: isFree ? "1px solid rgba(26,122,63,0.4)" : "none",
        }}>{isFree ? "🎁 GRATUIT" : `💎 ${bundle.price}`}</div>
      </div>

      {/* Skin display area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "20px 24px 12px", overflowY: "auto" }}>

        {/* Big skin card with real image */}
        <div style={{
          opacity: animDir ? 0 : 1,
          transform: animDir === "right" ? "translateX(50px)" : animDir === "left" ? "translateX(-50px)" : "translateX(0)",
          transition: "all 0.18s cubic-bezier(.22,.68,0,1.2)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          width: "100%",
        }}>
          {/* Card frame — bigger */}
          <div style={{
            width: 200, height: 280, borderRadius: 28,
            overflow: "hidden", position: "relative",
            ...getRarityBorderStyle(bundle.rarity),
            transition: "box-shadow 0.4s",
            flexShrink: 0,
          }}>
            {/* Real image */}
            {skin.image ? (
              <img src={skin.image} alt={skin.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: NM.card,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
                {ELEMENTS[elKey]?.emoji}
              </div>
            )}

            {/* Top overlay: element + rarity */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, transparent 100%)",
              padding: "12px 14px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "white",
                background: `${skin.color}cc`, padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {ELEMENTS[elKey]?.emoji} {ELEMENTS[elKey]?.name}
              </span>
              <span style={{ fontSize: 11, color: bundle.rarityColor, fontWeight: 900,
                letterSpacing: "0.1em", textTransform: "uppercase",
                textShadow: `0 0 8px ${bundle.rarityColor}` }}>
                {bundle.rarity}
              </span>
            </div>

            {/* Bottom overlay: name + status */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85) 100%)",
              padding: "30px 14px 14px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "white",
                textTransform: "uppercase", letterSpacing: "0.08em",
                textShadow: `0 0 14px ${skin.color}` }}>{skin.name}</div>
              <div style={{
                marginTop: 6, display: "inline-block",
                padding: "3px 12px", borderRadius: 20,
                background: statusColor === "#1a7a3f" ? "rgba(26,122,63,0.9)"
                  : statusColor === "#5b42c0" ? "rgba(91,66,192,0.9)"
                  : "rgba(50,50,50,0.9)",
                fontSize: 11, fontWeight: 900, color: "white",
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>{statusLabel}</div>
            </div>

            {/* Glow pulse on equipped */}
            {isEquipped && (
              <div style={{ position: "absolute", inset: 0, borderRadius: 28,
                boxShadow: `inset 0 0 24px ${skin.color}55`, pointerEvents: "none" }} />
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            {skinOwned && !isEquipped && (
              <button onClick={() => onEquip(elKey, skin.id)} style={{
                padding: "11px 30px", border: "none", cursor: "pointer", borderRadius: 14,
                background: `linear-gradient(145deg, ${skin.color}dd, ${skin.color}99)`,
                boxShadow: `4px 4px 12px ${skin.glowColor}, -2px -2px 5px rgba(255,255,255,0.8)`,
                color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 15, fontWeight: 900,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>⚡ Équiper</button>
            )}
            {isEquipped && (
              <div style={{
                padding: "11px 22px", borderRadius: 14, background: NM.bg, boxShadow: NM.in,
                fontSize: 14, fontWeight: 800, color: "#1a7a3f",
              }}>✓ Équipé — {ELEMENTS[elKey]?.name}</div>
            )}
            {!skinOwned && !owned && (
              <div style={{ fontSize: 13, color: "#0d1825", padding: "11px 0", fontWeight: 600 }}>🔒 Achète le pack pour débloquer
              </div>
            )}
          </div>
        </div>

        {/* Nav arrows + dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => go("left")} style={{
            width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
            background: NM.bg, boxShadow: NM.sm, fontSize: 20, color: "#0d1825",
          }}>‹</button>
          <div style={{ display: "flex", gap: 7 }}>
            {bundle.skins.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: i === idx ? 26 : 9, height: 9, borderRadius: 5, cursor: "pointer",
                background: i === idx ? skin.color : "#0d1825",
                boxShadow: i === idx ? `0 0 10px ${skin.color}` : NM.in,
                transition: "all 0.3s",
              }} />
            ))}
          </div>
          <button onClick={() => go("right")} style={{
            width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
            background: NM.bg, boxShadow: NM.sm, fontSize: 20, color: "#0d1825",
          }}>›</button>
        </div>

        {/* Mini image strip — bigger thumbnails, better spacing */}
        <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center", paddingBottom: 4 }}>
          {bundle.skins.map((s, i) => {
            const isActive = i === idx;
            const isOwn = profile.ownedSkins.includes(s.id);
            return (
              <div key={s.id} onClick={() => setIdx(i)} style={{
                width: 58, height: 76, borderRadius: 14, flexShrink: 0, cursor: "pointer",
                overflow: "hidden", position: "relative",
                boxShadow: isActive ? `${NM.sm}, 0 0 0 2.5px ${s.color}, 0 0 14px ${s.glowColor}` : NM.in,
                border: isActive ? `2.5px solid ${s.color}` : "2px solid transparent",
                transform: isActive ? "scale(1.12) translateY(-3px)" : "scale(1)",
                opacity: isOwn ? 1 : 0.55,
                transition: "all 0.28s",
              }}>
                {s.image ? (
                  <img src={s.image} alt={s.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: NM.card,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {ELEMENTS[s.element]?.emoji}
                  </div>
                )}
                {!isOwn && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🔒</div>
                )}
                {/* Element mini label */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "6px 2px 3px", textAlign: "center" }}>
                  <span style={{ fontSize: 8, color: "#fff", fontWeight: 900, textTransform: "uppercase" }}>{ELEMENTS[s.element]?.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy / owned footer */}
      <div style={{ padding: "18px 20px", flexShrink: 0, background: NM.card, boxShadow: "0 -2px 10px rgba(140,155,175,0.15)" }}>
        {owned ? (
          <div style={{
            background: NM.bg, boxShadow: NM.in, borderRadius: 16, padding: "16px 0",
            textAlign: "center", fontSize: 15, fontWeight: 800, color: "#1a7a3f",
          }}>✓ Pack déjà possédé — Tous les skins débloqués !</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#0d1825", textAlign: "center", lineHeight: 1.4 }}>
              {isFree ? "🎁 Pack gratuit — disponible pour tous les joueurs" : "Débloque les 5 skins élémentaires en une seule fois"}
            </div>
            <button onClick={() => { onBuy(bundle); onClose(); }} disabled={!canBuy} style={{
              width: "100%", padding: "16px 0", border: "none",
              cursor: canBuy ? "pointer" : "default", borderRadius: 16,
              background: canBuy
                ? `linear-gradient(145deg, ${bundle.rarityColor}dd, ${bundle.rarityColor}aa)`
                : NM.card,
              boxShadow: canBuy
                ? `4px 4px 14px ${bundle.rarityGlow}, -2px -2px 6px rgba(255,255,255,0.8)`
                : NM.in,
              color: canBuy ? "white" : "#0d1825",
              fontFamily: "Rajdhani,sans-serif", fontSize: 17, fontWeight: 900,
              letterSpacing: "0.1em", textTransform: "uppercase",
              opacity: canBuy ? 1 : 0.6,
            }}>
              {isFree
                ? "🎁 Obtenir gratuitement"
                : !canBuy
                  ? `💎 ${bundle.price} — Gemmes insuffisantes (${profile.gems})`
                  : `💎 ${bundle.price} — Acheter le pack`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BundleCatalog({ profile, setPreviewBundle }) {
  const CATEGORIES = [
    { key: "DIVIN",      label: "Divin",      icon: "✨", color: "#f59e0b" },
    { key: "MYTHIQUE",   label: "Mythique",   icon: "💀", color: "#dc2626" },
    { key: "LÉGENDAIRE", label: "Légendaire", icon: "⭐", color: "#9333ea" },
    { key: "ÉPIQUE",     label: "Épique",     icon: "💜", color: "#8b5cf6" },
    { key: "RARE",       label: "Rare",       icon: "💎", color: "#3b82f6" },
    { key: "COMMUN",     label: "Commun",     icon: "🟢", color: "#64748b" },
    { key: "GRATUIT",    label: "Gratuit",    icon: "🎁", color: "#1a7a3f" },
  ];

  const grouped = {};
  SKIN_BUNDLES.forEach((b) => {
    if (!grouped[b.rarity]) grouped[b.rarity] = [];
    grouped[b.rarity].push(b);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => b.price - a.price));

  const [openCats, setOpenCats] = useState(() => {
    const init = {};
    CATEGORIES.forEach((c) => { init[c.key] = true; });
    return init;
  });

  function toggleCat(key) {
    setOpenCats((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function BundleCard({ bundle, isFirst = false }) {
    const owned = isBundleOwned(bundle.id, profile.ownedSkins);
    const rarityStyle = owned ? { border: "1px solid rgba(26,122,63,0.3)", boxShadow: NM.in } : getRarityBorderStyle(bundle.rarity);
    return (
      <div onClick={() => setPreviewBundle(bundle)}
        style={{
          background: NM.card,
          borderRadius: isFirst ? 22 : 18,
          overflow: "hidden", cursor: "pointer",
          position: "relative",
          transition: "transform 0.15s",
          ...rarityStyle,
        }}>

        {/* Rarity ribbon */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          background: `linear-gradient(135deg, ${bundle.rarityColor}, ${bundle.rarityColor}99)`,
          padding: "4px 14px", borderBottomLeftRadius: 12,
          fontSize: isFirst ? 9 : 8, fontWeight: 900, color: "white",
          letterSpacing: "0.14em", textTransform: "uppercase",
          zIndex: 1,
        }}>{bundle.rarity}</div>

        {/* Skin strip */}
        <div style={{
          display: "flex",
          padding: isFirst ? "22px 14px 12px" : "18px 10px 10px",
          gap: isFirst ? 8 : 6,
          justifyContent: "center",
          background: `linear-gradient(160deg, ${bundle.rarityGlow}, transparent)`,
        }}>
          {bundle.skins.map((s) => {
            const isOwn = profile.ownedSkins.includes(s.id);
            const isEq = profile.equippedSkins[s.element] === s.id;
            const skinW = isFirst ? 58 : 50;
            const skinH = isFirst ? 82 : 70;
            return (
              <div key={s.id} style={{
                width: skinW, height: skinH, borderRadius: 12, overflow: "hidden",
                position: "relative",
                boxShadow: isOwn ? `${NM.sm}, 0 0 0 2px ${s.color}` : NM.in,
                opacity: isOwn ? 1 : 0.45,
                transition: "all 0.2s",
                flexShrink: 0,
              }}>
                {s.image
                  ? <img src={s.image} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: NM.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ELEMENTS[s.element]?.emoji}</div>
                }
                {/* Element label */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "6px 2px 3px", textAlign: "center" }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{ELEMENTS[s.element]?.name}</span>
                </div>
                {isEq && <div style={{ position: "absolute", top: 3, right: 3, width: 13, height: 13, borderRadius: "50%", background: s.color, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, boxShadow: `0 0 6px ${s.color}` }}>✓</div>}
                {!isOwn && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.18)", fontSize: 15 }}>🔒</div>}
              </div>
            );
          })}
        </div>

        {/* Info + CTA */}
        <div style={{ padding: isFirst ? "10px 16px 18px" : "8px 14px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Cinzel Decorative',serif",
              fontSize: isFirst ? 14 : 12,
              fontWeight: 900, color: "#0d1825",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: 3,
            }}>
              {bundle.icon} {bundle.name}
            </div>
            <div style={{
              fontSize: isFirst ? 11 : 10,
              color: "#0d1825", lineHeight: 1.45,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {bundle.description}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {owned ? (
              <div style={{ padding: "6px 12px", borderRadius: 10, background: NM.bg, boxShadow: NM.in, fontSize: 12, fontWeight: 800, color: "#1a7a3f" }}>✓ Possédé</div>
            ) : bundle.price === 0 ? (
              <div style={{ padding: "8px 14px", borderRadius: 12, background: "linear-gradient(145deg, #16a34add, #15803daa)", boxShadow: "3px 3px 8px rgba(22,163,74,0.3)", fontSize: 14, fontWeight: 900, color: "white", fontFamily: "Rajdhani,sans-serif" }}>🎁 GRATUIT</div>
            ) : (
              <div style={{ padding: "8px 14px", borderRadius: 12, background: `linear-gradient(145deg, ${bundle.rarityColor}dd, ${bundle.rarityColor}99)`, boxShadow: `3px 3px 8px ${bundle.rarityGlow}`, fontSize: 14, fontWeight: 900, color: "white", fontFamily: "Rajdhani,sans-serif" }}>💎 {bundle.price.toLocaleString()}</div>
            )}
            <div style={{ fontSize: 10, color: "#0d1825", marginTop: 4, letterSpacing: "0.04em" }}>Appuyer pour voir ›</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {CATEGORIES.map((cat) => {
        const bundles = grouped[cat.key];
        if (!bundles || bundles.length === 0) return null;
        const isOpen = openCats[cat.key];
        const ownedCount = bundles.filter((b) => isBundleOwned(b.id, profile.ownedSkins)).length;
        return (
          <div key={cat.key} style={{ borderRadius: 16, overflow: "hidden" }}>
            {/* Category header */}
            <button onClick={() => toggleCat(cat.key)} style={{
              width: "100%", border: "none", cursor: "pointer",
              background: NM.card,
              boxShadow: isOpen ? NM.in : NM.sm,
              borderRadius: isOpen ? "16px 16px 0 0" : 16,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
              transition: "all 0.25s", fontFamily: "Rajdhani,sans-serif",
              borderLeft: `5px solid ${cat.color}`,
            }}>
              {/* Color dot with glow */}
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: cat.color,
                boxShadow: `0 0 10px ${cat.color}aa`,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 15, fontWeight: 900, color: "#0d1825",
                textTransform: "uppercase", letterSpacing: "0.1em",
                flex: 1, textAlign: "left",
              }}>
                {cat.icon} {cat.label}
              </span>
              <span style={{
                fontSize: 11, color: ownedCount > 0 ? "#1a7a3f" : "#0d1825",
                marginRight: 6, fontWeight: ownedCount > 0 ? 800 : 600,
              }}>
                {ownedCount > 0
                  ? `${ownedCount}/${bundles.length} possédé${ownedCount > 1 ? "s" : ""}`
                  : `${bundles.length} pack${bundles.length > 1 ? "s" : ""}`}
              </span>
              <span style={{
                fontSize: 16, color: cat.color, fontWeight: 900,
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.25s", display: "inline-block",
              }}>›</span>
            </button>

            {/* Bundle cards */}
            {isOpen && (
              <div style={{
                background: `${cat.color}08`,
                border: `1px solid ${cat.color}25`,
                borderTop: "none",
                borderRadius: "0 0 16px 16px",
                padding: "14px 12px 16px",
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                {bundles.map((bundle, i) => (
                  <BundleCard key={bundle.id} bundle={bundle} isFirst={i === 0} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShopScreen({ profile, onUpdate }) {
  const [tab, setTab] = useState("bundles");
  const [previewBundle, setPreviewBundle] = useState(null);

  // VIP — tout passe par le backend, jamais par le frontend
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQfZj75o0cd0Lv58NgEg00";

  async function startCheckout() {
    // Try backend first (when deployed)
    if (BACKEND_CONFIGURED) {
      const data = await backendFetch("/api/create-checkout", {
        method: "POST",
        body: JSON.stringify({ playerId: profile.id }),
      });
      if (data?.url) {
        window.open(data.url, "_blank");
        return;
      }
    }
    // Fallback: direct Stripe Payment Link (toujours fonctionnel)
    window.open(STRIPE_PAYMENT_LINK, "_blank");
  }

  async function syncVipStatus() {
    const data = await backendFetch(`/api/subscription/${profile.id}`);
    if (!data) return;
    let p = { ...profile };
    // Applique le statut VIP depuis le backend
    p.vip = data.vip === true;
    if (!p.vip) p.bat = Math.min(p.bat, 5);
    // Crédite les gemmes en attente si le backend en a prévu
    if (data.gems_to_credit > 0) {
      p.gems = p.gems + data.gems_to_credit;
      // Acquitte auprès du backend
      await backendFetch("/api/credit-gems-ack", {
        method: "POST",
        body: JSON.stringify({ playerId: profile.id }),
      });
    }
    saveProfile(p);
    authSaveProfile(p);
    onUpdate(p);
  }

  function buyTitle(title) {
    if (profile.gems < title.price) return;
    const ownedTitles = loadOwnedTitles();
    if (ownedTitles.includes(title.id)) return;
    ownedTitles.push(title.id);
    saveOwnedTitles(ownedTitles);
    const p = { ...profile, gems: profile.gems - title.price };
    saveProfile(p); onUpdate(p);
  }

  function equipTitle(title) {
    const p = { ...profile, title: title.label };
    saveProfile(p); onUpdate(p);
  }
  function buyBat(amount, cost) {
    if (profile.gems < cost) return;
    const p = { ...profile, bat: Math.min(profile.bat + amount, 999), gems: profile.gems - cost };
    saveProfile(p); onUpdate(p);
  }
  function buyBundle(bundle) {
    if (bundle.price > 0 && profile.gems < bundle.price) return;
    const newSkinIds = getBundleSkinIds(bundle.id).filter((id) => !profile.ownedSkins.includes(id));
    // If buying the "individuel" pack, also register all individual skin IDs
    const extraIds = bundle.id === "individuel"
      ? INDIVIDUAL_SKINS.map((s) => s.id).filter((id) => !profile.ownedSkins.includes(id))
      : [];
    const gemCost = bundle.price > 0 ? bundle.price : 0;
    const p = { ...profile, ownedSkins: [...profile.ownedSkins, ...newSkinIds, ...extraIds], gems: profile.gems - gemCost };
    saveProfile(p); onUpdate(p);
  }
  function equipBundleSkin(elementKey, skinId) {
    const p = { ...profile, equippedSkins: { ...profile.equippedSkins, [elementKey]: skinId } };
    saveProfile(p); onUpdate(p);
  }
  function buySingleSkin(skin) {
    if (profile.ownedSkins.includes(skin.id) || profile.gems < skin.price) return;
    const p = { ...profile, ownedSkins: [...profile.ownedSkins, skin.id], gems: profile.gems - skin.price };
    saveProfile(p); onUpdate(p);
  }

  const tabs = [
    { id: "bundles", label: "Packs",   icon: "📦" },
    { id: "titres",  label: "Titres",  icon: "🏷️" },
    { id: "abo",     label: "VIP",     icon: "👑" },
    { id: "bat",     label: "BAT",     icon: "⚡" },
    { id: "skins",   label: "Skins",   icon: "🎨" },
    { id: "cadres",  label: "Cadres",  icon: "🖼️" },
    { id: "versus",  label: "Versus",  icon: "⚔️" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: NM.bg, overflow: "hidden" }}>

      {previewBundle && (
        <BundlePreviewModal
          bundle={previewBundle}
          profile={profile}
          onClose={() => setPreviewBundle(null)}
          onBuy={buyBundle}
          onEquip={equipBundleSkin}
        />
      )}

      {/* ── STICKY HEADER ── */}
      <div style={{ flexShrink: 0, padding: "12px 16px 0", background: NM.bg }}>
        {/* Title + wallet */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 900, fontFamily: "monospace" }}>— Boutique —
          </div>
          <div style={{ display: "flex", gap: 8, background: NM.card, boxShadow: NM.in, borderRadius: 20, padding: "5px 14px", fontSize: 14, fontWeight: 800, color: "#0d1825" }}>
            <span>⚡ {profile.vip ? "∞" : profile.bat}</span>
            <span style={{ color: "rgba(160,175,195,0.4)" }}>·</span>
            <span style={{ color: "#c47f00" }}>💎 {profile.gems.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab nav — icon + label, compact */}
        <div style={{ display: "flex", background: NM.card, boxShadow: NM.in, borderRadius: 16, padding: "4px", gap: 2 }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, border: "none", cursor: "pointer", borderRadius: 13,
                padding: active ? "7px 4px" : "7px 2px",
                background: active ? NM.bg : "transparent",
                boxShadow: active ? NM.sm : "none",
                transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontSize: active ? 18 : 16, lineHeight: 1 }}>{t.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 900, fontFamily: "Rajdhani,sans-serif",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: active ? "#5b42c0" : "#0f1923",
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Thin separator */}
        <div style={{ height: 1, background: "rgba(160,175,195,0.2)", margin: "10px 0 0" }} />
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 16px 20px",
        display: "flex", flexDirection: "column", gap: 12,
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(160,175,195,0.4) transparent",
      }}>

        {tab === "bundles" && <BundleCatalog profile={profile} setPreviewBundle={setPreviewBundle} />}

        {tab === "titres" && (() => {
        const ownedTitles = loadOwnedTitles();
        const equippedTitle = PREMIUM_TITLES.find((t) => t.label === profile.title);

        // Group by rarity in display order
        const ORDER = ["GRATUIT","COMMUN","RARE","ÉPIQUE","LÉGENDAIRE","MYTHIQUE","DIVIN"];
        const grouped = {};
        PREMIUM_TITLES.forEach((t) => {
          if (!grouped[t.rarity]) grouped[t.rarity] = [];
          grouped[t.rarity].push(t);
        });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Currently equipped */}
            <div style={{ background: NM.card, boxShadow: NM.in, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🏷️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#0d1825", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontFamily: "monospace" }}>Titre équipé</div>
                <TitleDisplay title={profile.title} fontSize={15} />
              </div>
              <div style={{ fontSize: 11, color: "#0f1923" }}>{profile.gems} 💎</div>
            </div>

            {ORDER.map((rarity) => {
              const titles = grouped[rarity];
              if (!titles) return null;
              const rc = TITLE_RARITIES[rarity];
              return (
                <div key={rarity}>
                  {/* Rarity header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: rc.color, boxShadow: `0 0 6px ${rc.color}88` }} />
                    <span style={{ fontSize: 12, fontWeight: 900, color: rc.color, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>{rarity}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {titles.map((title) => {
                      const owned = ownedTitles.includes(title.id);
                      const isEquipped = profile.title === title.label;
                      const canBuy = !owned && profile.gems >= title.price;

                      return (
                        <div key={title.id} style={{
                          background: NM.card,
                          borderRadius: 14, padding: "12px 14px",
                          display: "flex", alignItems: "center", gap: 12,
                          opacity: !owned && !canBuy && title.price > 0 ? 0.7 : 1,
                          transition: "opacity 0.2s",
                          ...(isEquipped
                            ? { border: `2px solid ${rc.color}`, boxShadow: NM.in }
                            : owned
                            ? { border: "1px solid rgba(26,122,63,0.3)", boxShadow: NM.sm }
                            : getRarityBorderStyle(title.rarity)
                          ),
                        }}>
                          {/* Title preview */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <TitleDisplay title={title.label} fontSize={15} style={{ display: "block", marginBottom: 3 }} />
                            {title.price === 0 ? (
                              <span style={{ fontSize: 10, color: "#1a7a3f", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Gratuit</span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#0f1923", fontWeight: 600 }}>💎 {title.price.toLocaleString()} gemmes</span>
                            )}
                          </div>

                          {/* Action button */}
                          {isEquipped ? (
                            <div style={{ padding: "5px 10px", borderRadius: 10, background: NM.bg, boxShadow: NM.in, fontSize: 11, fontWeight: 800, color: "#1a7a3f", flexShrink: 0 }}>✓ Équipé</div>
                          ) : owned ? (
                            <button onClick={() => equipTitle(title)} style={{
                              padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 12, flexShrink: 0,
                              background: `linear-gradient(145deg, ${rc.color}dd, ${rc.color}99)`,
                              boxShadow: `3px 3px 8px ${rc.border}, -2px -2px 5px rgba(255,255,255,0.7)`,
                              color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 900,
                              letterSpacing: "0.06em", textTransform: "uppercase",
                            }}>Équiper</button>
                          ) : title.price === 0 ? (
                            <button onClick={() => { buyTitle(title); equipTitle(title); }} style={{
                              padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 12, flexShrink: 0,
                              background: "linear-gradient(145deg, #16a34add, #15803daa)",
                              boxShadow: "3px 3px 8px rgba(22,163,74,0.3)",
                              color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 900,
                            }}>🎁 Gratuit</button>
                          ) : canBuy ? (
                            <button onClick={() => buyTitle(title)} style={{
                              padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 12, flexShrink: 0,
                              background: `linear-gradient(145deg, ${rc.color}dd, ${rc.color}99)`,
                              boxShadow: `3px 3px 8px ${rc.border}`,
                              color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 900,
                              letterSpacing: "0.04em",
                            }}>💎 {title.price.toLocaleString()}</button>
                          ) : (
                            <div style={{ padding: "5px 10px", borderRadius: 10, background: NM.card, boxShadow: NM.in, fontSize: 10, fontWeight: 700, color: "#0d1825", flexShrink: 0, textAlign: "center" }}>
                              💎 {(title.price - profile.gems).toLocaleString()}<br />
                              <span style={{ fontSize: 9 }}>manquantes</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {tab === "abo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* VIP card */}
          <div style={{ background: NM.card, boxShadow: NM.out, borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #d4960a, #b07500)", padding: "4px 14px", borderBottomLeftRadius: 12, fontSize: 11, fontWeight: 900, color: "white", letterSpacing: "0.1em" }}>POPULAIRE</div>
            <div style={{ fontSize: 28, marginBottom: 6 }}>👑</div>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 26, color: "#c47f00", fontWeight: 900 }}>
              4,99<span style={{ fontSize: 16 }}>€</span><span style={{ fontSize: 14, color: "#0d1825", fontFamily: "Rajdhani,sans-serif" }}>{"/mois"}</span>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {["BAT illimités", "Matchmaking prioritaire", "Badge VIP exclusif", "💎 500 gemmes / mois"].map((b) => (
                <div key={b} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700, color: "#0d1825" }}>
                  <span style={{ color: "#1a7a3f", fontSize: 15 }}>✓</span> {b}
                </div>
              ))}
            </div>

            {/* Non abonné → bouton Stripe Checkout */}
            {!profile.vip && (
              <>
                <button onClick={startCheckout} style={{
                  width: "100%", marginTop: 18, padding: "14px 0", border: "none",
                  cursor: "pointer", borderRadius: 14,
                  background: "linear-gradient(145deg, #d4960a, #b07500)",
                  boxShadow: "4px 4px 12px rgba(180,120,0,0.35), -2px -2px 6px rgba(255,255,255,0.8)",
                  color: "white", fontFamily: "Rajdhani,sans-serif",
                  fontSize: 15, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
                }}>👑 S'abonner — 4,99€/mois</button>
                <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#0d1825" }}>
                  {'Paiement sécurisé Stripe · VIP activé automatiquement après confirmation'}
                </div>
                {/* Sync — le joueur revient après paiement */}
                <button onClick={syncVipStatus} style={{
                  width: "100%", marginTop: 10, padding: "9px 0", border: "none",
                  cursor: "pointer", borderRadius: 10, background: NM.bg, boxShadow: NM.sm,
                  color: "#5b42c0", fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 800,
                }}>🔄 Actualiser le statut VIP</button>
              </>
            )}

            {/* Abonné */}
            {profile.vip && (
              <div style={{ marginTop: 18, background: NM.bg, boxShadow: NM.in, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1a7a3f" }}>Abonnement VIP actif</div>
                  <div style={{ fontSize: 11, color: "#0d1825", marginTop: 2 }}>+500 💎 créditées automatiquement chaque mois</div>
                </div>
                <span style={{ fontSize: 22 }}>👑</span>
              </div>
            )}
          </div>

          {/* Gestion — portail Stripe uniquement */}
          {profile.vip && (
            <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(91,66,192,0.2)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0d1825", marginBottom: 4 }}>Gérer mon abonnement</div>
              <div style={{ fontSize: 12, color: "#0d1825", lineHeight: 1.5, marginBottom: 12 }}>Pour résilier, utilise le portail Stripe ci-dessous. Le VIP sera retiré automatiquement à la fin de la période.</div>
              <a href="https://billing.stripe.com/p/login/5kQfZj75o0cd0Lv58NgEg00" target="_blank" rel="noopener noreferrer" style={{
                display: "block", textDecoration: "none", textAlign: "center",
                width: "100%", padding: "13px 0", borderRadius: 12,
                background: "linear-gradient(145deg, #5b42c0, #4433a0)",
                boxShadow: "3px 3px 8px rgba(91,66,192,0.3), -2px -2px 5px rgba(255,255,255,0.7)",
                color: "white", fontFamily: "Rajdhani,sans-serif",
                fontSize: 14, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase",
              }}>⚙️ Portail Stripe — Gérer / Résilier</a>
              <button onClick={syncVipStatus} style={{
                width: "100%", marginTop: 8, padding: "9px 0", border: "none",
                cursor: "pointer", borderRadius: 10, background: NM.bg, boxShadow: NM.sm,
                color: "#5b42c0", fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 800,
              }}>🔄 Synchroniser le statut</button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingBottom: 4, opacity: 0.55 }}>
            {["🔒 SSL", "💳 Stripe", "🛡️ PCI DSS"].map((b) => (
              <span key={b} style={{ fontSize: 11, color: "#0d1825", fontWeight: 700 }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {tab === "bat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <NmCard style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: NM.card, boxShadow: NM.in, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>BAT actuels</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0d1825", lineHeight: 1 }}>{profile.vip ? "∞" : profile.bat}</div>
              <div style={{ fontSize: 11, color: "#0d1825", marginTop: 3 }}>Recharge gratuite +2 toutes les 24h</div>
            </div>
          </NmCard>
          <NmCard>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0d1825", marginBottom: 6 }}>Comment obtenir plus de BAT ?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#0d1825" }}>
                <span>⏱️</span><span>+2 BAT gratuits toutes les 24h</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#0d1825" }}>
                <span>👑</span><span>Abonnement VIP → BAT illimités</span>
              </div>
            </div>
          </NmCard>
        </div>
      )}

      {tab === "skins" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header */}
          <div style={{
            background: NM.card, boxShadow: NM.sm, borderRadius: 14,
            padding: "12px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0d1825", marginBottom: 4 }}>🗡️ Skins Individuels
            </div>
            <div style={{ fontSize: 12, color: "#0d1825", lineHeight: 1.4 }}>
              Achète chaque skin séparément ou obtiens le <b>Pack Individuel</b> pour les avoir tous.
            </div>
          </div>

          {/* Individual skin cards */}
          {INDIVIDUAL_SKINS.map((skin) => {
            const owned = profile.ownedSkins.includes(skin.id);
            const canBuy = !owned && profile.gems >= skin.price;
            const isEquipped = profile.equippedSkins?.[skin.element] === skin.id;
            const elInfo = ELEMENTS[skin.element];
            const img = getIndivImage(skin);

            return (
              <div key={skin.id} style={{
                background: NM.card,
                borderRadius: 16, overflow: "hidden",
                ...(owned
                  ? { border: "1px solid rgba(26,122,63,0.3)", boxShadow: NM.in }
                  : { border: `1px solid ${skin.color}44`, boxShadow: NM.sm }),
              }}>
                <div style={{ display: "flex", gap: 0 }}>
                  {/* Skin image */}
                  <div style={{
                    width: 90, height: 118, flexShrink: 0, position: "relative", overflow: "hidden",
                    borderRadius: "16px 0 0 16px",
                  }}>
                    <img src={img} alt={skin.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    {/* Element badge */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                      padding: "10px 6px 5px", textAlign: "center",
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {elInfo?.emoji} {elInfo?.name}
                      </span>
                    </div>
                    {owned && (
                      <div style={{
                        position: "absolute", top: 6, left: 6,
                        background: "rgba(26,122,63,0.9)", borderRadius: 8,
                        padding: "2px 6px", fontSize: 9, fontWeight: 900, color: "white",
                      }}>✓</div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#0d1825", marginBottom: 3, fontFamily: "'Cinzel Decorative',serif", fontSize: 13 }}>
                        {skin.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#0d1825", lineHeight: 1.4, marginBottom: 8 }}>
                        {skin.desc}
                      </div>
                      {/* Element pill */}
                      <div style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        background: `${skin.color}22`, border: `1px solid ${skin.color}55`,
                        fontSize: 10, fontWeight: 800, color: skin.color,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>
                        {elInfo?.emoji} {elInfo?.name}
                      </div>
                    </div>

                    {/* Action row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      {isEquipped ? (
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#1a7a3f" }}>⚡ Équipé</div>
                      ) : owned ? (
                        <button onClick={() => {
                          const p = { ...profile, equippedSkins: { ...profile.equippedSkins, [skin.element]: skin.id } };
                          saveProfile(p); onUpdate(p);
                        }} style={{
                          padding: "6px 14px", border: "none", cursor: "pointer", borderRadius: 10,
                          background: `linear-gradient(145deg, ${skin.color}dd, ${skin.color}99)`,
                          boxShadow: `3px 3px 8px ${skin.glowColor}`,
                          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                        }}>Équiper</button>
                      ) : (
                        <button onClick={() => {
                          if (!canBuy) return;
                          const p = { ...profile, gems: profile.gems - skin.price, ownedSkins: [...profile.ownedSkins, skin.id] };
                          saveProfile(p); onUpdate(p);
                        }} style={{
                          padding: "6px 14px", border: "none", cursor: canBuy ? "pointer" : "default", borderRadius: 10,
                          background: canBuy
                            ? `linear-gradient(145deg, ${skin.color}dd, ${skin.color}99)`
                            : NM.card,
                          boxShadow: canBuy ? `3px 3px 8px ${skin.glowColor}` : NM.in,
                          color: canBuy ? "white" : "#0d1825",
                          fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                          opacity: canBuy ? 1 : 0.7,
                        }}>
                          {canBuy ? `💎 ${skin.price}` : `💎 ${skin.price}`}
                        </button>
                      )}
                      <div style={{ fontSize: 11, color: "#0f1923" }}>
                        {owned ? (owned ? "✓ Possédé" : "") : `${skin.price} gemmes`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Legacy card skins */}
          <div style={{ fontSize: 11, color: "#0d1825", textAlign: "center", fontFamily: "monospace", marginTop: 6 }}>Skins de cartes classiques
          </div>
          {CARD_SKINS.filter((s) => s.price > 0).map((skin) => {
            const owned = profile.ownedSkins.includes(skin.id);
            return (
              <NmCard key={skin.id} style={{ display: "flex", alignItems: "center", gap: 12, opacity: owned ? 0.7 : 1 }}>
                <div style={{ width: 44, height: 56, borderRadius: 10, background: NM.card, boxShadow: NM.in, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🃏</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15, color: "#0d1825" }}>{skin.name}</div><div style={{ fontSize: 12, color: "#0d1825" }}>Skin de cartes</div></div>
                <button onClick={() => buySingleSkin(skin)} disabled={owned} style={{ padding: "8px 12px", border: "none", cursor: owned ? "default" : "pointer", borderRadius: 12, background: owned ? NM.card : NM.bg, boxShadow: owned ? NM.in : NM.sm, color: owned ? "#1a7a3f" : "#0d1825", fontFamily: "Rajdhani,sans-serif", fontSize: 13, fontWeight: 800 }}>
                  {owned ? "✓ Possédé" : `💎 ${skin.price}`}
                </button>
              </NmCard>
            );
          })}
        </div>
      )}

      {tab === "cadres" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header */}
          <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0d1825", marginBottom: 4 }}>🖼️ Cadres Premium</div>
            <div style={{ fontSize: 12, color: "#0f1923", lineHeight: 1.5 }}>Débloque des cadres exclusifs pour personnaliser ton avatar dans toute l'arène.</div>
          </div>

          {/* Rank frames — auto unlocked */}
          <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(160,175,195,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>🏆 Cadres de Rang</div>
              <div style={{ fontSize: 11, color: "#0f1923", marginTop: 2 }}>Débloqués automatiquement en montant de rang</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "14px" }}>
              {FRAME_RANK.map((frame) => {
                const ranks = ["Bronze","Argent","Or","Platine","Diamant","Master","Legend"];
                const playerRankIdx = ranks.indexOf(getRank(profile.rankPoints).name);
                const frameRankIdx  = ranks.indexOf(frame.rank);
                const unlocked = frameRankIdx <= playerRankIdx;
                const equipped = profile.equippedFrame === frame.id;
                return (
                  <div key={frame.id} onClick={() => {
                    if (!unlocked) return;
                    const p = { ...profile, equippedFrame: equipped ? null : frame.id };
                    saveProfile(p); authSaveProfile(p); onUpdate(p);
                  }} style={{
                    width: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    cursor: unlocked ? "pointer" : "default", opacity: unlocked ? 1 : 0.4,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%", position: "relative",
                      background: equipped ? frame.bg : NM.card,
                      boxShadow: equipped ? NM.in : NM.sm,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        position: "absolute", inset: -3, borderRadius: "50%",
                        border: frame.border, boxShadow: frame.glow,
                        animation: unlocked ? frame.animation : "none",
                      }} />
                      <span style={{ fontSize: 24, position: "relative", zIndex: 1 }}>{frame.icon}</span>
                      {equipped && <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: frame.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 900, zIndex: 2 }}>✓</div>}
                      {!unlocked && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: unlocked ? frame.color : "#0f1923", textAlign: "center", textShadow: unlocked ? `0 0 8px ${frame.color}66` : "none" }}>{frame.name}</div>
                    <div style={{ fontSize: 9, color: "#0f1923", textAlign: "center" }}>{unlocked ? (equipped ? "Équipé" : "Équiper") : frame.rank}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium frames */}
          <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(160,175,195,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>✨ Cadres Premium</div>
              <div style={{ fontSize: 11, color: "#0f1923", marginTop: 2 }}>Achetables avec gemmes · Prestige maximum</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {FRAME_PREMIUM.map((frame, idx) => {
                const owned = (profile.ownedFrames || []).includes(frame.id);
                const equipped = profile.equippedFrame === frame.id;
                const canBuy = !owned && profile.gems >= frame.price;
                return (
                  <div key={frame.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderBottom: idx < FRAME_PREMIUM.length - 1 ? "1px solid rgba(160,175,195,0.15)" : "none",
                    background: equipped ? `${frame.bg}` : "transparent",
                  }}>
                    {/* Frame preview circle */}
                    <div style={{ width: 60, height: 60, borderRadius: "50%", position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: NM.card, boxShadow: NM.sm }}>
                      <div style={{
                        position: "absolute", inset: -3, borderRadius: "50%",
                        border: frame.border, boxShadow: frame.glow,
                        animation: owned ? frame.animation : "none",
                        opacity: owned ? 1 : 0.5,
                      }} />
                      <span style={{ fontSize: 26, position: "relative", zIndex: 1 }}>{frame.icon}</span>
                      {equipped && <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: frame.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 900, zIndex: 2 }}>✓</div>}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#0d1825" }}>{frame.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 10,
                          background: `${frame.color}22`, color: frame.color,
                          border: `1px solid ${frame.color}44`,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                        }}>{frame.rarity}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#0f1923" }}>
                        {frame.id === "frame_galaxie"  && "Énergie cosmique · Étoiles brillantes"}
                        {frame.id === "frame_feu"      && "Flammes élégantes · Braises dorées"}
                        {frame.id === "frame_neon"     && "Lignes cyber · Holographique"}
                        {frame.id === "frame_demon"    && "Énergie rouge sombre · Mystérieux"}
                        {frame.id === "frame_ange"     && "Lumière céleste · Halo premium"}
                        {frame.id === "frame_cristal"  && "Cristaux purs · Éclats lumineux"}
                        {frame.id === "frame_ombre"    && "Énergie noire · Fumée sombre"}
                        {frame.id === "frame_tempete"  && "Foudre bleue · Énergie électrique"}
                        {frame.id === "frame_dragon"   && "Aura puissante · Écailles énergie"}
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      {owned && !equipped && (
                        <button onClick={() => {
                          const p = { ...profile, equippedFrame: frame.id };
                          saveProfile(p); authSaveProfile(p); onUpdate(p);
                        }} style={{
                          padding: "8px 14px", border: "none", cursor: "pointer", borderRadius: 12,
                          background: `linear-gradient(145deg, ${frame.color}dd, ${frame.color}99)`,
                          boxShadow: `3px 3px 8px ${frame.glow.split("rgba")[1] ? "rgba" + frame.glow.split("rgba")[1].split(")")[0] + ")" : frame.color + "44"}`,
                          color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                        }}>Équiper</button>
                      )}
                      {equipped && (
                        <div style={{ padding: "8px 12px", background: NM.bg, boxShadow: NM.in, borderRadius: 12, fontSize: 11, fontWeight: 800, color: "#1a7a3f" }}>✓ Équipé</div>
                      )}
                      {!owned && (
                        <button onClick={() => {
                          if (!canBuy) return;
                          const newOwned = [...(profile.ownedFrames || []), frame.id];
                          const p = { ...profile, gems: profile.gems - frame.price, ownedFrames: newOwned, equippedFrame: frame.id };
                          saveProfile(p); authSaveProfile(p); onUpdate(p);
                        }} style={{
                          padding: "9px 14px", border: "none", cursor: canBuy ? "pointer" : "default", borderRadius: 12,
                          background: canBuy
                            ? `linear-gradient(145deg, ${frame.color}dd, ${frame.color}99)`
                            : NM.card,
                          boxShadow: canBuy ? `3px 3px 8px ${frame.color}44` : NM.in,
                          color: canBuy ? "white" : "#4a5568",
                          fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                          opacity: canBuy ? 1 : 0.65,
                        }}>
                          {canBuy ? `💎 ${frame.price}` : `💎 ${frame.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "versus" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: NM.card, boxShadow: NM.sm, borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0d1825", marginBottom: 4 }}>⚔️ Skins Versus</div>
            <div style={{ fontSize: 12, color: "#0f1923", lineHeight: 1.5 }}>Personnalise ton apparition sur l'écran versus. Ces skins n'affectent pas le gameplay.</div>
          </div>

          {VERSUS_SKINS.map((skin, idx) => {
            const owned = skin.price === 0 || (profile.ownedVersusSkins || []).includes(skin.id);
            const equipped = (profile.equippedVersusSkin || "vs_default") === skin.id;
            const canBuy = !owned && profile.gems >= skin.price;
            const rarityColors = { COMMUN: "#4a5568", RARE: "#3b82f6", ÉPIQUE: "#8b5cf6", LÉGENDAIRE: "#f59e0b", MYTHIQUE: "#dc2626", DIVIN: "#ff0080" };
            const rc = rarityColors[skin.rarity] || "#4a5568";
            return (
              <div key={skin.id} style={{
                background: equipped ? `linear-gradient(135deg, ${skin.bg}, rgba(0,0,0,0.02))` : NM.card,
                boxShadow: equipped ? `${NM.in}, 0 0 0 1.5px ${skin.aura}` : NM.sm,
                borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                border: equipped ? `1.5px solid ${skin.aura}` : "1.5px solid transparent",
              }}>
                {/* Preview circle */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                  background: `radial-gradient(circle, ${skin.bg} 0%, rgba(0,0,0,0.15) 100%)`,
                  boxShadow: `0 0 16px 4px ${skin.aura}, ${NM.sm}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30, position: "relative",
                  animation: owned ? "vsOrb 2s ease-in-out infinite" : "none",
                  opacity: owned ? 1 : 0.5,
                }}>
                  {skin.icon}
                  {equipped && <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: skin.aura, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 900 }}>✓</div>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#0d1825" }}>{skin.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 10, background: `${rc}18`, color: rc, border: `1px solid ${rc}33`, textTransform: "uppercase", letterSpacing: "0.06em" }}>{skin.rarity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#0f1923", marginBottom: 4 }}>{skin.desc}</div>
                  <div style={{ fontSize: 10, color: skin.aura, fontWeight: 700, textShadow: `0 0 6px ${skin.aura}55` }}>Aura : {skin.icon}</div>
                </div>

                {/* Action */}
                <div style={{ flexShrink: 0 }}>
                  {owned && !equipped && (
                    <button onClick={() => {
                      const p = { ...profile, equippedVersusSkin: skin.id };
                      saveProfile(p); authSaveProfile(p); onUpdate(p);
                    }} style={{
                      padding: "9px 14px", border: "none", cursor: "pointer", borderRadius: 12,
                      background: `linear-gradient(145deg, ${skin.aura.replace("rgba","rgba").replace(/,[^)]+\)/, ",0.85)")} , ${skin.aura.replace(/,[^)]+\)/, ",0.6)")})`,
                      color: "white", fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                      boxShadow: `3px 3px 8px ${skin.aura}`,
                    }}>Équiper</button>
                  )}
                  {equipped && (
                    <div style={{ padding: "9px 12px", background: NM.bg, boxShadow: NM.in, borderRadius: 12, fontSize: 11, fontWeight: 800, color: "#1a7a3f" }}>✓ Actif</div>
                  )}
                  {!owned && (
                    <button onClick={() => {
                      if (!canBuy) return;
                      const newOwned = [...(profile.ownedVersusSkins || []), skin.id];
                      const p = { ...profile, gems: profile.gems - skin.price, ownedVersusSkins: newOwned, equippedVersusSkin: skin.id };
                      saveProfile(p); authSaveProfile(p); onUpdate(p);
                    }} style={{
                      padding: "9px 14px", border: "none", cursor: canBuy ? "pointer" : "default", borderRadius: 12,
                      background: canBuy ? `linear-gradient(145deg, ${skin.aura.replace(/,[^)]+\)/, ",0.8)")}, ${skin.aura.replace(/,[^)]+\)/, ",0.5)")})` : NM.card,
                      boxShadow: canBuy ? `3px 3px 8px ${skin.aura}` : NM.in,
                      color: canBuy ? "white" : "#4a5568",
                      fontFamily: "Rajdhani,sans-serif", fontSize: 12, fontWeight: 900,
                      opacity: canBuy ? 1 : 0.65,
                    }}>💎 {skin.price}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end scrollable */}
    </div>
  );
}


export default ShopScreen;
