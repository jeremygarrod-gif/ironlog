// Check-ins: steps and sleep are numbers (trend + weekly averages, the same
// way weight is); hunger, energy, joints, wins and questions are plain notes.
// Weeks run Monday to Sunday, matching streaks and body tracking.

import { weekKey } from "./achievements.js";
import { smoothedTrend, weeklyAverages } from "./bodyMetrics.js";

export const NOTE_FIELDS = [
  { key: "hunger", label: "Hunger", hint: "How hungry were you? Cravings, appetite, did you hit your food?" },
  { key: "energy", label: "Energy", hint: "How was your energy, in the gym and out of it?" },
  { key: "joints", label: "Joints", hint: "Anything sore, tight or niggling? Which joint, and when?" },
  { key: "wins", label: "Wins", hint: "Anything that went well, big or small" },
  { key: "questions", label: "Questions", hint: "Things to ask or bring to your next planning chat" },
];

function avg(nums) {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

// Every note on an entry as one readable string, for the chart markers
export function notesText(e) {
  return NOTE_FIELDS.filter((f) => e[f.key]?.trim())
    .map((f) => `${f.label}: ${e[f.key].trim()}`)
    .join("\n");
}

// The smoothed-trend shape the shared chart expects, for steps or sleep
export function checkInTrend(entries, field) {
  return smoothedTrend(
    entries.map((e) => ({ ...e, measured_at: e.checked_at, notes: notesText(e) })),
    field
  );
}

// One row per week with anything logged, oldest first. Waist comes from Body
// tracking so the whole picture reads in one place.
export function weeklyCheckIns(entries, bodyMetrics) {
  const byWeek = new Map();
  for (const e of entries) {
    const k = weekKey(e.checked_at);
    if (!byWeek.has(k)) byWeek.set(k, { steps: [], sleep: [] });
    if (e.steps != null) byWeek.get(k).steps.push(Number(e.steps));
    if (e.sleep_hours != null) byWeek.get(k).sleep.push(Number(e.sleep_hours));
  }
  const waist = new Map(weeklyAverages(bodyMetrics).map((w) => [w.week, w.avgWaist]));
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, v]) => ({
      week,
      steps: v.steps.length ? avg(v.steps) : null,
      sleep: v.sleep.length ? avg(v.sleep) : null,
      waist: waist.get(week) ?? null,
    }));
}
