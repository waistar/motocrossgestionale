-- Eseguire una sola volta nel SQL Editor del progetto Supabase.
-- Questa funzione esegue una query senza leggere o modificare i dati del garage.
begin;

create or replace function public.garage_heartbeat()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

revoke all on function public.garage_heartbeat() from public;
grant execute on function public.garage_heartbeat() to anon, authenticated;

commit;
