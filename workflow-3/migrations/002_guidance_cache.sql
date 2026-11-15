CREATE TABLE IF NOT EXISTS accesspatch_form_structures (
  form_hash text PRIMARY KEY,
  structure jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accesspatch_guidance_cache (
  cache_key text PRIMARY KEY,
  form_hash text,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accesspatch_guidance_cache_expiry ON accesspatch_guidance_cache(expires_at);
