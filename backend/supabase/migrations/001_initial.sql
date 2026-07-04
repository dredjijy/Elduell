-- ============================================================
-- ELDUEL — Supabase Schema complet
-- Projet: https://rlmjpmauqsfjqgoynjyw.supabase.co
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PLAYERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username              TEXT UNIQUE NOT NULL,
  username_slug         TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  avatar                TEXT DEFAULT '⚔️',
  title                 TEXT DEFAULT 'Novice',
  rank_points           INTEGER DEFAULT 0,
  gems                  INTEGER DEFAULT 50,
  bat                   INTEGER DEFAULT 5,
  wins                  INTEGER DEFAULT 0,
  losses                INTEGER DEFAULT 0,
  draws                 INTEGER DEFAULT 0,
  games_played          INTEGER DEFAULT 0,
  vip                   BOOLEAN DEFAULT FALSE,
  vip_bonus_claimed     BOOLEAN DEFAULT FALSE,
  equipped_frame        TEXT DEFAULT NULL,
  equipped_versus_skin  TEXT DEFAULT 'vs_default',
  equipped_skins        JSONB DEFAULT '{"EAU":"default","FEU":"default","AIR":"default","TERRE":"default","ETHER":"default"}',
  owned_skins           TEXT[] DEFAULT ARRAY['default'],
  owned_frames          TEXT[] DEFAULT ARRAY[]::TEXT[],
  owned_versus_skins    TEXT[] DEFAULT ARRAY['vs_default'],
  last_bat_recharge     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  is_online             BOOLEAN DEFAULT FALSE,
  last_seen             TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── SESSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBSCRIPTIONS (Stripe VIP) ───────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id              UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status    TEXT DEFAULT 'none',
  last_vip_reward_month  TEXT DEFAULT NULL,
  pending_gems           INTEGER DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── MATCHMAKING QUEUE (Realtime PvP) ─────────────────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE NOT NULL,
  player_data JSONB NOT NULL,
  status      TEXT DEFAULT 'waiting',
  room_id     UUID DEFAULT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── PVP ROOMS (Realtime game state) ──────────────────────────
CREATE TABLE IF NOT EXISTS pvp_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_a_id     UUID REFERENCES players(id),
  player_b_id     UUID REFERENCES players(id),
  player_a_data   JSONB,
  player_b_data   JSONB,
  game_state      JSONB DEFAULT '{
    "phase": "waiting",
    "round": 0,
    "playerAhp": 5,
    "playerBhp": 5,
    "playerAchoice": null,
    "playerBchoice": null,
    "roundResults": [],
    "winner": null
  }',
  status          TEXT DEFAULT 'waiting',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── MATCHES (history) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_a_id   UUID REFERENCES players(id),
  player_b_id   UUID REFERENCES players(id),
  winner_id     UUID REFERENCES players(id),
  result        TEXT,
  rounds        JSONB,
  rank_delta_a  INTEGER DEFAULT 0,
  rank_delta_b  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUTO UPDATED_AT ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_updated_at ON players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS pvp_rooms_updated_at ON pvp_rooms;
CREATE TRIGGER pvp_rooms_updated_at
  BEFORE UPDATE ON pvp_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_slug         ON players(username_slug);
CREATE INDEX IF NOT EXISTS idx_players_rank         ON players(rank_points DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token       ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_player      ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sub_player           ON subscriptions(player_id);
CREATE INDEX IF NOT EXISTS idx_sub_stripe_cust      ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_sub_stripe_sub       ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_mmq_status           ON matchmaking_queue(status, joined_at);
CREATE INDEX IF NOT EXISTS idx_pvp_status           ON pvp_rooms(status);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches           ENABLE ROW LEVEL SECURITY;

-- Service role (backend only — uses service_role key, never anon)
CREATE POLICY "service_all_players"    ON players           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sessions"   ON sessions          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_subs"       ON subscriptions     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_mmq"        ON matchmaking_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_pvp"        ON pvp_rooms         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_matches"    ON matches           FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon key can read leaderboard (frontend)
CREATE POLICY "anon_read_leaderboard" ON players FOR SELECT TO anon USING (true);

-- Anon key: matchmaking + pvp realtime (frontend direct Supabase)
CREATE POLICY "anon_mmq_all"   ON matchmaking_queue FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_pvp_read"  ON pvp_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_pvp_write" ON pvp_rooms FOR UPDATE TO anon USING (true);

-- ── REALTIME — enable for PvP ─────────────────────────────────
-- Supabase Dashboard → Database → Replication → Add tables:
--   matchmaking_queue
--   pvp_rooms
-- OR run these after connecting to DB:
-- ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
-- ALTER PUBLICATION supabase_realtime ADD TABLE pvp_rooms;
