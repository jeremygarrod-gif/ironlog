-- IRONLOG — migration 005: bodyweight and waist tracking
--
-- ADDITIVE. Adds one new table; does not touch anything else you already
-- have. Safe to run more than once.
--
-- Supabase → SQL Editor → New query → paste the whole file → Run.

create table if not exists public.body_metrics (
  user_id      uuid not null references auth.users(id) on delete cascade,
  id           text not null,
  measured_at  timestamptz not null,
  weight_lb    numeric,
  waist_in     numeric,
  notes        text default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id),
  constraint body_metrics_has_a_value check (weight_lb is not null or waist_in is not null)
);

create index if not exists body_metrics_user_date_idx
  on public.body_metrics(user_id, measured_at desc);

alter table public.body_metrics enable row level security;

drop policy if exists "own rows select" on public.body_metrics;
drop policy if exists "own rows insert" on public.body_metrics;
drop policy if exists "own rows update" on public.body_metrics;
drop policy if exists "own rows delete" on public.body_metrics;

create policy "own rows select" on public.body_metrics
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.body_metrics
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.body_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.body_metrics
  for delete using (auth.uid() = user_id);

drop trigger if exists touch_updated_at on public.body_metrics;
create trigger touch_updated_at before update on public.body_metrics
  for each row execute function public.touch_updated_at();
