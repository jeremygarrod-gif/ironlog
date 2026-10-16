import { useMemo, useState } from "react";
import { C, S } from "../styles.js";
import { HelpLink } from "../components.jsx";
import { buildAiReport, RANGES } from "../exportReport.js";

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function Export({ data, onBackup, onFlash, onBack }) {
  const [rangeId, setRangeId] = useState("12w");
  const [showPreview, setShowPreview] = useState(false);

  const range = RANGES.find((r) => r.id === rangeId);
  const report = useMemo(() => buildAiReport(data, range.weeks), [data, range]);
  const kTokens = Math.max(1, Math.round(report.length / 4 / 1000));
  const cutoff = range.weeks ? Date.now() - range.weeks * 7 * 86400000 : 0;
  const sessionCount = data.sessions.filter((s) => new Date(s.performed_at).getTime() >= cutoff).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      onFlash("Copied. Paste it into your AI chat.");
    } catch {
      onFlash("Couldn't copy. Use Share / save file instead.", "error");
    }
  }

  // On a phone this opens the share sheet (Files, Messages, the Claude app…);
  // elsewhere it falls back to a normal download.
  async function shareFile() {
    const name = `ironlog-for-ai-${stamp()}.md`;
    const file = new File([report], name, { type: "text/plain" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "IRONLOG training data" });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      const url = URL.createObjectURL(new Blob([report], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onFlash("Saved to your downloads.");
    } catch {
      onFlash("Couldn't save the file. Try Copy instead.", "error");
    }
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>
          Export &amp; share
          <HelpLink section="backup" />
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Share with an AI</div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "6px 0 14px" }}>
            A readable summary of your program, sessions, progress, notes, body measurements and check-ins (steps,
            sleep and your notes, questions included), written so any AI model can make sense of it. It explains its own terms, so you can paste it straight into a chat and
            start asking questions.
          </div>

          <div style={S.inputLabel}>How much history</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 12px" }}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                style={{
                  ...S.btnXs,
                  padding: "7px 11px",
                  fontSize: 13,
                  color: rangeId === r.id ? C.accent : C.muted,
                  borderColor: rangeId === r.id ? C.accent : C.border,
                }}
                onClick={() => setRangeId(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            {sessionCount} session{sessionCount === 1 ? "" : "s"} · about {kTokens}k tokens of text
            {kTokens > 40 && " — long; a shorter range will fit most chats better"}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={copy}>
              Copy
            </button>
            <button style={{ ...S.btnGhost, flex: 1 }} onClick={shareFile}>
              Share / save file
            </button>
          </div>

          <button
            style={{ ...S.btnSmall, border: "none", padding: "12px 0 0", color: C.muted }}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Hide preview" : "Preview what gets shared"}
          </button>
          {showPreview && (
            <pre
              style={{
                background: C.sunken,
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
                maxHeight: 300,
                overflow: "auto",
                fontSize: 11,
                lineHeight: 1.5,
                color: C.muted,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {report}
            </pre>
          )}
          <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>
            It includes your body measurements, check-ins and notes, but not your email or account details. Only share it with
            an AI service you're comfortable giving that information to.
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Full backup</div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "6px 0 14px" }}>
            Everything in one file — workouts, sessions, templates, blocks, pauses, baselines, body measurements and
            check-ins.
            This is the one to keep for safety, and the only one you can import back. AI models can read it too, but
            it's long and technical, so the summary above works better in a chat.
          </div>
          <button style={S.btnGhost} onClick={onBackup}>
            ⬇ Download full backup
          </button>
        </div>
      </div>
    </div>
  );
}
