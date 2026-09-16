import { useState } from "react";
import { C, S } from "../styles.js";
import { signIn, signUp, sendPasswordReset } from "../supabase.js";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await signUp(email.trim(), password);
        // With email confirmation off, this signs you straight in.
      } else if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        await sendPasswordReset(email.trim());
        setMsg({ tone: "ok", text: "Check your email for a reset link." });
      }
    } catch (err) {
      setMsg({ tone: "error", text: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...S.screen, maxWidth: 380, paddingTop: "calc(64px + env(safe-area-inset-top))" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ ...S.logo, fontSize: 28 }}>
          IRON<span style={{ color: C.accent }}>LOG</span>
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
          {mode === "signup"
            ? "Create an account to start tracking."
            : mode === "reset"
            ? "We'll email you a reset link."
            : "Sign in to your training log."}
        </div>
      </div>

      <form onSubmit={submit} style={{ padding: "0 20px" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={S.inputLabel}>EMAIL</div>
          <input
            style={{ ...S.textInput, marginTop: 4 }}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode !== "reset" && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.inputLabel}>PASSWORD</div>
            <input
              style={{ ...S.textInput, marginTop: 4 }}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <button type="submit" disabled={busy} style={{ ...S.btnPrimary, width: "100%" }}>
          {busy
            ? "…"
            : mode === "signup"
            ? "Create account"
            : mode === "reset"
            ? "Send reset link"
            : "Sign in"}
        </button>

        {msg && <div style={S.banner(msg.tone === "error" ? "error" : "ok")}>{msg.text}</div>}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13 }}>
          {mode === "signin" && (
            <>
              <button type="button" style={linkBtn} onClick={() => setMode("signup")}>
                Create an account
              </button>
              <span style={{ color: C.border, margin: "0 8px" }}>·</span>
              <button type="button" style={linkBtn} onClick={() => setMode("reset")}>
                Forgot password
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" style={linkBtn} onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const linkBtn = {
  background: "none",
  border: "none",
  color: C.accent,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
  font: "inherit",
};

function friendly(err) {
  const m = (err?.message || String(err)).toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered")) return "That email already has an account — sign in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  return err?.message || "Something went wrong.";
}
