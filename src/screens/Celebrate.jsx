import { C, S } from "../styles.js";

const TONE = {
  pb: { color: C.accent, bg: "#0a2e14", border: C.accent },
  progress: { color: C.accent, bg: "#101c14", border: "#2a4a2f" },
  streak: { color: C.warn, bg: "#2a2010", border: "#5a4520" },
  milestone: { color: C.text, bg: C.sunken, border: C.border },
};

export default function Celebrate({ achievements, onDone }) {
  const nothing = !achievements.length;

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: nothing ? 18 : 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Session saved</div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            {nothing ? "Logged and in the books." : "Worth noting:"}
          </div>
        </div>

        {achievements.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {achievements.map((a, i) => {
              const t = TONE[a.tone] || TONE.milestone;
              return (
                <div
                  key={i}
                  style={{
                    background: t.bg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    padding: "11px 13px",
                    display: "flex",
                    gap: 11,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: t.color, fontSize: 15, lineHeight: 1.2, marginTop: 1 }}>
                    {a.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: t.color,
                        fontFamily: C.mono,
                        fontSize: 10,
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      {a.heading}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}>{a.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button style={{ ...S.btnPrimary, width: "100%" }} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
