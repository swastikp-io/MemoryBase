-- Migration: 003_memory_state_and_embedding_status.sql
-- Description: Track embedding health, memory lifecycle state, and duplicate occurrences.

ALTER TABLE memories ADD COLUMN embedding_status TEXT DEFAULT 'pending';
ALTER TABLE memories ADD COLUMN memory_state TEXT DEFAULT 'active';
ALTER TABLE memories ADD COLUMN occurrence_count INTEGER DEFAULT 1;
ALTER TABLE memories ADD COLUMN last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE memories ADD COLUMN superseded_by TEXT;
