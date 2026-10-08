// A plain-text (Markdown) training report meant to be pasted or attached into
// a conversation with an AI model. Unlike the JSON backup, which exists so the
// app can restore itself, this is written to be *read*: it explains the terms,
// lists the current program, then the sessions, per-lift progress, blocks and
// body measurements, with notes kept next to the numbers they explain.
//
// Everything is derived from the data passed in; nothing is stored. No email
// address or account id is included.

import { allTimeBests, dayOf, describeE1rm, setScore } from "./stall.js";
import { longTermAverage, rateOfChangePerWeek, weeklyAverages } from "./bodyMetrics.js";

export const RANGES = [
  { id: "4w", label: "Last 4 weeks", weeks: 4 },
  { id: "12w", label: "Last 12 weeks", weeks: 12 },
  { id: "26w", label: "Last 6 months", weeks: 26 },
  { id: "all", label: "Everything", weeks: null },
];

const r1 = (n) => Math.round(n * 10) / 10;
const one = (s) => String(s || "").replace(/\s*\n\s*/g, " ").trim();
const rng = (v) =>
  Array.isArray(v) ? (v[0] === v[1] ? `${v[0]}` : `${v[0]}–${v[1]}`) : v == null || v === "" ? "?" : `${v}`;

function setText(ws) {
  if (!ws) return null;
  const reps = ws.reps === "" || ws.reps == null ? "?" : ws.reps;
  return ws.bodyweight || ws.weight === "BW" ? `BW×${reps}` : `${ws.weight}×${reps}`;
}

function schemeText(scheme) {
  if (!scheme) return "no scheme";
  if (!scheme.warmup_sets?.length) return "no warm-up";
  const sets = scheme.warmup_sets.map((w) => `${rng(w.reps)}×${rng(w.pct)}%`).join(", ");
  return `${scheme.name} warm-up (reps × % of top set: ${sets})`;
}

function programSection(workouts, schemes) {
  const active = workouts.filter((w) => !w.archived_at);
  const archived = workouts.filter((w) => w.archived_at);
  const out = ["## Current program", ""];
  if (!active.length) out.push("(no active workouts)", "");
  for (const w of active) {
    out.push(`### ${w.name}`);
    (w.exercises || []).forEach((e, i) => {
      const scheme = schemes.find((s) => s.id === e.schemeId);
      const top = (e.workingSets || []).find((s) => s.isTop);
      const backs = (e.workingSets || []).filter((s) => !s.isTop);
      const parts = [`${i + 1}. ${e.name}`];
      if (top) parts.push(`top set ${rng(top.repRange)} reps`);
      if (backs.length) {
        parts.push(
          "back-offs " +
            backs.map((b) => `${rng(b.repRange)} reps${b.pctReduction ? ` @ ${rng(b.pctReduction)}% off top` : ""}`).join("; ")
        );
      }
      parts.push(schemeText(scheme));
      if (e.cue) parts.push(`cue: ${one(e.cue)}`);
      out.push(parts.join(" — "));
    });
    if (w.notes) out.push(`Notes: ${one(w.notes)}`);
    out.push("");
  }
  if (archived.length) {
    out.push(
      `Archived workouts (earlier blocks, history kept): ` +
        archived.map((w) => (w.archive_label ? `${w.name} [${w.archive_label}]` : w.name)).join(", "),
      ""
    );
  }
  return out;
}

function sessionLine(ex) {
  const working = ex.sets?.working || [];
  const top = working.find((w) => w.isTop);
  const backs = working.filter((w) => !w.isTop);
  const parts = [];
  if (top) {
    const sc = setScore(top);
    const e = sc && describeE1rm(sc);
    parts.push(`top ${setText(top)}${e ? ` (e1RM ${e})` : ""}`);
  }
  if (backs.length) parts.push(`back-off ${backs.map(setText).join(", ")}`);
  const warm = (ex.sets?.warmups || []).map((w) => w.actualWt).filter((x) => x !== "" && x != null);
  if (warm.length) parts.push(`warm-ups ${warm.join(", ")}`);
  if (ex.notes) parts.push(`NOTE: ${one(ex.notes)}`);
  return `- ${ex.name}: ${parts.join(" | ") || "no sets recorded"}`;
}

function logSection(sessions) {
  const out = ["## Training log (newest first)", ""];
  if (!sessions.length) out.push("(no sessions in this range)", "");
  for (const s of sessions) {
    out.push(`### ${dayOf(s.performed_at)} · ${s.workout_name || "Workout"}`);
    if (s.notes) out.push(`Session note: ${one(s.notes)}`);
    for (const ex of s.exercises || []) out.push(sessionLine(ex));
    out.push("");
  }
  return out;
}

function progressSection(allSessions, rangeSessions) {
  const names = [];
  for (const s of rangeSessions) for (const e of s.exercises || []) if (!names.includes(e.name)) names.push(e.name);
  names.sort((a, b) => a.localeCompare(b));
  const out = ["## Progress by exercise", "", "Top sets oldest → newest within this range; all-time bests cover all history.", ""];
  for (const name of names) {
    const bests = allTimeBests(allSessions, name);
    const history = [];
    for (const s of [...rangeSessions].reverse()) {
      const ex = (s.exercises || []).find((e) => e.name === name);
      const top = ex?.sets?.working?.find((w) => w.isTop);
      if (top) history.push(`${dayOf(s.performed_at).slice(5)} ${setText(top)}`);
    }
    const line = [`- ${name}`];
    if (bests.bestE1rm) {
      line.push(`all-time best e1RM ${describeE1rm(bests.bestE1rm)} (${setText(bests.bestE1rm)} on ${dayOf(bests.bestE1rm.date)})`);
      line.push(`heaviest top set ${setText(bests.heaviest)} on ${dayOf(bests.heaviest.date)}`);
    }
    if (history.length) line.push(`top sets: ${history.join(", ")}`);
    out.push(line.join(" — "));
  }
  out.push("");
  return out;
}

function contextSection({ blocks, pauses, resets, weeklyTarget }) {
  const out = ["## Blocks, pauses and baselines", ""];
  if (weeklyTarget) out.push(`Weekly goal: ${weeklyTarget} sessions.`);
  if (blocks.length) {
    out.push("Training blocks (progress comparisons restart at each start date):");
    for (const b of [...blocks].sort((a, c) => (a.start_date < c.start_date ? -1 : 1)))
      out.push(`- from ${b.start_date}${b.label ? ` — ${one(b.label)}` : ""}`);
  } else out.push("No training blocks set.");
  if (pauses.length) {
    out.push("Pauses (deload/calibration are excluded from stall counting; others only protect streaks):");
    for (const p of [...pauses].sort((a, c) => (a.start_date < c.start_date ? -1 : 1)))
      out.push(`- ${p.start_date} → ${p.end_date}: ${p.reason}${p.notes ? ` — ${one(p.notes)}` : ""}`);
  }
  if (resets.length) {
    out.push("Per-exercise baseline resets (different machine / new gym):");
    for (const r of [...resets].sort((a, c) => (a.reset_date < c.reset_date ? -1 : 1)))
      out.push(`- ${r.exercise_name} from ${r.reset_date}: ${r.reason}${r.notes ? ` — ${one(r.notes)}` : ""}`);
  }
  out.push("");
  return out;
}

function bodySection(entries, weeks) {
  const out = ["## Body measurements", ""];
  if (!entries.length) return [...out, "(none logged)", ""];
  const all = weeklyAverages(entries);
  const shown = weeks ? all.slice(-weeks) : all;
  out.push("Weekly averages (weeks run Monday–Sunday; weight in lb, waist in inches):", "", "| Week of | Avg weight | Avg waist |", "|---|---|---|");
  for (const w of shown)
    out.push(`| ${w.week} | ${w.avgWeight != null ? r1(w.avgWeight) : "—"} | ${w.avgWaist != null ? r1(w.avgWaist) : "—"} |`);
  out.push("");
  const dw = rateOfChangePerWeek(all, "avgWeight");
  const dwa = rateOfChangePerWeek(all, "avgWaist");
  if (dw != null) out.push(`Latest week vs the previous week with readings: weight ${dw > 0 ? "+" : ""}${r1(dw)} lb`);
  if (dwa != null) out.push(`Latest week vs the previous week with readings: waist ${dwa > 0 ? "+" : ""}${r1(dwa)} in`);
  const a30 = longTermAverage(entries, "weight_lb", 30);
  const a90 = longTermAverage(entries, "weight_lb", 90);
  if (a30 != null) out.push(`30-day average weight: ${r1(a30)} lb`);
  if (a90 != null) out.push(`90-day average weight: ${r1(a90)} lb`);
  const cutoff = weeks ? Date.now() - weeks * 7 * 86400000 : 0;
  const inRange = [...entries]
    .filter((e) => new Date(e.measured_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  out.push("", "Individual readings (a NOTE explains that day, e.g. an outlier):");
  for (const e of inRange) {
    const bits = [];
    if (e.weight_lb != null) bits.push(`${r1(e.weight_lb)} lb`);
    if (e.waist_in != null) bits.push(`waist ${r1(e.waist_in)} in`);
    out.push(`- ${dayOf(e.measured_at)}: ${bits.join(", ")}${e.notes ? ` — NOTE: ${one(e.notes)}` : ""}`);
  }
  out.push("");
  return out;
}

export function buildAiReport(data, weeks) {
  const { workouts, sessions, schemes, blocks, pauses, resets, bodyMetrics, weeklyTarget } = data;
  const cutoff = weeks ? Date.now() - weeks * 7 * 86400000 : 0;
  const ordered = [...sessions].sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at));
  const inRange = ordered.filter((s) => new Date(s.performed_at).getTime() >= cutoff);
  const rangeLabel = weeks ? `the last ${weeks} weeks` : "all history";

  const head = [
    "# IRONLOG training export",
    "",
    `Exported ${dayOf(new Date().toISOString())}. Sessions shown: ${inRange.length} covering ${rangeLabel}. All-time personal bests always use the full history.`,
    "",
    "## How to read this",
    "",
    "- Weights are in pounds; waist is in inches. Calculated weights are rounded to the nearest 5 lb.",
    "- Each exercise has one heavy **top set**, followed by lighter **back-off sets**. Warm-ups are calculated from the top set.",
    "- A set is written weight×reps (BW = bodyweight; ? = reps weren't recorded). **e1RM** is estimated one-rep max: weight × (1 + reps ÷ 30), which lets heavy-low-rep and light-high-rep sets be compared.",
    "- A session **beats the log** when its top-set e1RM is strictly higher than the best top set since the current baseline (start of the training block, or a per-exercise reset). A tie does not count. Three sessions in a row without beating the log is a **stall**. Only top sets are judged; back-offs are shown but never counted.",
    "- Deload and calibration weeks are excluded from stall counting. Injury, illness and travel pauses only protect streaks.",
    "- Lines marked NOTE are the lifter's own comments written at the time — read them before judging an unusual number.",
    "",
  ];

  return [
    ...head,
    ...programSection(workouts, schemes),
    ...logSection(inRange),
    ...progressSection(ordered, inRange),
    ...contextSection({ blocks, pauses, resets, weeklyTarget }),
    ...bodySection(bodyMetrics, weeks),
  ].join("\n");
}
