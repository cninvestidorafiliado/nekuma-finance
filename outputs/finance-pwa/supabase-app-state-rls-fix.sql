-- Correção segura para o erro:
-- "new row violates row-level security policy for table app_states"
--
-- Rode este arquivo no Supabase em:
-- SQL Editor > New query > Run

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

alter table public.app_states enable row level security;

grant select, insert, update, delete on public.app_states to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;

drop policy if exists "members can manage app state" on public.app_states;
create policy "members can manage app state"
on public.app_states for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create or replace function public.save_app_state(target_household_id uuid, app_state jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'usuario nao pertence a esta familia';
  end if;

  insert into public.app_states (household_id, state, updated_by, updated_at)
  values (target_household_id, coalesce(app_state, '{}'::jsonb), auth.uid(), saved_at)
  on conflict (household_id) do update
    set state = excluded.state,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return saved_at;
end;
$$;

grant execute on function public.save_app_state(uuid, jsonb) to authenticated;
