import { useState } from "react";
import { useAdminAuth } from "../auth/adminAuthContext";
import { getFriendlyAdminError } from "../api/adminApi";

// No router here on purpose: signing in just flips isAuthenticated in
// AdminAuthContext, and App.jsx swaps this screen out for the dashboard
// shell — the browser's address bar never changes.
export default function LoginPage() {
  const { login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getFriendlyAdminError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">W</span>
          <span className="auth-brand-name">
            Work <em>Loading</em>
          </span>
          <span className="auth-brand-tag">Admin</span>
        </div>
        <h1>Sign in</h1>
        <p className="auth-subtitle">Manage feedback, complaints, and job disputes.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@workloading.co"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
