import { useState } from "react";
import { C, S, toneColor } from "../styles.js";
import { fmtDate, fmtPct, pctOffTop, repColor } from "../utils.js";
import { Confirm } from "../components.jsx";

export function LibraryList({ library, onSelect, onBack }) {
  const names = Object.keys(library).sort();
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Exercise library</span>
        <span style={{ width: 40 }} />
      </div>

      {names.length === 0 ? (
        <div style={S.empty}>
          Nothing logged yet.
          <br />
          Finish a session and your lifts will collect here.
        </div>
      ) : (
        names.map((name) => (
          <button key={name} style={S.listItem} onClick={() => onSelect(name)}>
            <span>{name}</span>
            <span style={{ color: C.muted, fontSize: 12, fontFamily: C.mono }}>
              {library[name].length} session{library[name].length === 1 ? "" : "s"} →
            </span>
          </button>
        ))
      )}
    </div>
  );
}

export function ExerciseDetail({ name, entries, onRename, onDelete, onBack }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState(false);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    onRename(trimmed);
  }

  const sessionPhrase =
    entries.length > 0 ? ` and ${entries.length} logged session${entries.length === 1 ? "" : "s"}` : "";

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>{editing ? "Rename exercise" : name}</span>
        <span style={{ width: 40 }} />
      </div>

      {!editing && !confirming && (
        <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
          <button
            style={{ ...S.btnGhost, flex: 1 }}
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            Rename
          </button>
          <button
            style={{ ...S.btnGhost, flex: 1, color: C.danger, borderColor: C.danger }}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>
      )}

      {editing && (
        <div style={{ padding: "0 16px 14px" }}>
          <input
            style={S.textInput}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
            Updates the name across {entries.length} logged session{entries.length === 1 ? "" : "s"} and
            any workout that uses it.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btnPrimary, flex: 1 }} disabled={!draft.trim()} onClick={save}>
              Save
            </button>
            <button
              style={{ ...S.btnGhost, flex: 1 }}
              onClick={() => {
                setEditing(false);
                setDraft(name);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div style={{ padding: "0 16px 14px" }}>
          <Confirm
            message={`Delete "${name}"? Removes it from any workout that uses it${sessionPhrase}. Everything else in those sessions is kept.`}
            confirmLabel="Delete exercise"
            onConfirm={() => onDelete(name)}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div style={S.empty}>No history yet.</div>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {entries.map((e, i) => {
            const top = e.working.find((w) => w.isTop);
            return (
              <div key={i} style={S.exCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px 6px",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDate(e.date)}</div>
                    <div style={{ color: C.muted, fontSize: 11, fontFamily: C.mono, marginTop: 2 }}>
                      {e.workoutName}
                    </div>
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 13, color: C.accent, fontWeight: 700 }}>
                    {top?.bodyweight ? "BW" : `${top?.weight ?? "—"} lbs`}
                  </span>
                </div>

                <div style={{ padding: "0 14px 12px" }}>
                  {e.working.map((ws, wi) => {
                    const tone = repColor(ws.reps, ws.repRange);
                    const off = !ws.isTop && !ws.bodyweight ? pctOffTop(ws.weight, top?.weight) : null;
                    return (
                      <div
                        key={wi}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          padding: "3px 0",
                          fontFamily: C.mono,
                          fontSize: 13,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${wi + 1}`}</span>
                        <span>{ws.bodyweight ? "Bodyweight" : `${ws.weight} lbs`}</span>
                        {off != null && (
                          <span style={{ fontSize: 11, color: C.muted }}>({fmtPct(off)} off)</span>
                        )}
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {ws.repRange ? `${ws.repRange[0]}–${ws.repRange[1]}` : "?"} target
                        </span>
                        <span style={{ color: toneColor(tone), fontWeight: 600 }}>
                          {ws.reps ? `${ws.reps} reps` : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {e.notes && <div style={S.note}>{e.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
