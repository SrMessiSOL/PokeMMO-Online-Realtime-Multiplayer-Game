-- PostgreSQL baseline schema for browser MMO persistence.
-- Apply with: psql "$DATABASE_URL" -f server/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sprite TEXT NOT NULL DEFAULT 'misa-front',
  map_id TEXT NOT NULL DEFAULT 'town',
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'down',
  money INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS character_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  nickname TEXT,
  level INTEGER NOT NULL CHECK (level > 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  hp_current INTEGER NOT NULL CHECK (hp_current >= 0),
  hp_max INTEGER NOT NULL CHECK (hp_max > 0),
  moves_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_in_party BOOLEAN NOT NULL DEFAULT FALSE,
  party_slot INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (character_id, item_id)
);

CREATE TABLE IF NOT EXISTS quest_flags (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  flag_value TEXT NOT NULL,
  PRIMARY KEY (character_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_character_monsters_character_id ON character_monsters(character_id);
