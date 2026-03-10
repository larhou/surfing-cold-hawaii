-- Run this once in your Neon SQL editor to create the comments table
-- Go to: neon.tech → your project → SQL Editor → paste and run

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  name       VARCHAR(80)   NOT NULL,
  body       TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
