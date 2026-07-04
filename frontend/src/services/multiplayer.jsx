// services/multiplayer.js
// PvP Realtime via Supabase channels + VIP video utilities

import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase, backendFetch } from './global.js';

// ════════════════════════════════════════════════════════════
// VIP VIDEO
// ════════════════════════════════════════════════════════════
const VIP_VIDEO_KEY = 'elduel_vip_video';

export function loadVipVideo() {
  try { return localStorage.getItem(VIP_VIDEO_KEY); } catch { return null; }
}
export function saveVipVideo(dataUrl) {
  try { localStorage.setItem(VIP_VIDEO_KEY, dataUrl); return true; } catch { return false; }
}
export function clearVipVideo() {
  try { localStorage.removeItem(VIP_VIDEO_KEY); } catch {}
}
export async function validateVipVideo(file) {
  if (!file) return { ok: false, error: 'Aucun fichier' };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'Fichier trop lourd (max 10 MB)' };
  if (!file.type.startsWith('video/')) return { ok: false, error: 'Format vidéo requis' };
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ ok: true, dataUrl: e.target.result });
    reader.onerror = () => resolve({ ok: false, error: 'Erreur de lecture' });
    reader.readAsDataURL(file);
  });
}

export function VipVideoPlayer({ dataUrl, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && dataUrl) {
      ref.current.src = dataUrl;
      ref.current.play().catch(() => {});
    }
  }, [dataUrl]);
  if (!dataUrl) return null;
  return (
    <video ref={ref} autoPlay muted loop playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  );
}

// ════════════════════════════════════════════════════════════
// MATCHMAKING + PvP REALTIME
// ════════════════════════════════════════════════════════════

/**
 * useMatchmaking — gère la file d'attente PvP et la connection Realtime
 *
 * Usage dans MatchmakingScreen:
 *   const { status, roomId, opponent, cancel } = useMatchmaking(profile);
 *
 * status: 'searching' | 'matched' | 'error'
 */
export function useMatchmaking(profile) {
  const [status,   setStatus]   = useState('searching');
  const [roomId,   setRoomId]   = useState(null);
  const [opponent, setOpponent] = useState(null);
  const channelRef = useRef(null);
  const pollingRef = useRef(null);

  const cancel = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    clearInterval(pollingRef.current);
    if (profile?.id) {
      await backendFetch('/api/matchmaking/cancel', {
        method: 'POST',
        body: JSON.stringify({ playerId: profile.id }),
      }).catch(() => {
        // Fallback direct Supabase
        supabase.from('matchmaking_queue').delete().eq('player_id', profile.id);
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const playerData = {
      id:            profile.id,
      name:          profile.name,
      avatar:        profile.avatar,
      title:         profile.title,
      rankPoints:    profile.rankPoints,
      equippedFrame: profile.equippedFrame,
      vip:           profile.vip,
    };

    async function joinQueue() {
      // Try backend first (handles matchmaking logic server-side)
      const data = await backendFetch('/api/matchmaking/join', {
        method: 'POST',
        body: JSON.stringify({ playerId: profile.id, playerData }),
      });

      if (data?.status === 'matched') {
        setRoomId(data.roomId);
        setOpponent(data.opponentData);
        setStatus('matched');
        return;
      }

      // Backend unavailable → use Supabase directly
      if (!data) {
        await supabase.from('matchmaking_queue').upsert({
          player_id:   profile.id,
          player_data: playerData,
          status:      'waiting',
        }, { onConflict: 'player_id' });
      }

      // Subscribe to Realtime changes on matchmaking_queue for this player
      const channel = supabase
        .channel(`mmq_${profile.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `player_id=eq.${profile.id}`,
        }, (payload) => {
          const row = payload.new;
          if (row.status === 'matched' && row.room_id) {
            setRoomId(row.room_id);
            setStatus('matched');
            // Fetch opponent info
            supabase.from('pvp_rooms').select('*').eq('id', row.room_id).single().then(({ data: room }) => {
              if (room) {
                const oppData = room.player_a_id === profile.id ? room.player_b_data : room.player_a_data;
                setOpponent(oppData);
              }
            });
          }
        })
        .subscribe();

      channelRef.current = channel;

      // Polling fallback (every 2s) if Realtime doesn't fire
      pollingRef.current = setInterval(async () => {
        const statusData = await backendFetch(`/api/matchmaking/status/${profile.id}`);
        if (statusData?.status === 'matched' && statusData.roomId) {
          setRoomId(statusData.roomId);
          setStatus('matched');
          clearInterval(pollingRef.current);
        } else if (!statusData) {
          // Direct Supabase check
          const { data: row } = await supabase
            .from('matchmaking_queue').select('*').eq('player_id', profile.id).single();
          if (row?.status === 'matched' && row.room_id) {
            setRoomId(row.room_id);
            setStatus('matched');
            clearInterval(pollingRef.current);
          }
        }
      }, 2000);
    }

    joinQueue();

    return () => {
      cancel();
    };
  }, [profile?.id]);

  return { status, roomId, opponent, cancel };
}

/**
 * usePvpRoom — synchronise l'état du jeu PvP en Realtime
 *
 * Usage dans GameScreen en mode PvP:
 *   const { gameState, submitChoice } = usePvpRoom(roomId, profile.id);
 */
export function usePvpRoom(roomId, playerId) {
  const [gameState,  setGameState]  = useState(null);
  const [roomData,   setRoomData]   = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    // Load initial state
    supabase.from('pvp_rooms').select('*').eq('id', roomId).single().then(({ data }) => {
      if (data) {
        setRoomData(data);
        setGameState(data.game_state);
      }
    });

    // Subscribe to Realtime updates
    const channel = supabase
      .channel(`pvp_${roomId}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'pvp_rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const updated = payload.new;
        setRoomData(updated);
        setGameState(updated.game_state);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const submitChoice = useCallback(async (element) => {
    if (!roomId || !playerId) return;

    // Try backend
    const data = await backendFetch(`/api/room/${roomId}/choice`, {
      method: 'POST',
      body: JSON.stringify({ playerId, element }),
    });

    if (!data) {
      // Fallback: update Supabase directly
      const { data: room } = await supabase.from('pvp_rooms').select('*').eq('id', roomId).single();
      if (!room) return;
      const gs = { ...room.game_state };
      const isA = room.player_a_id === playerId;
      if (isA)  gs.playerAchoice = element;
      else      gs.playerBchoice = element;
      await supabase.from('pvp_rooms').update({ game_state: gs }).eq('id', roomId);
    }
  }, [roomId, playerId]);

  return { gameState, roomData, submitChoice };
}

/**
 * useOnlinePlayers — compteur de joueurs connectés
 */
export function useOnlinePlayers() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('online_players')
      .on('presence', { event: 'sync' }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  return count;
}
