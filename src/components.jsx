import { useState } from "react";
import { C, S } from "./styles.js";
import { normRange } from "./utils.js";
import { CATEGORY_NAMES, EXERCISE_CATEGORIES } from "./exerciseSeed.js";

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={S.inputLabel}>{label}</div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

export function Labeled({ label, children }) {
  return (
    <div style={S.inputGroup}>
      <div style={S.inputLabel}>{label}</div>
      {children}
    </div>
  );
}

// A number field that can be toggled between a single value and a lo–hi range.
export function RangeOrSingle({ label, value, onChange, width = 64 }) {
  const isRange = Array.isArray(value);
  const lo = isRange ? value[0] : value;
  const hi = isRange ? value[1] : value;
  return (
    <div style={S.inputGroup}>
      <div style={{ ...S.inputLabel, display: "flex", alignItems: "center", gap: 5 }}>
        {label}
        <button
          type="button"
          style={S.btnToggle}
          onClick={() => onChange(isRange ? lo : [lo, lo])}
        >
          {isRange ? "single" : "range"}
        </button>
      </div>
      <div style={S.inputRow}>
        <input
          style={{ ...S.numInput, width }}
          type="number"
          inputMode="numeric"
          value={lo}
          onChange={(e) => onChange(isRange ? [+e.target.value, hi] : +e.target.value)}
        />
        {isRange && (
          <>
            <span style={S.unit}>–</span>
            <input
              style={{ ...S.numInput, width }}
              type="number"
              inputMode="numeric"
              value={hi}
              onChange={(e) => onChange([lo, +e.target.value])}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function RepRangeInput({ value, onChange, label = "Rep range" }) {
  return (
    <div style={S.inputGroup}>
      <div style={S.inputLabel}>{label}</div>
      <div style={S.inputRow}>
        <input
          style={{ ...S.numInput, width: 60 }}
          type="number"
          inputMode="numeric"
          value={value[0]}
          onChange={(e) => onChange([+e.target.value, value[1]])}
        />
        <span style={S.unit}>–</span>
        <input
          style={{ ...S.numInput, width: 60 }}
          type="number"
          inputMode="numeric"
          value={value[1]}
          onChange={(e) => onChange([value[0], +e.target.value])}
        />
      </div>
    </div>
  );
}

export function Confirm({ message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div
      style={{
        background: C.dangerDim,
        border: `1px solid ${C.danger}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 10,
      }}
    >
      <div style={{ color: C.danger, fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
        {message}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...S.btnPrimary, background: C.danger, flex: 1 }} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button style={{ ...S.btnGhost, flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Modal({ title, body, children }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        {title && <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>}
        {body && (
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            {body}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      </div>
    </div>
  );
}

// Text input that suggests names already used elsewhere, so the same lift
// doesn't end up tracked under two spellings. Suggestions are grouped by
// muscle group from the bundled starter list, plus anything from the user's
// own history — placed under whatever body part they picked for it
// (categoryMap), or "Other" if they never set one.
export function ExerciseNameInput({ value, onChange, allNames, categoryMap = {} }) {
  const [open, setOpen] = useState(false);
  const query = (value || "").toLowerCase();

  const seedNames = new Set(EXERCISE_CATEGORIES.flatMap((g) => g.exercises));
  const buckets = new Map(EXERCISE_CATEGORIES.map((g) => [g.category, new Set(g.exercises)]));
  for (const name of allNames) {
    if (seedNames.has(name)) continue;
    const cat = CATEGORY_NAMES.includes(categoryMap[name]) ? categoryMap[name] : "Other";
    if (!buckets.has(cat)) buckets.set(cat, new Set());
    buckets.get(cat).add(name);
  }

  const orderedCats = [...CATEGORY_NAMES, ...[...buckets.keys()].filter((c) => !CATEGORY_NAMES.includes(c))];

  const list = orderedCats
    .map((category) => ({
      category,
      exercises: [...buckets.get(category)]
        .sort((a, b) => a.localeCompare(b))
        .filter((n) => n.toLowerCase().includes(query) && n !== value),
    }))
    .filter((g) => g.exercises.length > 0);

  return (
    <div style={{ position: "relative" }}>
      <input
        style={S.textInput}
        value={value}
        placeholder="Type or pick an exercise…"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && list.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            zIndex: 60,
            maxHeight: 260,
            overflowY: "auto",
            marginTop: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          {list.map((g) => (
            <div key={g.category}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  padding: "6px 12px",
                  background: C.sunken,
                  color: C.muted,
                  fontFamily: C.mono,
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {g.category}
              </div>
              {g.exercises.map((name) => (
                <button
                  key={name}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 12px",
                    background: "none",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    color: C.text,
                    cursor: "pointer",
                    fontSize: 14,
                    font: "inherit",
                  }}
                  onMouseDown={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact read-only summary of a warm-up scheme
export function SchemePreview({ scheme, fmtReps, fmtPctRange, fmtRest }) {
  if (!scheme) return null;
  if (!scheme.warmup_sets?.length) {
    return (
      <div style={{ ...S.panel, fontSize: 12, fontFamily: C.mono, color: C.muted }}>
        No warm-up sets
      </div>
    );
  }
  return (
    <div style={{ ...S.panel, fontSize: 12, fontFamily: C.mono, color: C.muted }}>
      <div style={{ marginBottom: 4, letterSpacing: 1, fontSize: 11 }}>
        {scheme.warmup_sets.length} WARM-UP {scheme.warmup_sets.length === 1 ? "SET" : "SETS"}
      </div>
      {scheme.warmup_sets.map((w, i) => (
        <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0", flexWrap: "wrap" }}>
          <span style={{ color: C.accent }}>W{i + 1}</span>
          <span>{fmtReps(w.reps)} reps</span>
          <span>@ {fmtPctRange(w.pct)}</span>
          <span>· rest {fmtRest(w.rest)}</span>
        </div>
      ))}
    </div>
  );
}

// A small "?" that opens the guide at a given section. It raises an event
// rather than taking a navigation prop, so it can sit anywhere without every
// screen having to pass routing down.
export function HelpLink({ section, label }) {
  return (
    <button
      type="button"
      aria-label={label || "How this works"}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("ironlog:help", { detail: section }));
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 9,
        border: `1px solid ${C.border}`,
        background: "none",
        color: C.muted,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: C.mono,
        cursor: "pointer",
        padding: 0,
        marginLeft: 7,
        verticalAlign: "middle",
        lineHeight: 1,
      }}
    >
      ?
    </button>
  );
}
