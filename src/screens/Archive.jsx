import { useState } from "react";
import { C, S } from "../styles.js";
import { Confirm, Field } from "../components.jsx";
import { fmtDate, todayInputValue } from "../utils.js";

// ── Starting a new block ─────────────────────────────────────────────────────

function defaultLabel() {
  const d = new Date();
  return `Block ending ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
}

export function NewBlock({ activeWorkouts, onConfirm, onBack }) {
  const [label, setLabel] = useState(defaultLabel);
  const [keepCopies, setKeepCopies] = useState(true);
  const [startDate, setStartDate] = useState(todayInputValue);
  const [selected, setSelected] = useState(() => new Set(activeWorkouts.map((w) => w.id)));
  const [busy, setBusy] = useState(false);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const count = selected.size;

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Start a new block</span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: "14px 16px 0", color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
        Archives the workouts below together under one name. Their session history stays browsable
        from the archive, and every exercise keeps its full record in the library — so weights in
        your new block still pre-fill from the last time you did each lift.
      </div>

      <div style={S.section}>
        <Field label="Name the block you're finishing">
          <input style={S.textInput} value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="New block starts">
          <input
            type="date"
            style={S.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>
            From this date every exercise gets a fresh baseline for the stall counter.
          </div>
        </Field>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>WORKOUTS TO ARCHIVE</div>
        {activeWorkouts.map((w) => {
          const on = selected.has(w.id);
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              style={{
                ...S.card,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
                color: C.text,
                font: "inherit",
                borderColor: on ? "#2a4a2f" : C.border,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `1.5px solid ${on ? C.accent : C.muted}`,
                  background: on ? C.accent : "none",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {on ? "✓" : ""}
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>{w.name}</div>
                <div style={S.cardSub}>
                  {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={S.section}>
        <button
          onClick={() => setKeepCopies((v) => !v)}
          style={{
            ...S.card,
            width: "100%",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            cursor: "pointer",
            textAlign: "left",
            color: C.text,
            font: "inherit",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `1.5px solid ${keepCopies ? C.accent : C.muted}`,
              background: keepCopies ? C.accent : "none",
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {keepCopies ? "✓" : ""}
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Keep copies to build the next block from</div>
            <div style={{ ...S.cardSub, lineHeight: 1.5, marginTop: 3 }}>
              Fresh editable versions go straight back on your home screen. Change what you like —
              the archived originals stay exactly as they were. Untick to start from nothing.
            </div>
          </div>
        </button>
      </div>

      <div style={{ padding: "8px 16px 40px" }}>
        <button
          style={{ ...S.btnPrimary, width: "100%", opacity: count && label.trim() ? 1 : 0.4 }}
          disabled={!count || !label.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm({
              ids: [...selected],
              label: label.trim(),
              keepCopies,
              startDate,
            });
            setBusy(false);
          }}
        >
          {busy
            ? "Archiving…"
            : `Archive ${count} workout${count === 1 ? "" : "s"}${keepCopies ? " and keep copies" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ── Browsing the archive ─────────────────────────────────────────────────────

export function ArchiveList({ archived, sessions, onHistory, onRestore, onCopy, onDelete, onBack }) {
  const [confirmId, setConfirmId] = useState(null);

  // Group by label, falling back to archive date for anything archived singly
  const groups = new Map();
  for (const w of archived) {
    const key = w.archive_label || `Archived ${fmtDate(w.archived_at)}`;
    if (!groups.has(key)) groups.set(key, { label: key, when: w.archived_at, workouts: [] });
    groups.get(key).workouts.push(w);
  }
  const ordered = [...groups.values()].sort((a, b) => (a.when < b.when ? 1 : -1));

  const statsFor = (id) => {
    const mine = sessions.filter((s) => s.workout_id === id);
    if (!mine.length) return null;
    const dates = mine.map((s) => s.performed_at).sort();
    return { count: mine.length, first: dates[0], last: dates[dates.length - 1] };
  };

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Archive</span>
        <span style={{ width: 40 }} />
      </div>

      {ordered.length === 0 ? (
        <div style={S.empty}>
          Nothing archived yet.
          <br />
          Use "Start a new block" on the home screen when a mesocycle ends.
        </div>
      ) : (
        ordered.map((g) => (
          <div key={g.label} style={S.section}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{g.label}</div>
              <div style={{ color: C.muted, fontSize: 11, fontFamily: C.mono }}>
                {g.workouts.length} workout{g.workouts.length === 1 ? "" : "s"}
              </div>
            </div>

            {g.workouts.map((w) => {
              const st = statsFor(w.id);
              return (
                <div key={w.id} style={S.card}>
                  {confirmId === w.id ? (
                    <Confirm
                      message={`Permanently delete "${w.name}"? Its sessions are kept, and exercise history is unaffected.`}
                      confirmLabel="Delete"
                      onConfirm={() => {
                        setConfirmId(null);
                        onDelete(w.id);
                      }}
                      onCancel={() => setConfirmId(null)}
                    />
                  ) : (
                    <>
                      <div style={S.cardTitle}>{w.name}</div>
                      <div style={S.cardSub}>
                        {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}
                        {st
                          ? ` · ${st.count} session${st.count === 1 ? "" : "s"} · ${fmtDate(st.first)}${
                              st.first !== st.last ? ` – ${fmtDate(st.last)}` : ""
                            }`
                          : " · never logged"}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                        {st && (
                          <button style={S.btnSmall} onClick={() => onHistory(w.id)}>
                            History
                          </button>
                        )}
                        <button style={S.btnSmall} onClick={() => onCopy(w)}>
                          Copy to active
                        </button>
                        <button style={S.btnSmall} onClick={() => onRestore(w.id)}>
                          Restore
                        </button>
                        <button
                          style={{ ...S.btnSmall, color: C.danger, borderColor: C.danger }}
                          onClick={() => setConfirmId(w.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}

      {ordered.length > 0 && (
        <div style={{ padding: "4px 16px 40px", color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          <b style={{ color: C.text }}>Copy to active</b> makes a fresh editable version and leaves
          the archived one alone — the right choice for reusing a block. <b style={{ color: C.text }}>Restore</b>{" "}
          moves the original back, history and all.
        </div>
      )}
    </div>
  );
}
