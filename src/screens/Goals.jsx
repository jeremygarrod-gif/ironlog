import { useState } from "react";
import { C, S } from "../styles.js";
import { Confirm, Field } from "../components.jsx";
import { fmtDate, todayInputValue, uid } from "../utils.js";

const REASONS = [
  { id: "deload", label: "Deload" },
  { id: "calibration", label: "Calibration" },
  { id: "injury", label: "Injury" },
  { id: "illness", label: "Illness" },
  { id: "travel", label: "Travel" },
  { id: "other", label: "Other" },
];

const reasonLabel = (id) => REASONS.find((r) => r.id === id)?.label || "Other";

export default function Goals({
  weeklyTarget,
  workoutCount,
  pauses,
  blocks = [],
  streaks,
  onSaveTarget,
  onSavePause,
  onDeletePause,
  onSaveBlock,
  onDeleteBlock,
  onBack,
}) {
  const [target, setTarget] = useState(weeklyTarget ?? workoutCount ?? 3);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [blockDraft, setBlockDraft] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(null);

  const today = todayInputValue();
  const current = blocks.find((b) => b.start_date <= today) || null;
  const upcoming = blocks.filter((b) => b.start_date > today);
  const past = blocks.filter((b) => b !== current && b.start_date <= today);

  function startPause() {
    const today = todayInputValue();
    setDraft({ id: uid(), start_date: today, end_date: today, reason: "deload", notes: "" });
    setAdding(true);
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Goals &amp; streaks</span>
        <span style={{ width: 40 }} />
      </div>

      {/* Weekly target */}
      <div style={S.section}>
        <div style={S.sectionLabel}>WEEKLY GOAL</div>
        <div style={S.card}>
          <Field label="Sessions per week">
            <div style={S.inputRow}>
              <button
                style={{ ...S.btnGhost, padding: "8px 14px" }}
                onClick={() => {
                  const v = Math.max(1, target - 1);
                  setTarget(v);
                  onSaveTarget(v);
                }}
              >
                −
              </button>
              <div
                style={{
                  fontFamily: C.mono,
                  fontSize: 24,
                  fontWeight: 700,
                  minWidth: 52,
                  textAlign: "center",
                }}
              >
                {target}
              </div>
              <button
                style={{ ...S.btnGhost, padding: "8px 14px" }}
                onClick={() => {
                  const v = Math.min(14, target + 1);
                  setTarget(v);
                  onSaveTarget(v);
                }}
              >
                +
              </button>
            </div>
          </Field>
          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
            A week counts as complete once you've logged this many sessions, whichever workouts they
            were. You currently have {workoutCount} workout{workoutCount === 1 ? "" : "s"} set up.
          </div>
        </div>
      </div>

      {/* Training blocks */}
      <div style={S.section}>
        <div style={S.sectionLabel}>TRAINING BLOCKS</div>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
          The stall counter compares each session against your best since the current block began.
          Starting a new block gives every exercise a fresh baseline. Deloads don't — use a pause for
          those.
        </div>

        {!current && !blockDraft && (
          <div
            style={{
              ...S.card,
              borderColor: C.warn,
              background: "#2a2010",
            }}
          >
            <div style={{ color: C.warn, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              No block start set
            </div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
              Until you set one, every lift is measured against its best ever — including anything
              from earlier blocks or before a cut.
            </div>
          </div>
        )}

        {current && confirmBlock === current.id && (
          <div style={S.card}>
            <Confirm
              message="Remove the current block start? Stall counts will recalculate against the block before it."
              confirmLabel="Remove"
              onConfirm={() => {
                setConfirmBlock(null);
                onDeleteBlock(current.id);
              }}
              onCancel={() => setConfirmBlock(null)}
            />
          </div>
        )}

        {current && confirmBlock !== current.id && (
          <div style={{ ...S.card, borderColor: "#2a4a2f" }}>
            <div style={S.cardRow}>
              <div>
                <div style={{ color: C.accent, fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5 }}>
                  CURRENT BLOCK
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  {current.label || "Current block"}
                </div>
                <div style={{ ...S.cardSub, fontFamily: C.mono }}>
                  started {fmtDate(`${current.start_date}T12:00:00`)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnSmall} onClick={() => setBlockDraft({ ...current })}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {[...upcoming, ...past].map((b) =>
          confirmBlock === b.id ? (
            <div key={b.id} style={S.card}>
              <Confirm
                message="Remove this block start? Stall counts will recalculate against the block before it."
                confirmLabel="Remove"
                onConfirm={() => {
                  setConfirmBlock(null);
                  onDeleteBlock(b.id);
                }}
                onCancel={() => setConfirmBlock(null)}
              />
            </div>
          ) : (
            <div key={b.id} style={{ ...S.card, padding: "10px 14px" }}>
              <div style={S.cardRow}>
                <div>
                  <span style={{ fontSize: 13 }}>{b.label || "Block"}</span>
                  <span style={{ color: C.muted, fontFamily: C.mono, fontSize: 12, marginLeft: 8 }}>
                    {b.start_date > today ? "starts" : "started"} {fmtDate(`${b.start_date}T12:00:00`)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btnXs} onClick={() => setBlockDraft({ ...b })}>
                    Edit
                  </button>
                  <button
                    style={{ ...S.btnXs, color: C.danger }}
                    onClick={() => setConfirmBlock(b.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {blockDraft ? (
          <div style={S.card}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={S.inputGroup}>
                <div style={S.inputLabel}>Block started</div>
                <input
                  type="date"
                  style={S.dateInput}
                  value={blockDraft.start_date}
                  onChange={(e) => setBlockDraft((d) => ({ ...d, start_date: e.target.value }))}
                />
              </div>
            </div>
            <Field label="Name (optional)">
              <input
                style={S.textInput}
                placeholder="e.g. Strength block, post-cut"
                value={blockDraft.label || ""}
                onChange={(e) => setBlockDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...S.btnPrimary, flex: 1 }}
                onClick={() => {
                  onSaveBlock(blockDraft);
                  setBlockDraft(null);
                }}
              >
                Save
              </button>
              <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setBlockDraft(null)}>
                Cancel
              </button>
            </div>
            {current && blockDraft.id === current.id && (
              <button
                style={{ ...S.btnAdd, color: C.danger, marginTop: 6 }}
                onClick={() => {
                  setBlockDraft(null);
                  setConfirmBlock(current.id);
                }}
              >
                Remove this block start
              </button>
            )}
          </div>
        ) : (
          <button
            style={S.btnAdd}
            onClick={() => setBlockDraft({ id: uid(), start_date: today, label: "" })}
          >
            {current ? "+ Start a new block" : "+ Set when this block started"}
          </button>
        )}
      </div>

      {/* Current standing */}
      {streaks && (
        <div style={S.section}>
          <div style={S.sectionLabel}>WHERE YOU ARE</div>
          <div style={S.card}>
            <Row label="This week" value={`${streaks.sessionsThisWeek} / ${streaks.target}`} />
            <Row
              label="Complete weeks in a row"
              value={streaks.completeWeeks}
              accent={streaks.completeWeeks >= 2}
            />
            <Row label="Weeks trained in a row" value={streaks.activeWeeks} />
            <Row label="Sessions logged" value={streaks.totalSessions} last />
          </div>
        </div>
      )}

      {/* Pauses */}
      <div style={S.section}>
        <div style={S.sectionLabel}>PAUSES</div>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
          Deloads, injury and illness are part of training, not failures. A paused week won't break a
          streak — it bridges the gap. It doesn't add to the count either, so the number still
          reflects weeks you actually completed. Sessions logged during a deload or calibration
          pause are also left out of the beat-the-log count, since those weeks are held back on
          purpose.
        </div>

        {pauses.length === 0 && !adding && (
          <div style={{ color: C.muted, fontSize: 13, padding: "4px 0 12px" }}>
            No pauses recorded.
          </div>
        )}

        {pauses.map((p) => (
          <div key={p.id} style={S.card}>
            {confirmId === p.id ? (
              <Confirm
                message="Remove this pause? Weeks it covered may break a streak."
                confirmLabel="Remove"
                onConfirm={() => {
                  setConfirmId(null);
                  onDeletePause(p.id);
                }}
                onCancel={() => setConfirmId(null)}
              />
            ) : (
              <>
                <div style={S.cardRow}>
                  <div>
                    <span
                      style={{
                        ...S.setBadge,
                        color: C.warn,
                        background: "#2a2010",
                      }}
                    >
                      {reasonLabel(p.reason)}
                    </span>
                  </div>
                  <button style={S.btnSmall} onClick={() => setConfirmId(p.id)}>
                    Remove
                  </button>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 13, marginTop: 8 }}>
                  {fmtDate(`${p.start_date}T12:00:00`)}
                  {p.end_date !== p.start_date && ` — ${fmtDate(`${p.end_date}T12:00:00`)}`}
                </div>
                {p.notes && <div style={S.note}>{p.notes}</div>}
              </>
            )}
          </div>
        ))}

        {adding && draft ? (
          <div style={S.card}>
            <Field label="Reason">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {REASONS.map((r) => (
                  <button
                    key={r.id}
                    style={{
                      ...S.btnXs,
                      padding: "7px 12px",
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

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={S.inputGroup}>
                <div style={S.inputLabel}>From</div>
                <input
                  type="date"
                  style={S.dateInput}
                  value={draft.start_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      start_date: v,
                      end_date: d.end_date < v ? v : d.end_date,
                    }));
                  }}
                />
              </div>
              <div style={S.inputGroup}>
                <div style={S.inputLabel}>To</div>
                <input
                  type="date"
                  style={S.dateInput}
                  min={draft.start_date}
                  value={draft.end_date}
                  onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
                />
              </div>
            </div>

            <Field label="Notes (optional)">
              <textarea
                style={{ ...S.notes, marginTop: 0, minHeight: 44 }}
                placeholder="Anything worth remembering later…"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </Field>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                style={{ ...S.btnPrimary, flex: 1 }}
                onClick={() => {
                  onSavePause(draft);
                  setAdding(false);
                  setDraft(null);
                }}
              >
                Save pause
              </button>
              <button
                style={{ ...S.btnGhost, flex: 1 }}
                onClick={() => {
                  setAdding(false);
                  setDraft(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button style={S.btnAdd} onClick={startPause}>
            + Add a pause
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "7px 0",
        borderBottom: last ? "none" : `1px solid ${C.border}`,
      }}
    >
      <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
      <span
        style={{
          fontFamily: C.mono,
          fontSize: 15,
          fontWeight: 700,
          color: accent ? C.warn : C.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}
