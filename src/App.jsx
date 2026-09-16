import { useCallback, useEffect, useMemo, useState } from "react";
import { C, S } from "./styles.js";
import {
  buildBackup,
  deleteDraft,
  deleteSession,
  deleteWorkout,
  importBackup,
  loadAll,
  saveDraft,
  saveSchemes,
  saveSession,
  saveTemplates,
  saveWorkout,
  signOut,
  supabase,
} from "./supabase.js";
import { buildExerciseLibrary, uid } from "./utils.js";

import Auth from "./screens/Auth.jsx";
import Home from "./screens/Home.jsx";
import Log from "./screens/Log.jsx";
import History from "./screens/History.jsx";
import EditWorkout from "./screens/EditWorkout.jsx";
import { Schemes, Templates } from "./screens/Manage.jsx";
import { LibraryList, ExerciseDetail } from "./screens/Library.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [route, setRoute] = useState({ screen: "home" });
  const [banner, setBanner] = useState(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setData(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!session?.user) return;
    try {
      const d = await loadAll(session.user.id);
      setData(d);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message || "Could not load your data.");
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) refresh();
  }, [session, refresh]);

  const library = useMemo(
    () => (data ? buildExerciseLibrary(data.sessions) : {}),
    [data]
  );

  const allExerciseNames = useMemo(() => {
    if (!data) return [];
    const names = new Set(Object.keys(library));
    for (const w of data.workouts) for (const e of w.exercises || []) if (e.name) names.add(e.name);
    return [...names].sort();
  }, [data, library]);

  function flash(text, tone = "ok") {
    setBanner({ text, tone });
    setTimeout(() => setBanner(null), 4500);
  }

  const go = (screen, params = {}) => setRoute({ screen, ...params });
  const home = () => setRoute({ screen: "home" });

  // ── Gates ──────────────────────────────────────────────────────────────────
  if (!authReady) return <Splash text="…" />;
  if (!session) return <Auth />;
  if (loadError)
    return (
      <Splash text={loadError}>
        <button style={{ ...S.btnGhost, marginTop: 16 }} onClick={refresh}>
          Try again
        </button>
      </Splash>
    );
  if (!data) return <Splash text="Loading your log…" />;

  const userId = session.user.id;
  const workout = data.workouts.find((w) => w.id === route.workoutId);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function startWorkout(workoutId, fresh = false) {
    if (fresh) {
      await deleteDraft(userId, workoutId);
      setData((d) => {
        const drafts = { ...d.drafts };
        delete drafts[workoutId];
        return { ...d, drafts };
      });
    }
    go("log", { workoutId });
  }

  async function handleSaveDraft(workoutId, state) {
    // keep a stable session id across draft saves so finishing doesn't duplicate
    const withId = { ...state, sessionId: data.drafts[workoutId]?.sessionId || uid() };
    setData((d) => ({ ...d, drafts: { ...d.drafts, [workoutId]: withId } }));
    try {
      await saveDraft(userId, workoutId, withId);
    } catch {
      /* draft saves are best-effort; the finish action is what matters */
    }
  }

  async function finishSession(newSession) {
    try {
      const saved = await saveSession(userId, newSession);
      await deleteDraft(userId, newSession.workout_id);
      setData((d) => {
        const drafts = { ...d.drafts };
        delete drafts[newSession.workout_id];
        const sessions = [saved, ...d.sessions.filter((s) => s.id !== saved.id)].sort(
          (a, b) => new Date(b.performed_at) - new Date(a.performed_at)
        );
        return { ...d, sessions, drafts };
      });
      home();
      flash("Session saved.");
    } catch (e) {
      flash(e.message || "Could not save the session.", "error");
    }
  }

  async function updateSession(edited) {
    try {
      const saved = await saveSession(userId, edited);
      setData((d) => ({
        ...d,
        sessions: d.sessions
          .map((s) => (s.id === saved.id ? saved : s))
          .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at)),
      }));
      flash("Session updated.");
    } catch (e) {
      flash(e.message || "Could not update the session.", "error");
    }
  }

  async function removeSession(id) {
    try {
      await deleteSession(userId, id);
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
      flash("Session deleted.");
    } catch (e) {
      flash(e.message || "Could not delete the session.", "error");
    }
  }

  async function persistWorkout(w) {
    try {
      const isNew = !w.id;
      const order = isNew ? data.workouts.length : data.workouts.findIndex((x) => x.id === w.id);
      const saved = await saveWorkout(userId, { ...w, id: w.id || uid() }, order);
      setData((d) => ({
        ...d,
        workouts: isNew
          ? [...d.workouts, saved]
          : d.workouts.map((x) => (x.id === saved.id ? saved : x)),
      }));
      home();
    } catch (e) {
      flash(e.message || "Could not save the workout.", "error");
    }
  }

  async function removeWorkout(id) {
    try {
      await deleteWorkout(userId, id);
      setData((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }));
      home();
      flash("Workout deleted.");
    } catch (e) {
      flash(e.message || "Could not delete the workout.", "error");
    }
  }

  function exportBackup() {
    const payload = buildBackup({
      schemes: data.schemes,
      templates: data.templates,
      workouts: data.workouts,
      sessions: data.sessions,
    });
    const text = JSON.stringify(payload, null, 2);
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("Backup downloaded.");
    } catch {
      navigator.clipboard
        ?.writeText(text)
        .then(() => flash("Backup copied to clipboard."))
        .catch(() => flash("Could not export. Try a different browser.", "error"));
    }
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const counts = await importBackup(userId, parsed);
        await refresh();
        flash(
          `Imported ${counts.sessions} sessions, ${counts.workouts} workouts, ${counts.templates} templates.`
        );
      } catch (err) {
        flash(err.message || "That file couldn't be read.", "error");
      }
    };
    reader.readAsText(file);
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  switch (route.screen) {
    case "log":
      if (!workout) return <Splash text="Workout not found." />;
      return (
        <Log
          workout={workout}
          schemes={data.schemes}
          sessions={data.sessions}
          draft={data.drafts[workout.id] || null}
          onSaveDraft={(state) => handleSaveDraft(workout.id, state)}
          onFinish={finishSession}
          onBack={home}
        />
      );

    case "history":
      return (
        <History
          sessions={data.sessions.filter((s) => s.workout_id === route.workoutId)}
          workoutName={workout?.name || "History"}
          onSaveSession={updateSession}
          onDeleteSession={removeSession}
          onBack={home}
        />
      );

    case "edit-workout":
      return (
        <EditWorkout
          workout={route.workoutId === "new" ? null : workout}
          schemes={data.schemes}
          templates={data.templates}
          allExerciseNames={allExerciseNames}
          onSave={persistWorkout}
          onDelete={removeWorkout}
          onBack={home}
        />
      );

    case "schemes":
      return (
        <Schemes
          schemes={data.schemes}
          onSave={async (schemes, removed) => {
            try {
              await saveSchemes(userId, schemes, removed);
              setData((d) => ({ ...d, schemes }));
            } catch (e) {
              flash(e.message || "Could not save schemes.", "error");
            }
          }}
          onBack={home}
        />
      );

    case "templates":
      return (
        <Templates
          templates={data.templates}
          schemes={data.schemes}
          onSave={async (templates, removed) => {
            try {
              await saveTemplates(userId, templates, removed);
              setData((d) => ({ ...d, templates }));
            } catch (e) {
              flash(e.message || "Could not save templates.", "error");
            }
          }}
          onBack={home}
        />
      );

    case "library":
      return (
        <LibraryList
          library={library}
          onSelect={(name) => go("exercise", { exerciseName: name })}
          onBack={home}
        />
      );

    case "exercise":
      return (
        <ExerciseDetail
          name={route.exerciseName}
          entries={library[route.exerciseName] || []}
          onBack={() => go("library")}
        />
      );

    default:
      return (
        <Home
          workouts={data.workouts}
          drafts={data.drafts}
          email={session.user.email}
          go={go}
          onStart={startWorkout}
          onExport={exportBackup}
          onImportFile={importFile}
          onSignOut={signOut}
          banner={banner}
        />
      );
  }
}

function Splash({ text, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ ...S.logo, fontSize: 20, marginBottom: 12 }}>
        IRON<span style={{ color: C.accent }}>LOG</span>
      </div>
      <div style={{ color: C.muted, fontSize: 13 }}>{text}</div>
      {children}
    </div>
  );
}
