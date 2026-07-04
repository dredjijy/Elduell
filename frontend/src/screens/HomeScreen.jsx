// screens/HomeScreen.jsx
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

function HomeScreen({ profile, onPlay, onPlayBot, onNavigate }) {
  const rank = getRank(profile.rankPoints);
  const batOk = profile.vip || profile.bat > 0;
  const ringRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);

  // ── Animated ring canvas ──────────────────────────────────
  useEffect(() => {
    const canvas = ringRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H;

    function resize() {
      W = canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();

    // Generate radial bars (like the reference image)
    const BAR_COUNT = 80;
    const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
      angle: (i / BAR_COUNT) * Math.PI * 2,
      baseH: 8 + Math.random() * 44,
      speed: 0.0004 + Math.random() * 0.0006,
      phase: Math.random() * Math.PI * 2,
    }));

    // 3 concentric ring layers
    const ringLayers = [
      { rFactor: 0.36, w: 14, shadow: 8 },
      { rFactor: 0.33, w: 7,  shadow: 5 },
      { rFactor: 0.30, w: 3,  shadow: 3 },
    ];

    function render(ts) {
      const t = ts;
      timeRef.current = t;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      const cx = cw / 2, cy = ch / 2;
      const baseR = Math.min(cw, ch) * 0.36;

      // ── Background ──────────────────────────────────────
      ctx.fillStyle = "#e8ecf0";
      ctx.fillRect(0, 0, cw, ch);

      // Subtle dot grid
      ctx.fillStyle = "rgba(160,170,185,0.35)";
      const gridStep = 22;
      for (let gx = gridStep / 2; gx < cw; gx += gridStep) {
        for (let gy = gridStep / 2; gy < ch; gy += gridStep) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Concentric rings (neumorphic) ───────────────────
      ringLayers.forEach((layer) => {
        const r = baseR * (layer.rFactor / 0.36);

        // Outer shadow
        ctx.shadowColor = "rgba(120,130,145,0.4)";
        ctx.shadowBlur  = layer.shadow;
        ctx.shadowOffsetX = layer.shadow * 0.6;
        ctx.shadowOffsetY = layer.shadow * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "#dde3ea";
        ctx.lineWidth   = layer.w;
        ctx.stroke();
        ctx.shadowColor = "transparent";

        // Inner highlight
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI * 0.6, Math.PI * 0.2);
        const highlightGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        highlightGrad.addColorStop(0, "rgba(255,255,255,0.9)");
        highlightGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = highlightGrad;
        ctx.lineWidth   = layer.w * 0.5;
        ctx.stroke();
      });

      // ── Radial bars ─────────────────────────────────────
      const barR   = baseR * 1.01;
      const gapR   = baseR * 0.90;

      bars.forEach((bar) => {
        const wave   = 0.5 + 0.5 * Math.sin(t * bar.speed + bar.phase);
        const h      = bar.baseH * (0.4 + 0.6 * wave);
        const dx     = Math.cos(bar.angle);
        const dy     = Math.sin(bar.angle);

        const x1 = cx + dx * gapR;
        const y1 = cy + dy * gapR;
        const x2 = cx + dx * (barR + h);
        const y2 = cy + dy * (barR + h);

        // Bar gradient — white core, soft shadow base
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        const alpha = 0.25 + 0.55 * wave;
        grad.addColorStop(0,   `rgba(190,200,215,${alpha * 0.4})`);
        grad.addColorStop(0.4, `rgba(220,228,238,${alpha})`);
        grad.addColorStop(1,   `rgba(255,255,255,${alpha * 0.8})`);

        ctx.shadowColor   = `rgba(140,155,175,${0.3 * wave})`;
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = "round";
        ctx.stroke();
        ctx.shadowColor = "transparent";
      });

      // ── Opening gap (like the ref — top-right open arc) ─
      // Clear a gap in the ring (~60 degrees at top-right)
      const gapStart = -Math.PI * 0.12;
      const gapEnd   = Math.PI * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, baseR + 60, gapStart, gapEnd);
      ctx.closePath();
      ctx.fillStyle = "#e8ecf0";
      ctx.fill();
      ctx.restore();

      // ── Inner filled disc (depth illusion) ─────────────
      const discGrad = ctx.createRadialGradient(cx - baseR * 0.1, cy - baseR * 0.1, 0, cx, cy, baseR * 0.88);
      discGrad.addColorStop(0,   "#f4f6f9");
      discGrad.addColorStop(0.6, "#edf0f5");
      discGrad.addColorStop(1,   "#e2e7ef");
      ctx.shadowColor   = "rgba(120,135,155,0.25)";
      ctx.shadowBlur    = 20;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = discGrad;
      ctx.fill();
      ctx.shadowColor = "transparent";

      // ── Inner highlight ring ────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.88, -Math.PI * 0.8, Math.PI * 0.1);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth   = 3;
      ctx.stroke();

      // ── Subtle scan line inside disc ────────────────────
      const scanY = cy - baseR * 0.3 + (baseR * 0.6) * ((t * 0.0002) % 1);
      const scanGrad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, "rgba(100,120,180,0.06)");
      scanGrad.addColorStop(1, "transparent");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.88, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = scanGrad;
      ctx.fillRect(cx - baseR, scanY - 8, baseR * 2, 16);
      ctx.restore();

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="screen" style={{
      alignItems: "center", justifyContent: "flex-start",
      padding: 0, gap: 0, position: "relative",
      background: "#e8ecf0", overflowY: "auto",
    }}>

      {/* ── RING HERO ─────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1.05", flexShrink: 0, maxHeight: 360 }}>
        {/* Canvas ring */}
        <canvas ref={ringRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

        {/* Center text overlay — like "INVESTMENTS" in the ref */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 4, zIndex: 2,
        }}>
          {/* Avatar inside ring */}
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(145deg, #f0f3f7, #dde3ea)",
            boxShadow: "4px 4px 10px rgba(120,130,145,0.3), -3px -3px 8px rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 6,
            border: `2px solid ${rank.color}44`,
          }}><AvatarDisplay avatar={profile.avatar} size={32} /></div>

          {/* Title */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 300, fontSize: 22, letterSpacing: "0.25em",
            color: "#0d1825", textTransform: "uppercase",
          }}>ELDUEL</div>

          {/* Thin separator */}
          <div style={{ width: 40, height: 1, background: "rgba(80,100,130,0.25)", margin: "2px 0" }} />

          {/* Player name */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5a6880", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {profile.name}
          </div>

          {/* Rank */}
          <div style={{ fontSize: 12, color: rank.color, fontWeight: 700, letterSpacing: "0.08em" }}>
            {rank.icon} {rank.name}
          </div>

          {/* Data readouts — like the ref annotations */}
          <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
            {[
              { label: "VICTOIRES", val: profile.wins },
              { label: "RANG", val: profile.rankPoints },
              { label: "BAT", val: profile.vip ? "∞" : profile.bat },
            ].map((d, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1825", lineHeight: 1 }}>{d.val}</div>
                <div style={{ fontSize: 9, color: "#0d1825", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2, fontWeight: 800 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Corner data labels — like the ref floating annotations */}
        {[
          { text: `PARTIES — ${profile.gamesPlayed}`, top: "14%", left: "80%", align: "left" },
          { text: `${rank.name.toUpperCase()} · ${profile.rankPoints}pts`, top: "74%", left: "80%", align: "left" },
          { text: `DÉFAITES — ${profile.losses}`, top: "74%", left: "4%", align: "left" },
        ].map((ann, i) => (
          <div key={i} style={{
            position: "absolute", top: ann.top, left: ann.left,
            fontSize: 9, color: "#0d1825", letterSpacing: "0.08em",
            textTransform: "uppercase", fontFamily: "monospace", fontWeight: 800,
            lineHeight: 1.6, zIndex: 3, pointerEvents: "none",
            maxWidth: "30%", wordBreak: "break-word",
          }}>
            {ann.text.split("·").map((line, j) => <div key={j}>{line.trim()}</div>)}
          </div>
        ))}

        {/* VIP badge */}
        {profile.vip && (
          <div style={{
            position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#1a1a00", fontSize: 10, fontWeight: 900,
            padding: "3px 10px", borderRadius: 20, letterSpacing: "0.1em",
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)", zIndex: 3,
          }}>VIP</div>
        )}
      </div>

      {/* ── PLAY BUTTONS ──────────────────────────────────── */}
      <div style={{ width: "100%", padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Multiplay button */}
        <button
          disabled={!batOk}
          onClick={onPlay}
          style={{
            width: "100%", border: "none", cursor: batOk ? "pointer" : "not-allowed",
            borderRadius: 16, padding: "16px 20px",
            background: batOk
              ? "linear-gradient(145deg, #f0f3f7, #dde3ea)"
              : "linear-gradient(145deg, #e8eaed, #d8dadd)",
            boxShadow: batOk
              ? "5px 5px 12px rgba(120,135,155,0.35), -4px -4px 10px rgba(255,255,255,0.9)"
              : "inset 3px 3px 7px rgba(120,135,155,0.2), inset -2px -2px 5px rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", gap: 14,
            transition: "all 0.2s", fontFamily: "Rajdhani,sans-serif",
            opacity: batOk ? 1 : 0.55,
          }}
          onMouseDown={e => batOk && (e.currentTarget.style.boxShadow = "inset 4px 4px 9px rgba(120,135,155,0.3), inset -2px -2px 6px rgba(255,255,255,0.8)")}
          onMouseUp={e => batOk && (e.currentTarget.style.boxShadow = "5px 5px 12px rgba(120,135,155,0.35), -4px -4px 10px rgba(255,255,255,0.9)")}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(145deg, #e8ebf0, #d5dae3)",
            boxShadow: "3px 3px 7px rgba(120,135,155,0.3), -2px -2px 6px rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>⚔️</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0d1825", letterSpacing: "0.08em", textTransform: "uppercase" }}>Jouer en ligne
            </div>
            <div style={{ fontSize: 12, color: batOk ? "#0f1923" : "#c05050", marginTop: 2, letterSpacing: "0.04em" }}>
              {!batOk ? "0 BAT — Recharge ou abonne-toi" : `Consomme 1 BAT · Restant : ${profile.vip ? "∞" : profile.bat}`}
            </div>
          </div>
          {batOk && (
            <div style={{ fontSize: 18, color: "#0d1825", fontWeight: 300 }}>›</div>
          )}
        </button>

        {/* Bot button */}
        <button
          onClick={onPlayBot}
          style={{
            width: "100%", border: "none", cursor: "pointer",
            borderRadius: 16, padding: "16px 20px",
            background: "linear-gradient(145deg, #f0f3f7, #dde3ea)",
            boxShadow: "5px 5px 12px rgba(120,135,155,0.35), -4px -4px 10px rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", gap: 14,
            transition: "all 0.2s", fontFamily: "Rajdhani,sans-serif",
          }}
          onMouseDown={e => (e.currentTarget.style.boxShadow = "inset 4px 4px 9px rgba(120,135,155,0.3), inset -2px -2px 6px rgba(255,255,255,0.8)")}
          onMouseUp={e => (e.currentTarget.style.boxShadow = "5px 5px 12px rgba(120,135,155,0.35), -4px -4px 10px rgba(255,255,255,0.9)")}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(145deg, #e8ebf0, #d5dae3)",
            boxShadow: "3px 3px 7px rgba(120,135,155,0.3), -2px -2px 6px rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🤖</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0d1825", letterSpacing: "0.08em", textTransform: "uppercase" }}>Jouer contre un bot
            </div>
            <div style={{ fontSize: 12, color: "#0d1825", marginTop: 2, letterSpacing: "0.04em" }}>Gratuit · Sans BAT
            </div>
          </div>
          <div style={{ fontSize: 18, color: "#0d1825", fontWeight: 300 }}>›</div>
        </button>
      </div>

      {/* ── ELEMENTS RING DISPLAY ─────────────────────────── */}
      <div style={{
        width: "calc(100% - 40px)", margin: "10px 20px 0",
        background: "linear-gradient(145deg, #f0f3f7, #dde3ea)",
        boxShadow: "inset 3px 3px 7px rgba(120,135,155,0.2), inset -2px -2px 5px rgba(255,255,255,0.8)",
        borderRadius: 16, padding: "12px 16px",
      }}>
        <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 900, marginBottom: 10 }}>5 ÉLÉMENTS
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {Object.entries(ELEMENTS).map(([k, el]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "linear-gradient(145deg, #f0f3f7, #dde3ea)",
                boxShadow: `3px 3px 7px rgba(120,135,155,0.3), -2px -2px 5px rgba(255,255,255,0.9), 0 0 0 1.5px ${el.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{el.emoji}</div>
              <span style={{ fontSize: 10, color: el.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{el.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────── */}
      <div style={{
        width: "calc(100% - 40px)", margin: "10px 20px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
      }}>
        {[
          { label: "VICTOIRES", val: profile.wins,        accent: "#2d7a1f" },
          { label: "DÉFAITES",  val: profile.losses,       accent: "#c0392b" },
          { label: "PARTIES",   val: profile.gamesPlayed,  accent: "#5a6880" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "linear-gradient(145deg, #f0f3f7, #dde3ea)",
            boxShadow: "3px 3px 8px rgba(120,135,155,0.28), -2px -2px 6px rgba(255,255,255,0.85)",
            borderRadius: 12, padding: "10px 6px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4, fontWeight: 800 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}


export default HomeScreen;
