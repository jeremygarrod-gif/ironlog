// Bodyweight and waist tracking — weekly averages, a smoothed trend, and
// rate of change. Weeks match the streak weeks in achievements.js (Monday to
// Sunday) so "this week" always means the same thing across the app.

import { weekKey } from "./achievements.js";

function avg(nums) {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

// Oldest first, and only entries that actually have a value for anything
function chronological(entries) {
  return [...entries]
    .filter((e) => e.weight_lb != null || e.waist_in != null)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
}

// One row per week that has at least one entry, oldest first
export function weeklyAverages(entries) {
  const sorted = chronological(entries);
  const byWeek = new Map();
  for (const e of sorted) {
    const key = weekKey(e.measured_at);
    if (!byWeek.has(key)) byWeek.set(key, { weights: [], waists: [] });
    if (e.weight_lb != null) byWeek.get(key).weights.push(e.weight_lb);
    if (e.waist_in != null) byWeek.get(key).waists.push(e.waist_in);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, v]) => ({
      week,
      avgWeight: v.weights.length ? avg(v.weights) : null,
      avgWaist: v.waists.length ? avg(v.waists) : null,
    }));
}

// A trailing moving average over the last `window` readings that have this
// field, so a single rough morning doesn't swing the line — the point of
// tracking weekly average weight in the first place.
export function smoothedTrend(entries, field, window = 7) {
  const sorted = chronological(entries).filter((e) => e[field] != null);
  return sorted.map((e, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    return { date: e.measured_at, raw: e[field], smooth: avg(slice.map((s) => s[field])) };
  });
}

// Average of every reading in the trailing N days
export function longTermAverage(entries, field, days, reference = new Date()) {
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - days);
  const vals = chronological(entries)
    .filter((e) => e[field] != null && new Date(e.measured_at) >= cutoff)
    .map((e) => e[field]);
  return vals.length ? avg(vals) : null;
}

// Change between the two most recent weeks that have a value — the number a
// weekly-average bulk or cut is actually judged on
export function rateOfChangePerWeek(weekly, field) {
  const withVal = weekly.filter((w) => w[field] != null);
  if (withVal.length < 2) return null;
  return withVal[withVal.length - 1][field] - withVal[withVal.length - 2][field];
}
