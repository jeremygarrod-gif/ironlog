-- IRONLOG — migration 002: weekly target and streak pauses
--
-- ADDITIVE. This does not drop or alter any existing table, so your logged
-- sessions are untouched. Safe to run more than once.
--
-- Supabase → SQL Editor → New snippet → paste → Run.

-- One row per person. Holds preferences that aren't tied to a workout.
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  weekly_target  int not null default 3,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Periods where missing sessions shouldn't break a streak: deloads, injury,
-- illness, travel. A pause bridges a gap rather than counting toward a streak.
create table if not exists public.pauses (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  start_date  date not null,
  end_date    date not null,
  reason      text not null default 'other',
  notes       text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists pauses_user_range_idx
  on public.pauses(user_id, start_date desc);

alter table public.settings enable row level security;
alter table public.pauses   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','pauses'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

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

do $$
declare t text;
begin
  foreach t in array array['settings','pauses'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
