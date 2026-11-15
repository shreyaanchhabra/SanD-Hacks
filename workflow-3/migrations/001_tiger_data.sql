CREATE TABLE IF NOT EXISTS accesspatch_saved_journeys (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  goal text NOT NULL CHECK (length(goal) <= 2000),
  milestone text NOT NULL CHECK (length(milestone) <= 160),
  confirmed_progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  mastra_run_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accesspatch_saved_journeys_owner_updated
  ON accesspatch_saved_journeys(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS accesspatch_guidance_events (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('explain_more','im_stuck','lost_target','provider_failure')),
  journey_category text NOT NULL CHECK (length(journey_category) <= 100),
  step_category text NOT NULL CHECK (length(step_category) <= 100),
  provider text CHECK (provider IS NULL OR length(provider) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accesspatch_guidance_events_created
  ON accesspatch_guidance_events(created_at);

CREATE TABLE IF NOT EXISTS accesspatch_public_sources (
  id text PRIMARY KEY,
  canonical_url text NOT NULL,
  title text NOT NULL CHECK (length(title) <= 300),
  excerpt text NOT NULL CHECK (length(excerpt) <= 2000),
  content_sha256 text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accesspatch_public_sources_url
  ON accesspatch_public_sources(canonical_url);
