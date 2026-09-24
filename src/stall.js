// Progress measurement.
//
// Three separate questions, deliberately kept apart:
//
//   1. Has this lift stalled?   → top set vs. the best since the baseline started
//   2. How did today compare?   → each set vs. last session, for in-the-moment calls
//   3. What's my best ever?     → all-time PRs, never reset
//
// Every set is scored as an estimated one-rep max (Epley):
//   weight × (1 + reps ÷ 30)
// which lets heavier-for-fewer and lighter-for-more land on one number.
//
// ── The stall counter ────────────────────────────────────────────────────────
// Each session's top set is compared with the best top set since the baseline
// started. A new best resets the counter to 0. Anything else — a tie included —
// adds 1. At 3 the lift is stalled.
//
// The baseline starts at the most recent of:
//   • the start of the current training block
//   • a reset for this exercise (different machine, new gym)
// Swapping to a different exercise needs no reset: a new name has no history.
//
// Deload and calibration weeks are skipped entirely — not counted, and not a
// reset. The comparison carries on against the best from before the deload, so
// coming back strong shows up as a new best.
//
// Only the top set can flag a stall. Back-off weight depends on how the top set
// went that day, so it's too noisy to judge on its own; it's measured and shown,
// but never counted.
//
// Nothing here is stored. It is all derived from sessions each time, so editing
// or deleting a past session, block or reset recalculates on its own.

const SKIP_REASONS = new Set(["deload", "calibration"]);
const EPS = 1e-9;

export function e1rm(weight, reps) {
  return weight * (1 + reps / 30);
}

// Bodyweight sets have no load to multiply, so they're scored on reps and only
// ever compared with other bodyweight sets.
export function setScore(set) {
  if (!set) return null;
  const reps = parseInt(set.reps, 10);
  if (!reps || reps <= 0) return null;
  if (set.bodyweight || set.weight === "BW") return { kind: "bw", value: reps, weight: null, reps };
  const weight = parseFloat(set.weight);
  if (!weight) return null;
  return { kind: "wt", value: e1rm(weight, reps), weight, reps };
}

// ── Dates ────────────────────────────────────────────────────────────────────

// Local calendar day, so an evening session doesn't slip into tomorrow in UTC
export function dayOf(value) {
  if (typeof value === "string" && value.length === 10) return value;
  const d = new Date(value);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function skipRanges(pauses) {
  return (pauses || [])
    .filter((p) => SKIP_REASONS.has(p.reason))
    .map((p) => [p.start_date, p.end_date]);
}

function inRanges(day, ranges) {
  return ranges.some(([from, to]) => day >= from && day <= to);
}

// ── Baseline ─────────────────────────────────────────────────────────────────

// Where the current comparison window opens for this exercise on this day.
// Returns null if there's no block or reset yet — then all history counts.
export function baselineFor({ blocks, resets, name, day }) {
  let best = null;
  for (const b of blocks || []) {
    if (b.start_date <= day && (!best || b.start_date > best.date)) {
      best = { date: b.start_date, kind: "block", label: b.label || "" };
    }
  }
  for (const r of resets || []) {
    if (r.exercise_name !== name || r.reset_date > day) continue;
    // A reset on the same day as a block start is the same boundary; prefer
    // naming it as the reset, since that's the more specific reason
    if (!best || r.reset_date >= best.date) {
      best = { date: r.reset_date, kind: "reset", label: r.reason || "" };
    }
  }
  return best;
}

// ── History ──────────────────────────────────────────────────────────────────

function pickSet(exercise, which) {
  const working = exercise?.sets?.working || [];
  if (which === "top") return working.find((w) => w.isTop) || null;
  return working[which] || null;
}

// Counted scores for one set position of an exercise, oldest first, within
// [from, upTo]. Sessions after the day being judged are left out, so logging an
// old workout after the fact compares it against what came before it.
function scoredHistory(sessions, name, { which = "top", from, upTo, excludeId, ranges }) {
  const out = [];
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    const day = dayOf(s.performed_at);
    if (upTo && day > upTo) continue;
    if (from && day < from) continue;
    if (ranges && inRanges(day, ranges)) continue;
    const ex = (s.exercises || []).find((e) => e.name === name);
    if (!ex) continue;
    const score = setScore(pickSet(ex, which));
    if (score) out.push({ ...score, date: s.performed_at, day });
  }
  return out.reverse(); // sessions arrive newest first
}

// ── 1. Stall counter ─────────────────────────────────────────────────────────
// Returns null when there's nothing to judge: a skipped week, no reps yet, or
// the first counted session since the baseline (which *is* the baseline).

export function evaluateStall({
  sessions,
  pauses,
  blocks,
  resets,
  name,
  currentSet,
  currentDate,
  excludeSessionId,
}) {
  const ranges = skipRanges(pauses);
  const day = dayOf(currentDate || new Date().toISOString());
  if (inRanges(day, ranges)) return null;

  const current = setScore(currentSet);
  if (!current) return null;

  const baseline = baselineFor({ blocks, resets, name, day });
  const history = scoredHistory(sessions, name, {
    which: "top",
    from: baseline?.date,
    upTo: day,
    excludeId: excludeSessionId,
    ranges,
  }).filter((h) => h.kind === current.kind);

  if (!history.length) return null;

  let best = history[0];
  let count = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].value > best.value + EPS) {
      best = history[i];
      count = 0;
    } else {
      count += 1;
    }
  }

  if (current.value > best.value + EPS) {
    return { beat: true, count: 0, best, current, baseline };
  }
  return { beat: false, count: count + 1, best, current, baseline };
}

export const STALL_AT = 3;
export const WARN_AT = 2;

export function isStalled(count) {
  return count >= STALL_AT;
}

// Everything in a finished session worth listing — the warning onward
export function sessionStalls({ sessions, pauses, blocks, resets, savedSession }) {
  const out = [];
  for (const ex of savedSession.exercises || []) {
    const r = evaluateStall({
      sessions,
      pauses,
      blocks,
      resets,
      name: ex.name,
      currentSet: pickSet(ex, "top"),
      currentDate: savedSession.performed_at,
      excludeSessionId: savedSession.id,
    });
    if (r && !r.beat && r.count >= WARN_AT) out.push({ name: ex.name, ...r });
  }
  return out;
}

// ── 2. vs. last session ──────────────────────────────────────────────────────
// The number for in-the-moment decisions. Compares a set with the same set
// position last time. Never feeds the stall counter.

export function compareToLast(currentSet, lastSet) {
  const cur = setScore(currentSet);
  const last = setScore(lastSet);
  if (!cur || !last || cur.kind !== last.kind) return null;
  const delta = cur.value - last.value;
  return {
    current: cur,
    last,
    delta,
    direction: delta > EPS ? "up" : delta < -EPS ? "down" : "same",
  };
}

// ── 3. All-time PRs ──────────────────────────────────────────────────────────
// Never reset, not windowed, and deloads included — a PR is a PR.

export function allTimeBests(sessions, name) {
  let bestE1rm = null;
  let heaviest = null;
  for (const s of sessions) {
    const ex = (s.exercises || []).find((e) => e.name === name);
    if (!ex) continue;
    const score = setScore(pickSet(ex, "top"));
    if (!score || score.kind !== "wt") continue;
    if (!bestE1rm || score.value > bestE1rm.value + EPS) {
      bestE1rm = { ...score, date: s.performed_at };
    }
    if (!heaviest || score.weight > heaviest.weight) {
      heaviest = { ...score, date: s.performed_at };
    }
  }
  return { bestE1rm, heaviest };
}

// Best top set since the baseline — the number the stall counter chases
export function blockBest({ sessions, pauses, blocks, resets, name, day }) {
  const d = day || dayOf(new Date().toISOString());
  const baseline = baselineFor({ blocks, resets, name, day: d });
  const history = scoredHistory(sessions, name, {
    which: "top",
    from: baseline?.date,
    upTo: d,
    ranges: skipRanges(pauses),
  }).filter((h) => h.kind === "wt");
  let best = null;
  for (const h of history) if (!best || h.value > best.value + EPS) best = h;
  return { best, baseline, sessions: history.length };
}

// ── Presentation ─────────────────────────────────────────────────────────────

export function ordinal(n) {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

export function describeSet(score) {
  if (!score) return "—";
  if (score.kind === "bw") return `bodyweight × ${score.reps}`;
  return `${score.weight} × ${score.reps}`;
}

export function describeE1rm(score) {
  if (!score || score.kind === "bw") return null;
  return Math.round(score.value);
}

export function describeDelta(cmp) {
  if (!cmp) return null;
  if (cmp.direction === "same") return "same as last";
  const n = cmp.current.kind === "bw" ? cmp.delta : Math.round(cmp.delta * 10) / 10;
  const unit = cmp.current.kind === "bw" ? " reps" : "";
  return `${n > 0 ? "+" : ""}${n}${unit}`;
}
