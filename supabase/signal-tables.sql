-- Adaptive Lifting: tables for the Signal workout (run once in the Supabase SQL editor).
-- Additive only. Every table is prefixed lifting_ and locked to its owner.

create table if not exists public.lifting_signal_visits (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  finished_at timestamptz not null,
  record jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.lifting_signal_visits enable row level security;
drop policy if exists "signal visits: owner" on public.lifting_signal_visits;
create policy "signal visits: owner" on public.lifting_signal_visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.lifting_signal_state (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.lifting_signal_state enable row level security;
drop policy if exists "signal state: owner" on public.lifting_signal_state;
create policy "signal state: owner" on public.lifting_signal_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.lifting_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text not null,
  context jsonb not null
);
alter table public.lifting_feedback enable row level security;
drop policy if exists "feedback: owner" on public.lifting_feedback;
create policy "feedback: owner" on public.lifting_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
