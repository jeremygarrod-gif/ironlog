// Time frames for trend screens (Body tracking, Check-in).

export const RANGES = [
  { id: "month", label: "This month" },
  { id: "3m", label: "3 months", months: 3 },
  { id: "6m", label: "6 months", months: 6 },
  { id: "1y", label: "1 year", months: 12 },
  { id: "all", label: "All" },
];

// Where the period opens; null means no limit
export function rangeStart(id) {
  const now = new Date();
  if (id === "all") return null;
  if (id === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const d = new Date(now);
  d.setMonth(d.getMonth() - RANGES.find((r) => r.id === id).months);
  return d;
}

// Each screen remembers its own choice
export function readRange(key, fallback = "3m") {
  try {
    const v = localStorage.getItem(key);
    if (RANGES.some((r) => r.id === v)) return v;
  } catch {
    /* private browsing: just use the default */
  }
  return fallback;
}

export function writeRange(key, id) {
  try {
    localStorage.setItem(key, id);
  } catch {
    /* it just won't be remembered */
  }
}
