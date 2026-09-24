import { useState } from "react";
import { C, S, toneColor } from "../styles.js";
import { Confirm, Field } from "../components.jsx";
import { fmtDate, fmtPct, pctOffTop, repColor, todayInputValue, uid } from "../utils.js";
import { allTimeBests, blockBest, describeE1rm, describeSet } from "../stall.js";

const RESET_REASONS = [
  { id: "machine", label: "Different machine" },
  { id: "gym", label: "New gym" },
  { id: "other", label: "Other" },
];
const reasonLabel = (id) => RESET_REASONS.find((r) => r.id === id)?.label || "Other";

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

export function ExerciseDetail({
  name,
  entries,
  sessions = [],
  pauses = [],
  blocks = [],
  resets = [],
  onSaveReset,
  onDeleteReset,
  onBack,
}) {
  const [draft, setDraft] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const pr = allTimeBests(sessions, name);
  const bb = blockBest({ sessions, pauses, blocks, resets, name });
  const mine = resets.filter((r) => r.exercise_name === name);
  const since = bb.baseline
    ? bb.baseline.kind === "reset"
      ? `since reset ${fmtDate(`${bb.baseline.date}T12:00:00`)}`
      : `since block started ${fmtDate(`${bb.baseline.date}T12:00:00`)}`
    : "no block start set — counting all history";

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>{name}</span>
        <span style={{ width: 40 }} />
      </div>

      {entries.length > 0 && (
        <div style={{ padding: "14px 16px 0", display: "grid", gap: 8 }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.accent }}>
              ALL-TIME PR
            </div>
            {pr.bestE1rm ? (
              <div style={{ fontFamily: C.mono, fontSize: 13, marginTop: 8, lineHeight: 1.9 }}>
                <PrRow label="Best e1RM" score={pr.bestE1rm} />
                <PrRow label="Heaviest top set" score={pr.heaviest} />
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Bodyweight only so far.</div>
            )}
          </div>

          <div style={S.card}>
            <div style={S.cardRow}>
              <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.warn }}>
                BASELINE FOR STALLS
              </div>
              {!draft && onSaveReset && (
                <button
                  style={S.btnXs}
                  onClick={() =>
                    setDraft({ id: uid(), exercise_name: name, reset_date: todayInputValue(), reason: "machine", notes: "" })
                  }
                >
                  Reset baseline
                </button>
              )}
            </div>
            {bb.best ? (
              <div style={{ fontFamily: C.mono, fontSize: 13, marginTop: 8, lineHeight: 1.9 }}>
                <PrRow label="Best" score={bb.best} />
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                Nothing logged since the baseline yet.
              </div>
            )}
            <div style={{ color: C.muted, fontSize: 11, fontFamily: C.mono, marginTop: 4 }}>{since}</div>

            {draft && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
                  For a different machine or a new gym, where the numbers aren't comparable. Swapping to
                  a different exercise doesn't need this — a new name starts fresh on its own.
                </div>
                <Field label="Reason">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {RESET_REASONS.map((r) => (
                      <button
                        key={r.id}
                        style={{
                          ...S.btnXs,
                          padding: "7px 11px",
                          fontSize: 12,
                          color: draft.reason === r.id ? C.accent : C.muted,
                          borderColor: draft.reason === r.id ? C.accent : C.border,
                        }}
                        onClick={() => setDraft((d) => ({ ...d, reason: r.id }))}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="From">
                  <input
                    type="date"
                    style={S.dateInput}
                    value={draft.reset_date}
                    onChange={(e) => setDraft((d) => ({ ...d, reset_date: e.target.value }))}
                  />
                </Field>
                <Field label="Notes (optional)">
                  <input
                    style={S.textInput}
                    placeholder="e.g. Hammer Strength press at the new gym"
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  />
                </Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{ ...S.btnPrimary, flex: 1 }}
                    onClick={() => {
                      onSaveReset(draft);
                      setDraft(null);
                    }}
                  >
                    Save reset
                  </button>
                  <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {mine.length > 0 && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                {mine.map((r) =>
                  confirmId === r.id ? (
                    <Confirm
                      key={r.id}
                      message="Remove this reset? The baseline falls back to the block start."
                      confirmLabel="Remove"
                      onConfirm={() => {
                        setConfirmId(null);
                        onDeleteReset(r.id);
                      }}
                      onCancel={() => setConfirmId(null)}
                    />
                  ) : (
                    <div
                      key={r.id}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", gap: 8 }}
                    >
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: C.text }}>{reasonLabel(r.reason)}</span>
                        <span style={{ color: C.muted, fontFamily: C.mono, marginLeft: 8 }}>
                          {fmtDate(`${r.reset_date}T12:00:00`)}
                        </span>
                        {r.notes && <div style={{ color: C.muted, marginTop: 2 }}>{r.notes}</div>}
                      </div>
                      <button style={{ ...S.btnXs, color: C.danger }} onClick={() => setConfirmId(r.id)}>
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
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

function PrRow({ label, score }) {
  if (!score) return null;
  const e = describeE1rm(score);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span>
        {describeSet(score)}
        {e != null && <span style={{ color: C.muted }}> · {e}</span>}
        <span style={{ color: C.muted }}> · {fmtDate(score.date)}</span>
      </span>
    </div>
  );
}
