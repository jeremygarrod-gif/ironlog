import { useState } from "react";
import { C, S } from "../styles.js";
import { Field, HelpLink, RangeOrSingle, RepRangeInput } from "../components.jsx";
import { fmtPctRange, fmtReps, fmtRest, uid } from "../utils.js";

// ── Warm-up schemes ──────────────────────────────────────────────────────────

export function Schemes({ schemes, onSave, onBack }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(schemes)));
  const [removed, setRemoved] = useState([]);
  const [open, setOpen] = useState(null);

  const upd = (id, patch) => setLocal((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updSet = (id, i, patch) =>
    setLocal((p) =>
      p.map((s) =>
        s.id === id
          ? { ...s, warmup_sets: s.warmup_sets.map((w, j) => (j === i ? { ...w, ...patch } : w)) }
          : s
      )
    );

  function duplicate(scheme) {
    const copy = {
      ...JSON.parse(JSON.stringify(scheme)),
      id: uid(),
      name: `${scheme.name} copy`,
    };
    setLocal((p) => [...p, copy]);
    setOpen(copy.id);
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Warm-up schemes<HelpLink section="setup" /></span>
        <button
          style={S.btnPrimary}
          onClick={() => {
            onSave(local, removed);
            onBack();
          }}
        >
          Save
        </button>
      </div>

      {local.map((scheme) => (
        <div key={scheme.id} style={S.exCard}>
          <button style={S.exHeader} onClick={() => setOpen(open === scheme.id ? null : scheme.id)}>
            <span style={S.exName}>{scheme.name}</span>
            <span style={S.exToggle}>
              {scheme.warmup_sets.length} {scheme.warmup_sets.length === 1 ? "set" : "sets"}{" "}
              {open === scheme.id ? "▲" : "▼"}
            </span>
          </button>

          {open === scheme.id && (
            <div style={S.exBody}>
              <Field label="Name">
                <input
                  style={S.textInput}
                  value={scheme.name}
                  onChange={(e) => upd(scheme.id, { name: e.target.value })}
                />
              </Field>

              <div style={S.subLabel}>WARM-UP SETS</div>

              {scheme.warmup_sets.map((w, i) => (
                <div key={i} style={S.setBlock}>
                  <div style={S.setHead}>
                    <span style={S.setBadge}>W{i + 1}</span>
                    <button
                      style={{ ...S.btnXs, marginLeft: "auto", color: C.danger, borderColor: C.danger }}
                      onClick={() =>
                        upd(scheme.id, { warmup_sets: scheme.warmup_sets.filter((_, j) => j !== i) })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <RangeOrSingle label="Reps" value={w.reps} onChange={(v) => updSet(scheme.id, i, { reps: v })} />
                    <RangeOrSingle label="% of top" value={w.pct} onChange={(v) => updSet(scheme.id, i, { pct: v })} />
                    <RangeOrSingle label="Rest (s)" value={w.rest} onChange={(v) => updSet(scheme.id, i, { rest: v })} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                    {fmtReps(w.reps)} reps @ {fmtPctRange(w.pct)} · rest {fmtRest(w.rest)}
                  </div>
                </div>
              ))}

              <button
                style={S.btnAdd}
                onClick={() =>
                  upd(scheme.id, { warmup_sets: [...scheme.warmup_sets, { reps: 5, pct: 50, rest: 60 }] })
                }
              >
                + Add warm-up set
              </button>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={S.btnGhost} onClick={() => duplicate(scheme)}>
                  Duplicate
                </button>
                <button
                  style={{ ...S.btnGhost, color: C.danger, borderColor: C.danger }}
                  onClick={() => {
                    setRemoved((r) => [...r, scheme.id]);
                    setLocal((p) => p.filter((s) => s.id !== scheme.id));
                    setOpen(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ padding: "8px 16px" }}>
        <button
          style={S.btnAdd}
          onClick={() => {
            const s = { id: uid(), name: "New scheme", warmup_sets: [{ reps: 5, pct: 50, rest: 60 }] };
            setLocal((p) => [...p, s]);
            setOpen(s.id);
          }}
        >
          + New scheme
        </button>
      </div>
    </div>
  );
}

// ── Exercise templates ───────────────────────────────────────────────────────

export function Templates({ templates, schemes, onSave, onBack }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(templates)));
  const [removed, setRemoved] = useState([]);
  const [open, setOpen] = useState(null);

  const upd = (id, patch) => setLocal((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updSet = (id, i, patch) =>
    setLocal((p) =>
      p.map((t) =>
        t.id === id
          ? { ...t, working_sets: t.working_sets.map((w, j) => (j === i ? { ...w, ...patch } : w)) }
          : t
      )
    );

  function duplicate(tpl) {
    const copy = { ...JSON.parse(JSON.stringify(tpl)), id: uid(), name: `${tpl.name} copy` };
    setLocal((p) => [...p, copy]);
    setOpen(copy.id);
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>Exercise templates<HelpLink section="setup" /></span>
        <button
          style={S.btnPrimary}
          onClick={() => {
            onSave(local, removed);
            onBack();
          }}
        >
          Save
        </button>
      </div>

      <div style={{ padding: "12px 16px 0", color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
        A template bundles a warm-up scheme with a working-set structure, so a new exercise is one tap
        to set up. Applying one copies its settings — you can still tweak them per exercise afterwards.
      </div>

      {local.map((tpl) => (
        <div key={tpl.id} style={{ ...S.exCard, marginTop: 10 }}>
          <button style={S.exHeader} onClick={() => setOpen(open === tpl.id ? null : tpl.id)}>
            <span style={S.exName}>{tpl.name}</span>
            <span style={S.exToggle}>{open === tpl.id ? "▲" : "▼"}</span>
          </button>

          {open === tpl.id && (
            <div style={S.exBody}>
              <Field label="Template name">
                <input
                  style={S.textInput}
                  value={tpl.name}
                  onChange={(e) => upd(tpl.id, { name: e.target.value })}
                />
              </Field>

              <Field label="Warm-up scheme">
                <select
                  style={S.select}
                  value={tpl.scheme_id || ""}
                  onChange={(e) => upd(tpl.id, { scheme_id: e.target.value })}
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div style={S.subLabel}>WORKING SETS</div>

              {tpl.working_sets.map((ws, i) => (
                <div key={i} style={S.setBlock}>
                  <div style={S.setHead}>
                    <span style={S.setBadge}>{ws.isTop ? "TOP" : `S${i + 1}`}</span>
                    {!ws.isTop && (
                      <button
                        style={{ ...S.btnXs, marginLeft: "auto", color: C.danger, borderColor: C.danger }}
                        onClick={() =>
                          upd(tpl.id, { working_sets: tpl.working_sets.filter((_, j) => j !== i) })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <RepRangeInput value={ws.repRange} onChange={(v) => updSet(tpl.id, i, { repRange: v })} />
                    {!ws.isTop && (
                      <RangeOrSingle
                        label="% off top"
                        value={ws.pctReduction || [10, 15]}
                        onChange={(v) => updSet(tpl.id, i, { pctReduction: Array.isArray(v) ? v : [v, v] })}
                      />
                    )}
                    <RangeOrSingle label="Rest (s)" value={ws.rest} onChange={(v) => updSet(tpl.id, i, { rest: v })} />
                  </div>
                </div>
              ))}

              <button
                style={S.btnAdd}
                onClick={() =>
                  upd(tpl.id, {
                    working_sets: [
                      ...tpl.working_sets,
                      { isTop: false, repRange: [10, 12], pctReduction: [10, 15], rest: [120, 150] },
                    ],
                  })
                }
              >
                + Add back-off set
              </button>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={S.btnGhost} onClick={() => duplicate(tpl)}>
                  Duplicate
                </button>
                <button
                  style={{ ...S.btnGhost, color: C.danger, borderColor: C.danger }}
                  onClick={() => {
                    setRemoved((r) => [...r, tpl.id]);
                    setLocal((p) => p.filter((t) => t.id !== tpl.id));
                    setOpen(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ padding: "8px 16px" }}>
        <button
          style={S.btnAdd}
          onClick={() => {
            const t = {
              id: uid(),
              name: "New template",
              scheme_id: schemes[0]?.id,
              working_sets: [
                { isTop: true, repRange: [6, 9], pctReduction: null, rest: [180, 300] },
                { isTop: false, repRange: [10, 12], pctReduction: [10, 15], rest: [180, 300] },
              ],
            };
            setLocal((p) => [...p, t]);
            setOpen(t.id);
          }}
        >
          + New template
        </button>
      </div>
    </div>
  );
}
