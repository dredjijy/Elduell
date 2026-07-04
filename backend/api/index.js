// backend/api/index.js
// ELDUEL API complète — Auth + Profil + PvP + Stripe + Supabase
// Déployable sur Vercel (serverless) ou Railway (serveur)

require('dotenv').config();
const express         = require('express');
const cors            = require('cors');
const Stripe          = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// ── Init ─────────────────────────────────────────────────────
const app    = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rlmjpmauqsfjqgoynjyw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service_role — jamais exposé au frontend
);

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(u => u.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => o === '*' || o === origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Stripe webhook needs raw body BEFORE express.json() ──────
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── API Secret guard ─────────────────────────────────────────
function requireSecret(req, res, next) {
  if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Token auth guard ─────────────────────────────────────────
async function requireToken(req, res, next) {
  const token = req.headers['x-session-token'] || req.body?.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  const { data: session } = await supabase
    .from('sessions')
    .select('player_id, expires_at')
    .eq('token', token)
    .single();
  if (!session || new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Session expirée' });
  }
  req.playerId = session.player_id;
  next();
}

// ── Hash password (FNV-1a — même algo que frontend) ──────────
function hashPassword(pw) {
  let h = 0x811c9dc5;
  for (let i = 0; i < pw.length; i++) {
    h ^= pw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function sanitize(p) {
  if (!p) return null;
  const { password_hash, ...safe } = p;
  return safe;
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', requireSecret, async (req, res) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  const slug = username.trim().toLowerCase();
  if (slug.length < 3)         return res.status(400).json({ error: 'Pseudo trop court (min 3)' });
  if (slug.length > 20)        return res.status(400).json({ error: 'Pseudo trop long (max 20)' });
  if (!/^[a-z0-9_]+$/.test(slug)) return res.status(400).json({ error: 'Lettres, chiffres et _ uniquement' });
  if (password.length < 4)     return res.status(400).json({ error: 'Mot de passe min 4 caractères' });

  const { data: existing } = await supabase
    .from('players').select('id').eq('username_slug', slug).single();
  if (existing) return res.status(400).json({ error: 'Ce pseudo est déjà pris' });

  const { data: player, error } = await supabase
    .from('players')
    .insert({ username: username.trim(), username_slug: slug, password_hash: hashPassword(password), avatar: avatar || '⚔️' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { data: session } = await supabase
    .from('sessions').insert({ player_id: player.id }).select().single();

  res.json({ ok: true, token: session.token, player: sanitize(player) });
});

// POST /api/auth/login
app.post('/api/auth/login', requireSecret, async (req, res) => {
  const { username, password } = req.body;
  const slug = (username || '').trim().toLowerCase();

  const { data: player } = await supabase
    .from('players').select('*').eq('username_slug', slug).single();
  if (!player) return res.status(400).json({ error: 'Compte introuvable' });
  if (player.password_hash !== hashPassword(password))
    return res.status(400).json({ error: 'Mot de passe incorrect' });

  // Clean old sessions
  await supabase.from('sessions').delete()
    .eq('player_id', player.id).lt('expires_at', new Date().toISOString());

  const { data: session } = await supabase
    .from('sessions').insert({ player_id: player.id }).select().single();

  res.json({ ok: true, token: session.token, player: sanitize(player) });
});

// POST /api/auth/session — validate token
app.post('/api/auth/session', requireSecret, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: session } = await supabase
    .from('sessions').select('*, players(*)').eq('token', token)
    .gt('expires_at', new Date().toISOString()).single();

  if (!session) return res.status(401).json({ error: 'Session expirée' });

  // Mark online
  await supabase.from('players').update({ is_online: true, last_seen: new Date() })
    .eq('id', session.player_id);

  res.json({ ok: true, player: sanitize(session.players) });
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireSecret, async (req, res) => {
  const { token, playerId } = req.body;
  if (token) await supabase.from('sessions').delete().eq('token', token);
  if (playerId) {
    await supabase.from('players').update({ is_online: false, last_seen: new Date() }).eq('id', playerId);
    // Remove from matchmaking
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
  }
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// PROFIL
// ════════════════════════════════════════════════════════════

// GET /api/player/:id
app.get('/api/player/:id', requireSecret, async (req, res) => {
  const { data, error } = await supabase
    .from('players').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Joueur introuvable' });
  res.json({ player: sanitize(data) });
});

// PATCH /api/player/:id — sync profile from frontend
app.patch('/api/player/:id', requireSecret, async (req, res) => {
  const allowed = [
    'avatar','title','rank_points','gems','bat','wins','losses','draws','games_played',
    'equipped_frame','equipped_versus_skin','equipped_skins',
    'owned_skins','owned_frames','owned_versus_skins','last_bat_recharge',
  ];
  const update = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const { data, error } = await supabase
    .from('players').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, player: sanitize(data) });
});

// GET /api/leaderboard
app.get('/api/leaderboard', requireSecret, async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('id,username,avatar,title,rank_points,wins,losses,draws,vip,equipped_frame,is_online')
    .order('rank_points', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ leaderboard: data });
});

// ════════════════════════════════════════════════════════════
// MATCHMAKING REALTIME (via Supabase — backend sert de coordinateur)
// ════════════════════════════════════════════════════════════

// POST /api/matchmaking/join — joueur rejoint la file
app.post('/api/matchmaking/join', requireSecret, async (req, res) => {
  const { playerId, playerData } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId requis' });

  // Remove existing entry
  await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);

  // Add to queue
  await supabase.from('matchmaking_queue').insert({
    player_id: playerId,
    player_data: playerData,
    status: 'waiting',
  });

  // Try to find a match: oldest waiting player != me
  const { data: opponents } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('status', 'waiting')
    .neq('player_id', playerId)
    .order('joined_at', { ascending: true })
    .limit(1);

  if (opponents && opponents.length > 0) {
    const opponent = opponents[0];

    // Create PvP room
    const { data: room } = await supabase
      .from('pvp_rooms')
      .insert({
        player_a_id:   opponent.player_id,
        player_b_id:   playerId,
        player_a_data: opponent.player_data,
        player_b_data: playerData,
        status: 'playing',
        game_state: {
          phase: 'choose', round: 1,
          playerAhp: 5, playerBhp: 5,
          playerAchoice: null, playerBchoice: null,
          playerAstreak: 0, playerBstreak: 0,
          roundResults: [], winner: null,
        },
      })
      .select().single();

    // Mark both as matched
    await supabase.from('matchmaking_queue').update({ status: 'matched', room_id: room.id })
      .in('player_id', [playerId, opponent.player_id]);

    return res.json({ ok: true, status: 'matched', roomId: room.id, opponentData: opponent.player_data });
  }

  res.json({ ok: true, status: 'waiting' });
});

// POST /api/matchmaking/cancel
app.post('/api/matchmaking/cancel', requireSecret, async (req, res) => {
  const { playerId } = req.body;
  await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
  res.json({ ok: true });
});

// GET /api/matchmaking/status/:playerId
app.get('/api/matchmaking/status/:playerId', requireSecret, async (req, res) => {
  const { data } = await supabase
    .from('matchmaking_queue').select('*').eq('player_id', req.params.playerId).single();
  if (!data) return res.json({ status: 'not_in_queue' });
  res.json({ status: data.status, roomId: data.room_id });
});

// ════════════════════════════════════════════════════════════
// PVP GAME STATE
// ════════════════════════════════════════════════════════════

// GET /api/room/:roomId
app.get('/api/room/:roomId', requireSecret, async (req, res) => {
  const { data, error } = await supabase
    .from('pvp_rooms').select('*').eq('id', req.params.roomId).single();
  if (error) return res.status(404).json({ error: 'Room not found' });
  res.json({ room: data });
});

// POST /api/room/:roomId/choice — joueur soumet son élément
app.post('/api/room/:roomId/choice', requireSecret, async (req, res) => {
  const { playerId, element } = req.body;
  const { roomId } = req.params;

  const { data: room } = await supabase
    .from('pvp_rooms').select('*').eq('id', roomId).single();
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const isA = room.player_a_id === playerId;
  const isB = room.player_b_id === playerId;
  if (!isA && !isB) return res.status(403).json({ error: 'Not in this room' });

  const gs = { ...room.game_state };
  if (isA) gs.playerAchoice = element;
  if (isB) gs.playerBchoice = element;

  // If both chose → resolve round
  if (gs.playerAchoice && gs.playerBchoice) {
    const STRENGTHS = {
      EAU:   ['FEU','TERRE'],
      FEU:   ['AIR','ETHER'],
      AIR:   ['EAU','TERRE'],
      TERRE: ['FEU','ETHER'],
      ETHER: ['EAU','AIR'],
    };
    const aWins = STRENGTHS[gs.playerAchoice]?.includes(gs.playerBchoice);
    const bWins = STRENGTHS[gs.playerBchoice]?.includes(gs.playerAchoice);

    let roundResult = 'DRAW';
    if (aWins)      { gs.playerBhp--; roundResult = 'WIN_A'; gs.playerAstreak = (gs.playerAstreak||0)+1; gs.playerBstreak=0; }
    else if (bWins) { gs.playerAhp--; roundResult = 'WIN_B'; gs.playerBstreak = (gs.playerBstreak||0)+1; gs.playerAstreak=0; }
    else            { gs.playerAstreak=0; gs.playerBstreak=0; }

    gs.roundResults.push({
      round: gs.round,
      playerAchoice: gs.playerAchoice,
      playerBchoice: gs.playerBchoice,
      result: roundResult,
    });

    // Check game over
    if (gs.playerAhp <= 0 || gs.playerBhp <= 0 || gs.round >= 5) {
      gs.phase = 'finished';
      gs.winner = gs.playerAhp > gs.playerBhp ? 'A'
                : gs.playerBhp > gs.playerAhp ? 'B'
                : 'DRAW';

      // Save match history
      const winnerId = gs.winner === 'A' ? room.player_a_id
                     : gs.winner === 'B' ? room.player_b_id
                     : null;
      await supabase.from('matches').insert({
        player_a_id: room.player_a_id,
        player_b_id: room.player_b_id,
        winner_id: winnerId,
        result: gs.winner,
        rounds: gs.roundResults,
      });

      // Update player stats
      const deltaA = gs.winner==='A' ? 10 : gs.winner==='B' ? -5 : 2;
      const deltaB = gs.winner==='B' ? 10 : gs.winner==='A' ? -5 : 2;
      await Promise.all([
        supabase.rpc ? null : supabase.from('players').select('rank_points,wins,losses,draws').eq('id', room.player_a_id).single().then(({data})=>{
          if(!data) return;
          return supabase.from('players').update({
            rank_points: Math.max(0, (data.rank_points||0)+deltaA),
            wins: (data.wins||0) + (gs.winner==='A'?1:0),
            losses: (data.losses||0) + (gs.winner==='B'?1:0),
            draws: (data.draws||0) + (gs.winner==='DRAW'?1:0),
            games_played: (data.games_played||0)+1,
          }).eq('id', room.player_a_id);
        }),
        supabase.from('players').select('rank_points,wins,losses,draws').eq('id', room.player_b_id).single().then(({data})=>{
          if(!data) return;
          return supabase.from('players').update({
            rank_points: Math.max(0, (data.rank_points||0)+deltaB),
            wins: (data.wins||0) + (gs.winner==='B'?1:0),
            losses: (data.losses||0) + (gs.winner==='A'?1:0),
            draws: (data.draws||0) + (gs.winner==='DRAW'?1:0),
            games_played: (data.games_played||0)+1,
          }).eq('id', room.player_b_id);
        }),
      ]);

      // Cleanup queue entries
      await supabase.from('matchmaking_queue')
        .delete().in('player_id', [room.player_a_id, room.player_b_id]);
    } else {
      gs.round++;
      gs.phase = 'choose';
      gs.playerAchoice = null;
      gs.playerBchoice = null;
    }
  }

  const { data: updated } = await supabase
    .from('pvp_rooms').update({ game_state: gs }).eq('id', roomId).select().single();

  res.json({ ok: true, gameState: updated.game_state });
});

// ════════════════════════════════════════════════════════════
// STRIPE / VIP
// ════════════════════════════════════════════════════════════

// POST /api/create-checkout
app.post('/api/create-checkout', requireSecret, async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId requis' });

  try {
    const { data: sub } = await supabase
      .from('subscriptions').select('stripe_customer_id').eq('player_id', playerId).single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const { data: player } = await supabase
        .from('players').select('username').eq('id', playerId).single();
      const customer = await stripe.customers.create({
        name: player?.username,
        metadata: { elduel_player_id: playerId },
      });
      customerId = customer.id;
      await supabase.from('subscriptions').upsert(
        { player_id: playerId, stripe_customer_id: customerId },
        { onConflict: 'player_id' }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${allowedOrigins[0]}?vip_success=1&player_id=${playerId}`,
      cancel_url:  `${allowedOrigins[0]}?vip_cancel=1`,
      subscription_data: { metadata: { elduel_player_id: playerId } },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    // Fallback to direct Stripe link
    res.json({ url: 'https://buy.stripe.com/5kQfZj75o0cd0Lv58NgEg00' });
  }
});

// GET /api/subscription/:playerId
app.get('/api/subscription/:playerId', requireSecret, async (req, res) => {
  const { data } = await supabase
    .from('subscriptions').select('*').eq('player_id', req.params.playerId).single();
  if (!data) return res.json({ vip: false, subscriptionStatus: 'none', gemsToCred: 0 });
  res.json({
    vip: data.subscription_status === 'active',
    subscriptionStatus: data.subscription_status,
    gemsToCred: data.pending_gems || 0,
  });
});

// POST /api/credit-gems-ack
app.post('/api/credit-gems-ack', requireSecret, async (req, res) => {
  const { playerId } = req.body;
  await supabase.from('subscriptions').update({ pending_gems: 0 }).eq('player_id', playerId);
  res.json({ ok: true });
});

// POST /api/cancel-portal
app.post('/api/cancel-portal', requireSecret, async (req, res) => {
  const { playerId } = req.body;
  const { data: sub } = await supabase
    .from('subscriptions').select('stripe_customer_id').eq('player_id', playerId).single();
  if (!sub?.stripe_customer_id) {
    return res.json({ url: 'https://billing.stripe.com/p/login/5kQfZj75o0cd0Lv58NgEg00' });
  }
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: allowedOrigins[0],
    });
    res.json({ url: portal.url });
  } catch {
    res.json({ url: 'https://billing.stripe.com/p/login/5kQfZj75o0cd0Lv58NgEg00' });
  }
});

// POST /api/webhook — Stripe events
app.post('/api/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Stripe webhook: ${event.type}`);

  switch (event.type) {

    case 'checkout.session.completed': {
      const s = event.data.object;
      const pid = s.metadata?.elduel_player_id;
      if (pid && s.customer) {
        await supabase.from('subscriptions').upsert(
          { player_id: pid, stripe_customer_id: s.customer, stripe_subscription_id: s.subscription },
          { onConflict: 'player_id' }
        );
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const pid = sub.metadata?.elduel_player_id;
      if (!pid) break;

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

      const { data: existing } = await supabase
        .from('subscriptions').select('last_vip_reward_month,pending_gems').eq('player_id', pid).single();

      const already = existing?.last_vip_reward_month === month;
      const newGems = (existing?.pending_gems||0) + (already ? 0 : 500);

      await supabase.from('subscriptions').upsert({
        player_id: pid,
        stripe_customer_id: invoice.customer,
        stripe_subscription_id: invoice.subscription,
        subscription_status: 'active',
        last_vip_reward_month: already ? existing.last_vip_reward_month : month,
        pending_gems: newGems,
      }, { onConflict: 'player_id' });

      await supabase.from('players').update({ vip: true }).eq('id', pid);
      console.log(`✅ VIP for ${pid} — ${already?'already rewarded':'+500 gems pending'}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const pid = sub.metadata?.elduel_player_id;
      if (!pid) break;
      await supabase.from('subscriptions').upsert({
        player_id: pid,
        stripe_customer_id: sub.customer,
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
      }, { onConflict: 'player_id' });
      if (sub.status !== 'active') {
        await supabase.from('players').update({ vip: false, bat: 5 }).eq('id', pid);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj = event.data.object;
      const subId = obj.subscription || obj.id;
      if (!subId) break;
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const pid = sub.metadata?.elduel_player_id;
        if (!pid) break;
        await supabase.from('subscriptions').update({ subscription_status: 'canceled', pending_gems: 0 }).eq('player_id', pid);
        await supabase.from('players').update({ vip: false, bat: 5 }).eq('id', pid);
        console.log(`❌ VIP revoked for ${pid}`);
      } catch {}
      break;
    }
  }

  res.json({ received: true });
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', async (_, res) => {
  const { error } = await supabase.from('players').select('id').limit(1);
  res.json({ ok: !error, service: 'elduel-api', supabase: !error ? 'connected' : error.message });
});

// ── Start ─────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`ELDUEL API on :${PORT}`));
}

module.exports = app;
