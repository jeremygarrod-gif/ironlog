-- IRONLOG — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run.

-- Fresh start if a previous version of this schema was applied
drop table if exists public.drafts cascade;
drop table if exists public.sessions cascade;
drop table if exists public.workouts cascade;
drop table if exists public.exercise_templates cascade;
drop table if exists public.schemes cascade;

-- ─────────────────────────────────────────────────────────────
-- Tables
--
-- Primary keys are (user_id, id). Records belong to a person, and
-- ids only need to be unique within that person's own data — which
-- lets everyone's defaults share readable ids like 's1' without
-- one account colliding with another.
--
-- Top-level entities are rows; naturally nested structures
-- (warm-up sets, working sets, logged exercises) are JSONB,
-- matching how the app already models them.
-- ─────────────────────────────────────────────────────────────

-- Warm-up schemes: 5321, 2-Feeler, 1-Feeler, None, plus your own
create table public.schemes (
  user_id      uuid not null references auth.users(id) on delete cascade,
  id           text not null,
  name         text not null,
  warmup_sets  jsonb not null default '[]'::jsonb,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

-- Exercise templates: a warm-up scheme plus a working-set structure
create table public.exercise_templates (
  user_id       uuid not null references auth.users(id) on delete cascade,
  id            text not null,
  name          text not null,
  scheme_id     text,
  working_sets  jsonb not null default '[]'::jsonb,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

-- Workout days. Exercises are stored as JSONB.
create table public.workouts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  name        text not null,
  exercises   jsonb not null default '[]'::jsonb,
  notes       text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- Completed sessions. performed_at is the editable workout date.
create table public.sessions (
  user_id       uuid not null references auth.users(id) on delete cascade,
  id            text not null,
  workout_id    text,
  workout_name  text,
  performed_at  timestamptz not null,
  notes         text default '',
  exercises     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

-- In-progress workouts. One per workout per person.
create table public.drafts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  workout_id  text not null,
  state       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, workout_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

create index sessions_user_date_idx  on public.sessions(user_id, performed_at desc);
create index sessions_workout_idx    on public.sessions(user_id, workout_id, performed_at desc);
-- Supports "when did I last do this lift" searches inside the JSONB
create index sessions_exercises_gin  on public.sessions using gin (exercises);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Every table: you only ever see or touch your own rows.
-- This is what makes a shared link safe.
-- ─────────────────────────────────────────────────────────────

alter table public.schemes            enable row level security;
alter table public.exercise_templates enable row level security;
alter table public.workouts           enable row level security;
alter table public.sessions           enable row level security;
alter table public.drafts             enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'schemes','exercise_templates','workouts','sessions','drafts'
  ] loop
    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Keep updated_at current on every write
-- ─────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'schemes','exercise_templates','workouts','sessions','drafts'
  ] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
