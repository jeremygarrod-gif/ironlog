import { useState } from "react";
import { C, S } from "../styles.js";
import {
  Confirm,
  ExerciseNameInput,
  Field,
  RangeOrSingle,
  RepRangeInput,
  SchemePreview,
  HelpLink,
} from "../components.jsx";
import { fmtPctRange, fmtReps, fmtRest, uid } from "../utils.js";
import { CATEGORY_NAMES, EXERCISE_CATEGORIES } from "../exerciseSeed.js";

function seedCategoryFor(name) {
  return EXERCISE_CATEGORIES.find((g) => g.exercises.includes(name))?.category || "";
}

function blankExercise(schemes) {
  return {
    id: uid(),
    name: "",
    category: null,
    schemeId: schemes[0]?.id,
    topSetWeight: 100,
    workingSets: [
      { isTop: true, repRange: [6, 9], pctReduction: null, rest: [180, 300] },
      { isTop: false, repRange: [10, 12], pctReduction: [10, 15], rest: [180, 300] },
    ],
  };
}

export default function EditWorkout({
  workout,
  schemes,
  templates,
  allExerciseNames,
  exerciseCategories,
  onSave,
  onDelete,
  onArchive,
  onBack,
}) {
  const [name, setName] = useState(workout?.name ?? "New workout");
  const [exercises, setExercises] = useState(() =>
    workout?.exercises?.length ? JSON.parse(JSON.stringify(workout.exercises)) : [blankExercise(schemes)]
  );
  const [open, setOpen] = useState(workout ? null : null);
  const [confirming, setConfirming] = useState(false);

  const upd = (id, patch) => setExercises((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const updSet = (id, i, patch) =>
    setExercises((p) =>
      p.map((e) =>
        e.id === id
          ? { ...e, workingSets: e.workingSets.map((w, j) => (j === i ? { ...w, ...patch } : w)) }
          : e
      )
    );

  function applyTemplate(exId, tpl) {
    upd(exId, {
      schemeId: tpl.scheme_id,
      workingSets: JSON.parse(JSON.stringify(tpl.working_sets)),
    });
  }

  function move(id, dir) {
    setExercises((prev) => {
      const i = prev.findIndex((e) => e.id === id);
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const canSave = name.trim() && exercises.every((e) => e.name.trim());

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>{workout ? "Edit workout" : "New workout"}</span>
        <button
          style={{ ...S.btnPrimary, opacity: canSave ? 1 : 0.4 }}
          disabled={!canSave}
          onClick={() => onSave({ ...(workout || {}), name: name.trim(), exercises })}
        >
          Save
        </button>
      </div>

      <div style={{ padding: "14px 16px 4px" }}>
        <Field label="Workout name">
          <input style={S.textInput} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>

      <div style={{ padding: "6px 16px 8px" }}>
        <div style={S.sectionLabel}>EXERCISES<HelpLink section="workout" /></div>
      </div>

      {exercises.map((ex, i) => {
        const scheme = schemes.find((s) => s.id === ex.schemeId);
        return (
          <div key={ex.id} style={S.exCard}>
            <div style={{ ...S.exHeader, cursor: "default" }}>
              <button
                style={{
                  flex: 1,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: ex.name ? C.text : C.muted,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
                onClick={() => setOpen(open === ex.id ? null : ex.id)}
              >
                {ex.name || "Untitled exercise"} {open === ex.id ? "▲" : "▼"}
              </button>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={S.btnXs} disabled={i === 0} onClick={() => move(ex.id, -1)}>
                  ↑
                </button>
                <button
                  style={S.btnXs}
                  disabled={i === exercises.length - 1}
                  onClick={() => move(ex.id, 1)}
                >
                  ↓
                </button>
                <button
                  style={{ ...S.btnXs, color: C.danger }}
                  onClick={() => setExercises((p) => p.filter((e) => e.id !== ex.id))}
                >
                  ✕
                </button>
              </div>
            </div>

            {open === ex.id && (
              <div style={S.exBody}>
                {templates.length > 0 && (
                  <div style={S.panel}>
                    <div
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        fontFamily: C.mono,
                        letterSpacing: 1,
                        marginBottom: 7,
                      }}
                    >
                      APPLY TEMPLATE
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {templates.map((t) => (
                        <button key={t.id} style={S.btnTemplate} onClick={() => applyTemplate(ex.id, t)}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Field label="Exercise name">
                  <ExerciseNameInput
                    value={ex.name}
                    onChange={(v) => upd(ex.id, { name: v })}
                    allNames={allExerciseNames}
                    categoryMap={exerciseCategories}
                  />
                </Field>

                <Field label="Body part">
                  <select
                    style={S.select}
                    value={ex.category || exerciseCategories?.[ex.name] || seedCategoryFor(ex.name)}
                    onChange={(e) => upd(ex.id, { category: e.target.value })}
                  >
                    <option value="">Other</option>
                    {CATEGORY_NAMES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
                    Used to group this exercise in the picker above.
                  </div>
                </Field>

                <Field label="Warm-up scheme">
                  <select
                    style={S.select}
                    value={ex.schemeId || ""}
                    onChange={(e) => upd(ex.id, { schemeId: e.target.value })}
                  >
                    {schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <SchemePreview
                  scheme={scheme}
                  fmtReps={fmtReps}
                  fmtPctRange={fmtPctRange}
                  fmtRest={fmtRest}
                />

                <Field label="Starting top set weight">
                  <div style={S.inputRow}>
                    <input
                      style={S.wtInput}
                      type="number"
                      inputMode="decimal"
                      value={ex.topSetWeight}
                      onChange={(e) => upd(ex.id, { topSetWeight: +e.target.value })}
                    />
                    <span style={S.unit}>lbs</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
                    Only used the first time. After that it follows your last session.
                  </div>
                </Field>

                <div style={S.subLabel}>WORKING SETS</div>

                {ex.workingSets.map((ws, si) => (
                  <div key={si} style={S.setBlock}>
                    <div style={S.setHead}>
                      <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${si + 1}`}</span>
                      {!ws.isTop && (
                        <button
                          style={{ ...S.btnXs, marginLeft: "auto", color: C.danger, borderColor: C.danger }}
                          onClick={() =>
                            upd(ex.id, { workingSets: ex.workingSets.filter((_, j) => j !== si) })
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <RepRangeInput
                        value={ws.repRange}
                        onChange={(v) => updSet(ex.id, si, { repRange: v })}
                      />
                      {!ws.isTop && (
                        <RangeOrSingle
                          label="% off top"
                          value={ws.pctReduction || [10, 15]}
                          onChange={(v) =>
                            updSet(ex.id, si, { pctReduction: Array.isArray(v) ? v : [v, v] })
                          }
                        />
                      )}
                      <RangeOrSingle
                        label="Rest (s)"
                        value={ws.rest}
                        onChange={(v) => updSet(ex.id, si, { rest: v })}
                      />
                    </div>
                  </div>
                ))}

                <button
                  style={S.btnAdd}
                  onClick={() =>
                    upd(ex.id, {
                      workingSets: [
                        ...ex.workingSets,
                        { isTop: false, repRange: [10, 12], pctReduction: [10, 15], rest: [120, 150] },
                      ],
                    })
                  }
                >
                  + Add back-off set
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ padding: "8px 16px" }}>
        <button
          style={S.btnAdd}
          onClick={() => {
            const e = blankExercise(schemes);
            setExercises((p) => [...p, e]);
            setOpen(e.id);
          }}
        >
          + Add exercise
        </button>
      </div>

      {workout && (
        <div style={{ padding: "12px 16px 40px" }}>
          {onArchive && !confirming && (
            <button
              style={{ ...S.btnGhost, width: "100%", marginBottom: 8 }}
              onClick={() => onArchive(workout.id)}
            >
              Archive workout
            </button>
          )}
          {confirming ? (
            <Confirm
              message={`Delete "${name}"? Its sessions are kept, but you'll lose the easy way back to them. Archiving is usually the better choice.`}
              confirmLabel="Delete workout"
              onConfirm={() => onDelete(workout.id)}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <button
              style={{ ...S.btnGhost, color: C.danger, borderColor: C.danger, width: "100%" }}
              onClick={() => setConfirming(true)}
            >
              Delete workout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
