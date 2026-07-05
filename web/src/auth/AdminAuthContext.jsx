import { useEffect, useMemo, useState, useCallback } from "react";
import { loginAdmin, setStoredAdminToken, SESSION_EXPIRED_EVENT } from "../api/adminApi";
import { AdminAuthContext } from "./adminAuthContext";

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // No boot-time "restore from storage" step on purpose — the token is kept
  // in memory only (see adminApi.js), so a fresh page load never has one to
  // restore. Every reload lands on the login screen by design.
  const [booting] = useState(false);

  useEffect(() => {
    const onExpired = () => setAdmin(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, admin: me } = await loginAdmin(email, password);
    setStoredAdminToken(token);
    setAdmin(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    setStoredAdminToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, isAuthenticated: !!admin, booting, login, logout }),
    [admin, booting, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
