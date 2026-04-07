-- Moonvit Roundtable — создать таблицу сессий
-- Выполнить в Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS roundtable_sessions (
  id uuid PRIMARY KEY,
  template_id text NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'setup',
  agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_phase integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 0,
  current_agent_index integer NOT NULL DEFAULT 0,
  brand_context text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roundtable_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roundtable_public_all ON roundtable_sessions;
CREATE POLICY roundtable_public_all ON roundtable_sessions
  FOR ALL USING (true) WITH CHECK (true);
