// ── IDs ──────────────────────────────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Numbers ──────────────────────────────────────────────────────────────────
export function round5(n) {
  return Math.round(n / 5) * 5;
}

export function fmtWt(n) {
  if (n == null || n === "") return "—";
  const v = typeof n === "number" ? n : parseFloat(n);
  if (isNaN(v)) return String(n);
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1).replace(/\.0$/, "") + "%";
}

// ── Ranges ───────────────────────────────────────────────────────────────────
// Percentages, reps and rest can each be a single number or a [lo, hi] pair.

export function normRange(v) {
  if (Array.isArray(v)) return { lo: v[0], hi: v[1], isRange: v[0] !== v[1] };
  return { lo: v, hi: v, isRange: false };
}

export function fmtPctRange(p) {
  const { lo, hi, isRange } = normRange(p);
  return isRange ? `${lo}–${hi}%` : `${lo}%`;
}

export function fmtReps(r) {
  const { lo, hi, isRange } = normRange(r);
  return isRange ? `${lo}–${hi}` : String(lo);
}

export function fmtRest(r) {
  const { lo, hi, isRange } = normRange(r);
  const one = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60}min` : `${s}s`);
  return isRange ? `${one(lo)}–${one(hi)}` : one(lo);
}

// Weight range implied by a percentage (or percentage range) of a top set
export function calcWtRange(topWt, pct) {
  const { lo, hi, isRange } = normRange(pct);
  const wLo = round5((topWt * lo) / 100);
  const wHi = round5((topWt * hi) / 100);
  return { lo: wLo, hi: wHi, isRange: isRange && wLo !== wHi };
}

// ── Rep performance ──────────────────────────────────────────────────────────
// "hit"  → met or beat the top of the range: add weight next time
// "miss" → under the bottom of the range: drop weight next time
// "ok"   → inside the range: hold

export function repColor(reps, range) {
  if (reps === "" || reps == null) return "";
  const n = parseInt(reps, 10);
  if (isNaN(n)) return "";
  const r = range || [6, 9];
  if (n >= r[1]) return "hit";
  if (n < r[0]) return "miss";
  return "ok";
}

export function recommendation(reps, range) {
  const c = repColor(reps, range);
  if (c === "hit") return { label: "↑ Increase weight", tone: "hit" };
  if (c === "miss") return { label: "↓ Decrease weight", tone: "miss" };
  if (c === "ok") return { label: "→ Same weight", tone: "ok" };
  return null;
}

// Percentage a working set sits below the top set
export function pctOffTop(weight, topWeight) {
  const w = parseFloat(weight);
  const t = parseFloat(topWeight);
  if (!w || !t) return null;
  return (1 - w / t) * 100;
}

// Percentage a warm-up weight represents of the top set
export function pctOfTop(weight, topWeight) {
  const w = parseFloat(weight);
  const t = parseFloat(topWeight);
  if (!w || !t) return null;
  return (w / t) * 100;
}

// ── Dates ────────────────────────────────────────────────────────────────────
export function todayInputValue() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Store as midday so timezone shifts can never move the date across a day boundary
export function dateInputToISO(value) {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function isoToDateInput(iso) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString();
}

export function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Derived exercise library ─────────────────────────────────────────────────
// Built from sessions rather than stored, so edits and deletes can never
// leave stale entries behind.

export function buildExerciseLibrary(sessions) {
  const lib = {};
  // sessions arrive newest first
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      if (!lib[ex.name]) lib[ex.name] = [];
      lib[ex.name].push({
        sessionId: s.id,
        date: s.performed_at,
        workoutName: s.workout_name,
        topSetWeight: ex.topSetWeight,
        working: ex.sets?.working || [],
        warmups: ex.sets?.warmups || [],
        notes: ex.notes || "",
      });
    }
  }
  return lib;
}

// Most recent occurrence of an exercise, optionally limited to one workout
export function findLastExercise(sessions, exerciseName, workoutId) {
  for (const s of sessions) {
    if (workoutId && s.workout_id !== workoutId) continue;
    const ex = (s.exercises || []).find((e) => e.name === exerciseName);
    if (ex) return { session: s, exercise: ex };
  }
  return null;
}
