-- ============================================================
-- MemoryBase: Complete Supabase Schema Migration
-- ============================================================
-- This migration creates all tables, RLS policies, and trigger
-- functions for the MemoryBase application.
-- Run this in Supabase SQL Editor or via `supabase db push`.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE 1: PROFILES
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  github_username text,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- TABLE 2: CHATS
-- ────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New Chat',
  model_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_chats_updated_at on public.chats(updated_at desc);

-- ────────────────────────────────────────────────────────────
-- TABLE 3: CHAT_MESSAGES
-- ────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  web_search_used boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_chat_id on public.chat_messages(chat_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);

-- ────────────────────────────────────────────────────────────
-- TABLE 4: MEMORIES
-- ────────────────────────────────────────────────────────────
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  category text,
  importance real default 0.5,
  embedding text,
  embedding_status text default 'pending',
  memory_state text default 'active',
  occurrence_count integer default 1,
  last_seen_at timestamptz default now(),
  superseded_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_memories_user_id on public.memories(user_id);
create index if not exists idx_memories_category on public.memories(category);
create index if not exists idx_memories_state on public.memories(memory_state);

-- ────────────────────────────────────────────────────────────
-- TABLE 5: EPISODES (for memory reflection engine)
-- ────────────────────────────────────────────────────────────
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  embedding text,
  created_at timestamptz default now()
);

create index if not exists idx_episodes_user_id on public.episodes(user_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.memories enable row level security;
alter table public.episodes enable row level security;


-- ────────────────────────────────────────────────────────────
-- PROFILES POLICIES
-- ────────────────────────────────────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- CHATS POLICIES
-- ────────────────────────────────────────────────────────────
create policy "Users can view own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can create own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.chats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.chats for delete
  using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- CHAT_MESSAGES POLICIES
-- Uses join through chats to verify ownership
-- ────────────────────────────────────────────────────────────
create policy "Users can view messages in own chats"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chats
      where chats.id = chat_messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own chats"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chats
      where chats.id = chat_messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in own chats"
  on public.chat_messages for delete
  using (
    exists (
      select 1 from public.chats
      where chats.id = chat_messages.chat_id
        and chats.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- MEMORIES POLICIES
-- ────────────────────────────────────────────────────────────
create policy "Users can view own memories"
  on public.memories for select
  using (auth.uid() = user_id);

create policy "Users can create own memories"
  on public.memories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own memories"
  on public.memories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own memories"
  on public.memories for delete
  using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- EPISODES POLICIES
-- ────────────────────────────────────────────────────────────
create policy "Users can view own episodes"
  on public.episodes for select
  using (auth.uid() = user_id);

create policy "Users can create own episodes"
  on public.episodes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own episodes"
  on public.episodes for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TRIGGER: AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, github_username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      ''
    ),
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    new.raw_user_meta_data ->> 'user_name'  -- GitHub username from OAuth metadata
  );
  return new;
end;
$$;

-- Drop trigger if it already exists to allow re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to chats
drop trigger if exists update_chats_updated_at on public.chats;
create trigger update_chats_updated_at
  before update on public.chats
  for each row execute function public.update_updated_at();

-- Apply to memories
drop trigger if exists update_memories_updated_at on public.memories;
create trigger update_memories_updated_at
  before update on public.memories
  for each row execute function public.update_updated_at();
