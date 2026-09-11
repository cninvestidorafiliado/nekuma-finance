-- Execute once in the Supabase SQL Editor.
-- Reject snapshots from devices still running a version older than the reset.
-- No existing family data is deleted by this migration.
begin;

create or replace function public.guard_app_state_reset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(nullif(new.state->>'resetAt', ''), '1970-01-01T00:00:00Z')::timestamptz
     < coalesce(nullif(old.state->>'resetAt', ''), '1970-01-01T00:00:00Z')::timestamptz then
    raise exception 'Os dados desta familia foram resetados. Atualize o aplicativo antes de salvar.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_app_state_reset on public.app_states;
create trigger guard_app_state_reset
before update of state on public.app_states
for each row execute function public.guard_app_state_reset();

commit;
