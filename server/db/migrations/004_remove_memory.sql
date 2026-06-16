-- Migration: 004_remove_memory.sql
-- Description: Completely remove memory layer tables and structures

-- Drop triggers for memories
DROP TRIGGER IF EXISTS update_memories_updated_at;

-- Drop tables
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS episodes;
DROP TABLE IF EXISTS reflections;
DROP TABLE IF EXISTS memory_links;
DROP TABLE IF EXISTS memory_retrieval_logs;

-- In SQLite we don't drop functions or RLS policies directly, but this file is meant for SQLite.
