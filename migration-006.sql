-- IRONLOG — migration 006: check-ins
--
-- Steps and sleep are numbers (they get trend charts and weekly averages);
-- hunger, energy, joints, wins and questions are free-text notes.
-- Waist stays in Body tracking (migration 005).
--
-- ADDITIVE. Adds one new table; does not touch anything you already have.
-- Safe to run more than once.
--
-- Supabase → SQL Editor → New query → paste the whole file → Run.

create table if not exists public.check_ins (
  user_id       uuid not null references auth.users(id) on delete cascade,
  id            text not null,
  checked_at    timestamptz not null,
  steps         integer check (steps is null or steps >= 0),
  sleep_hours   numeric check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  hunger        text default '',
  energy        text default '',
  joints        text default '',
  wins          text default '',
  questions     text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id),
  constraint check_ins_has_a_value check (
    steps is not null
    or sleep_hours is not null
    or coalesce(hunger, '') <> ''
    or coalesce(energy, '') <> ''
    or coalesce(joints, '') <> ''
    or coalesce(wins, '') <> ''
    or coalesce(questions, '') <> ''
  )
);

create index if not exists check_ins_user_date_idx
  on public.check_ins(user_id, checked_at desc);

alter table public.check_ins enable row level security;

drop policy if exists "own rows select" on public.check_ins;
drop policy if exists "own rows insert" on public.check_ins;
drop policy if exists "own rows update" on public.check_ins;
drop policy if exists "own rows delete" on public.check_ins;

create policy "own rows select" on public.check_ins
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.check_ins
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.check_ins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.check_ins
  for delete using (auth.uid() = user_id);

drop trigger if exists touch_updated_at on public.check_ins;
create trigger touch_updated_at before update on public.check_ins
  for each row execute function public.touch_updated_at();
