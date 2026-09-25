import { useState } from "react";
import { C, S } from "../styles.js";
import { Confirm, Field, HelpLink } from "../components.jsx";
import { dateInputToISO, fmtDate, fmtDateShort, isoToDateInput, todayInputValue, uid } from "../utils.js";
import { longTermAverage, rateOfChangePerWeek, smoothedTrend, weeklyAverages } from "../bodyMetrics.js";

function fmt1(n) {
  return n == null ? "—" : String(Math.round(n * 10) / 10);
}

// Faint daily line plus a solid smoothed one — the whole point is that the
// smoothed line is what you actually judge progress on, not any one reading.
// A reading with a note gets a bigger, tappable marker, so an outlier on the
// line can be explained without leaving the chart.
function TrendChart({ points, unit }) {
  const [activeIdx, setActiveIdx] = useState(null);

  if (points.length < 2) return null;

  const W = 320;
  const H = 104;
  const PAD = { t: 8, b: 22, l: 34, r: 8 };

  const vals = points.flatMap((p) => [p.raw, p.smooth]).filter((v) => v != null);
  if (!vals.length) return null;

  const min = Math.min(...vals) * 0.98;
  const max = Math.max(...vals) * 1.02;
  const x = (i) => PAD.l + (i / Math.max(points.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - ((v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);

  const rawLine = points.map((p, i) => [x(i), y(p.raw)]);
  const smoothLine = points.map((p, i) => [x(i), y(p.smooth)]);
  const ticks = [min, (min + max) / 2, max].map((v) => Math.round(v * 10) / 10);
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const active = activeIdx != null ? points[activeIdx] : null;

  return (
    <>
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
        <polyline
          points={rawLine.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={C.accent}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        <polyline points={smoothLine.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.accent} strokeWidth="2" />
        {points.map((p, i) =>
          p.notes ? (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.raw)}
              r={activeIdx === i ? 6 : 5}
              fill={C.warn}
              stroke={C.bg}
              strokeWidth="1.5"
              style={{ cursor: "pointer" }}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            />
          ) : (
            <circle key={i} cx={x(i)} cy={y(p.raw)} r={2} fill={C.muted} />
          )
        )}
      </svg>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
        <span style={{ color: C.warn }}>●</span> has a note — tap to read it
      </div>
      {active && (
        <div style={{ ...S.note, marginTop: 8 }}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 2 }}>
            {fmtDate(active.date)} · {fmt1(active.raw)} {unit}
          </div>
          {active.notes}
        </div>
      )}
    </>
  );
}

function blankDraft() {
  return { id: null, measured_at: todayInputValue(), weight_lb: "", waist_in: "", notes: "" };
}

export default function Tracking({ entries, onSave, onDelete, onBack }) {
  const [draft, setDraft] = useState(blankDraft());
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  function resetDraft() {
    setDraft(blankDraft());
    setEditingId(null);
  }

  function submit() {
    const weight = draft.weight_lb.trim() ? parseFloat(draft.weight_lb) : null;
    const waist = draft.waist_in.trim() ? parseFloat(draft.waist_in) : null;
    if (weight == null && waist == null) return;
    onSave({
      id: draft.id || uid(),
      measured_at: dateInputToISO(draft.measured_at),
      weight_lb: weight,
      waist_in: waist,
      notes: draft.notes.trim(),
    });
    resetDraft();
  }

  function edit(e) {
    setEditingId(e.id);
    setDraft({
      id: e.id,
      measured_at: isoToDateInput(e.measured_at),
      weight_lb: e.weight_lb != null ? String(e.weight_lb) : "",
      waist_in: e.waist_in != null ? String(e.waist_in) : "",
      notes: e.notes || "",
    });
  }

  const weekly = weeklyAverages(entries);
  const weightTrend = smoothedTrend(entries, "weight_lb");
  const waistTrend = smoothedTrend(entries, "waist_in");
  const weightChange = rateOfChangePerWeek(weekly, "avgWeight");
  const waistChange = rateOfChangePerWeek(weekly, "avgWaist");
  const avg30 = longTermAverage(entries, "weight_lb", 30);
  const avg90 = longTermAverage(entries, "weight_lb", 90);

  const sorted = [...entries].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
  const canSubmit = draft.weight_lb.trim() || draft.waist_in.trim();

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>
          Body tracking
          <HelpLink section="tracking" />
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{editingId ? "Edit entry" : "Log today"}</div>
          <Field label="Date">
            <input
              type="date"
              style={S.dateInput}
              value={draft.measured_at}
              onChange={(e) => setDraft((d) => ({ ...d, measured_at: e.target.value }))}
            />
          </Field>
          <div style={{ display: "flex", gap: 16 }}>
            <Field label="Weight">
              <div style={S.inputRow}>
                <input
                  style={S.wtInput}
                  type="number"
                  inputMode="decimal"
                  placeholder="—"
                  value={draft.weight_lb}
                  onChange={(e) => setDraft((d) => ({ ...d, weight_lb: e.target.value }))}
                />
                <span style={S.unit}>lbs</span>
              </div>
            </Field>
            <Field label="Waist">
              <div style={S.inputRow}>
                <input
                  style={S.wtInput}
                  type="number"
                  inputMode="decimal"
                  placeholder="—"
                  value={draft.waist_in}
                  onChange={(e) => setDraft((d) => ({ ...d, waist_in: e.target.value }))}
                />
                <span style={S.unit}>in</span>
              </div>
            </Field>
          </div>
          <Field label="Notes (optional)">
            <input
              style={S.textInput}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnPrimary, flex: 1, opacity: canSubmit ? 1 : 0.4 }} disabled={!canSubmit} onClick={submit}>
              {editingId ? "Save changes" : "Log entry"}
            </button>
            {editingId && (
              <button style={S.btnGhost} onClick={resetDraft}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {(weightChange != null || waistChange != null || avg30 != null) && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.accent, marginBottom: 8 }}>
              THIS WEEK VS LAST
            </div>
            {weightChange != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: C.muted }}>Weight</span>
                <span style={{ color: weightChange > 0 ? C.warn : weightChange < 0 ? C.accent : C.muted, fontWeight: 700 }}>
                  {weightChange > 0 ? "+" : ""}
                  {fmt1(weightChange)} lb/wk
                </span>
              </div>
            )}
            {waistChange != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 13 }}>
                <span style={{ color: C.muted }}>Waist</span>
                <span style={{ color: waistChange > 0 ? C.warn : waistChange < 0 ? C.accent : C.muted, fontWeight: 700 }}>
                  {waistChange > 0 ? "+" : ""}
                  {fmt1(waistChange)} in/wk
                </span>
              </div>
            )}
            {(avg30 != null || avg90 != null) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                {avg30 != null && <div>30-day avg weight: {fmt1(avg30)} lbs</div>}
                {avg90 != null && <div>90-day avg weight: {fmt1(avg90)} lbs</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {weightTrend.length >= 2 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>
              WEIGHT TREND
            </div>
            <TrendChart points={weightTrend} unit="lbs" />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>faint = daily · solid = 7-entry average</div>
          </div>
        </div>
      )}

      {waistTrend.length >= 2 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>
              WAIST TREND
            </div>
            <TrendChart points={waistTrend} unit="in" />
          </div>
        </div>
      )}

      {weekly.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>
              WEEKLY AVERAGES
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: "left", paddingLeft: 0 }}>WEEK OF</th>
                    <th style={S.th}>WEIGHT</th>
                    <th style={{ ...S.th, paddingRight: 0 }}>WAIST</th>
                  </tr>
                </thead>
                <tbody>
                  {[...weekly]
                    .reverse()
                    .slice(0, 8)
                    .map((w) => (
                      <tr key={w.week} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ ...S.td, textAlign: "left", paddingLeft: 0, color: C.muted, fontSize: 11 }}>
                          {fmtDateShort(`${w.week}T12:00:00`)}
                        </td>
                        <td style={S.td}>{w.avgWeight != null ? `${fmt1(w.avgWeight)} lbs` : "—"}</td>
                        <td style={{ ...S.td, paddingRight: 0 }}>{w.avgWaist != null ? `${fmt1(w.avgWaist)} in` : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionLabel}>ENTRIES</div>
        {sorted.length === 0 ? (
          <div style={S.empty}>
            Nothing logged yet.
            <br />
            Log today's weight or waist above to get started.
          </div>
        ) : (
          sorted.map((e) =>
            confirmId === e.id ? (
              <Confirm
                key={e.id}
                message="Delete this entry?"
                onConfirm={() => {
                  setConfirmId(null);
                  onDelete(e.id);
                }}
                onCancel={() => setConfirmId(null)}
              />
            ) : (
              <div key={e.id} style={S.card}>
                <div style={S.cardRow}>
                  <div>
                    <div style={S.cardTitle}>{fmtDate(e.measured_at)}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, marginTop: 3 }}>
                      {e.weight_lb != null ? `${fmt1(e.weight_lb)} lbs` : ""}
                      {e.weight_lb != null && e.waist_in != null ? " · " : ""}
                      {e.waist_in != null ? `${fmt1(e.waist_in)} in` : ""}
                    </div>
                    {e.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{e.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={S.btnXs} onClick={() => edit(e)}>
                      Edit
                    </button>
                    <button style={{ ...S.btnXs, color: C.danger, borderColor: C.danger }} onClick={() => setConfirmId(e.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
