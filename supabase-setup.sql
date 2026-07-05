-- ============================================================
-- Ma routine — schéma Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- Une ligne par utilisateur : tout l'état de l'appli en JSON.
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sécurité : chaque personne ne voit et ne modifie QUE sa propre ligne.
alter table public.app_state enable row level security;

drop policy if exists "own state select" on public.app_state;
drop policy if exists "own state insert" on public.app_state;
drop policy if exists "own state update" on public.app_state;

create policy "own state select" on public.app_state
  for select using (auth.uid() = user_id);
create policy "own state insert" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "own state update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
