import { useState } from "react";
import { C, S } from "../styles.js";
import { Confirm, Field, HelpLink, PeriodPicker } from "../components.jsx";
import { dateInputToISO, fmtDate, fmtDateShort, isoToDateInput, todayInputValue, uid } from "../utils.js";
import { checkInTrend, NOTE_FIELDS, weeklyCheckIns } from "../checkIns.js";
import { weekKey } from "../achievements.js";
import { rangeStart, readRange, writeRange } from "../periods.js";
import { TrendChart } from "./Tracking.jsx";

const RANGE_KEY = "ironlog:checkin-range";

const fmtSteps = (n) => (n == null ? "—" : Math.round(n).toLocaleString());
const fmtHours = (n) => (n == null ? "—" : String(Math.round(n * 10) / 10));

function blankDraft(date) {
  return { id: null, date, steps: "", sleep: "", hunger: "", energy: "", joints: "", wins: "", questions: "" };
}

function draftFrom(e) {
  return {
    id: e.id,
    date: isoToDateInput(e.checked_at),
    steps: e.steps != null ? String(e.steps) : "",
    sleep: e.sleep_hours != null ? String(e.sleep_hours) : "",
    hunger: e.hunger || "",
    energy: e.energy || "",
    joints: e.joints || "",
    wins: e.wins || "",
    questions: e.questions || "",
  };
}

export default function CheckIn({ entries, bodyMetrics, onSave, onDelete, onBack }) {
  const [rangeId, setRangeId] = useState(() => readRange(RANGE_KEY));
  const [draft, setDraft] = useState(() => blankDraft(todayInputValue()));
  const [confirmId, setConfirmId] = useState(null);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  // One check-in per day: picking a date that already has one opens it for
  // editing rather than starting a second
  function pickDate(date) {
    const existing = entries.find((e) => isoToDateInput(e.checked_at) === date);
    if (existing) setDraft(draftFrom(existing));
    else setDraft((d) => ({ ...d, id: null, date }));
  }

  function pickRange(id) {
    setRangeId(id);
    writeRange(RANGE_KEY, id);
  }

  const hasSomething =
    draft.steps.trim() || draft.sleep.trim() || NOTE_FIELDS.some((f) => draft[f.key].trim());

  function submit() {
    if (!hasSomething) return;
    const id = draft.id || uid();
    onSave({
      id,
      checked_at: dateInputToISO(draft.date),
      steps: draft.steps.trim() ? Math.round(parseFloat(draft.steps)) : null,
      sleep_hours: draft.sleep.trim() ? parseFloat(draft.sleep) : null,
      ...Object.fromEntries(NOTE_FIELDS.map((f) => [f.key, draft[f.key].trim()])),
    });
    // Stay on it, now tied to the saved entry, so saving again updates it
    setDraft((d) => ({ ...d, id }));
  }

  function edit(e) {
    setDraft(draftFrom(e));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Worked out from everything, then trimmed to the period, so the smoothed
  // line doesn't wobble at the left edge
  const start = rangeStart(rangeId);
  const weeklyAll = weeklyCheckIns(entries, bodyMetrics);
  const weekly = weeklyAll.filter((w) => {
    if (!start) return true;
    const end = new Date(`${w.week}T12:00:00`);
    end.setDate(end.getDate() + 6);
    return end >= start;
  });
  const inPeriod = (p) => !start || new Date(p.date) >= start;
  const stepsTrend = checkInTrend(entries, "steps").filter(inPeriod);
  const sleepTrend = checkInTrend(entries, "sleep_hours").filter(inPeriod);

  const thisWeek = weeklyAll.find((w) => w.week === weekKey(new Date()));
  const sorted = [...entries].sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

  const chartCard = (label, trend, unit, hasAny) =>
    hasAny && (
      <div style={{ padding: "14px 16px 0" }}>
        <div style={S.card}>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>
            {label}
          </div>
          {trend.length >= 2 ? (
            <>
              <TrendChart points={trend} unit={unit} />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>faint = daily · solid = 7-entry average</div>
            </>
          ) : (
            <div style={{ color: C.muted, fontSize: 13 }}>Not enough readings in this period. Try a longer one.</div>
          )}
        </div>
      </div>
    );

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>
          Check-in
          <HelpLink section="checkin" />
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{draft.id ? "Edit check-in" : "New check-in"}</div>
          <Field label="Date">
            <input type="date" style={S.dateInput} value={draft.date} onChange={(e) => pickDate(e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 16 }}>
            <Field label="Steps">
              <input
                style={{ ...S.wtInput, width: 110 }}
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={draft.steps}
                onChange={(e) => set({ steps: e.target.value })}
              />
            </Field>
            <Field label="Sleep">
              <div style={S.inputRow}>
                <input
                  style={S.wtInput}
                  type="number"
                  inputMode="decimal"
                  placeholder="—"
                  value={draft.sleep}
                  onChange={(e) => set({ sleep: e.target.value })}
                />
                <span style={S.unit}>hrs</span>
              </div>
            </Field>
          </div>
          <div style={{ color: C.muted, fontSize: 11, margin: "-2px 0 10px" }}>
            Waist is logged in Body tracking, and shows up in the weekly summary below.
          </div>

          {NOTE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <textarea
                style={{ ...S.notes, marginTop: 0, minHeight: 48 }}
                placeholder={f.hint}
                value={draft[f.key]}
                onChange={(e) => set({ [f.key]: e.target.value })}
              />
            </Field>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...S.btnPrimary, flex: 1, opacity: hasSomething ? 1 : 0.4 }}
              disabled={!hasSomething}
              onClick={submit}
            >
              {draft.id ? "Save changes" : "Save check-in"}
            </button>
            {draft.id && (
              <button style={S.btnGhost} onClick={() => setDraft(blankDraft(todayInputValue()))}>
                New
              </button>
            )}
          </div>
        </div>
      </div>

      {thisWeek && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.accent, marginBottom: 8 }}>
              THIS WEEK (AVERAGE PER DAY)
            </div>
            {[
              ["Steps", fmtSteps(thisWeek.steps)],
              ["Sleep", thisWeek.sleep != null ? `${fmtHours(thisWeek.sleep)} hrs` : "—"],
              ["Waist", thisWeek.waist != null ? `${fmtHours(thisWeek.waist)} in` : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && <PeriodPicker value={rangeId} onChange={pickRange} />}

      {chartCard("STEPS TREND", stepsTrend, "steps", entries.some((e) => e.steps != null))}
      {chartCard("SLEEP TREND", sleepTrend, "hrs", entries.some((e) => e.sleep_hours != null))}

      {weekly.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={S.card}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>
              WEEKLY AVERAGES
            </div>
            <div style={{ overflow: "auto", maxHeight: 320 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: "left", paddingLeft: 0 }}>WEEK OF</th>
                    <th style={S.th}>STEPS/DAY</th>
                    <th style={S.th}>SLEEP</th>
                    <th style={{ ...S.th, paddingRight: 0 }}>WAIST</th>
                  </tr>
                </thead>
                <tbody>
                  {[...weekly].reverse().map((w) => (
                    <tr key={w.week} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...S.td, textAlign: "left", paddingLeft: 0, color: C.muted, fontSize: 11 }}>
                        {fmtDateShort(`${w.week}T12:00:00`)}
                      </td>
                      <td style={S.td}>{fmtSteps(w.steps)}</td>
                      <td style={S.td}>{w.sleep != null ? `${fmtHours(w.sleep)} h` : "—"}</td>
                      <td style={{ ...S.td, paddingRight: 0 }}>{w.waist != null ? `${fmtHours(w.waist)} in` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionLabel}>CHECK-INS</div>
        {sorted.length === 0 ? (
          <div style={S.empty}>
            Nothing logged yet.
            <br />
            Fill in what you have above — steps, sleep, or just a note — and save.
          </div>
        ) : (
          sorted.map((e) =>
            confirmId === e.id ? (
              <Confirm
                key={e.id}
                message="Delete this check-in?"
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
                    <div style={S.cardTitle}>{fmtDate(e.checked_at)}</div>
                    {(e.steps != null || e.sleep_hours != null) && (
                      <div style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, marginTop: 3 }}>
                        {e.steps != null ? `${fmtSteps(e.steps)} steps` : ""}
                        {e.steps != null && e.sleep_hours != null ? " · " : ""}
                        {e.sleep_hours != null ? `${fmtHours(Number(e.sleep_hours))} h sleep` : ""}
                      </div>
                    )}
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
                {NOTE_FIELDS.filter((f) => e[f.key]?.trim()).map((f) => (
                  <div key={f.key} style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ color: C.muted, fontWeight: 600 }}>{f.label}: </span>
                    {e[f.key]}
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
