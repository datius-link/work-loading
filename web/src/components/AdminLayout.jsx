import { useState } from "react";
import { useAdminAuth } from "../auth/adminAuthContext";
import Icon from "./Icon";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "support", label: "Support Inbox", icon: "inbox" },
  { key: "disputes", label: "Disputes", icon: "scale" },
];

function initials(name) {
  return (
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

// No react-router here: switching between Dashboard / Support / Disputes is
// plain React state (activeView), not a URL change — the address bar stays
// on whatever single page the admin app was loaded at.
export default function AdminLayout({ activeView, onChangeView, children }) {
  const { admin, logout } = useAdminAuth();
  // Sidebar is a permanent column at >= 900px (any normal desktop window)
  // and an overlay drawer below that (see the "@media (max-width: 900px)"
  // block in index.css) — this state only controls the drawer's
  // open/closed state on narrow screens; it's simply unused/inert on desktop
  // since .nav-toggle/.sidebar-close are hidden there and .sidebar ignores
  // the "open" class outside that media query.
  const [navOpen, setNavOpen] = useState(false);

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeView)?.label || "";

  const selectView = (key) => {
    onChangeView(key);
    setNavOpen(false);
  };

  return (
    <div className="app-shell">
      {navOpen ? <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} /> : null}

      <aside className={"sidebar" + (navOpen ? " open" : "")}>
        <div className="sidebar-brand">
          <span className="auth-brand-mark">W</span>
          <span className="auth-brand-name">
            Work <em>Loading</em>
          </span>
          <span className="auth-brand-tag">Admin</span>
          <button type="button" className="sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <Icon name="close" size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={"sidebar-link" + (activeView === item.key ? " active" : "")}
              onClick={() => selectView(item.key)}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <Icon name={item.icon} size={17} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-column">
        {/* Kept intentionally minimal: a menu toggle (mobile only), the
           current section's name, and the signed-in account — nothing else
           competing for space in the header. */}
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="nav-toggle" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Icon name="menu" size={20} />
            </button>
            <div className="topbar-title">{activeLabel}</div>
          </div>
          <div className="topbar-account">
            <div className="account-meta">
              <div className="account-name">{admin?.full_name}</div>
              <div className="account-role">{admin?.role}</div>
            </div>
            <div className="avatar">{initials(admin?.full_name)}</div>
            <button type="button" className="btn-ghost btn-icon" onClick={logout} aria-label="Sign out" title="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
