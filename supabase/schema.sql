-- ============================================================
-- Tennis Tournament Manager
-- Supabase / PostgreSQL Schema
-- FGCU HCI Project 2025
-- ============================================================
-- HOW TO USE:
--   1. Go to your Supabase project dashboard → SQL Editor
--   2. Paste this entire file and click Run
-- ============================================================


-- ── Extensions ───────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE user_role          AS ENUM ('player', 'admin');
CREATE TYPE tournament_status  AS ENUM ('upcoming', 'registration_open', 'in_progress', 'completed');
CREATE TYPE surface_type       AS ENUM ('clay', 'grass', 'hard', 'indoor');
CREATE TYPE match_status       AS ENUM ('pending', 'in_progress', 'completed', 'walkover');
CREATE TYPE reg_status         AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status     AS ENUM ('unpaid', 'paid', 'refunded');


-- ── Table: profiles ──────────────────────────────────────────
-- One row per authenticated user. Linked to auth.users via id.

CREATE TABLE user (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'player',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── Table: tournaments ───────────────────────────────────────

CREATE TABLE tournament (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT              NOT NULL,
  description     TEXT              NOT NULL DEFAULT '',
  location        TEXT              NOT NULL DEFAULT '',
  start_date      DATE              NOT NULL,
  end_date        DATE              NOT NULL,
  max_players     INT               NOT NULL DEFAULT 8,  -- must be power of 2 (4, 8, 16...)
  entry_fee       NUMERIC(10, 2)    NOT NULL DEFAULT 0,
  rules           TEXT              NOT NULL DEFAULT '',
  status          tournament_status NOT NULL DEFAULT 'upcoming',
  surface         surface_type      NOT NULL DEFAULT 'hard',
  current_players INT               NOT NULL DEFAULT 0,
  created_by      UUID              NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);


-- ── Table: registrations ─────────────────────────────────────

CREATE TABLE registration (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id       UUID           NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  player_id           UUID           NOT NULL REFERENCES user(id)    ON DELETE CASCADE,
  registration_status reg_status     NOT NULL DEFAULT 'confirmed',
  payment_status      payment_status NOT NULL DEFAULT 'paid',  -- dummy payment: always marks as paid
  registered_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, player_id)                            -- one registration per player per tournament
);


-- ── Table: matches ───────────────────────────────────────────

CREATE TABLE match (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID         NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  round         INT          NOT NULL,   -- 1 = QF / Round of 8,  2 = SF,  3 = Final
  match_number  INT          NOT NULL,   -- position within the round (1-indexed)
  player1_id    UUID         REFERENCES user(id),
  player2_id    UUID         REFERENCES user(id),
  winner_id     UUID         REFERENCES user(id),
  score         TEXT,                    -- free text e.g. "6-4, 7-5"
  status        match_status NOT NULL DEFAULT 'pending',
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, round, match_number)
);


-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_tournaments_status        ON tournaments(status);
CREATE INDEX idx_registrations_tournament  ON registrations(tournament_id);
CREATE INDEX idx_registrations_player      ON registrations(player_id);
CREATE INDEX idx_matches_tournament        ON matches(tournament_id);
CREATE INDEX idx_matches_round             ON matches(tournament_id, round);


-- ── Trigger: auto-create profile on sign-up ──────────────────
-- Fires after Supabase Auth creates a new user.
-- Reads full_name and role from the signup metadata.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Player'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Trigger: keep current_players count in sync ──────────────

CREATE OR REPLACE FUNCTION sync_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tournament SET current_players = current_players + 1
    WHERE id = NEW.tournament_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tournament SET current_players = current_players - 1
    WHERE id = OLD.tournament_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_registration_change
  AFTER INSERT OR DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION sync_player_count();


-- ── Row Level Security (RLS) ──────────────────────────────────

ALTER TABLE user          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament    ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration  ENABLE ROW LEVEL SECURITY;
ALTER TABLE match         ENABLE ROW LEVEL SECURITY;

-- Helper: returns true if the currently logged-in user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- user: anyone authenticated can read, users can only edit their own
CREATE POLICY "Users can read all user profiles"
  ON user FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON user FOR UPDATE USING (auth.uid() = id);

-- tournaments: public read, admin write
CREATE POLICY "Anyone can view tournaments"
  ON tournament FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournaments"
  ON tournament FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update tournaments"
  ON tournament FOR UPDATE USING (is_admin());

-- registrations: players see their own, admins see all
CREATE POLICY "Players see their own registrations"
  ON registrations FOR SELECT
  USING (auth.uid() = player_id OR is_admin());

CREATE POLICY "Players can register themselves"
  ON registrations FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can cancel their own registration"
  ON registrations FOR DELETE
  USING (auth.uid() = player_id);

-- matches: public read, admin full control
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT USING (true);

CREATE POLICY "Admins can manage matches"
  ON matches FOR ALL USING (is_admin());


-- ── Seed Data ────────────────────────────────────────────────
-- Creates a sample tournament once an admin account exists.
-- Safe to remove before production.

INSERT INTO tournaments (
  name, description, location,
  start_date, end_date,
  max_players, entry_fee, rules,
  status, surface, created_by
)
SELECT
  'FGCU Spring Open',
  'The annual FGCU spring tennis tournament open to all students.',
  'FGCU Tennis Complex, Fort Myers FL',
  '2025-04-20',
  '2025-04-27',
  8,
  25.00,
  'Single elimination. Best of 3 sets. No-Ad scoring. Players must arrive 15 minutes before their scheduled match.',
  'registration_open',
  'hard',
  id
FROM profiles WHERE role = 'admin' LIMIT 1;
