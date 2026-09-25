import { useState } from "react";
import { C, S, toneColor } from "../styles.js";
import { Confirm, HelpLink } from "../components.jsx";
import { fmtDate, fmtDateShort, fmtPct, pctOffTop, repColor, round5 } from "../utils.js";

// ── Progression chart ────────────────────────────────────────────────────────

function Chart({ points }) {
  if (points.length < 2) return null;

  const W = 320;
  const H = 104;
  const PAD = { t: 8, b: 22, l: 34, r: 8 };

  const weights = points.flatMap((p) => [p.topWt, p.backWt]).filter((v) => v != null);
  if (!weights.length) return null;

  const min = Math.min(...weights) * 0.94;
  const max = Math.max(...weights) * 1.04;
  const x = (i) => PAD.l + (i / Math.max(points.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = (w) => H - PAD.b - ((w - min) / (max - min || 1)) * (H - PAD.t - PAD.b);

  const topLine = points.map((p, i) => (p.topWt != null ? [x(i), y(p.topWt)] : null)).filter(Boolean);
  const backLine = points.map((p, i) => (p.backWt != null ? [x(i), y(p.backWt)] : null)).filter(Boolean);
  const ticks = [min, (min + max) / 2, max].map(round5);
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {ticks.map((t, i) => (
        <line key={i} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={C.border} strokeWidth="1" />
      ))}
      {ticks.map((t, i) => (
        <text key={i} x={PAD.l - 5} y={y(t) + 3.5} textAnchor="end" fontSize="9" fill={C.muted}>
          {t}
        </text>
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize="9" fill={C.muted}>
          {fmtDateShort(points[i].date)}
        </text>
      ))}
      {backLine.length > 1 && (
        <polyline
          points={backLine.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={C.accent}
          strokeWidth="1.5"
          strokeOpacity="0.35"
          strokeDasharray="4,3"
        />
      )}
      {topLine.length > 1 && (
        <polyline
          points={topLine.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={C.accent}
          strokeWidth="2"
        />
      )}
      {points.map((p, i) =>
        p.topWt == null ? null : (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.topWt)}
            r={3.5}
            fill={p.tone ? toneColor(p.tone) : C.muted}
            stroke={C.bg}
            strokeWidth="1.5"
          />
        )
      )}
    </svg>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function History({ sessions, workoutName, onBack, onSaveSession, onDeleteSession }) {
  const [view, setView] = useState("progress");
  const [openIdx, setOpenIdx] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const exNames = [];
  for (const s of [...sessions].reverse()) {
    for (const ex of s.exercises || []) if (!exNames.includes(ex.name)) exNames.push(ex.name);
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>{workoutName}</span>
        <span style={{ width: 40 }} />
      </div>

      {sessions.length === 0 ? (
        <div style={S.empty}>
          No sessions logged yet.
          <br />
          Finish a workout and it'll show up here.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              margin: "12px 16px 6px",
              borderRadius: 8,
              overflow: "hidden",
              border: `1px solid ${C.border}`,
            }}
          >
            {["progress", "log"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: view === v ? C.accent : "none",
                  color: view === v ? "#000" : C.muted,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: C.mono,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {v === "progress" ? "PROGRESS" : "SESSION LOG"}
              </button>
            ))}
          </div>
          <div style={{ padding: "2px 16px 8px", color: C.muted, fontSize: 11, textAlign: "right" }}>
            How to read this<HelpLink section="history" />
          </div>

          {view === "progress" &&
            exNames.map((name) => (
              <ProgressCard key={name} name={name} sessions={sessions} />
            ))}

          {view === "log" &&
            sessions.map((s, i) => {
              const editing = editingId === s.id;
              const shown = editing ? draft : s;
              return (
                <div key={s.id} style={S.exCard}>
                  <button style={S.exHeader} onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                    <span style={S.exName}>{fmtDate(s.performed_at)}</span>
                    <span style={S.exToggle}>{openIdx === i ? "▲" : "▼"}</span>
                  </button>

                  {openIdx === i && (
                    <div style={S.exBody}>
                      {confirmId === s.id ? (
                        <Confirm
                          message="Delete this session? This can't be undone."
                          onConfirm={() => {
                            setConfirmId(null);
                            onDeleteSession(s.id);
                          }}
                          onCancel={() => setConfirmId(null)}
                        />
                      ) : (
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                          {!editing ? (
                            <>
                              <button
                                style={S.btnSmall}
                                onClick={() => {
                                  setEditingId(s.id);
                                  setDraft(JSON.parse(JSON.stringify(s)));
                                }}
                              >
                                Edit
                              </button>
                              <button
                                style={{ ...S.btnSmall, color: C.danger, borderColor: C.danger }}
                                onClick={() => setConfirmId(s.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={S.btnPrimary}
                                onClick={() => {
                                  onSaveSession(draft);
                                  setEditingId(null);
                                  setDraft(null);
                                }}
                              >
                                Save changes
                              </button>
                              <button
                                style={S.btnGhost}
                                onClick={() => {
                                  setEditingId(null);
                                  setDraft(null);
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {editing ? (
                        <textarea
                          style={{ ...S.notes, marginTop: 0, marginBottom: 10 }}
                          placeholder="Session notes…"
                          value={shown.notes || ""}
                          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        />
                      ) : (
                        shown.notes && <div style={S.note}>{shown.notes}</div>
                      )}

                      {(shown.exercises || []).map((ex, ei) => (
                        <SessionExercise
                          key={ei}
                          ex={ex}
                          editing={editing}
                          allSessions={sessions}
                          currentId={s.id}
                          onChange={(fn) =>
                            setDraft((d) => ({
                              ...d,
                              exercises: d.exercises.map((x, j) => (j === ei ? fn(x) : x)),
                            }))
                          }
                          onRemove={() =>
                            setDraft((d) => ({
                              ...d,
                              exercises: d.exercises.filter((_, j) => j !== ei),
                            }))
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </>
      )}
    </div>
  );
}

function ProgressCard({ name, sessions }) {
  const rows = [];
  for (const s of sessions) {
    const ex = (s.exercises || []).find((e) => e.name === name);
    if (!ex) continue;
    const top = ex.sets.working.find((w) => w.isTop);
    const back = ex.sets.working.find((w) => !w.isTop);
    rows.push({ date: s.performed_at, top, back });
  }
  if (!rows.length) return null;

  const points = [...rows].reverse().map((r) => ({
    date: r.date,
    topWt: r.top && !r.top.bodyweight ? parseFloat(r.top.weight) : null,
    backWt: r.back && !r.back.bodyweight ? parseFloat(r.back.weight) : null,
    tone: r.top ? repColor(r.top.reps, r.top.repRange) : "",
  }));

  return (
    <div style={{ ...S.exCard, marginBottom: 12 }}>
      <div style={{ padding: "12px 14px 2px", fontWeight: 600, fontSize: 15 }}>{name}</div>
      <div style={{ padding: "2px 14px 10px" }}>
        <Chart points={points} />

        {points.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 10,
              fontFamily: C.mono,
              color: C.muted,
              margin: "4px 0 10px",
              flexWrap: "wrap",
            }}
          >
            <span>
              <span style={{ color: C.accent }}>●</span> hit
            </span>
            <span>
              <span style={{ color: C.warn }}>●</span> in range
            </span>
            <span>
              <span style={{ color: C.danger }}>●</span> missed
            </span>
            <span>— top · - - back-off</span>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: "left", paddingLeft: 0 }}>DATE</th>
                <th style={{ ...S.th, color: C.accent, fontWeight: 700 }}>TOP SET</th>
                <th style={{ ...S.th, paddingRight: 0 }}>BACK-OFF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const topTone = r.top ? repColor(r.top.reps, r.top.repRange) : "";
                const backTone = r.back ? repColor(r.back.reps, r.back.repRange) : "";
                const off =
                  r.back && r.top && !r.back.bodyweight && !r.top.bodyweight
                    ? pctOffTop(r.back.weight, r.top.weight)
                    : null;
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ ...S.td, textAlign: "left", paddingLeft: 0, color: C.muted, fontSize: 11 }}>
                      {fmtDate(r.date)}
                    </td>
                    <td style={S.td}>
                      <span>{r.top?.bodyweight ? "BW" : `${r.top?.weight ?? "—"} lbs`}</span>
                      {r.top?.reps && (
                        <span style={{ marginLeft: 6, color: toneColor(topTone), fontWeight: 700 }}>
                          {r.top.reps}r
                        </span>
                      )}
                    </td>
                    <td style={{ ...S.td, paddingRight: 0, color: C.muted }}>
                      {off != null && <span style={{ fontSize: 10 }}>({fmtPct(off)} off) </span>}
                      <span>{r.back?.bodyweight ? "BW" : r.back ? `${r.back.weight} lbs` : "—"}</span>
                      {r.back?.reps && (
                        <span style={{ marginLeft: 6, color: toneColor(backTone), fontWeight: 700 }}>
                          {r.back.reps}r
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SessionExercise({ ex, editing, allSessions, currentId, onChange, onRemove }) {
  // Most recent earlier session containing this lift, for side-by-side comparison
  const prevSession = allSessions.find(
    (s) => s.id !== currentId && (s.exercises || []).some((e) => e.name === ex.name)
  );
  const prevEx = prevSession?.exercises.find((e) => e.name === ex.name) || null;
  const prevTop = prevEx?.sets.working.find((w) => w.isTop);
  const currTop = ex.sets.working.find((w) => w.isTop);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 600 }}>{ex.name}</div>
        {editing && (
          <button style={{ ...S.btnXs, color: C.danger, borderColor: C.danger }} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      {editing ? (
        <>
          {ex.sets.working.map((ws, wi) => {
            const tone = repColor(ws.reps, ws.repRange);
            return (
              <div key={wi} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", flexWrap: "wrap" }}>
                <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${wi + 1}`}</span>
                {!ws.bodyweight && (
                  <>
                    <input
                      style={{ ...S.wtInput, width: 74 }}
                      type="number"
                      inputMode="decimal"
                      value={ws.weight}
                      onChange={(e) =>
                        onChange((x) => ({
                          ...x,
                          sets: {
                            ...x.sets,
                            working: x.sets.working.map((w, k) =>
                              k === wi ? { ...w, weight: e.target.value } : w
                            ),
                          },
                        }))
                      }
                    />
                    <span style={S.unit}>lbs</span>
                  </>
                )}
                {ws.bodyweight && (
                  <span style={{ fontFamily: C.mono, color: C.accent, fontSize: 13 }}>Bodyweight</span>
                )}
                <input
                  style={{
                    ...S.repsInput,
                    background: tone === "hit" ? C.hitBg : tone === "miss" ? C.missBg : "#1a1a1a",
                  }}
                  type="number"
                  inputMode="numeric"
                  value={ws.reps || ""}
                  onChange={(e) =>
                    onChange((x) => ({
                      ...x,
                      sets: {
                        ...x.sets,
                        working: x.sets.working.map((w, k) =>
                          k === wi ? { ...w, reps: e.target.value } : w
                        ),
                      },
                    }))
                  }
                />
                <span style={{ ...S.unit, fontSize: 11 }}>reps</span>
              </div>
            );
          })}
          <textarea
            style={{ ...S.notes, minHeight: 40 }}
            placeholder="Exercise notes…"
            value={ex.notes || ""}
            onChange={(e) => onChange((x) => ({ ...x, notes: e.target.value }))}
          />
        </>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, textAlign: "left", paddingLeft: 0 }}>SET</th>
                  <th style={{ ...S.th, color: C.accent, fontWeight: 700 }}>THIS SESSION</th>
                  {prevEx && <th style={{ ...S.th, paddingRight: 0 }}>PREV · {fmtDateShort(prevSession.performed_at)}</th>}
                </tr>
              </thead>
              <tbody>
                {ex.sets.working.map((ws, wi) => {
                  const tone = repColor(ws.reps, ws.repRange);
                  const off = !ws.isTop && !ws.bodyweight ? pctOffTop(ws.weight, currTop?.weight) : null;

                  const prev = prevEx?.sets.working[wi] || null;
                  const prevTone = prev ? repColor(prev.reps, prev.repRange) : "";
                  const prevOff =
                    prev && !prev.isTop && !prev.bodyweight ? pctOffTop(prev.weight, prevTop?.weight) : null;
                  const delta =
                    prev && !ws.bodyweight && !prev.bodyweight
                      ? parseFloat(ws.weight) - parseFloat(prev.weight)
                      : null;

                  return (
                    <tr key={wi} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...S.td, textAlign: "left", paddingLeft: 0 }}>
                        <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${wi + 1}`}</span>
                      </td>
                      <td style={S.td}>
                        <span>{ws.bodyweight ? "BW" : `${ws.weight} lbs`}</span>
                        {off != null && <span style={{ color: C.muted, fontSize: 10 }}> ({fmtPct(off)} off)</span>}
                        {ws.reps && (
                          <span style={{ marginLeft: 6, color: toneColor(tone), fontWeight: 700 }}>
                            {ws.reps}r
                          </span>
                        )}
                        {delta != null && delta !== 0 && (
                          <span
                            style={{
                              marginLeft: 5,
                              fontSize: 10,
                              fontWeight: 700,
                              color: delta > 0 ? C.accent : C.danger,
                            }}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta}
                          </span>
                        )}
                      </td>
                      {prevEx && (
                        <td style={{ ...S.td, paddingRight: 0, color: C.muted }}>
                          {prev ? (
                            <>
                              <span>{prev.bodyweight ? "BW" : `${prev.weight} lbs`}</span>
                              {prevOff != null && <span style={{ fontSize: 10 }}> ({fmtPct(prevOff)} off)</span>}
                              {prev.reps && (
                                <span style={{ marginLeft: 6, color: toneColor(prevTone), fontWeight: 700 }}>
                                  {prev.reps}r
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ex.notes && <div style={S.note}>{ex.notes}</div>}
        </>
      )}
    </div>
  );
}
