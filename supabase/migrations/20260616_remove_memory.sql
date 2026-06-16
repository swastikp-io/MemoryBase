-- ============================================================
-- MemoryBase: Remove Memory Layer
-- ============================================================
-- This migration removes the memories and episodes tables,
-- along with their associated RLS policies, indexes, and triggers.
-- ============================================================

-- 1. Drop Triggers
drop trigger if exists update_memories_updated_at on public.memories;

-- 2. Drop Policies
drop policy if exists "Users can view own memories" on public.memories;
drop policy if exists "Users can create own memories" on public.memories;
drop policy if exists "Users can update own memories" on public.memories;
drop policy if exists "Users can delete own memories" on public.memories;

drop policy if exists "Users can view own episodes" on public.episodes;
drop policy if exists "Users can create own episodes" on public.episodes;
drop policy if exists "Users can delete own episodes" on public.episodes;

-- 3. Drop Tables (this also drops associated indexes)
drop table if exists public.memories cascade;
drop table if exists public.episodes cascade;
drop table if exists public.reflections cascade;
drop table if exists public.memory_links cascade;
drop table if exists public.memory_retrieval_logs cascade;

-- Note: We don't drop vector extensions as they might be used by other features,
-- but the prompt explicitly asked to remove pgvector functions if strictly tied to memory.
-- MemoryBase schema does not currently define explicit pgvector custom functions
-- in 001_complete_schema.sql, but if match_memories existed, we would drop it.
drop function if exists match_memories(vector(1536), float, int);
drop function if exists match_episodes(vector(1536), float, int);
