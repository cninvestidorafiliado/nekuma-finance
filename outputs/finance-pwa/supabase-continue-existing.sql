create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'JPY',
  default_rate numeric(12, 6) not null default 0.035,
  created_at timestamptz not null default now()
);

alter table public.households add column if not exists invite_code text;
alter table public.households alter column invite_code set default upper(encode(gen_random_bytes(5), 'hex'));
update public.households
set invite_code = upper(encode(gen_random_bytes(5), 'hex'))
where invite_code is null or invite_code = '';
alter table public.households alter column invite_code set not null;
create unique index if not exists households_invite_code_key on public.households(invite_code);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null check (country in ('brasil', 'japao')),
  type text not null,
  title text not null,
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null check (currency in ('BRL', 'JPY')),
  date date not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'debt', 'card', 'consortium', 'investment', 'vehicle'));

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  method text not null default 'Wise',
  from_country text not null default 'japao',
  to_country text not null default 'brasil',
  sent_amount numeric(14, 2) not null check (sent_amount >= 0),
  sent_currency text not null default 'JPY',
  fee_amount numeric(14, 2) not null default 0,
  fee_currency text not null default 'JPY',
  rate numeric(12, 6) not null,
  received_amount numeric(14, 2) not null check (received_amount >= 0),
  received_currency text not null default 'BRL',
  date date not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null check (country in ('brasil', 'japao')),
  provider text,
  title text not null,
  category text not null,
  type text not null check (type in ('expense', 'debt', 'card', 'consortium', 'investment')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null check (currency in ('BRL', 'JPY')),
  due_day integer not null check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.commitment_payments (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  month text not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  paid_by uuid references auth.users(id),
  paid_at timestamptz not null default now(),
  unique (commitment_id, month)
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null check (country in ('brasil', 'japao')),
  provider text,
  title text not null,
  type text not null,
  original_amount numeric(14, 2) not null check (original_amount >= 0),
  outstanding_amount numeric(14, 2) not null check (outstanding_amount >= 0),
  installment_amount numeric(14, 2) not null check (installment_amount >= 0),
  currency text not null check (currency in ('BRL', 'JPY')),
  due_day integer check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null check (country in ('brasil', 'japao')),
  provider text,
  title text not null,
  current_amount numeric(14, 2) not null default 0,
  monthly_contribution numeric(14, 2) not null default 0,
  currency text not null check (currency in ('BRL', 'JPY')),
  risk text,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null check (country in ('brasil', 'japao')),
  issuer text not null,
  nickname text not null,
  brand text,
  last4 text,
  limit_amount numeric(14, 2) not null default 0,
  bill_amount numeric(14, 2) not null default 0,
  currency text not null check (currency in ('BRL', 'JPY')),
  closing_day integer check (closing_day between 1 and 31),
  due_day integer check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);

create table if not exists public.crypto_assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  symbol text not null,
  quantity numeric(24, 10) not null check (quantity >= 0),
  cost_amount numeric(14, 2) not null check (cost_amount >= 0),
  cost_currency text not null check (cost_currency in ('BRL', 'JPY')),
  purchase_date date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  country text not null default 'japao' check (country in ('japao')),
  model text,
  plate text,
  shaken_amount numeric(14, 2) not null default 0,
  shaken_due_date date,
  insurance_amount numeric(14, 2) not null default 0,
  insurance_day integer check (insurance_day between 1 and 31),
  insurance_company text,
  insurance_payment_method text,
  currency text not null default 'JPY' check (currency in ('JPY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_maintenance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  kind text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'JPY' check (currency in ('JPY')),
  date date not null,
  payment_method text,
  location text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('salary', 'amazon', 'uber', 'extra')),
  hourly_rate numeric(14, 2) not null default 0,
  color text,
  currency text not null default 'JPY' check (currency in ('BRL', 'JPY')),
  pay_rule text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_id uuid references public.income_sources(id) on delete set null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'JPY' check (currency in ('BRL', 'JPY')),
  date date not null,
  period_start date,
  period_end date,
  work_days integer not null default 0 check (work_days >= 0),
  hirukin_days integer not null default 0 check (hirukin_days >= 0),
  yakin_days integer not null default 0 check (yakin_days >= 0),
  weekend_days integer not null default 0 check (weekend_days >= 0),
  hourly_rate numeric(14, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_states (
  household_id uuid primary key references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.commitments enable row level security;
alter table public.commitment_payments enable row level security;
alter table public.debts enable row level security;
alter table public.investments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.crypto_assets enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_maintenance enable row level security;
alter table public.income_sources enable row level security;
alter table public.work_incomes enable row level security;
alter table public.app_states enable row level security;

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

create or replace function public.ensure_default_household(household_name text default 'Familia')
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

  select hm.household_id
    into target_household
  from public.household_members hm
  where hm.user_id = auth.uid()
  order by hm.created_at asc
  limit 1;

  if target_household is null then
    insert into public.households (name)
    values (coalesce(nullif(trim(household_name), ''), 'Familia'))
    returning id into target_household;

    insert into public.household_members (household_id, user_id, role)
    values (target_household, auth.uid(), 'owner');
  end if;

  return target_household;
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

  select h.id
    into target_household
  from public.households h
  where h.invite_code = upper(trim(join_code))
  limit 1;

  if target_household is null then
    raise exception 'codigo de familia invalido';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return target_household;
end;
$$;

grant execute on function public.ensure_default_household(text) to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;

drop policy if exists "members can read households" on public.households;
create policy "members can read households"
on public.households for select
using (public.is_household_member(id));

drop policy if exists "members can update households" on public.households;
create policy "members can update households"
on public.households for update
using (public.is_household_member(id));

drop policy if exists "members can read household members" on public.household_members;
create policy "members can read household members"
on public.household_members for select
using (public.is_household_member(household_id));

drop policy if exists "members can manage transactions" on public.transactions;
create policy "members can manage transactions"
on public.transactions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage transfers" on public.transfers;
create policy "members can manage transfers"
on public.transfers for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage commitments" on public.commitments;
create policy "members can manage commitments"
on public.commitments for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage commitment payments" on public.commitment_payments;
create policy "members can manage commitment payments"
on public.commitment_payments for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage debts" on public.debts;
create policy "members can manage debts"
on public.debts for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage investments" on public.investments;
create policy "members can manage investments"
on public.investments for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage credit cards" on public.credit_cards;
create policy "members can manage credit cards"
on public.credit_cards for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage crypto assets" on public.crypto_assets;
create policy "members can manage crypto assets"
on public.crypto_assets for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage vehicles" on public.vehicles;
create policy "members can manage vehicles"
on public.vehicles for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage vehicle maintenance" on public.vehicle_maintenance;
create policy "members can manage vehicle maintenance"
on public.vehicle_maintenance for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage income sources" on public.income_sources;
create policy "members can manage income sources"
on public.income_sources for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage work incomes" on public.work_incomes;
create policy "members can manage work incomes"
on public.work_incomes for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can manage app state" on public.app_states;
create policy "members can manage app state"
on public.app_states for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
