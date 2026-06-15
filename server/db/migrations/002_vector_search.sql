-- Migration: 002_vector_search.sql
-- Description: Add embedding columns for semantic memory retrieval

ALTER TABLE memories ADD COLUMN embedding TEXT;

CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
