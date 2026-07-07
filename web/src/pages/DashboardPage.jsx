import { useEffect, useState } from "react";
import { useAdminAuth } from "../auth/adminAuthContext";
import { fetchDashboardSummary, getFriendlyAdminError } from "../api/adminApi";
import Icon from "../components/Icon";

const TYPE_META = {
  contact_admin: { label: "Contact Us", icon: "mail" },
  feedback: { label: "Feedback", icon: "smile" },
  report_problem: { label: "Problem reports", icon: "flag" },
};

export default function DashboardPage({ onNavigate }) {
  const { admin } = useAdminAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardSummary()
      .then(({ summary: data }) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getFriendlyAdminError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>Welcome back{admin?.full_name ? `, ${admin.full_name.split(" ")[0]}` : ""}</h1>
      <p className="page-subtitle">
        A quick look at what needs attention right now.
      </p>

      {error ? <div className="form-error" style={{ marginTop: 16 }}>{error}</div> : null}

      {/* Clickable cards get a "stat-card-action" affordance (hover lift +
          a trailing chevron, added in CSS) so it's visually obvious which
          tiles open the Support Inbox and which are just read-only status. */}
      <div className="card-grid">
        <button
          type="button"
          className="stat-card stat-card-action"
          onClick={() => onNavigate?.("support")}
          aria-label="Open support requests — view in Support Inbox"
        >
          <div className="stat-icon"><Icon name="inbox" size={20} /></div>
          <div className="stat-label">Open support requests</div>
          <div className="stat-value">{loading ? "…" : summary?.open_support_requests ?? 0}</div>
          <div className="stat-hint">{loading ? " " : `${summary?.new_last_24h ?? 0} new in the last 24h`}</div>
        </button>

        <div className="stat-card">
          <div className="stat-icon"><Icon name="scale" size={20} /></div>
          <div className="stat-label">Open disputes</div>
          <div className="stat-value">{loading ? "…" : summary?.open_disputes ?? 0}</div>
          <div className="stat-hint">Disputes screen coming soon</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Icon name="checkCircle" size={20} /></div>
          <div className="stat-label">Signed in as</div>
          <div className="stat-value stat-value-small">{admin?.email}</div>
          <div className="stat-hint" style={{ textTransform: "capitalize" }}>{admin?.role}</div>
        </div>
      </div>

      <h2 className="section-title">Support requests by type</h2>
      <p className="section-hint">Click a category to jump straight to those messages in the Support Inbox.</p>
      <div className="card-grid card-grid-tight">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <button
            type="button"
            key={key}
            className="stat-card stat-card-action stat-card-compact"
            onClick={() => onNavigate?.("support", { type: key })}
            aria-label={`View ${meta.label} in Support Inbox`}
          >
            <div className="stat-icon"><Icon name={meta.icon} size={18} /></div>
            <div className="stat-label">{meta.label}</div>
            <div className="stat-value">{loading ? "…" : summary?.open_by_type?.[key] ?? 0}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
