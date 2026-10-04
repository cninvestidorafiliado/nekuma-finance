-- Nekuma Finance: family roles and server-side authorization.
-- Apply after supabase-schema.sql or supabase-continue-existing.sql.

alter table public.household_members drop constraint if exists household_members_role_check;
alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner', 'admin', 'editor', 'member', 'viewer'));

create or replace function public.is_household_writer(target_household_id uuid)
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
      and hm.role in ('owner', 'admin', 'editor', 'member')
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
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
      and hm.role = 'owner'
  );
$$;

create or replace function public.update_household_member_role(
  target_household_id uuid,
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_household_owner(target_household_id) then
    raise exception 'apenas o dono pode alterar permissoes';
  end if;
  if new_role not in ('admin', 'editor', 'viewer') then
    raise exception 'papel familiar invalido';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'o dono nao pode alterar o proprio papel';
  end if;

  update public.household_members
  set role = new_role
  where household_id = target_household_id
    and user_id = target_user_id
    and role <> 'owner';

  if not found then
    raise exception 'membro nao encontrado ou protegido';
  end if;
end;
$$;

create or replace function public.join_household_by_code(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select h.id into target_household
  from public.households h
  where h.invite_code = upper(trim(join_code))
  limit 1;

  if target_household is null then
    raise exception 'codigo de familia invalido';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household, auth.uid(), 'viewer')
  on conflict (household_id, user_id) do nothing;

  return target_household;
end;
$$;

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
  if not public.is_household_writer(target_household_id) then
    raise exception 'usuario sem permissao para editar esta familia';
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

drop policy if exists "members can update households" on public.households;
create policy "owners can update households"
on public.households for update
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

drop policy if exists "members can manage app state" on public.app_states;
drop policy if exists "members can read app state" on public.app_states;
drop policy if exists "writers can insert app state" on public.app_states;
drop policy if exists "writers can update app state" on public.app_states;
drop policy if exists "writers can delete app state" on public.app_states;

create policy "members can read app state"
on public.app_states for select
using (public.is_household_member(household_id));

create policy "writers can insert app state"
on public.app_states for insert
with check (public.is_household_writer(household_id));

create policy "writers can update app state"
on public.app_states for update
using (public.is_household_writer(household_id))
with check (public.is_household_writer(household_id));

create policy "writers can delete app state"
on public.app_states for delete
using (public.is_household_writer(household_id));

grant execute on function public.is_household_writer(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.update_household_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;
grant execute on function public.save_app_state(uuid, jsonb) to authenticated;
