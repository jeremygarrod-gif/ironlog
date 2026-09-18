// Achievements — worked out from session history at the moment a workout is
// finished.
//
// Deliberately one-directional: this celebrates, and never announces a broken
// streak or a missed week. Deloads, illness and rest are part of training, and
// an app that scolds you for them is working against the person using it.

// ── Week handling ────────────────────────────────────────────────────────────
// Weeks run Monday to Sunday, keyed by the date of their Monday.

export function weekKey(dateish) {
  const d = new Date(dateish);
  const offset = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - offset);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function prevWeek(key) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// Which week-keys a pause covers, inclusive of both ends
export function pausedWeekKeys(pauses) {
  const keys = new Set();
  for (const p of pauses || []) {
    let cur = weekKey(`${p.start_date}T12:00:00`);
    const last = weekKey(`${p.end_date}T12:00:00`);
    let guard = 0;
    while (guard++ < 520) {
      keys.add(cur);
      if (cur >= last) break;
      const d = new Date(`${cur}T12:00:00`);
      d.setDate(d.getDate() + 7);
      cur = d.toISOString().slice(0, 10);
    }
  }
  return keys;
}

function groupByWeek(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const k = weekKey(s.performed_at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return map;
}

// ── Streaks ──────────────────────────────────────────────────────────────────

// Consecutive weeks counting back from `from` where `test` holds.
//
// A paused week neither counts nor breaks: it bridges. Three weeks out injured
// joins week six to week seven, and the total still reads seven — the number
// should describe work done, not time elapsed.
function streakBack(byWeek, from, test, paused) {
  let count = 0;
  let key = from;
  let guard = 0;
  while (guard++ < 520) {
    const week = byWeek.get(key);
    if (week && test(week)) {
      count += 1;
    } else if (!paused || !paused.has(key)) {
      break;
    }
    key = prevWeek(key);
  }
  return count;
}

export function computeStreaks(sessions, workouts, options = {}) {
  const { reference = new Date(), weeklyTarget, pauses = [] } = options;

  const byWeek = groupByWeek(sessions);
  const thisWeek = weekKey(reference);
  const ids = workouts.map((w) => w.id);
  const paused = pausedWeekKeys(pauses);

  // The goal is a number of sessions per week, stated rather than inferred.
  // Falling back to the template count keeps behaviour sane before anyone has
  // opened the settings screen.
  const target = weeklyTarget && weeklyTarget > 0 ? weeklyTarget : ids.length || 3;

  const isComplete = (weekSessions) => weekSessions.length >= target;

  // A streak shouldn't evaporate mid-week just because you haven't finished
  // this week's slate yet, so if the current week isn't complete we measure
  // from last week instead.
  const completeFrom =
    byWeek.has(thisWeek) && isComplete(byWeek.get(thisWeek)) ? thisWeek : prevWeek(thisWeek);
  const activeFrom = byWeek.has(thisWeek) ? thisWeek : prevWeek(thisWeek);

  const perWorkout = {};
  for (const w of workouts) {
    const from = (byWeek.get(thisWeek) || []).some((s) => s.workout_id === w.id)
      ? thisWeek
      : prevWeek(thisWeek);
    perWorkout[w.id] = streakBack(
      byWeek,
      from,
      (ws) => ws.some((s) => s.workout_id === w.id),
      paused
    );
  }

  const thisWeekSessions = byWeek.get(thisWeek) || [];
  const doneThisWeek = new Set(thisWeekSessions.map((s) => s.workout_id));

  return {
    totalSessions: sessions.length,
    target,
    doneThisWeek,
    weekPaused: paused.has(thisWeek),
    weekComplete: thisWeekSessions.length >= target,
    sessionsThisWeek: thisWeekSessions.length,
    remaining: Math.max(0, target - thisWeekSessions.length),
    completeWeeks: streakBack(byWeek, completeFrom, isComplete, paused),
    activeWeeks: streakBack(byWeek, activeFrom, (ws) => ws.length > 0, paused),
    perWorkout,
  };
}

// ── Lift comparisons ─────────────────────────────────────────────────────────

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

function topSetOf(exercise) {
  return exercise?.sets?.working?.find((w) => w.isTop) || null;
}

// Every prior recording of a lift, newest first
function historyFor(sessions, name, excludeId) {
  const out = [];
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    const ex = (s.exercises || []).find((e) => e.name === name);
    if (ex) out.push({ session: s, exercise: ex });
  }
  return out;
}

function compareLift(sessions, savedSession, exercise) {
  const top = topSetOf(exercise);
  if (!top || top.bodyweight) return null;

  const weight = num(top.weight);
  const reps = parseInt(top.reps, 10);
  if (!weight || isNaN(reps) || reps <= 0) return null;

  const past = historyFor(sessions, exercise.name, savedSession.id);
  if (!past.length) return null;

  const priorTops = past
    .map((p) => topSetOf(p.exercise))
    .filter((t) => t && !t.bodyweight && num(t.weight) && parseInt(t.reps, 10) > 0)
    .map((t) => ({ weight: num(t.weight), reps: parseInt(t.reps, 10) }));

  if (!priorTops.length) return null;

  const heaviestEver = Math.max(...priorTops.map((t) => t.weight));
  const bestRepsAtWeight = Math.max(
    0,
    ...priorTops.filter((t) => t.weight === weight).map((t) => t.reps)
  );
  const last = priorTops[0];

  if (weight > heaviestEver) {
    return { kind: "pb-weight", name: exercise.name, weight, reps, previous: heaviestEver };
  }
  if (weight === heaviestEver && bestRepsAtWeight > 0 && reps > bestRepsAtWeight) {
    return { kind: "pb-reps", name: exercise.name, weight, reps, previous: bestRepsAtWeight };
  }
  if (weight > last.weight) {
    return { kind: "up-weight", name: exercise.name, weight, reps, previous: last.weight };
  }
  if (weight === last.weight && reps > last.reps) {
    return { kind: "up-reps", name: exercise.name, weight, reps, previous: last.reps };
  }
  return null;
}

// ── Message pools ────────────────────────────────────────────────────────────
// Indexed by the streak or milestone value rather than picked at random, so the
// wording changes as the number grows instead of repeating by chance.

const MESSAGES = {
  weekComplete: [
    "Full week, done. Every session on the board.",
    "That's the whole week logged. Nothing skipped.",
    "Clean sweep. Every workout this week accounted for.",
    "Week complete — you showed up for all of it.",
    "All sessions in. That's the hard part handled.",
    "Whole week, start to finish. Well done.",
  ],
  completeWeeks: [
    "",
    "",
    "Two complete weeks back to back.",
    "Three full weeks running. That's a habit forming.",
    "Four complete weeks. This is what consistency looks like.",
    "Five weeks straight, nothing missed. Serious work.",
    "Six full weeks. Most people never get here.",
    "Seven weeks running. That's not luck any more.",
    "Eight complete weeks. Genuinely impressive.",
  ],
  activeWeeks: [
    "",
    "",
    "Two weeks running.",
    "Three weeks in a row in the gym.",
    "Four straight weeks of training.",
    "Five weeks without a gap.",
    "Six weeks running. Momentum is real.",
    "Seven weeks straight.",
    "Eight weeks of showing up.",
  ],
  workoutStreak: [
    "",
    "",
    "Two weeks running on {name}.",
    "Three {name} sessions, three weeks straight.",
    "Four weeks of {name} without missing one.",
    "Five weeks running on {name}. Rock solid.",
    "Six straight weeks of {name}.",
    "Seven weeks of {name}. That lift is getting your full attention.",
  ],
  milestone: [
    "{n} sessions logged.",
    "{n} workouts in the books.",
    "{n} sessions deep.",
    "That's {n} logged sessions.",
  ],
  pbWeight: [
    "New best on {name} — {weight} lbs for {reps}. Previous best was {previous}.",
    "{name} personal best: {weight} lbs × {reps}. Beat {previous}.",
    "Heaviest {name} yet — {weight} lbs. Old mark was {previous}.",
    "{weight} lbs on {name}. That's a new ceiling, up from {previous}.",
  ],
  pbReps: [
    "Best reps yet at {weight} on {name} — {reps}, up from {previous}.",
    "{name}: {reps} reps at {weight} lbs, more than you've ever done at that weight.",
    "New rep record on {name} at {weight} lbs — {reps} beats {previous}.",
  ],
  upWeight: [
    "{name} up to {weight} lbs from {previous} last time.",
    "Added weight on {name} — {previous} to {weight} lbs.",
    "{name} moved up: {weight} lbs, was {previous}.",
  ],
  upReps: [
    "{name}: {reps} reps at {weight} lbs, one better than last time's {previous}.",
    "More reps on {name} at the same weight — {reps} versus {previous}.",
    "{name} improved: {reps} reps at {weight} lbs, up from {previous}.",
  ],
};

function pick(pool, index, fallbackPool) {
  if (index < pool.length && pool[index]) return pool[index];
  const src = fallbackPool || pool.filter(Boolean);
  if (!src.length) return "";
  return src[index % src.length];
}

function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
}

const MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500];

// ── Entry point ──────────────────────────────────────────────────────────────
// Called after a session is saved. Returns a list of things worth saying,
// most significant first, capped so it stays a moment rather than a wall.

export function computeAchievements({ sessions, workouts, savedSession, weeklyTarget, pauses }) {
  const out = [];
  const streaks = computeStreaks(sessions, workouts, {
    reference: savedSession.performed_at,
    weeklyTarget,
    pauses,
  });
  const workout = workouts.find((w) => w.id === savedSession.workout_id);

  // Lift progress, best first
  const lifts = (savedSession.exercises || [])
    .map((ex) => compareLift(sessions, savedSession, ex))
    .filter(Boolean);

  const rank = { "pb-weight": 0, "pb-reps": 1, "up-weight": 2, "up-reps": 3 };
  lifts.sort((a, b) => rank[a.kind] - rank[b.kind]);

  for (const lift of lifts.slice(0, 3)) {
    const pool =
      lift.kind === "pb-weight"
        ? MESSAGES.pbWeight
        : lift.kind === "pb-reps"
        ? MESSAGES.pbReps
        : lift.kind === "up-weight"
        ? MESSAGES.upWeight
        : MESSAGES.upReps;
    const isPB = lift.kind.startsWith("pb");
    out.push({
      tone: isPB ? "pb" : "progress",
      icon: isPB ? "★" : "▲",
      heading: isPB ? "Personal best" : "Up on last time",
      text: fill(pick(pool, lift.reps + Math.round(lift.weight)), lift),
    });
  }

  // Full week
  if (streaks.weekComplete) {
    out.push({
      tone: "streak",
      icon: "◆",
      heading: "Week complete",
      text: pick(MESSAGES.weekComplete, streaks.completeWeeks),
    });

    if (streaks.completeWeeks >= 2) {
      out.push({
        tone: "streak",
        icon: "◆",
        heading: `${streaks.completeWeeks} complete weeks`,
        text: pick(MESSAGES.completeWeeks, streaks.completeWeeks),
      });
    }
  } else if (streaks.activeWeeks >= 2) {
    out.push({
      tone: "streak",
      icon: "●",
      heading: `${streaks.activeWeeks} week streak`,
      text: pick(MESSAGES.activeWeeks, streaks.activeWeeks),
    });
  }

  // This particular workout, week on week
  const wStreak = streaks.perWorkout[savedSession.workout_id] || 0;
  if (wStreak >= 2 && workout) {
    out.push({
      tone: "streak",
      icon: "●",
      heading: `${wStreak} weeks of ${workout.name}`,
      text: fill(pick(MESSAGES.workoutStreak, wStreak), { name: workout.name }),
    });
  }

  // Round numbers
  if (MILESTONES.includes(streaks.totalSessions)) {
    out.push({
      tone: "milestone",
      icon: "■",
      heading: "Milestone",
      text: fill(pick(MESSAGES.milestone, streaks.totalSessions), { n: streaks.totalSessions }),
    });
  }

  return { achievements: out.slice(0, 5), streaks };
}
