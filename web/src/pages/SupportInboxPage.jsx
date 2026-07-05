import { useEffect, useMemo, useState } from "react";
import { getFriendlyAdminError, listSupportRequests, updateSupportRequest } from "../api/adminApi";
import Icon from "../components/Icon";

const TYPES = [
  { key: "", label: "All types" },
  { key: "contact_admin", label: "Contact Us", icon: "mail" },
  { key: "feedback", label: "Feedback", icon: "smile" },
  { key: "report_problem", label: "Problem reports", icon: "flag" },
];

const STATUSES = [
  { key: "", label: "All statuses" },
  { key: "open", label: "Open", icon: "clock" },
  { key: "in_progress", label: "In progress", icon: "progress" },
  { key: "resolved", label: "Resolved", icon: "checkCircle" },
];

function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function typeMeta(type) {
  return TYPES.find((t) => t.key === type) || { label: type, icon: "mail" };
}

function statusMeta(status) {
  return STATUSES.find((s) => s.key === status) || { label: status, icon: "clock" };
}

// initialType lets DashboardPage deep-link here already filtered to a type
// (e.g. clicking the "Feedback" tile) without needing a router.
export default function SupportInboxPage({ initialType = "" }) {
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listSupportRequests({ type: type || undefined, status: status || undefined, q: query || undefined })
      .then(({ requests: rows }) => {
        setRequests(rows);
      })
      .catch((err) => setError(getFriendlyAdminError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  useEffect(() => {
    setNote(selected?.admin_note || "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyUpdate = async (patch) => {
    if (!selected) return;
    setSaving(true);
    try {
      const { request: updated } = await updateSupportRequest(selected.id, patch);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(getFriendlyAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-wide">
      <h1>Support Inbox</h1>
      <p className="page-subtitle">Contact Us messages, feedback, and problem reports from the app.</p>

      <div className="filter-bar">
        <div className="search-field">
          <Icon name="search" size={15} />
          <input
            type="text"
            placeholder="Search subject, message, or user…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="chip-row">
          {TYPES.map((t) => (
            <button
              key={t.key || "all-types"}
              type="button"
              className={"chip" + (type === t.key ? " active" : "")}
              onClick={() => setType(t.key)}
            >
              {t.icon ? <Icon name={t.icon} size={13} /> : null}
              {t.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {STATUSES.map((s) => (
            <button
              key={s.key || "all-statuses"}
              type="button"
              className={"chip" + (status === s.key ? " active" : "")}
              onClick={() => setStatus(s.key)}
            >
              {s.icon ? <Icon name={s.icon} size={13} /> : null}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="form-error" style={{ marginTop: 12 }}>{error}</div> : null}

      <div className="inbox-layout">
        <div className="inbox-list">
          {loading ? (
            <div className="inbox-empty">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="inbox-empty">
              <Icon name="inbox" size={26} />
              <p>Nothing here yet.</p>
            </div>
          ) : (
            requests.map((r) => {
              const tMeta = typeMeta(r.type);
              const sMeta = statusMeta(r.status);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={"inbox-row" + (selectedId === r.id ? " active" : "")}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="inbox-row-icon"><Icon name={tMeta.icon} size={16} /></div>
                  <div className="inbox-row-body">
                    <div className="inbox-row-top">
                      <span className="inbox-row-name">{r.requester?.full_name || r.requester?.username || "User"}</span>
                      <span className="inbox-row-time">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="inbox-row-subject">{r.subject || r.category || tMeta.label}</div>
                    <div className="inbox-row-snippet">{r.message}</div>
                  </div>
                  <span className={"status-pill status-" + r.status}>
                    <Icon name={sMeta.icon} size={11} />
                    {sMeta.label}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="inbox-detail">
          {!selected ? (
            <div className="inbox-empty">
              <Icon name="inbox" size={26} />
              <p>Select a message to view details.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <div className="detail-type">
                    <Icon name={typeMeta(selected.type).icon} size={15} />
                    {typeMeta(selected.type).label}
                    {selected.category ? <span className="detail-category">· {selected.category}</span> : null}
                  </div>
                  <h2 className="detail-subject">{selected.subject || typeMeta(selected.type).label}</h2>
                </div>
                <span className={"status-pill status-" + selected.status}>
                  <Icon name={statusMeta(selected.status).icon} size={11} />
                  {statusMeta(selected.status).label}
                </span>
              </div>

              <div className="detail-meta">
                <span>{selected.requester?.full_name || selected.requester?.username || "User"}</span>
                {selected.requester?.email ? <span> · {selected.requester.email}</span> : null}
                <span> · {new Date(selected.created_at).toLocaleString()}</span>
              </div>

              <div className="detail-message">{selected.message}</div>

              <div className="detail-actions">
                <label className="field">
                  <span>Status</span>
                  <select
                    value={selected.status}
                    disabled={saving}
                    onChange={(e) => applyUpdate({ status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>

                <label className="field">
                  <span>Internal note</span>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Notes for other admins — not visible to the user."
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary btn-small"
                  disabled={saving}
                  onClick={() => applyUpdate({ admin_note: note })}
                >
                  {saving ? "Saving…" : "Save note"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
