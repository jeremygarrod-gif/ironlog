import { useState } from "react";
import { C, S } from "../styles.js";
import { signIn, signInWithGoogle, signUp, sendPasswordReset } from "../supabase.js";

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

      <div style={{ padding: "0 20px" }}>
        <button
          type="button"
          onClick={async () => {
            setMsg(null);
            try {
              await signInWithGoogle();
            } catch (err) {
              setMsg({ tone: "error", text: friendly(err) });
            }
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "#fff",
            color: "#1f1f1f",
            fontWeight: 600,
            fontSize: 14,
            padding: "11px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.muted, fontSize: 11, fontFamily: C.mono, letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
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

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.2-3.8 6.6-9.5 6.6-15.7z"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-1.9 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3 .1-6.8 5.2-.1.3C7.9 41 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.8-2.9-.8-4.4s.3-3 .7-4.4v-.3l-6.9-5.3-.2.1C2.9 16.9 2 20.3 2 24s.9 7.1 2.4 10.2l7.1-5.8z"/>
      <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 29.9 2 24 2 15.4 2 7.9 7 4.3 13.8l7.1 5.8c1.9-5.3 6.8-9.1 12.6-9.1z"/>
    </svg>
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
  if (m.includes("provider") && m.includes("not enabled"))
    return "Google sign-in isn't switched on yet. Use email and password for now.";
  return err?.message || "Something went wrong.";
}
