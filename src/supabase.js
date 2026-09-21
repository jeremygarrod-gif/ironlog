import { createClient } from "@supabase/supabase-js";
import { uid } from "./utils.js";

// These two values are safe to keep in the code. The anon key only grants the
// access your Row Level Security policies allow, and those policies restrict
// every row to its owner. Never put the service_role key here.
const SUPABASE_URL = "https://fxmrramezfqfawdoxqus.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bXJyYW1lemZxZmF3ZG94cXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Njk5NTIsImV4cCI6MjEwNTE0NTk1Mn0.0463ERotoyfGUdQf5Yb8nJAwRFv75k3PPofF8FeyvC4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

// ── Defaults seeded into a brand new account ─────────────────────────────────

export const DEFAULT_SCHEMES = [
  { id: "s0", name: "None (no warm-up)", warmup_sets: [], sort_order: 0 },
  {
    id: "s1",
    name: "5321",
    sort_order: 1,
    warmup_sets: [
      { reps: 5, pct: 35, rest: 60 },
      { reps: 3, pct: 50, rest: [60, 90] },
      { reps: 2, pct: 70, rest: [90, 120] },
      { reps: 1, pct: [85, 90], rest: [120, 180] },
    ],
  },
  {
    id: "s2",
    name: "2-Feeler",
    sort_order: 2,
    warmup_sets: [
      { reps: [8, 10], pct: 50, rest: 60 },
      { reps: [3, 5], pct: 80, rest: [90, 120] },
    ],
  },
  {
    id: "s3",
    name: "1-Feeler",
    sort_order: 3,
    warmup_sets: [{ reps: [4, 6], pct: 75, rest: [60, 90] }],
  },
];

const TOP = { isTop: true, repRange: [6, 9], pctReduction: null };
const BACKOFF = { isTop: false, repRange: [10, 12], pctReduction: [10, 15] };

export const DEFAULT_TEMPLATES = [
  {
    id: "t1",
    name: "Heavy Compound",
    scheme_id: "s1",
    sort_order: 0,
    working_sets: [
      { ...TOP, rest: [180, 300] },
      { ...BACKOFF, rest: [180, 300] },
    ],
  },
  {
    id: "t2",
    name: "2-Feeler",
    scheme_id: "s2",
    sort_order: 1,
    working_sets: [
      { ...TOP, rest: [120, 150] },
      { ...BACKOFF, rest: [120, 150] },
    ],
  },
  {
    id: "t3",
    name: "1-Feeler",
    scheme_id: "s3",
    sort_order: 2,
    working_sets: [
      { ...TOP, rest: [120, 150] },
      { ...BACKOFF, rest: [120, 150] },
    ],
  },
];

// ── Loading ──────────────────────────────────────────────────────────────────

export async function loadAll(userId) {
  const [schemes, templates, workouts, sessions, drafts, settings, pauses] = await Promise.all([
    supabase.from("schemes").select("*").order("sort_order"),
    supabase.from("exercise_templates").select("*").order("sort_order"),
    supabase.from("workouts").select("*").order("sort_order"),
    supabase.from("sessions").select("*").order("performed_at", { ascending: false }),
    supabase.from("drafts").select("*"),
    supabase.from("settings").select("*").maybeSingle(),
    supabase.from("pauses").select("*").order("start_date", { ascending: false }),
  ]);

  const firstError =
    schemes.error || templates.error || workouts.error || sessions.error || drafts.error;
  if (firstError) throw firstError;

  // settings and pauses arrive with migration 002; treat them as optional so an
  // un-migrated database still loads rather than showing an error screen
  const settingsRow = settings.error ? null : settings.data;
  const pauseRows = pauses.error ? [] : pauses.data || [];

  let schemeRows = schemes.data || [];
  let templateRows = templates.data || [];

  // A brand new account starts empty — give it the standard schemes and templates
  if (schemeRows.length === 0 && templateRows.length === 0 && (workouts.data || []).length === 0) {
    await seedDefaults(userId);
    const [s2, t2] = await Promise.all([
      supabase.from("schemes").select("*").order("sort_order"),
      supabase.from("exercise_templates").select("*").order("sort_order"),
    ]);
    schemeRows = s2.data || [];
    templateRows = t2.data || [];
  }

  const draftMap = {};
  for (const d of drafts.data || []) draftMap[d.workout_id] = d.state;

  return {
    schemes: schemeRows,
    templates: templateRows,
    workouts: workouts.data || [],
    sessions: sessions.data || [],
    drafts: draftMap,
    weeklyTarget: settingsRow?.weekly_target ?? null,
    pauses: pauseRows,
  };
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function saveWeeklyTarget(userId, weeklyTarget) {
  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: userId, weekly_target: weeklyTarget }, { onConflict: "user_id" });
  if (error) throw error;
}

// ── Pauses ───────────────────────────────────────────────────────────────────

export async function savePause(userId, pause) {
  const row = {
    user_id: userId,
    id: pause.id || uid(),
    start_date: pause.start_date,
    end_date: pause.end_date,
    reason: pause.reason || "other",
    notes: pause.notes || "",
  };
  const { data, error } = await supabase
    .from("pauses")
    .upsert(row, { onConflict: "user_id,id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePause(userId, pauseId) {
  const { error } = await supabase
    .from("pauses")
    .delete()
    .eq("user_id", userId)
    .eq("id", pauseId);
  if (error) throw error;
}

async function seedDefaults(userId) {
  await supabase.from("schemes").insert(DEFAULT_SCHEMES.map((s) => ({ ...s, user_id: userId })));
  await supabase
    .from("exercise_templates")
    .insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, user_id: userId })));
}

// ── Schemes ──────────────────────────────────────────────────────────────────

export async function saveSchemes(userId, schemes, removedIds = []) {
  if (removedIds.length) {
    const { error } = await supabase.from("schemes").delete().eq("user_id", userId).in("id", removedIds);
    if (error) throw error;
  }
  const rows = schemes.map((s, i) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    warmup_sets: s.warmup_sets,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await supabase.from("schemes").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function saveTemplates(userId, templates, removedIds = []) {
  if (removedIds.length) {
    const { error } = await supabase
      .from("exercise_templates")
      .delete()
      .eq("user_id", userId)
      .in("id", removedIds);
    if (error) throw error;
  }
  const rows = templates.map((t, i) => ({
    id: t.id,
    user_id: userId,
    name: t.name,
    scheme_id: t.scheme_id,
    working_sets: t.working_sets,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await supabase.from("exercise_templates").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

// ── Workouts ─────────────────────────────────────────────────────────────────

export async function saveWorkout(userId, workout, sortOrder) {
  const row = {
    id: workout.id || uid(),
    user_id: userId,
    name: workout.name,
    exercises: workout.exercises,
    notes: workout.notes || "",
    sort_order: sortOrder ?? 0,
  };
  const { data, error } = await supabase
    .from("workouts")
    .upsert(row, { onConflict: "user_id,id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkout(userId, workoutId) {
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", userId)
    .eq("id", workoutId);
  if (error) throw error;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(userId, session) {
  const row = {
    id: session.id || uid(),
    user_id: userId,
    workout_id: session.workout_id,
    workout_name: session.workout_name,
    performed_at: session.performed_at,
    notes: session.notes || "",
    exercises: session.exercises,
  };
  const { data, error } = await supabase
    .from("sessions")
    .upsert(row, { onConflict: "user_id,id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(userId, sessionId) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", sessionId);
  if (error) throw error;
}

// ── Rename an exercise everywhere ───────────────────────────────────────────
// Exercise names are free text stored on each workout and each historical
// session rather than a lookup table, so renaming one only in the workout
// would split its history in two. This rewrites every row that mentions the
// old name so PBs, streaks and the library stay attached to the new one.

export async function renameExercise(userId, oldName, newName, { workouts, sessions }) {
  const renamed = (exercises) =>
    (exercises || []).map((e) => (e.name === oldName ? { ...e, name: newName } : e));

  const changedWorkouts = workouts
    .filter((w) => (w.exercises || []).some((e) => e.name === oldName))
    .map((w) => ({ ...w, exercises: renamed(w.exercises) }));

  const changedSessions = sessions
    .filter((s) => (s.exercises || []).some((e) => e.name === oldName))
    .map((s) => ({ ...s, exercises: renamed(s.exercises) }));

  if (changedWorkouts.length) {
    const rows = changedWorkouts.map((w) => ({
      id: w.id,
      user_id: userId,
      name: w.name,
      exercises: w.exercises,
      notes: w.notes || "",
      sort_order: w.sort_order ?? 0,
    }));
    const { error } = await supabase.from("workouts").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
  }

  if (changedSessions.length) {
    const rows = changedSessions.map((s) => ({
      id: s.id,
      user_id: userId,
      workout_id: s.workout_id,
      workout_name: s.workout_name,
      performed_at: s.performed_at,
      notes: s.notes || "",
      exercises: s.exercises,
    }));
    const { error } = await supabase.from("sessions").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
  }

  return { changedWorkouts, changedSessions };
}

// ── Drafts ───────────────────────────────────────────────────────────────────

export async function saveDraft(userId, workoutId, state) {
  const { error } = await supabase
    .from("drafts")
    .upsert({ user_id: userId, workout_id: workoutId, state }, { onConflict: "user_id,workout_id" });
  if (error) throw error;
}

export async function deleteDraft(userId, workoutId) {
  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("user_id", userId)
    .eq("workout_id", workoutId);
  if (error) throw error;
}

// ── Backup import ────────────────────────────────────────────────────────────
// Accepts the JSON exported by the earlier browser-storage version and writes
// it into the signed-in account.

export async function importBackup(userId, data) {
  const counts = { schemes: 0, templates: 0, workouts: 0, sessions: 0 };

  if (Array.isArray(data.schemes) && data.schemes.length) {
    const rows = data.schemes.map((s, i) => ({
      id: s.id || uid(),
      user_id: userId,
      name: s.name,
      warmup_sets: s.warmupSets ?? s.warmup_sets ?? [],
      sort_order: i,
    }));
    const { error } = await supabase.from("schemes").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
    counts.schemes = rows.length;
  }

  if (Array.isArray(data.exTemplates ?? data.templates)) {
    const src = data.exTemplates ?? data.templates;
    const rows = src.map((t, i) => ({
      id: t.id || uid(),
      user_id: userId,
      name: t.name,
      scheme_id: t.schemeId ?? t.scheme_id ?? null,
      // older exports stored backoffSets separately from the implied top set
      working_sets:
        t.workingSets ??
        t.working_sets ??
        [
          { ...TOP, rest: [180, 300] },
          ...(t.backoffSets || []).map((b) => ({ ...BACKOFF, ...b })),
        ],
      sort_order: i,
    }));
    if (rows.length) {
      const { error } = await supabase.from("exercise_templates").upsert(rows, { onConflict: "user_id,id" });
      if (error) throw error;
      counts.templates = rows.length;
    }
  }

  if (Array.isArray(data.workouts) && data.workouts.length) {
    const rows = data.workouts.map((w, i) => ({
      id: w.id || uid(),
      user_id: userId,
      name: w.name,
      exercises: (w.exercises || []).map((e) => ({
        ...e,
        schemeId: e.schemeId ?? e.scheme_id ?? null,
      })),
      notes: w.notes || "",
      sort_order: i,
    }));
    const { error } = await supabase.from("workouts").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
    counts.workouts = rows.length;
  }

  if (Array.isArray(data.sessions) && data.sessions.length) {
    const rows = data.sessions.map((s) => ({
      id: s.id || uid(),
      user_id: userId,
      workout_id: s.workoutId ?? s.workout_id ?? null,
      workout_name: s.workoutName ?? s.workout_name ?? "",
      performed_at: s.performed_at ?? s.date ?? new Date().toISOString(),
      notes: s.notes || "",
      exercises: s.exercises || [],
    }));
    const { error } = await supabase.from("sessions").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
    counts.sessions = rows.length;
  }

  return counts;
}

// ── Backup export ────────────────────────────────────────────────────────────

export function buildBackup({ schemes, templates, workouts, sessions }) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    schemes,
    templates,
    workouts,
    sessions,
  };
}
