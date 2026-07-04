-- ============================================================
-- ELDUEL — MISE À NIVEAU (002_upgrade.sql)
-- À exécuter APRÈS l'ancienne 001 déjà passée.
-- Ajoute uniquement ce qui manque — ne touche pas aux données.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Colonnes manquantes sur players ─────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- ── Token de session auto-généré (sécurisé) ──────────────────
ALTER TABLE sessions ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(32), 'hex');
ALTER TABLE sessions ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '30 days';

-- ── MATCHMAKING QUEUE (PvP temps réel) ───────────────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE NOT NULL,
  player_data JSONB NOT NULL,
  status      TEXT DEFAULT 'waiting',
  room_id     UUID DEFAULT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── PVP ROOMS (état de jeu temps réel) ───────────────────────
CREATE TABLE IF NOT EXISTS pvp_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_a_id     UUID REFERENCES players(id),
  player_b_id     UUID REFERENCES players(id),
  player_a_data   JSONB,
  player_b_data   JSONB,
  game_state      JSONB DEFAULT '{
    "phase": "waiting", "round": 0,
    "playerAhp": 5, "playerBhp": 5,
    "playerAchoice": null, "playerBchoice": null,
    "roundResults": [], "winner": null
  }',
  status          TEXT DEFAULT 'waiting',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Colonnes manquantes sur matches ──────────────────────────
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rank_delta_a INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rank_delta_b INTEGER DEFAULT 0;

-- ── Trigger updated_at sur pvp_rooms ─────────────────────────
DROP TRIGGER IF EXISTS pvp_rooms_updated_at ON pvp_rooms;
CREATE TRIGGER pvp_rooms_updated_at
  BEFORE UPDATE ON pvp_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_points DESC);
CREATE INDEX IF NOT EXISTS idx_mmq_status   ON matchmaking_queue(status, joined_at);
CREATE INDEX IF NOT EXISTS idx_pvp_status   ON pvp_rooms(status);

-- ── RLS sur les nouvelles tables ─────────────────────────────
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_rooms         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_mmq" ON matchmaking_queue;
CREATE POLICY "service_all_mmq" ON matchmaking_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_all_pvp" ON pvp_rooms;
CREATE POLICY "service_all_pvp" ON pvp_rooms FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon (frontend direct : Realtime + fallback sans backend)
DROP POLICY IF EXISTS "anon_read_leaderboard" ON players;
CREATE POLICY "anon_read_leaderboard" ON players FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_mmq_all" ON matchmaking_queue;
CREATE POLICY "anon_mmq_all"   ON matchmaking_queue FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_pvp_read" ON pvp_rooms;
CREATE POLICY "anon_pvp_read"  ON pvp_rooms FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_pvp_write" ON pvp_rooms;
CREATE POLICY "anon_pvp_write" ON pvp_rooms FOR UPDATE TO anon USING (true);

-- ── Realtime : publier les tables PvP ────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE pvp_rooms;
