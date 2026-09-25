# IRONLOG

A personal training log for Jeremy (plus a few testers), built around one top
set per exercise followed by back-off sets, with warm-ups calculated from the top
set. Installed on his iPhone as a home-screen web app.

The long-term goal is to streamline all of his training *and* nutrition planning
and tracking into this one app. See `ROADMAP.md` for the agreed plan.

## Working with Jeremy

- He isn't a developer. Explain what you're doing and why in plain language,
  and give numbered steps for anything he has to do himself.
- **He runs all SQL himself** in Supabase → SQL Editor. You have no database
  access. Put each schema change in a new numbered file (`migration-005.sql`, …)
  at the repo root, make it additive and safe to re-run, and tell him to run it
  *before* the code that needs it goes live.
- After a deploy, the installed app caches the old version. Tell him to fully
  close it from the app switcher and reopen.
- Keep his exercise names exactly as he has them. Names are the identity of a
  lift — see "Exercise names" below.

## Stack and deployment

- Vite + React 18, no router, no CSS files. Styles are inline objects built from
  tokens in `src/styles.js` (`C` for colours, `S` for shared styles).
- Supabase for auth (email + password) and Postgres. The URL and anon key are in
  `src/supabase.js`; both are public by design, and Row Level Security is what
  protects the data. Never put a service-role key or any secret in client code.
- Vercel deploys automatically from `main` on GitHub (`jeremygarrod-gif/ironlog`).
  Pushes to any other branch get their own preview URL.
- `npm run build` must succeed before any push. Check the exit code, not just the
  last line of output.

## Layout

- `src/App.jsx` — auth gate, loads all data once, routing, the global message
  banner (`flash`). **All hooks must run before the early returns** for auth and
  loading, or the app crashes on sign-in.
- `src/supabase.js` — every database call, backup import/export.
- `src/nav.js` — route stack mirrored into browser history, so in-app back
  buttons, the iOS edge swipe and Android back all behave the same.
- `src/stall.js` — e1RM, beat-the-log, baselines, all-time PRs.
- `src/achievements.js` — streaks, weekly goal, post-session summary.
- `src/utils.js` — rounding, formatting, dates, derived exercise library.
- `src/components.jsx` — shared inputs, `Confirm`, `Modal`, `HelpLink`.
- `src/screens/` — one file per screen. `Guide.jsx` is the in-app guide.

## Data

Every table has `user_id` and RLS limiting each person to their own rows. Primary
keys are **composite `(user_id, id)`**, so every upsert needs
`onConflict: "user_id,id"` and every delete must filter on `user_id` too.

Tables: `schemes`, `exercise_templates`, `workouts` (+ `archived_at`,
`archive_label`), `sessions`, `drafts`, `settings`, `pauses`, `blocks`,
`exercise_resets`. Nested structures are JSONB:

- workout `exercises`: `{ id, name, schemeId, topSetWeight, cue, workingSets: [{ isTop, repRange, pctReduction, rest, bodyweight }] }`
- session `exercises`: `{ name, topSetWeight, notes, sets: { warmups: [{ pct, reps, actualWt }], working: [{ isTop, repRange, weight, reps, bodyweight }] } }`. `weight` is `"BW"` for bodyweight sets.
- scheme `warmup_sets`: `[{ reps, pct, rest }]`

Any of `pct`, `reps` and `rest` can be a number or a `[lo, hi]` range. Session
dates (`performed_at`) are stored at midday so time zones can't shift the day.
The exercise library is **derived from sessions**, never stored.

`loadAll` treats `settings`, `pauses`, `blocks` and `exercise_resets` as optional,
so the app still loads if a migration hasn't been run yet. Keep that pattern for
new tables.

Migrations in the repo: `ironlog-schema.sql` (first deploy only — it drops and
recreates tables, **never run it again**), then `migration-002` to `004`, all run.
`v4-program.sql` was a one-time import of his current program; re-running it
would overwrite his edits to those workouts.

## Training rules the code implements

These came from Jeremy's own program and matter more than the code around them.

- Weights are in lb, rounded to the nearest 5.
- Every set is scored as **e1RM = weight × (1 + reps ÷ 30)**.
- **Beating the log:** a session's *top set* e1RM strictly greater than the best
  top set since the baseline. A tie does not count.
- **Stall counter:** a new best resets it to 0; anything else adds 1. Warn at 2,
  **stalled at 3**. Only the top set counts; back-offs are shown, never judged.
- **Baseline** starts at the latest of the current block's start date or a reset
  for that exercise. A new exercise name starts fresh on its own.
- **Deload and calibration** sessions are skipped entirely — neither counted nor
  a reset. Injury, illness, travel and other pauses protect streaks only.
- A past-dated session is compared only against sessions *before* its date.
- **Streaks** only ever encourage. A paused week bridges a streak: it neither
  breaks it nor adds to it. Nothing ever mentions a missed week.
- All-time PRs are separate, include everything, and never reset.

## Exercise names

Inside the app, names match **exactly, case-sensitively**. Two spellings are two
lifts with separate histories. The exercise-name field suggests existing names
for this reason. Any import should match names case-insensitively against his
existing history and use the stored spelling, as `v4-program.sql` did.

## Guardrails learned the hard way

- **Messages must be visible on every screen.** Errors used to render only on the
  home screen, so failures elsewhere looked like nothing happening. Use `flash`.
- **The workout screen must not lose input.** Its draft autosaves on a debounce,
  flushes on leaving the screen, and must never save after "Finish" (that
  resurrects a phantom in-progress workout).
- **A future-dated block is still a set block.** Goals shows it as "Next block".
- **Keep the guide true.** When behaviour changes, update the matching section of
  `src/screens/Guide.jsx` in the same change. Its section ids are what the `?`
  links point at.

## Tests

There's no test suite in the repo yet. Behaviour was verified with throwaway
scripts that weren't committed. Setting up Vitest and covering the rules above is
a good first task — especially the stall counter, baselines, deload skipping, and
the workout screen's save-on-exit behaviour.
