-- ============================================================
-- Cesar Botello Customs — Supabase Schema
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New Query → paste all of this → Run)
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- PROFILES — one row per signed-up user (customer or admin)
-- Supabase already gives us auth.users; this extends it.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- SETTINGS — single-row table for site-wide text/photos
-- ------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  business_name text not null default 'Cesar Botello Customs',
  location_line text not null default 'Murfreesboro, Tennessee',
  address text not null default '719 Minor St, Murfreesboro, TN',
  email text not null default 'cesarbotellocustoms@gmail.com',
  snapchat_handle text not null default 'cesarbotellocustoms',
  hero_eyebrow text default 'Family-Owned · Three Generations',
  hero_headline_top text default 'Every piece carries',
  hero_headline_em text default 'a mark, and a story.',
  hero_subhead text default 'Hand engraving, laser art, and custom metalwork on the firearms you already trust — plus a curated selection ready to take home. Started by our grandfather, carried today by two cousins who still do it by hand.',
  legacy_quote text default 'He didn''t teach us to engrave metal. He taught us to slow down and pay attention.',
  legacy_text text default 'What started as our grandad''s bench work has become a family business run today by two cousins — same precision, same respect for the craft, same last name on the door.',
  story_intro_title text default 'Grandad''s bench.',
  story_intro_text text default 'Long before there was a shopfront, there was a bench, a set of hand gravers, and a grandfather who believed a firearm could be a family heirloom, not just a tool.',
  story_outro_text text default 'Today the shop is run by two cousins — same last name, same bench discipline, same belief that precision and story belong together.',
  family_photo_url text,
  workshop_photo_url text,
  constraint single_row check (id = 1)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- FIREARMS
-- ------------------------------------------------------------
create table if not exists public.firearms (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('glock','colt','sig','draco')),
  engraved boolean not null default false,
  name text not null,
  tag text not null,
  description text not null,
  price text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CUSTOM WORK PORTFOLIO
-- ------------------------------------------------------------
create table if not exists public.custom_work (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text not null,
  description text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ACCESSORIES
-- ------------------------------------------------------------
create table if not exists public.accessories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- FAMILY TIMELINE
-- ------------------------------------------------------------
create table if not exists public.timeline (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  title text not null,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RAFFLE CONFIG — single-row table
-- ------------------------------------------------------------
create table if not exists public.raffle_settings (
  id int primary key default 1,
  ticket_price int not null default 100,
  total_tickets int not null default 50,
  max_per_person int not null default 3,
  duration_days int not null default 14,
  prize_image_url text,
  constraint single_row check (id = 1)
);
insert into public.raffle_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.raffle_prizes (
  id uuid primary key default gen_random_uuid(),
  place text not null,
  description text not null,
  sort_order int not null default 0
);

create table if not exists public.raffle_how_it_works (
  id uuid primary key default gen_random_uuid(),
  step_text text not null,
  sort_order int not null default 0
);

create table if not exists public.raffle_terms (
  id uuid primary key default gen_random_uuid(),
  term_text text not null,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- RAFFLE CODES — one code per ticket, redeemed by a logged-in customer
-- ------------------------------------------------------------
create table if not exists public.raffle_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'unused' check (status in ('unused','redeemed')),
  ticket_number int,
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REDEMPTION FUNCTION — atomic, race-condition safe.
-- Locks the code row, picks a random still-available ticket
-- number, and assigns it in one transaction so two people
-- redeeming at the same instant can never get the same number.
-- ============================================================
create or replace function public.redeem_raffle_code(input_code text, redeeming_user uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row public.raffle_codes%rowtype;
  v_total int;
  v_available int[];
  v_picked int;
begin
  -- Lock the specific code row so concurrent calls serialize on it
  select * into v_row
  from public.raffle_codes
  where code = upper(trim(input_code))
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'invalid');
  end if;

  if v_row.status = 'redeemed' then
    return jsonb_build_object('success', false, 'error', 'used', 'ticketNumber', v_row.ticket_number);
  end if;

  select total_tickets into v_total from public.raffle_settings where id = 1;

  -- Serialize all redemptions against each other (not just same code)
  -- so two different codes can't be assigned the same number.
  perform pg_advisory_xact_lock(hashtext('raffle_ticket_assignment'));

  select array_agg(n) into v_available
  from generate_series(1, v_total) as n
  where n not in (
    select ticket_number from public.raffle_codes where ticket_number is not null
  );

  if v_available is null or array_length(v_available, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'soldout');
  end if;

  v_picked := v_available[1 + floor(random() * array_length(v_available, 1))::int];

  update public.raffle_codes
  set status = 'redeemed',
      ticket_number = v_picked,
      redeemed_by = redeeming_user,
      redeemed_at = now()
  where id = v_row.id;

  return jsonb_build_object('success', true, 'ticketNumber', v_picked, 'totalTickets', v_total);
end;
$$;

-- Only our server (using the service-role key) may call this function.
-- It takes an arbitrary redeeming_user id, so it must never be callable
-- directly from the browser via the anon/authenticated roles.
revoke all on function public.redeem_raffle_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_raffle_code(text, uuid) to service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- Public can read site content. Only admins can write.
-- Raffle codes: nobody can read the raw table directly —
-- all access goes through the redeem_raffle_code() function
-- and the admin dashboard (service role, bypasses RLS).
-- ============================================================

alter table public.settings enable row level security;
alter table public.firearms enable row level security;
alter table public.custom_work enable row level security;
alter table public.accessories enable row level security;
alter table public.timeline enable row level security;
alter table public.raffle_settings enable row level security;
alter table public.raffle_prizes enable row level security;
alter table public.raffle_how_it_works enable row level security;
alter table public.raffle_terms enable row level security;
alter table public.raffle_codes enable row level security;
alter table public.profiles enable row level security;

-- Public read access to site content
create policy "public read settings" on public.settings for select using (true);
create policy "public read firearms" on public.firearms for select using (true);
create policy "public read custom_work" on public.custom_work for select using (true);
create policy "public read accessories" on public.accessories for select using (true);
create policy "public read timeline" on public.timeline for select using (true);
create policy "public read raffle_settings" on public.raffle_settings for select using (true);
create policy "public read raffle_prizes" on public.raffle_prizes for select using (true);
create policy "public read raffle_how_it_works" on public.raffle_how_it_works for select using (true);
create policy "public read raffle_terms" on public.raffle_terms for select using (true);

-- Users can see their own profile only
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

-- No public policies on raffle_codes at all — the app talks to it
-- only via the SECURITY DEFINER function above, or via the
-- service-role key from the admin dashboard (which bypasses RLS).

-- NOTE: Write access (insert/update/delete on the content tables)
-- is handled by the admin dashboard using Supabase's service-role
-- key on the server, which bypasses RLS entirely. That key is never
-- exposed to the browser. This keeps the policies above simple:
-- "public can read, nothing else is allowed by anon/authenticated
-- roles" — all admin writes happen server-side with elevated trust.

-- ============================================================
-- To make yourself an admin after you sign up once on the site:
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- ============================================================
