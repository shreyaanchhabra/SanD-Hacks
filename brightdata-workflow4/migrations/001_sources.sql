CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY,
  canonical_url TEXT NOT NULL,
  requested_url TEXT NOT NULL,
  title TEXT NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  content_hash CHAR(64) NOT NULL,
  passages JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canonical_url, content_hash)
);

CREATE INDEX IF NOT EXISTS sources_retrieved_at_idx ON sources (retrieved_at DESC);
