create or replace function public.list_household_members(target_household_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  joined_at timestamptz,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    hm.user_id,
    au.email::text,
    coalesce(
      nullif(au.raw_user_meta_data->>'name', ''),
      nullif(au.raw_user_meta_data->>'family_name', ''),
      au.email
    )::text as display_name,
    hm.role,
    hm.created_at as joined_at,
    hm.user_id = auth.uid() as is_current_user
  from public.household_members hm
  join auth.users au on au.id = hm.user_id
  where hm.household_id = target_household_id
    and public.is_household_member(target_household_id)
  order by hm.created_at asc;
$$;

grant execute on function public.list_household_members(uuid) to authenticated;
