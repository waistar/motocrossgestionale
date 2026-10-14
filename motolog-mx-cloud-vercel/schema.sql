-- Esegui nell'SQL Editor del tuo progetto Supabase, una sola volta.
create table if not exists public.garage_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.garage_data enable row level security;
revoke all on public.garage_data from anon;
grant select, insert, update on public.garage_data to authenticated;
drop policy if exists "garage_select_owner" on public.garage_data;
drop policy if exists "garage_insert_owner" on public.garage_data;
drop policy if exists "garage_update_owner" on public.garage_data;
create policy "garage_select_owner" on public.garage_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "garage_insert_owner" on public.garage_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "garage_update_owner" on public.garage_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
