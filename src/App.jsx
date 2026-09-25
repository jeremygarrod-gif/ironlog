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
  archiveWorkouts,
  deleteBlock,
  deleteReset,
  duplicateWorkouts,
  saveBlock,
  saveReset,
  restoreWorkout,
  savePause,
  deletePause,
  renameExercise,
  deleteExercise,
  saveBodyMetric,
  deleteBodyMetric,
  saveSession,
  saveTemplates,
  saveWeeklyTarget,
  saveWorkout,
  signOut,
  supabase,
} from "./supabase.js";
import { buildExerciseLibrary, uid } from "./utils.js";
import { useEdgeSwipeBack, useNavStack } from "./nav.js";
import { computeAchievements, computeStreaks } from "./achievements.js";
import { sessionStalls } from "./stall.js";

import Auth from "./screens/Auth.jsx";
import Home from "./screens/Home.jsx";
import Log from "./screens/Log.jsx";
import History from "./screens/History.jsx";
import EditWorkout from "./screens/EditWorkout.jsx";
import { Schemes, Templates } from "./screens/Manage.jsx";
import { LibraryList, ExerciseDetail } from "./screens/Library.jsx";
import Celebrate from "./screens/Celebrate.jsx";
import Goals from "./screens/Goals.jsx";
import Guide from "./screens/Guide.jsx";
import { ArchiveList, NewBlock } from "./screens/Archive.jsx";
import Tracking from "./screens/Tracking.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const { route, go, back, home, lastPop } = useNavStack();
  const [banner, setBanner] = useState(null);
  const [celebration, setCelebration] = useState(null);

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

  const activeWorkouts = useMemo(
    () => (data ? data.workouts.filter((w) => !w.archived_at) : []),
    [data]
  );
  const archivedWorkouts = useMemo(
    () => (data ? data.workouts.filter((w) => w.archived_at) : []),
    [data]
  );

  const streaks = useMemo(
    () =>
      data
        ? computeStreaks(data.sessions, activeWorkouts, {
            weeklyTarget: data.weeklyTarget,
            pauses: data.pauses,
          })
        : null,
    [data, activeWorkouts]
  );

  const allExerciseNames = useMemo(() => {
    if (!data) return [];
    const names = new Set(Object.keys(library));
    for (const w of data.workouts) for (const e of w.exercises || []) if (e.name) names.add(e.name);
    return [...names].sort();
  }, [data, library]);

  // Body part chosen for a custom exercise, set once anywhere and remembered
  // everywhere that name shows up in the picker
  const exerciseCategories = useMemo(() => {
    const map = {};
    if (!data) return map;
    for (const w of data.workouts) for (const e of w.exercises || []) if (e.name && e.category) map[e.name] = e.category;
    return map;
  }, [data]);

  function flash(text, tone = "ok") {
    setBanner({ text, tone });
    setTimeout(() => setBanner(null), tone === "error" ? 9000 : 4500);
  }

  useEdgeSwipeBack(back, lastPop);

  // Any "?" in the app raises this; open the guide at that section
  useEffect(() => {
    const open = (e) => go("guide", { section: e.detail || null });
    window.addEventListener("ironlog:help", open);
    return () => window.removeEventListener("ironlog:help", open);
  }, [go]);

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
      const nextSessions = [saved, ...data.sessions.filter((s) => s.id !== saved.id)].sort(
        (a, b) => new Date(b.performed_at) - new Date(a.performed_at)
      );
      const { achievements } = computeAchievements({
        sessions: nextSessions,
        workouts: activeWorkouts,
        savedSession: saved,
        weeklyTarget: data.weeklyTarget,
        pauses: data.pauses,
      });
      const stalls = sessionStalls({
        sessions: nextSessions,
        pauses: data.pauses,
        blocks: data.blocks,
        resets: data.resets,
        savedSession: saved,
      });
      // "Up on last time" beside "didn't beat the log" for the same lift would
      // read as a contradiction, so the stall wins. Personal bests stay — a
      // heaviest-ever single is still worth knowing even when e1RM didn't move.
      const flagged = new Set(stalls.map((st) => st.name));
      const shown = achievements.filter(
        (a) => !(a.kind && a.kind.startsWith("up-") && flagged.has(a.exercise))
      );
      home();
      setCelebration({ achievements: shown, stalls });
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
      const order = isNew ? activeWorkouts.length : activeWorkouts.findIndex((x) => x.id === w.id);
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

  async function renameExerciseEverywhere(oldName, newName) {
    try {
      const { changedWorkouts, changedSessions, changedResets } = await renameExercise(
        userId,
        oldName,
        newName,
        { workouts: data.workouts, sessions: data.sessions, resets: data.resets }
      );
      setData((d) => ({
        ...d,
        workouts: d.workouts.map((w) => changedWorkouts.find((c) => c.id === w.id) || w),
        sessions: d.sessions.map((s) => changedSessions.find((c) => c.id === s.id) || s),
        resets: d.resets.map((r) => changedResets.find((c) => c.id === r.id) || r),
      }));
      back();
      flash(`Renamed to "${newName}".`);
    } catch (e) {
      flash(e.message || "Could not rename that exercise.", "error");
    }
  }

  async function deleteExerciseEverywhere(name) {
    try {
      const { changedWorkouts, changedSessions, removedResetIds } = await deleteExercise(userId, name, {
        workouts: data.workouts,
        sessions: data.sessions,
        resets: data.resets,
      });
      setData((d) => ({
        ...d,
        workouts: d.workouts.map((w) => changedWorkouts.find((c) => c.id === w.id) || w),
        sessions: d.sessions.map((s) => changedSessions.find((c) => c.id === s.id) || s),
        resets: d.resets.filter((r) => !removedResetIds.includes(r.id)),
      }));
      back();
      flash(`Removed "${name}" from your library.`);
    } catch (e) {
      flash(e.message || "Could not remove that exercise.", "error");
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

  async function archiveBlock({ ids, label, keepCopies, startDate }) {
    try {
      const originals = data.workouts.filter((w) => ids.includes(w.id));
      // Starting a block without archiving anything is allowed — a fresh
      // baseline on the same workouts, e.g. after a cut
      if (ids.length) await archiveWorkouts(userId, ids, label);
      const alreadySet = data.blocks.some((b) => b.start_date === startDate);
      if (startDate && !alreadySet) {
        try {
          const newBlock = await saveBlock(userId, { start_date: startDate, label: "" });
          setData((d) => ({
            ...d,
            blocks: [newBlock, ...d.blocks].sort((a, b) => (a.start_date < b.start_date ? 1 : -1)),
          }));
        } catch {
          /* migration 004 not run — archiving still succeeded */
        }
      }
      let copies = [];
      if (keepCopies && ids.length) {
        const remaining = activeWorkouts.filter((w) => !ids.includes(w.id)).length;
        copies = await duplicateWorkouts(userId, originals, remaining);
      }
      const stamp = new Date().toISOString();
      setData((d) => {
        const drafts = { ...d.drafts };
        for (const id of ids) delete drafts[id];
        return {
          ...d,
          drafts,
          workouts: [
            ...d.workouts.map((w) =>
              ids.includes(w.id) ? { ...w, archived_at: stamp, archive_label: label } : w
            ),
            ...copies,
          ],
        };
      });
      home();
      const when = new Date(`${startDate}T12:00:00`).toLocaleDateString();
      flash(
        !ids.length
          ? alreadySet
            ? `A block already starts on ${when} — nothing to change.`
            : `New block starts ${when}.`
          : keepCopies
          ? `Archived "${label}". Fresh copies are ready to edit.`
          : `Archived "${label}".`
      );
    } catch (e) {
      flash(
        /archived_at|column/i.test(e.message || "")
          ? "Run migration-003.sql in Supabase first, then try again."
          : e.message || "Could not archive.",
        "error"
      );
    }
  }

  async function restoreOne(id) {
    try {
      await restoreWorkout(userId, id);
      setData((d) => ({
        ...d,
        workouts: d.workouts.map((w) =>
          w.id === id ? { ...w, archived_at: null, archive_label: null } : w
        ),
      }));
      flash("Restored to your workouts.");
    } catch (e) {
      flash(e.message || "Could not restore.", "error");
    }
  }

  async function copyOne(w) {
    try {
      const [copy] = await duplicateWorkouts(userId, [w], activeWorkouts.length);
      setData((d) => ({ ...d, workouts: [...d.workouts, copy] }));
      flash(`Copied "${w.name}" to your workouts.`);
    } catch (e) {
      flash(e.message || "Could not copy.", "error");
    }
  }

  const byStartDesc = (a, b) => (a.start_date < b.start_date ? 1 : -1);
  const byResetDesc = (a, b) => (a.reset_date < b.reset_date ? 1 : -1);
  const needs004 = (e) =>
    /blocks|exercise_resets|relation|does not exist/i.test(e?.message || "")
      ? "Run migration-004.sql in Supabase first, then try again."
      : e?.message || "Something went wrong.";

  async function upsertBlock(b) {
    try {
      const saved = await saveBlock(userId, b);
      setData((d) => ({
        ...d,
        blocks: [saved, ...d.blocks.filter((x) => x.id !== saved.id)].sort(byStartDesc),
      }));
      flash("Block saved.");
    } catch (e) {
      flash(needs004(e), "error");
    }
  }

  async function removeBlock(id) {
    try {
      await deleteBlock(userId, id);
      setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    } catch (e) {
      flash(needs004(e), "error");
    }
  }

  async function upsertReset(r) {
    try {
      const saved = await saveReset(userId, r);
      setData((d) => ({
        ...d,
        resets: [saved, ...d.resets.filter((x) => x.id !== saved.id)].sort(byResetDesc),
      }));
    } catch (e) {
      flash(needs004(e), "error");
    }
  }

  async function removeReset(id) {
    try {
      await deleteReset(userId, id);
      setData((d) => ({ ...d, resets: d.resets.filter((r) => r.id !== id) }));
    } catch (e) {
      flash(needs004(e), "error");
    }
  }

  const needs005 = (e) =>
    /body_metrics|relation|does not exist/i.test(e?.message || "")
      ? "Run migration-005.sql in Supabase first, then try again."
      : e?.message || "Something went wrong.";

  async function upsertBodyMetric(entry) {
    try {
      const saved = await saveBodyMetric(userId, entry);
      setData((d) => ({
        ...d,
        bodyMetrics: [saved, ...d.bodyMetrics.filter((x) => x.id !== saved.id)].sort(
          (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
        ),
      }));
      flash("Saved.");
    } catch (e) {
      flash(needs005(e), "error");
    }
  }

  async function removeBodyMetric(id) {
    try {
      await deleteBodyMetric(userId, id);
      setData((d) => ({ ...d, bodyMetrics: d.bodyMetrics.filter((m) => m.id !== id) }));
    } catch (e) {
      flash(needs005(e), "error");
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

  const screen = (() => {
  switch (route.screen) {
    case "log":
      if (!workout) return <Splash text="Workout not found." />;
      return (
        <Log
          workout={workout}
          schemes={data.schemes}
          sessions={data.sessions}
          pauses={data.pauses}
          blocks={data.blocks}
          resets={data.resets}
          draft={data.drafts[workout.id] || null}
          onSaveDraft={(state) => handleSaveDraft(workout.id, state)}
          onFinish={finishSession}
          onBack={back}
        />
      );

    case "history":
      return (
        <History
          sessions={data.sessions.filter((s) => s.workout_id === route.workoutId)}
          workoutName={workout?.name || "History"}
          onSaveSession={updateSession}
          onDeleteSession={removeSession}
          onBack={back}
        />
      );

    case "edit-workout":
      return (
        <EditWorkout
          workout={route.workoutId === "new" ? null : workout}
          schemes={data.schemes}
          templates={data.templates}
          allExerciseNames={allExerciseNames}
          exerciseCategories={exerciseCategories}
          onSave={persistWorkout}
          onDelete={removeWorkout}
          onArchive={async (id) => {
            try {
              await archiveWorkouts(userId, [id], null);
              const stamp = new Date().toISOString();
              setData((d) => {
                const drafts = { ...d.drafts };
                delete drafts[id];
                return {
                  ...d,
                  drafts,
                  workouts: d.workouts.map((w) =>
                    w.id === id ? { ...w, archived_at: stamp, archive_label: null } : w
                  ),
                };
              });
              home();
              flash("Workout archived.");
            } catch (e) {
              flash(
                /archived_at|column/i.test(e.message || "")
                  ? "Run migration-003.sql in Supabase first, then try again."
                  : e.message || "Could not archive.",
                "error"
              );
            }
          }}
          onBack={back}
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
          onBack={back}
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
          onBack={back}
        />
      );

    case "new-block":
      return (
        <NewBlock activeWorkouts={activeWorkouts} onConfirm={archiveBlock} onBack={back} />
      );

    case "archive":
      return (
        <ArchiveList
          archived={archivedWorkouts}
          sessions={data.sessions}
          onHistory={(id) => go("history", { workoutId: id })}
          onRestore={restoreOne}
          onCopy={copyOne}
          onDelete={async (id) => {
            try {
              await deleteWorkout(userId, id);
              setData((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }));
            } catch (e) {
              flash(e.message || "Could not delete.", "error");
            }
          }}
          onBack={back}
        />
      );

    case "guide":
      return <Guide initialSection={route.section || null} onBack={back} />;

    case "tracking":
      return (
        <Tracking
          entries={data.bodyMetrics}
          onSave={upsertBodyMetric}
          onDelete={removeBodyMetric}
          onBack={back}
        />
      );

    case "goals":
      return (
        <Goals
          weeklyTarget={data.weeklyTarget}
          workoutCount={activeWorkouts.length}
          pauses={data.pauses}
          blocks={data.blocks}
          streaks={streaks}
          onSaveBlock={upsertBlock}
          onDeleteBlock={removeBlock}
          onSaveTarget={async (n) => {
            setData((d) => ({ ...d, weeklyTarget: n }));
            try {
              await saveWeeklyTarget(userId, n);
            } catch (e) {
              flash(e.message || "Could not save your goal.", "error");
            }
          }}
          onSavePause={async (p) => {
            try {
              const saved = await savePause(userId, p);
              setData((d) => ({
                ...d,
                pauses: [saved, ...d.pauses.filter((x) => x.id !== saved.id)].sort((a, b) =>
                  a.start_date < b.start_date ? 1 : -1
                ),
              }));
            } catch (e) {
              flash(e.message || "Could not save the pause.", "error");
            }
          }}
          onDeletePause={async (id) => {
            try {
              await deletePause(userId, id);
              setData((d) => ({ ...d, pauses: d.pauses.filter((p) => p.id !== id) }));
            } catch (e) {
              flash(e.message || "Could not remove the pause.", "error");
            }
          }}
          onBack={back}
        />
      );

    case "library":
      return (
        <LibraryList
          library={library}
          onSelect={(name) => go("exercise", { exerciseName: name })}
          onBack={back}
        />
      );

    case "exercise":
      return (
        <ExerciseDetail
          name={route.exerciseName}
          entries={library[route.exerciseName] || []}
          sessions={data.sessions}
          pauses={data.pauses}
          blocks={data.blocks}
          resets={data.resets}
          onSaveReset={upsertReset}
          onDeleteReset={removeReset}
          onRename={(newName) => renameExerciseEverywhere(route.exerciseName, newName)}
          onDelete={() => deleteExerciseEverywhere(route.exerciseName)}
          onBack={back}
        />
      );

    default:
      return (
        <>
          {celebration && (
            <Celebrate
              achievements={celebration.achievements}
              stalls={celebration.stalls}
              onDone={() => setCelebration(null)}
            />
          )}
        <Home
          workouts={activeWorkouts}
          archivedCount={archivedWorkouts.length}
          drafts={data.drafts}
          email={session.user.email}
          go={go}
          onStart={startWorkout}
          onExport={exportBackup}
          onImportFile={importFile}
          onSignOut={signOut}
          banner={banner}
          streaks={streaks}
        />
        </>
      );
  }
  })();

  // Messages float above every screen. They used to render only on the home
  // screen, so a failure anywhere else — archiving from the edit screen, say —
  // happened silently.
  return (
    <>
      {screen}
      {banner && (
        <div
          role="status"
          onClick={() => setBanner(null)}
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: "calc(16px + env(safe-area-inset-bottom))",
            zIndex: 200,
            maxWidth: 496,
            margin: "0 auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            cursor: "pointer",
            ...S.banner(banner.tone),
            marginTop: 0,
          }}
        >
          {banner.text}
        </div>
      )}
    </>
  );
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
