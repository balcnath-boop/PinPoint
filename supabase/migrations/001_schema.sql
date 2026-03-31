-- ============================================================
-- PINPOINT — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── TRIPS ──────────────────────────────────────────────────
create table public.trips (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz default now(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  destination   text not null,
  start_date    date not null,
  end_date      date not null,
  cover_color   text default '#2A4A6B',
  share_token   text unique not null default encode(gen_random_bytes(8), 'hex'),
  is_archived   boolean default false,

  -- Logistics
  flight_out_airline      text,
  flight_out_number       text,
  flight_out_confirmation text,
  flight_out_departs      timestamptz,
  flight_out_arrives      timestamptz,

  flight_ret_airline      text,
  flight_ret_number       text,
  flight_ret_confirmation text,
  flight_ret_departs      timestamptz,
  flight_ret_arrives      timestamptz,

  hotel_name              text,
  hotel_address           text,
  hotel_confirmation      text,
  hotel_checkin           timestamptz,
  hotel_checkout          timestamptz
);

-- ── DAYS ───────────────────────────────────────────────────
create table public.days (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  trip_id     uuid references public.trips(id) on delete cascade not null,
  date        date not null,
  day_number  integer not null,
  label       text
);

-- ── PLACES ─────────────────────────────────────────────────
create type public.place_category as enum (
  'sight', 'food', 'hotel', 'activity', 'transport', 'other'
);

create table public.places (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz default now(),
  trip_id      uuid references public.trips(id) on delete cascade not null,
  day_id       uuid references public.days(id) on delete cascade not null,
  name         text not null,
  address      text,
  latitude     double precision,
  longitude    double precision,
  category     public.place_category default 'sight',
  notes        text,
  sort_order   integer default 0,
  completed    boolean default false,
  completed_at timestamptz
);

-- ── INDEXES ────────────────────────────────────────────────
create index trips_user_id_idx on public.trips(user_id);
create index trips_share_token_idx on public.trips(share_token);
create index days_trip_id_idx on public.days(trip_id);
create index places_day_id_idx on public.places(day_id);
create index places_trip_id_idx on public.places(trip_id);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.trips  enable row level security;
alter table public.days   enable row level security;
alter table public.places enable row level security;

-- Trips: owners can do everything
create policy "Users manage own trips"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trips: anyone can read via share_token (handled in app layer with service role)
-- We expose a separate RPC for this so anon can't enumerate all trips

-- Days: owner access via trip
create policy "Users manage own days"
  on public.days for all
  using (
    exists (
      select 1 from public.trips t
      where t.id = days.trip_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = days.trip_id and t.user_id = auth.uid()
    )
  );

-- Places: owner access via trip
create policy "Users manage own places"
  on public.places for all
  using (
    exists (
      select 1 from public.trips t
      where t.id = places.trip_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = places.trip_id and t.user_id = auth.uid()
    )
  );

-- ── RPC: Get trip by share token (public, no auth) ─────────
create or replace function public.get_trip_by_token(token text)
returns table (
  trip_id       uuid,
  trip_name     text,
  destination   text,
  start_date    date,
  end_date      date,
  cover_color   text,
  flight_out_airline      text,
  flight_out_number       text,
  flight_out_confirmation text,
  flight_out_departs      timestamptz,
  flight_out_arrives      timestamptz,
  flight_ret_airline      text,
  flight_ret_number       text,
  flight_ret_confirmation text,
  flight_ret_departs      timestamptz,
  flight_ret_arrives      timestamptz,
  hotel_name              text,
  hotel_address           text,
  hotel_confirmation      text,
  hotel_checkin           timestamptz,
  hotel_checkout          timestamptz
)
language sql security definer
as $$
  select
    id, name, destination, start_date, end_date, cover_color,
    flight_out_airline, flight_out_number, flight_out_confirmation,
    flight_out_departs, flight_out_arrives,
    flight_ret_airline, flight_ret_number, flight_ret_confirmation,
    flight_ret_departs, flight_ret_arrives,
    hotel_name, hotel_address, hotel_confirmation,
    hotel_checkin, hotel_checkout
  from public.trips
  where share_token = token
    and is_archived = false;
$$;

create or replace function public.get_days_by_token(token text)
returns table (
  id uuid, trip_id uuid, date date, day_number int, label text
)
language sql security definer
as $$
  select d.id, d.trip_id, d.date, d.day_number, d.label
  from public.days d
  join public.trips t on t.id = d.trip_id
  where t.share_token = token
    and t.is_archived = false
  order by d.day_number;
$$;

create or replace function public.get_places_by_token(token text)
returns table (
  id uuid, day_id uuid, trip_id uuid, name text, address text,
  latitude double precision, longitude double precision,
  category public.place_category, notes text,
  sort_order int, completed boolean, completed_at timestamptz
)
language sql security definer
as $$
  select p.id, p.day_id, p.trip_id, p.name, p.address,
    p.latitude, p.longitude, p.category, p.notes,
    p.sort_order, p.completed, p.completed_at
  from public.places p
  join public.trips t on t.id = p.trip_id
  where t.share_token = token
    and t.is_archived = false
  order by p.sort_order;
$$;

-- Grant anon access to the RPCs (not to the tables directly)
grant execute on function public.get_trip_by_token(text) to anon;
grant execute on function public.get_days_by_token(text) to anon;
grant execute on function public.get_places_by_token(text) to anon;
