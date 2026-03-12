-- supabase/migrations/001_init.sql
-- Run this in your Supabase SQL Editor to create the full schema.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user record on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Style Packs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_packs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'analyzed', 'failed')),
  example_count INT DEFAULT 0,
  style_data    JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_packs_user ON style_packs(user_id);

-- ─── Style Examples ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_examples (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_pack_id   UUID NOT NULL REFERENCES style_packs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration_secs   FLOAT,
  file_size_bytes BIGINT,
  status          TEXT DEFAULT 'uploaded',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Style Profiles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_pack_id               UUID NOT NULL UNIQUE REFERENCES style_packs(id) ON DELETE CASCADE,
  pace                        TEXT,
  cut_frequency               TEXT,
  caption_density             TEXT,
  hook_aggressiveness         TEXT,
  sales_intensity_baseline    TEXT,
  cta_frequency               TEXT,
  zoom_frequency              TEXT,
  preferred_structure         TEXT,
  preferred_tone              TEXT,
  product_reveal_timing       TEXT,
  authenticity_vs_polish      INT CHECK (authenticity_vs_polish BETWEEN 0 AND 100),
  pattern_interrupt_frequency TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Style Signatures ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_signatures (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_pack_id             UUID NOT NULL UNIQUE REFERENCES style_packs(id) ON DELETE CASCADE,
  avg_clip_duration         FLOAT,
  cuts_per_30_seconds       FLOAT,
  product_reveal_seconds    FLOAT,
  avg_caption_words         FLOAT,
  caption_lines_per_screen  FLOAT,
  cta_frequency             FLOAT,
  zoom_frequency            FLOAT,
  proof_frequency           FLOAT,
  urgency_score             INT CHECK (urgency_score BETWEEN 0 AND 100),
  emotional_intensity_score INT CHECK (emotional_intensity_score BETWEEN 0 AND 100),
  polish_score              INT CHECK (polish_score BETWEEN 0 AND 100),
  authenticity_score        INT CHECK (authenticity_score BETWEEN 0 AND 100),
  hook_type_distribution    JSONB,
  style_confidence          FLOAT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  product_name        TEXT NOT NULL,
  product_notes       TEXT,
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'uploading', 'processing', 'generated', 'failed')),
  style_pack_id       UUID REFERENCES style_packs(id),
  match_example_id    UUID,
  sales_intensity     INT DEFAULT 2 CHECK (sales_intensity BETWEEN 0 AND 4),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- ─── Project Assets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('raw_footage', 'voiceover', 'image', 'broll')),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration_secs   FLOAT,
  file_size_bytes BIGINT,
  width           INT,
  height          INT,
  fps             FLOAT,
  status          TEXT DEFAULT 'uploaded',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transcripts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcripts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        UUID REFERENCES project_assets(id) ON DELETE CASCADE,
  example_id      UUID REFERENCES style_examples(id) ON DELETE CASCADE,
  content         TEXT,
  segments        JSONB,
  language        TEXT DEFAULT 'en',
  service         TEXT DEFAULT 'stub',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Generations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  style_pack_id   UUID REFERENCES style_packs(id),
  sales_intensity INT,
  match_example_id UUID,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─── Generation Variants ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generation_variants (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id        UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  variant_key          TEXT NOT NULL CHECK (variant_key IN ('A', 'B', 'C', 'D')),
  variant_name         TEXT NOT NULL,
  strategy_summary     TEXT,
  style_match_score    INT,
  hook_option_id       UUID,
  mock_video_url       TEXT,
  duration_secs        INT,
  status               TEXT DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Hook Options ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hook_options (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  hook_type       TEXT NOT NULL,
  text            TEXT NOT NULL,
  score           INT CHECK (score BETWEEN 0 AND 100),
  rationale       TEXT,
  is_selected     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Edit Plans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edit_plans (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id                  UUID NOT NULL UNIQUE REFERENCES generation_variants(id) ON DELETE CASCADE,
  hook_segment                JSONB,
  body_segments               JSONB,
  product_demo_segments       JSONB,
  social_proof_segment        JSONB,
  cta_segment                 JSONB,
  caption_style               TEXT,
  pacing_target               FLOAT,
  transition_instructions     TEXT,
  zoom_instructions           TEXT,
  sales_intensity             TEXT,
  style_match_confidence      FLOAT,
  hook_type                   TEXT,
  product_reveal_target_secs  FLOAT,
  full_json                   JSONB,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Exports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  variant_id      UUID REFERENCES generation_variants(id),
  project_id      UUID REFERENCES projects(id),
  file_url        TEXT,
  file_name       TEXT,
  file_size_bytes BIGINT,
  format          TEXT DEFAULT 'mp4',
  resolution      TEXT DEFAULT '1080x1920',
  status          TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'complete', 'failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─── Processing Jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processing_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL,
  reference_id    UUID NOT NULL,
  reference_type  TEXT NOT NULL,
  status          TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  progress        INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  result          JSONB,
  error_message   TEXT,
  external_job_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE style_packs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_examples      ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_signatures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook_options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports             ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users own their style packs"    ON style_packs    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their examples"       ON style_examples FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their projects"       ON projects       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their exports"        ON exports        FOR ALL USING (auth.uid() = user_id);

-- Profiles/signatures are readable if you own the style pack
CREATE POLICY "Style profile via pack ownership" ON style_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM style_packs WHERE id = style_pack_id AND user_id = auth.uid())
  );

CREATE POLICY "Style signature via pack ownership" ON style_signatures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM style_packs WHERE id = style_pack_id AND user_id = auth.uid())
  );

-- Generations readable via project ownership
CREATE POLICY "Generations via project ownership" ON generations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );
