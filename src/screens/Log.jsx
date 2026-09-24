import { useEffect, useRef, useState } from "react";
import { C, S, toneColor } from "../styles.js";
import { Labeled } from "../components.jsx";
import {
  compareToLast,
  describeDelta,
  describeE1rm,
  describeSet,
  evaluateStall,
  isStalled,
  ordinal,
} from "../stall.js";
import {
  calcWtRange,
  dateInputToISO,
  fmtDate,
  fmtPct,
  fmtPctRange,
  fmtReps,
  fmtRest,
  fmtWt,
  findLastExercise,
  isoToDateInput,
  normRange,
  pctOffTop,
  pctOfTop,
  recommendation,
  repColor,
  round5,
  todayInputValue,
  uid,
} from "../utils.js";

// ── Building log state from a workout definition ─────────────────────────────

function buildWarmups(scheme, topWt, previousWarmups) {
  return (scheme?.warmup_sets || []).map((w, i) => {
    const wr = calcWtRange(topWt, w.pct);
    const prior = previousWarmups?.[i];
    return {
      pct: w.pct,
      reps: w.reps,
      rest: w.rest,
      prescribedLo: wr.lo,
      prescribedHi: wr.hi,
      prescribedIsRange: wr.isRange,
      actualWt: prior?.actualWt ?? String(wr.lo),
    };
  });
}

function buildWorkingSets(defs, topWt, prior) {
  return defs.map((ws, i) => {
    const priorSet = prior?.[i];
    if (ws.isTop) {
      return {
        isTop: true,
        repRange: ws.repRange,
        rest: ws.rest,
        weight: String(topWt),
        reps: "",
        bodyweight: priorSet?.bodyweight ?? ws.bodyweight ?? false,
      };
    }
    const red = ws.pctReduction || [10, 15];
    const lo = round5(topWt * (1 - red[1] / 100));
    const hi = round5(topWt * (1 - red[0] / 100));
    return {
      isTop: false,
      repRange: ws.repRange,
      rest: ws.rest,
      pctReduction: red,
      rangeLo: lo,
      rangeHi: hi,
      weight: priorSet?.weight != null && priorSet.weight !== "BW" ? String(priorSet.weight) : String(lo),
      reps: "",
      bodyweight: priorSet?.bodyweight ?? ws.bodyweight ?? false,
    };
  });
}

export function buildExerciseState(exDef, schemes, sessions, workoutId) {
  const scheme = schemes.find((s) => s.id === exDef.schemeId) || { warmup_sets: [] };

  // Weights always follow the most recent time this lift was done, in any workout
  const anyHit = findLastExercise(sessions, exDef.name);
  const thisHit = findLastExercise(sessions, exDef.name, workoutId);

  const topWt = anyHit?.exercise?.topSetWeight ?? exDef.topSetWeight ?? 100;

  const lastAny = anyHit
    ? {
        working: anyHit.exercise.sets?.working || [],
        date: anyHit.session.performed_at,
        workoutName: anyHit.session.workout_name,
        sameWorkout: anyHit.session.workout_id === workoutId,
      }
    : null;

  const lastThis =
    thisHit && thisHit.session.id !== anyHit?.session?.id
      ? {
          working: thisHit.exercise.sets?.working || [],
          date: thisHit.session.performed_at,
          workoutName: thisHit.session.workout_name,
        }
      : null;

  return {
    key: exDef.id || uid(),
    name: exDef.name,
    schemeId: exDef.schemeId,
    topSetInput: String(topWt),
    topSetWeight: topWt,
    warmups: buildWarmups(scheme, topWt, anyHit?.exercise?.sets?.warmups),
    workingSets: buildWorkingSets(exDef.workingSets || [], topWt, anyHit?.exercise?.sets?.working),
    notes: "",
    expanded: true,
    lastAny,
    lastThis,
  };
}

// Recalculate prescribed weights after the top set changes. Manually overridden
// actual weights are preserved; ones still sitting on the old prescribed value
// follow along.
function recalc(ex) {
  const topWt = parseFloat(ex.topSetInput);
  if (!topWt || isNaN(topWt)) return ex;

  const warmups = ex.warmups.map((w) => {
    const wr = calcWtRange(topWt, w.pct);
    const untouched = String(w.actualWt) === String(w.prescribedLo);
    return {
      ...w,
      prescribedLo: wr.lo,
      prescribedHi: wr.hi,
      prescribedIsRange: wr.isRange,
      actualWt: untouched ? String(wr.lo) : w.actualWt,
    };
  });

  const workingSets = ex.workingSets.map((ws) => {
    if (ws.isTop) return { ...ws, weight: String(topWt) };
    const red = ws.pctReduction || [10, 15];
    const lo = round5(topWt * (1 - red[1] / 100));
    const hi = round5(topWt * (1 - red[0] / 100));
    const untouched = ws.rangeLo != null && String(ws.weight) === String(ws.rangeLo);
    return { ...ws, rangeLo: lo, rangeHi: hi, weight: untouched ? String(lo) : ws.weight };
  });

  return { ...ex, topSetWeight: topWt, warmups, workingSets };
}

// ── Last-session summary ─────────────────────────────────────────────────────

function LastSession({ data, label, withAdvice }) {
  const top = data.working.find((w) => w.isTop);
  const topWt = top ? parseFloat(top.weight) : null;

  return (
    <div style={{ ...S.panel, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>
        {label} · <span style={{ color: C.text }}>{data.workoutName}</span> · {fmtDate(data.date)}
      </div>
      {data.working.map((ws, i) => {
        const tone = repColor(ws.reps, ws.repRange);
        const advice = withAdvice ? recommendation(ws.reps, ws.repRange) : null;
        const off = !ws.isTop && !ws.bodyweight ? pctOffTop(ws.weight, topWt) : null;
        return (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", flexWrap: "wrap" }}
          >
            <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${i + 1}`}</span>
            <span style={{ fontFamily: C.mono, fontSize: 13 }}>
              {ws.bodyweight ? "Bodyweight" : `${ws.weight} lbs`}
            </span>
            {off != null && (
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
                ({fmtPct(off)} off)
              </span>
            )}
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted }}>
              {ws.repRange ? `${ws.repRange[0]}–${ws.repRange[1]}` : "?"} target
            </span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: toneColor(tone), fontWeight: 600 }}>
              {ws.reps ? `${ws.reps} done` : "—"}
            </span>
            {advice && (
              <span
                style={{
                  fontFamily: C.mono,
                  fontSize: 12,
                  fontWeight: 700,
                  color: toneColor(advice.tone),
                  marginLeft: "auto",
                }}
              >
                {advice.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function Log({
  workout,
  schemes,
  sessions,
  pauses,
  blocks,
  resets,
  draft,
  onSaveDraft,
  onFinish,
  onBack,
}) {
  const [sessionDate, setSessionDate] = useState(
    draft?.sessionDate ?? todayInputValue()
  );
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [exs, setExs] = useState(
    () =>
      draft?.exs ??
      (workout.exercises || []).map((e) => buildExerciseState(e, schemes, sessions, workout.id))
  );
  const [saving, setSaving] = useState(false);
  const [stallAlert, setStallAlert] = useState(null);
  const firstRun = useRef(true);

  // Autosave the draft, debounced so typing doesn't spam the database
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      onSaveDraft({ sessionDate, notes, exs });
    }, 800);
    return () => clearTimeout(t);
  }, [sessionDate, notes, exs]);

  const setEx = (i, fn) => setExs((prev) => prev.map((e, j) => (j === i ? fn(e) : e)));

  // Runs when you leave the top set's reps field. Fires at most once per exercise
  // per session — the acknowledgement is stored on the exercise, so it also
  // survives leaving and resuming the draft.
  function checkStall(i) {
    const ex = exs[i];
    if (!ex || ex.stallAck) return;
    const top = ex.workingSets.find((w) => w.isTop);
    if (!top || top.reps === "" || top.reps == null) return;
    const result = evaluateStall({
      sessions,
      pauses,
      blocks,
      resets,
      name: ex.name,
      currentSet: { weight: top.weight, reps: top.reps, bodyweight: top.bodyweight },
      currentDate: sessionDate,
      excludeSessionId: draft?.sessionId,
    });
    if (result && !result.beat && result.count >= 2) {
      setStallAlert({ index: i, name: ex.name, ...result });
    }
  }

  function buildSession() {
    return {
      id: draft?.sessionId || uid(),
      workout_id: workout.id,
      workout_name: workout.name,
      performed_at: dateInputToISO(sessionDate),
      notes,
      exercises: exs.map((ex) => ({
        name: ex.name,
        topSetWeight: parseFloat(ex.topSetInput) || ex.topSetWeight,
        notes: ex.notes,
        sets: {
          warmups: ex.warmups.map((w) => ({
            pct: w.pct,
            reps: w.reps,
            actualWt: w.actualWt,
          })),
          working: ex.workingSets.map((ws) => ({
            isTop: ws.isTop,
            repRange: ws.repRange,
            weight: ws.bodyweight ? "BW" : ws.weight,
            reps: ws.reps,
            bodyweight: !!ws.bodyweight,
          })),
        },
      })),
    };
  }

  async function finish() {
    setSaving(true);
    await onFinish(buildSession());
    setSaving(false);
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Save &amp; exit
        </button>
        <span style={S.headerTitle}>{workout.name}</span>
        <button style={S.btnPrimary} disabled={saving} onClick={finish}>
          {saving ? "…" : "Finish"}
        </button>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <Labeled label="SESSION DATE">
          <input
            type="date"
            style={S.dateInput}
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </Labeled>
      </div>

      {exs.map((ex, i) => (
        <ExerciseCard
          key={ex.key}
          ex={ex}
          index={i}
          schemes={schemes}
          setEx={setEx}
          onRemove={() => setExs((p) => p.filter((_, j) => j !== i))}
          onTopSetLogged={() => checkStall(i)}
        />
      ))}

      <div style={{ padding: "4px 16px 8px" }}>
        <div style={S.subLabel}>SESSION NOTES</div>
        <textarea
          style={S.notes}
          placeholder="How did it go?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ padding: "8px 16px 40px" }}>
        <button style={{ ...S.btnPrimary, width: "100%" }} disabled={saving} onClick={finish}>
          {saving ? "Saving…" : "Finish session"}
        </button>
        <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 10 }}>
          Progress saves automatically — you can leave and come back.
        </div>
      </div>

      {stallAlert && (
        <StallAlert
          alert={stallAlert}
          onAck={() => {
            setEx(stallAlert.index, (e) => ({ ...e, stallAck: true }));
            setStallAlert(null);
          }}
        />
      )}
    </div>
  );
}

function StallAlert({ alert, onAck }) {
  const stalled = isStalled(alert.count);
  const tone = stalled ? C.danger : C.warn;
  const todayE = describeE1rm(alert.current);
  const bestE = describeE1rm(alert.best);
  const b = alert.baseline;
  const since = b
    ? b.kind === "reset"
      ? `since baseline reset ${fmtDate(`${b.date}T12:00:00`)}`
      : `since block started ${fmtDate(`${b.date}T12:00:00`)}`
    : "all-time — no block start set";

  return (
    <div style={S.overlay} role="alertdialog" aria-modal="true">
      <div style={{ ...S.modal, borderColor: tone }}>
        {stalled && (
          <div
            style={{
              display: "inline-block",
              background: C.dangerDim,
              color: C.danger,
              fontFamily: C.mono,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              padding: "3px 8px",
              borderRadius: 4,
              marginBottom: 10,
            }}
          >
            STALLED
          </div>
        )}
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 11,
            letterSpacing: 1.5,
            color: tone,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          {ordinal(alert.count)} session without beating the log
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{alert.name}</div>

        <div style={{ ...S.panel, fontFamily: C.mono, fontSize: 13, lineHeight: 1.9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: C.muted }}>Today</span>
            <span>
              {describeSet(alert.current)}
              {todayE != null && <span style={{ color: C.muted }}> · e1RM {todayE}</span>}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: C.muted }}>Block best</span>
            <span>
              {describeSet(alert.best)}
              {bestE != null && <span style={{ color: C.muted }}> · e1RM {bestE}</span>}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: C.muted }}>Set on</span>
            <span>{fmtDate(alert.best.date)}</span>
          </div>
        </div>
        <div style={{ color: C.muted, fontSize: 11, margin: "-2px 0 12px", fontFamily: C.mono }}>
          Best {since}
        </div>

        <button style={{ ...S.btnPrimary, width: "100%" }} onClick={onAck}>
          Got it
        </button>
      </div>
    </div>
  );
}

function ExerciseCard({ ex, index, schemes, setEx, onRemove, onTopSetLogged }) {
  const scheme = schemes.find((s) => s.id === ex.schemeId);

  function changeScheme(schemeId) {
    const sc = schemes.find((s) => s.id === schemeId);
    const topWt = parseFloat(ex.topSetInput) || ex.topSetWeight;
    setEx(index, (e) => ({
      ...e,
      schemeId,
      warmups: buildWarmups(sc, topWt, null),
    }));
  }

  function addWarmup() {
    const topWt = parseFloat(ex.topSetInput) || ex.topSetWeight;
    const wr = calcWtRange(topWt, 50);
    setEx(index, (e) => ({
      ...e,
      warmups: [
        ...e.warmups,
        {
          pct: 50,
          reps: 5,
          rest: 60,
          prescribedLo: wr.lo,
          prescribedHi: wr.hi,
          prescribedIsRange: wr.isRange,
          actualWt: String(wr.lo),
        },
      ],
    }));
  }

  function addWorkingSet() {
    const topWt = parseFloat(ex.topSetInput) || ex.topSetWeight;
    const lo = round5(topWt * 0.85);
    const hi = round5(topWt * 0.9);
    setEx(index, (e) => ({
      ...e,
      workingSets: [
        ...e.workingSets,
        {
          isTop: false,
          repRange: [10, 12],
          rest: [120, 150],
          pctReduction: [10, 15],
          rangeLo: lo,
          rangeHi: hi,
          weight: String(lo),
          reps: "",
          bodyweight: false,
        },
      ],
    }));
  }

  return (
    <div style={S.exCard}>
      <button style={S.exHeader} onClick={() => setEx(index, (e) => ({ ...e, expanded: !e.expanded }))}>
        <span style={S.exName}>{ex.name}</span>
        <span style={S.exToggle}>{ex.expanded ? "▲" : "▼"}</span>
      </button>

      {ex.expanded && (
        <div style={S.exBody}>
          {ex.lastAny && (
            <LastSession
              data={ex.lastAny}
              label={ex.lastAny.sameWorkout ? "LAST TIME" : "LAST TIME (ANY WORKOUT)"}
              withAdvice
            />
          )}
          {ex.lastThis && <LastSession data={ex.lastThis} label="LAST TIME (THIS WORKOUT)" />}

          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", margin: "12px 0 4px" }}>
            <Labeled label="Top set weight">
              <div style={S.inputRow}>
                <input
                  style={S.wtInput}
                  type="number"
                  inputMode="decimal"
                  value={ex.topSetInput}
                  onChange={(e) => setEx(index, (x) => recalc({ ...x, topSetInput: e.target.value }))}
                />
                <span style={S.unit}>lbs</span>
              </div>
            </Labeled>
            <div style={{ marginLeft: "auto" }}>
              <button style={{ ...S.btnXs, color: C.danger, borderColor: C.danger }} onClick={onRemove}>
                Remove exercise
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 2px" }}>
            <span style={{ ...S.inputLabel, whiteSpace: "nowrap" }}>Warm-up scheme</span>
            <select
              style={{ ...S.select, fontSize: 12, padding: "6px 8px" }}
              value={ex.schemeId || ""}
              onChange={(e) => changeScheme(e.target.value)}
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {ex.warmups.length > 0 && <div style={S.subLabel}>WARM-UP SETS</div>}

          {ex.warmups.map((w, wi) => {
            const actual = pctOfTop(w.actualWt, ex.topSetWeight);
            const { lo, hi } = normRange(w.pct);
            const mid = (lo + hi) / 2;
            const drift = actual != null ? actual - mid : null;
            const prescribedWt = w.prescribedIsRange
              ? `${fmtWt(w.prescribedLo)}–${fmtWt(w.prescribedHi)} lbs`
              : `${fmtWt(w.prescribedLo)} lbs`;

            return (
              <div key={wi} style={S.setBlock}>
                <div style={S.setHead}>
                  <span style={S.setBadge}>W{wi + 1}</span>
                  <span style={S.setInfo}>
                    {fmtReps(w.reps)} reps · rest {fmtRest(w.rest)}
                  </span>
                  <button
                    style={{ ...S.btnXs, marginLeft: "auto", color: C.danger, borderColor: C.danger }}
                    onClick={() =>
                      setEx(index, (e) => ({ ...e, warmups: e.warmups.filter((_, j) => j !== wi) }))
                    }
                  >
                    Remove
                  </button>
                </div>

                <div style={S.prescribed}>
                  <span style={S.prescribedLabel}>Prescribed</span>
                  <span style={S.prescribedVal}>
                    {fmtPctRange(w.pct)} → <b>{prescribedWt}</b>
                  </span>
                </div>

                <div style={S.setRow}>
                  <Labeled label="Actual wt">
                    <div style={S.inputRow}>
                      <input
                        style={S.wtInput}
                        type="number"
                        inputMode="decimal"
                        value={w.actualWt}
                        onChange={(e) =>
                          setEx(index, (x) => ({
                            ...x,
                            warmups: x.warmups.map((y, j) =>
                              j === wi ? { ...y, actualWt: e.target.value } : y
                            ),
                          }))
                        }
                      />
                      <span style={S.unit}>lbs</span>
                    </div>
                  </Labeled>
                  {actual != null && (
                    <Labeled label="Actual %">
                      <div
                        style={{
                          fontFamily: C.mono,
                          fontWeight: 700,
                          fontSize: 15,
                          paddingTop: 6,
                          color: drift != null && Math.abs(drift) <= 3 ? C.accent : C.warn,
                        }}
                      >
                        {fmtPct(actual)}
                        {drift != null && Math.abs(drift) > 0.5 && (
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>
                            {drift > 0 ? "+" : ""}
                            {fmtPct(drift)} vs target
                          </div>
                        )}
                      </div>
                    </Labeled>
                  )}
                </div>
              </div>
            );
          })}

          <button style={{ ...S.btnAdd, fontSize: 12, padding: "6px 0" }} onClick={addWarmup}>
            + Add warm-up set
          </button>

          <div style={S.subLabel}>WORKING SETS</div>

          {ex.workingSets.map((ws, si) => {
            const tone = repColor(ws.reps, ws.repRange);
            const off = !ws.isTop && !ws.bodyweight ? pctOffTop(ws.weight, ex.topSetWeight) : null;
            const inRange =
              off != null && ws.pctReduction && off >= ws.pctReduction[0] && off <= ws.pctReduction[1];
            const advice = recommendation(ws.reps, ws.repRange);

            return (
              <div
                key={si}
                style={{
                  ...S.setBlock,
                  borderLeft: `3px solid ${tone ? toneColor(tone) : C.border}`,
                }}
              >
                <div style={S.setHead}>
                  <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${si + 1}`}</span>
                  <span style={S.setInfo}>rest {fmtRest(ws.rest)}</span>
                  <span style={S.repTarget}>
                    {ws.repRange[0]}–{ws.repRange[1]} reps
                  </span>
                  {!ws.isTop && (
                    <button
                      style={{ ...S.btnXs, color: C.danger, borderColor: C.danger }}
                      onClick={() =>
                        setEx(index, (e) => ({
                          ...e,
                          workingSets: e.workingSets.filter((_, j) => j !== si),
                        }))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>

                {!ws.isTop && !ws.bodyweight && ws.rangeLo != null && (
                  <div style={S.prescribed}>
                    <span style={S.prescribedLabel}>Prescribed</span>
                    <span style={S.prescribedVal}>
                      {ws.pctReduction[0]}–{ws.pctReduction[1]}% off →{" "}
                      <b>
                        {fmtWt(ws.rangeLo)}–{fmtWt(ws.rangeHi)} lbs
                      </b>
                    </span>
                  </div>
                )}

                <div style={S.setRow}>
                  <Labeled label={ws.isTop ? "Weight" : "Actual wt"}>
                    {ws.bodyweight ? (
                      <div
                        style={{
                          fontFamily: C.mono,
                          fontSize: 15,
                          fontWeight: 700,
                          color: C.accent,
                          paddingTop: 8,
                        }}
                      >
                        Bodyweight
                      </div>
                    ) : (
                      <div style={S.inputRow}>
                        <input
                          style={S.wtInput}
                          type="number"
                          inputMode="decimal"
                          value={ws.weight}
                          onChange={(e) =>
                            setEx(index, (x) => ({
                              ...x,
                              workingSets: x.workingSets.map((y, j) =>
                                j === si ? { ...y, weight: e.target.value } : y
                              ),
                            }))
                          }
                        />
                        <span style={S.unit}>lbs</span>
                      </div>
                    )}
                  </Labeled>

                  <Labeled label="Reps done">
                    <input
                      style={{
                        ...S.repsInput,
                        background: tone === "hit" ? C.hitBg : tone === "miss" ? C.missBg : "#1a1a1a",
                      }}
                      type="number"
                      inputMode="numeric"
                      value={ws.reps}
                      onChange={(e) =>
                        setEx(index, (x) => ({
                          ...x,
                          workingSets: x.workingSets.map((y, j) =>
                            j === si ? { ...y, reps: e.target.value } : y
                          ),
                        }))
                      }
                      onBlur={() => {
                        if (ws.isTop && onTopSetLogged) onTopSetLogged();
                      }}
                    />
                  </Labeled>

                  {off != null && (
                    <Labeled label="Actual % off">
                      <div
                        style={{
                          fontFamily: C.mono,
                          fontWeight: 700,
                          fontSize: 15,
                          paddingTop: 6,
                          color: inRange ? C.accent : C.warn,
                        }}
                      >
                        {fmtPct(off)}
                      </div>
                    </Labeled>
                  )}

                  <Labeled label="Bodyweight">
                    <button
                      style={{
                        ...S.btnXs,
                        marginTop: 6,
                        color: ws.bodyweight ? C.accent : C.muted,
                        borderColor: ws.bodyweight ? C.accent : C.border,
                      }}
                      onClick={() =>
                        setEx(index, (x) => ({
                          ...x,
                          workingSets: x.workingSets.map((y, j) =>
                            j === si ? { ...y, bodyweight: !y.bodyweight } : y
                          ),
                        }))
                      }
                    >
                      {ws.bodyweight ? "✓ BW" : "BW"}
                    </button>
                  </Labeled>
                </div>

                {(() => {
                  const lastSet = ex.lastAny?.working?.[si];
                  const cmp = compareToLast(
                    { weight: ws.weight, reps: ws.reps, bodyweight: ws.bodyweight },
                    lastSet
                  );
                  if (!cmp) return null;
                  const col =
                    cmp.direction === "up" ? C.accent : cmp.direction === "down" ? C.danger : C.muted;
                  return (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "baseline",
                        marginTop: 8,
                        fontFamily: C.mono,
                        fontSize: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: C.muted }}>vs last session</span>
                      <span style={{ color: C.muted }}>{describeSet(cmp.last)}</span>
                      <span style={{ color: col, fontWeight: 700 }}>
                        {describeDelta(cmp)}
                        {cmp.direction !== "same" && cmp.current.kind === "wt" && " e1RM"}
                      </span>
                    </div>
                  );
                })()}

                {advice && advice.tone !== "ok" && (
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: C.mono,
                      color: toneColor(advice.tone),
                      marginTop: 6,
                      fontWeight: 600,
                    }}
                  >
                    {advice.label} next session
                  </div>
                )}
              </div>
            );
          })}

          <button style={{ ...S.btnAdd, fontSize: 12, padding: "6px 0" }} onClick={addWorkingSet}>
            + Add working set
          </button>

          <textarea
            style={S.notes}
            placeholder="Exercise notes…"
            value={ex.notes}
            onChange={(e) => setEx(index, (x) => ({ ...x, notes: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
}
