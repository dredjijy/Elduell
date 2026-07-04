// screens/LeaderboardScreen.jsx
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

function LeaderboardScreen({ profile }) {
  const [liveBoard, setLiveBoard] = useState(null);

  useEffect(() => {
    backendFetch('/api/leaderboard').then(data => {
      if (data?.leaderboard) {
        setLiveBoard(data.leaderboard.map(p => ({
          id: p.id, name: p.username, avatar: p.avatar, title: p.title,
          rankPoints: p.rank_points, wins: p.wins, losses: p.losses,
          draws: p.draws, vip: p.vip, equippedFrame: p.equipped_frame,
        })));
      }
    }).catch(() => {});
  }, []);

  const rank = getRank(profile.rankPoints);
  const fakeLeaders = [
    { name: "LegendKira",  avatar: "🌙", rankPoints: 2340, title: "Immortel" },
    { name: "AquaLord",    avatar: "🌊", rankPoints: 1890, title: "Champion" },
    { name: "EtherKnight", avatar: "🔮", rankPoints: 1450, title: "Guerrier" },
    { name: "FireMaster",  avatar: "🔥", rankPoints: 1200, title: "Combattant" },
    { name: "ShadowBlade", avatar: "👁️", rankPoints: 980,  title: "Duelliste" },
    { name: "TerraFury",   avatar: "🐉", rankPoints: 820,  title: "Champion" },
    { name: "StormRider",  avatar: "⚔️", rankPoints: 650,  title: "Guerrier" },
    { name: profile.name,  avatar: profile.avatar, rankPoints: profile.rankPoints, title: profile.title, isMe: true },
    { name: "IceBreaker",  avatar: "🛡️", rankPoints: 310,  title: "Novice" },
    { name: "VoidWalker",  avatar: "💀", rankPoints: 180,  title: "Novice" },
  ].sort((a, b) => b.rankPoints - a.rankPoints);

  return (
    <div className="screen" style={{ background: NM.bg, padding: "16px", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#0d1825", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 800, fontFamily: "monospace" }}>— Classement —
      </div>

      {/* Rank system */}
      <NmCard>
        <SectionLabel>Système de rang</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {RANKS.map((r) => {
            const isMe = r.name === rank.name;
            return (
              <div key={r.name} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                borderRadius: 10, background: isMe ? NM.card : "transparent",
                boxShadow: isMe ? NM.in : "none",
              }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <span style={{ color: r.color, fontWeight: 800, fontSize: 14, width: 65 }}>{r.name}</span>
                <span style={{ fontSize: 12, color: "#0d1825" }}>{r.max === Infinity ? `${r.min}+` : `${r.min}–${r.max}`} pts</span>
                {isMe && <span style={{ marginLeft: "auto", fontSize: 11, color: r.color, fontWeight: 800 }}>◀ Toi</span>}
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: 10, fontSize: 12, color: "#0d1825",
          borderTop: "1px solid rgba(160,175,195,0.3)", paddingTop: 8,
        }}>✅ Victoire +10 · ❌ Défaite −5 · 🤝 Égalité +5
        </div>
      </NmCard>

      {/* Leaderboard list */}
      <NmCard style={{ padding: 0, overflow: "hidden" }}>
        {fakeLeaders.map((player, i) => {
          const pr = getRank(player.rankPoints);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              borderBottom: i < fakeLeaders.length - 1 ? "1px solid rgba(160,175,195,0.25)" : "none",
              background: player.isMe ? "rgba(91,66,192,0.06)" : "transparent",
            }}>
              <div style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 18 : 12, fontWeight: 800, color: "#0d1825" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: NM.card, boxShadow: NM.sm,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{player.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: player.isMe ? "#5b42c0" : "#0d1825", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {player.name}{player.isMe && " (Toi)"}
                </div>
                <div style={{ fontSize: 11 }}><TitleDisplay title={player.title} fontSize={10} /></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: pr.color, fontSize: 13, fontWeight: 800 }}>{pr.icon} {pr.name}</div>
                <div style={{ fontSize: 11, color: "#0d1825" }}>{player.rankPoints} pts</div>
              </div>
            </div>
          );
        })}
      </NmCard>
      <div style={{ height: 8 }} />
    </div>
  );
}


export default LeaderboardScreen;
