import { useState } from "react";
import { AdminAuthProvider } from "./auth/AdminAuthContext.jsx";
import { useAdminAuth } from "./auth/adminAuthContext";
import AdminLayout from "./components/AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SupportInboxPage from "./pages/SupportInboxPage";
import ComingSoonPage from "./pages/ComingSoonPage";

// Deliberately no react-router: the whole admin app lives at a single URL.
// Which screen shows (login vs. dashboard vs. support vs. disputes) is
// plain React state, so there's no address to type/bookmark/guess your way
// into a section without going through the login gate first.
function AdminApp() {
  const { isAuthenticated, booting } = useAdminAuth();
  const [view, setView] = useState("dashboard");
  // Lets the dashboard's "Feedback" / "Problem reports" tiles deep-link into
  // the Support Inbox pre-filtered, without a router — just a bit of state
  // handed down alongside the view switch.
  const [supportParams, setSupportParams] = useState(null);

  if (booting) {
    return (
      <div className="full-screen-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const navigate = (nextView, params = null) => {
    if (nextView === "support") setSupportParams(params);
    setView(nextView);
  };

  return (
    <AdminLayout activeView={view} onChangeView={navigate}>
      {view === "support" ? (
        <SupportInboxPage initialType={supportParams?.type || ""} />
      ) : view === "disputes" ? (
        <ComingSoonPage
          title="Disputes"
          description="Job disputes raised by hirers or providers will show up here for review."
        />
      ) : (
        <DashboardPage onNavigate={navigate} />
      )}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminApp />
    </AdminAuthProvider>
  );
}
