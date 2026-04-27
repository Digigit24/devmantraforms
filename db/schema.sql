-- Run this once against your Neon database to create the schema.
-- psql $DATABASE_URL -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  company     TEXT        NOT NULL,
  sector      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  question_id TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  score       NUMERIC
);

CREATE TABLE IF NOT EXISTS results (
  lead_id           UUID    PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  total_score       INTEGER NOT NULL,
  tier              TEXT    NOT NULL,
  dimension_scores  JSONB   NOT NULL,
  weakest_dimension TEXT    NOT NULL,
  flags             JSONB   DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  lead_id           UUID        PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  executive_verdict TEXT        NOT NULL,
  actions           JSONB       NOT NULL,
  benchmark         TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_responses_lead_id ON responses(lead_id);
