-- ============================================================
-- Tennis Tournament Manager
-- Supabase / PostgreSQL Schema
-- FGCU HCI Project 2026
-- ============================================================
-- HOW TO USE:
--   1. Go to your Supabase project dashboard → SQL Editor
--   2. Paste this entire file and click Run
-- ============================================================


-- ── Extensions ───────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE user_role          AS ENUM ('player', 'admin');
CREATE TYPE tournament_status  AS ENUM ('upcoming', 'registration_open', 'in_progress', 'completed');
CREATE TYPE surface_type       AS ENUM ('clay', 'grass', 'hard', 'indoor');
CREATE TYPE match_status       AS ENUM ('pending', 'in_progress', 'completed', 'walkover');
CREATE TYPE reg_status         AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status     AS ENUM ('unpaid', 'paid', 'refunded');


-- ── Table: "user" ────────────────────────────────────────────
-- One row per authenticated user. Linked to auth.users via id.
-- NOTE: "user" is a reserved word in Postgres — must always be quoted.

CREATE TABLE "user" (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'player',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── Table: tournament ────────────────────────────────────────

CREATE TABLE tournament (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT              NOT NULL,
  description     TEXT              NOT NULL DEFAULT '',
  location        TEXT              NOT NULL DEFAULT '',
  start_date      DATE              NOT NULL,
  end_date        DATE              NOT NULL,
  max_players     INT               NOT NULL DEFAULT 8,
  entry_fee       NUMERIC(10, 2)    NOT NULL DEFAULT 0,
  rules           TEXT              NOT NULL DEFAULT '',
  status          tournament_status NOT NULL DEFAULT 'upcoming',
  surface         surface_type      NOT NULL DEFAULT 'hard',
  current_players INT               NOT NULL DEFAULT 0,
  created_by      UUID              NOT NULL REFERENCES "user"(id),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT tournament_dates_ordered     CHECK (end_date >= start_date),
  CONSTRAINT tournament_max_players_pow2  CHECK (max_players >= 2 AND (max_players & (max_players - 1)) = 0),
  CONSTRAINT tournament_players_nonneg    CHECK (current_players >= 0 AND current_players <= max_players)
);


-- ── Table: registration ──────────────────────────────────────

CREATE TABLE registration (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID           NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  player_id           UUID           NOT NULL REFERENCES "user"(id)     ON DELETE CASCADE,
  registration_status reg_status     NOT NULL DEFAULT 'confirmed',
  payment_status      payment_status NOT NULL DEFAULT 'paid',
  registered_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, player_id)
);


-- ── Table: match ─────────────────────────────────────────────

CREATE TABLE match (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID         NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  round         INT          NOT NULL,
  match_number  INT          NOT NULL,
  player1_id    UUID         REFERENCES "user"(id),
  player2_id    UUID         REFERENCES "user"(id),
  winner_id     UUID         REFERENCES "user"(id),
  score         TEXT,
  status        match_status NOT NULL DEFAULT 'pending',
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, round, match_number),
  CONSTRAINT match_players_distinct CHECK (
    player1_id IS NULL OR player2_id IS NULL OR player1_id <> player2_id
  ),
  CONSTRAINT match_winner_valid CHECK (
    winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id
  )
);


-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_tournament_status        ON tournament(status);
CREATE INDEX idx_registration_tournament  ON registration(tournament_id);
CREATE INDEX idx_registration_player      ON registration(player_id);
CREATE INDEX idx_match_tournament         ON match(tournament_id);
CREATE INDEX idx_match_round              ON match(tournament_id, round);
CREATE INDEX idx_match_players            ON match(player1_id, player2_id);
CREATE INDEX idx_user_admin               ON "user"(role) WHERE role = 'admin';


-- ── Trigger: auto-create user row on sign-up ─────────────────
-- Fires after Supabase Auth creates a new user.
-- SECURITY: role is always forced to 'player'. raw_user_meta_data is
-- client-controlled and MUST NOT be trusted to set privileges. Admins are
-- promoted manually via the SQL Editor.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public."user" (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Player'),
    'player'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Trigger: prevent self-promotion ──────────────────────────
-- Blocks any UPDATE to "user".role unless the caller is already admin.
-- Without this, the "Users can update their own profile" RLS policy would
-- let any user run UPDATE "user" SET role = 'admin' WHERE id = auth.uid().
--
-- Only guards authenticated callers (auth.uid() IS NOT NULL). Direct DB
-- access via the SQL Editor or service-role key runs with no auth.uid()
-- and is treated as a trusted path — used to bootstrap the first admin.

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public."user"
       WHERE id = auth.uid() AND role = 'admin'
     )
  THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_role_guard
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();


-- ── Trigger: keep current_players count in sync ──────────────
-- Also enforces capacity and tournament-status invariants under concurrency
-- by taking a row lock on the tournament before updating the count.

CREATE OR REPLACE FUNCTION sync_player_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cur INT;
  cap INT;
  st  tournament_status;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT current_players, max_players, status
      INTO cur, cap, st
      FROM tournament
     WHERE id = NEW.tournament_id
       FOR UPDATE;

    IF st <> 'registration_open' THEN
      RAISE EXCEPTION 'Tournament is not open for registration';
    END IF;
    IF cur >= cap THEN
      RAISE EXCEPTION 'Tournament is full';
    END IF;

    UPDATE tournament SET current_players = cur + 1
     WHERE id = NEW.tournament_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tournament SET current_players = current_players - 1
     WHERE id = OLD.tournament_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER on_registration_change
  AFTER INSERT OR DELETE ON registration
  FOR EACH ROW EXECUTE FUNCTION sync_player_count();


-- ── Trigger: force registration payment/status fields ────────
-- Clients submit INSERTs via RLS; we do not want them choosing their own
-- payment_status or registration_status. Force the dummy-payment values.

CREATE OR REPLACE FUNCTION normalize_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.payment_status      := 'paid';
  NEW.registration_status := 'confirmed';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_registration_insert
  BEFORE INSERT ON registration
  FOR EACH ROW EXECUTE FUNCTION normalize_registration();


-- ── Row Level Security (RLS) ──────────────────────────────────

ALTER TABLE "user"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE match        ENABLE ROW LEVEL SECURITY;

-- Helper: returns true if the currently logged-in user is an admin.
-- SECURITY INVOKER with a pinned search_path avoids the CVE-2018-1058 class
-- of attacks and prevents policy re-entry when used from policies on "user".
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."user"
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- "user": anyone authenticated can read, users can only edit their own row.
-- Role changes are blocked by the enforce_role_guard BEFORE UPDATE trigger.
CREATE POLICY "Users can read all user profiles"
  ON "user" FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON "user" FOR UPDATE
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- tournament: public read, admin write
CREATE POLICY "Anyone can view tournaments"
  ON tournament FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournaments"
  ON tournament FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update tournaments"
  ON tournament FOR UPDATE
  USING      (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete tournaments"
  ON tournament FOR DELETE
  USING (is_admin());

-- registration: players see their own, admins see all.
-- Insert is gated on tournament state; the sync_player_count trigger also
-- enforces capacity/state under concurrency (defense in depth).
CREATE POLICY "Players see their own registrations"
  ON registration FOR SELECT
  USING (auth.uid() = player_id OR is_admin());

CREATE POLICY "Players can register themselves"
  ON registration FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1 FROM tournament t
      WHERE t.id = tournament_id
        AND t.status = 'registration_open'
        AND t.current_players < t.max_players
    )
  );

CREATE POLICY "Players can cancel their own registration"
  ON registration FOR DELETE
  USING (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1 FROM tournament t
      WHERE t.id = tournament_id
        AND t.status IN ('upcoming', 'registration_open')
    )
  );

-- match: public read, admin full control (with WITH CHECK on writes)
CREATE POLICY "Anyone can view matches"
  ON match FOR SELECT USING (true);

CREATE POLICY "Admins can insert matches"
  ON match FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update matches"
  ON match FOR UPDATE
  USING      (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete matches"
  ON match FOR DELETE
  USING (is_admin());


-- ── Seed Data ────────────────────────────────────────────────
-- Creates a sample tournament once an admin account exists.
-- Idempotent: inserts 0 rows if no admin exists, or if a tournament with
-- the same name already exists. Re-run safely from the SQL Editor after
-- promoting your first admin.

INSERT INTO tournament (
  name, description, location,
  start_date, end_date,
  max_players, entry_fee, rules,
  status, surface, created_by
)
SELECT
  'FGCU Spring Open',
  'The annual FGCU spring tennis tournament open to all students.',
  'FGCU Tennis Complex, Fort Myers FL',
  '2026-04-20',
  '2026-04-27',
  8,
  25.00,
  'Single elimination. Best of 3 sets. No-Ad scoring. Players must arrive 15 minutes before their scheduled match.',
  'registration_open',
  'hard',
  u.id
FROM "user" u
WHERE u.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM tournament WHERE name = 'FGCU Spring Open')
ORDER BY u.created_at ASC
LIMIT 1;
