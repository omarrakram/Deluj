-- ════════════════════════════════════════════════════════════════════════════
-- DELUJ Digital Operating System — Supabase schema
-- Run once in the Supabase SQL editor (or `psql -f supabase/schema.sql`).
-- Safe to re-run: everything is idempotent.
--
-- Security model
--   • The browser uses the anon key and can only SELECT (RLS policies below).
--     It needs read access so Supabase Realtime can stream row changes to it.
--   • Every write goes through the Next.js server with the service-role key,
--     after the shared domain engine has validated and re-priced it.
--   • No card data is ever stored: payments are demo-only.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.menu_items (
  id                 text primary key,
  name               text not null,
  description        text,
  price              integer not null check (price between 1 and 5000),
  category           text not null,
  available          boolean not null default true,
  featured           boolean not null default false,
  sort               integer not null default 0,
  tags               text[] not null default '{}',
  modifier_group_ids text[] not null default '{}',
  art                jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

create table if not exists public.orders (
  id                text primary key,
  number            integer not null,
  table_code        text,
  channel           text not null check (channel in ('dine_in', 'pickup', 'delivery')),
  via               text not null check (via in ('qr', 'app', 'counter', 'marketplace')),
  status            text not null check (status in ('new', 'accepted', 'preparing', 'ready', 'served', 'cancelled')),
  lines             jsonb not null,
  subtotal          integer not null,
  total             integer not null,
  payment_method    text not null check (payment_method in ('card', 'apple_pay', 'cash')),
  payment_status    text not null check (payment_status in ('paid', 'pay_at_table', 'paid_marketplace')),
  customer_name     text,
  is_returning      boolean not null default false,
  note              text,
  source            text not null default 'live' check (source in ('seed', 'live')),
  client_request_id text unique,
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  preparing_at      timestamptz,
  ready_at          timestamptz,
  served_at         timestamptz,
  updated_at        timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_table_idx on public.orders (table_code, created_at desc);

create table if not exists public.service_requests (
  id                text primary key,
  table_code        text not null,
  kind              text not null check (kind in ('waiter', 'bill', 'water', 'napkins', 'cutlery', 'sauce')),
  status            text not null check (status in ('open', 'acknowledged', 'done')),
  source            text not null default 'live' check (source in ('seed', 'live')),
  client_request_id text unique,
  created_at        timestamptz not null default now(),
  acknowledged_at   timestamptz,
  completed_at      timestamptz,
  updated_at        timestamptz not null default now()
);
create index if not exists service_requests_open_idx on public.service_requests (table_code, kind) where status <> 'done';

create table if not exists public.activity (
  id         text primary key,
  kind       text not null,
  title      text not null,
  detail     text,
  amount     integer,
  table_code text,
  ref_id     text,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_at_idx on public.activity (created_at desc);

create table if not exists public.table_sessions (
  table_code text primary key,
  opened_at  timestamptz not null default now()
);

create table if not exists public.demo_meta (
  id                integer primary key default 1 check (id = 1),
  reset_version     integer not null default 0,
  business_date     text not null default '',
  seeded_at         timestamptz not null default now(),
  last_order_number integer not null default 1000
);
insert into public.demo_meta (id) values (1) on conflict (id) do nothing;

-- ── Row Level Security: read-only for the browser ───────────────────────────
alter table public.menu_items       enable row level security;
alter table public.orders           enable row level security;
alter table public.service_requests enable row level security;
alter table public.activity         enable row level security;
alter table public.table_sessions   enable row level security;
alter table public.demo_meta        enable row level security;

grant usage on schema public to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['menu_items', 'orders', 'service_requests', 'activity', 'table_sessions', 'demo_meta'] loop
    -- The server writes with the service role: grant it explicitly rather than relying
    -- on a project's default privileges (which can be switched off).
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant select, insert, update, delete on public.%I to service_role', t);
    end if;
    execute format('drop policy if exists "demo read" on public.%I', t);
    execute format('create policy "demo read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- ── Realtime: stream every change to subscribed screens ─────────────────────
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['menu_items', 'orders', 'service_requests', 'activity', 'table_sessions', 'demo_meta'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Server-only functions (service role) ────────────────────────────────────

-- Atomic order numbers, safe under concurrent checkouts.
create or replace function public.next_order_number()
returns integer
language sql
security definer
set search_path = public
as $$
  update public.demo_meta set last_order_number = last_order_number + 1 where id = 1
  returning last_order_number;
$$;

-- Replace the whole demo state in one transaction (Reset Demo / new business day).
-- p_expected_version: when not null, only reset if nobody else already did.
create or replace function public.reset_demo(p_state jsonb, p_expected_version integer default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_next integer;
begin
  select reset_version into v_current from public.demo_meta where id = 1 for update;
  if p_expected_version is not null and v_current <> p_expected_version then
    return v_current;
  end if;
  v_next := coalesce(v_current, 0) + 1;

  -- TRUNCATE (unlike DELETE) is not streamed row by row to every open screen.
  truncate public.activity, public.service_requests, public.orders, public.table_sessions;

  insert into public.menu_items
    select * from jsonb_populate_recordset(null::public.menu_items, p_state -> 'menu')
  on conflict (id) do update set
    name = excluded.name, description = excluded.description, price = excluded.price,
    category = excluded.category, available = excluded.available, featured = excluded.featured,
    sort = excluded.sort, tags = excluded.tags, modifier_group_ids = excluded.modifier_group_ids,
    art = excluded.art, updated_at = excluded.updated_at;
  delete from public.menu_items
    where id not in (select x ->> 'id' from jsonb_array_elements(p_state -> 'menu') x);

  insert into public.orders select * from jsonb_populate_recordset(null::public.orders, p_state -> 'orders');
  insert into public.service_requests select * from jsonb_populate_recordset(null::public.service_requests, p_state -> 'requests');
  insert into public.activity select * from jsonb_populate_recordset(null::public.activity, p_state -> 'activity');
  insert into public.table_sessions select * from jsonb_populate_recordset(null::public.table_sessions, p_state -> 'sessions');

  update public.demo_meta set
    reset_version = v_next,
    business_date = p_state -> 'meta' ->> 'business_date',
    seeded_at = (p_state -> 'meta' ->> 'seeded_at')::timestamptz,
    last_order_number = (p_state -> 'meta' ->> 'last_order_number')::integer
  where id = 1;
  return v_next;
end;
$$;

revoke all on function public.next_order_number() from public, anon, authenticated;
revoke all on function public.reset_demo(jsonb, integer) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.next_order_number() to service_role;
    grant execute on function public.reset_demo(jsonb, integer) to service_role;
  end if;
end $$;
