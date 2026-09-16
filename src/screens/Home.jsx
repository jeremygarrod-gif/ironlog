import { useRef, useState } from "react";
import { C, S } from "../styles.js";
import { Modal } from "../components.jsx";

export default function Home({
  workouts,
  drafts,
  email,
  go,
  onStart,
  onExport,
  onImportFile,
  onSignOut,
  banner,
}) {
  const [resumeFor, setResumeFor] = useState(null);
  const fileRef = useRef(null);

  const workout = workouts.find((w) => w.id === resumeFor);

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <span style={S.logo}>
          IRON<span style={{ color: C.accent }}>LOG</span>
        </span>
        <button style={S.btnSmall} onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>WORKOUTS</div>

        {workouts.length === 0 && (
          <div style={S.empty}>
            No workouts yet.
            <br />
            Create one to get started, or import a backup below.
          </div>
        )}

        {workouts.map((w) => (
          <div key={w.id} style={S.card}>
            <div style={S.cardRow}>
              <span style={S.cardTitle}>{w.name}</span>
              <button style={S.btnSmall} onClick={() => go("edit-workout", { workoutId: w.id })}>
                Edit
              </button>
            </div>
            <div style={S.cardSub}>
              {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}
              {drafts[w.id] && <span style={{ color: C.warn }}> · in progress</span>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                style={S.btnPrimary}
                onClick={() => (drafts[w.id] ? setResumeFor(w.id) : onStart(w.id))}
              >
                {drafts[w.id] ? "▶ Resume" : "▶ Start"}
              </button>
              <button style={S.btnGhost} onClick={() => go("history", { workoutId: w.id })}>
                History
              </button>
            </div>
          </div>
        ))}

        <button style={S.btnAdd} onClick={() => go("edit-workout", { workoutId: "new" })}>
          + New workout
        </button>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>TEMPLATES & LIBRARY</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={S.btnGhost} onClick={() => go("library")}>
            Exercise library
          </button>
          <button style={S.btnGhost} onClick={() => go("templates")}>
            Exercise templates
          </button>
          <button style={S.btnGhost} onClick={() => go("schemes")}>
            Warm-up schemes
          </button>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>DATA</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={S.btnGhost} onClick={onExport}>
            ⬇ Export backup
          </button>
          <button style={S.btnGhost} onClick={() => fileRef.current?.click()}>
            ⬆ Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {banner && <div style={S.banner(banner.tone)}>{banner.text}</div>}
        <div style={{ color: C.muted, fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
          Signed in as {email}. Your data is stored in your account and syncs across devices.
        </div>
      </div>

      {resumeFor && (
        <Modal
          title="Resume workout?"
          body={`You have an unfinished ${workout?.name || "session"}. Pick up where you left off, or start over.`}
        >
          <button
            style={S.btnPrimary}
            onClick={() => {
              const id = resumeFor;
              setResumeFor(null);
              onStart(id);
            }}
          >
            Resume
          </button>
          <button
            style={S.btnGhost}
            onClick={() => {
              const id = resumeFor;
              setResumeFor(null);
              onStart(id, true);
            }}
          >
            Start fresh
          </button>
          <button style={{ ...S.btnGhost, color: C.muted }} onClick={() => setResumeFor(null)}>
            Cancel
          </button>
        </Modal>
      )}
    </div>
  );
}
