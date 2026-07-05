import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
// Must match the backend's ADMIN_API_PREFIX (see node/.env) — the admin
// routes are deliberately not mounted at the obvious "/admin" path.
const ADMIN_PREFIX = import.meta.env.VITE_ADMIN_API_PREFIX || "/admin";

// Deliberately in-memory only — no localStorage/sessionStorage. An admin
// session must not survive a page reload or a new tab/window: every visit
// requires signing in again. (See AdminAuthContext — there is no "restore
// from storage" bootstrap step to match.)
let inMemoryAdminToken = null;

export function getStoredAdminToken() {
  return inMemoryAdminToken;
}

export function setStoredAdminToken(token) {
  inMemoryAdminToken = token || null;
}

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralizes the "your session is no longer valid" case so every screen
// doesn't need its own 401 handling — the AdminAuthContext listens for this.
export const SESSION_EXPIRED_EVENT = "ekazi-admin-session-expired";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setStoredAdminToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export async function loginAdmin(email, password) {
  const res = await api.post(`${ADMIN_PREFIX}/auth/login`, { email, password });
  return res.data;
}

export async function fetchAdminMe() {
  const res = await api.get(`${ADMIN_PREFIX}/me`);
  return res.data;
}

export async function fetchDashboardSummary() {
  const res = await api.get(`${ADMIN_PREFIX}/dashboard-summary`);
  return res.data;
}

// params: { type?, status?, q?, page?, limit? }
export async function listSupportRequests(params = {}) {
  const res = await api.get(`${ADMIN_PREFIX}/support`, { params });
  return res.data;
}

export async function getSupportRequest(id) {
  const res = await api.get(`${ADMIN_PREFIX}/support/${id}`);
  return res.data;
}

// patch: { status?, admin_note? }
export async function updateSupportRequest(id, patch) {
  const res = await api.patch(`${ADMIN_PREFIX}/support/${id}`, patch);
  return res.data;
}

export function getFriendlyAdminError(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (err.code === "ERR_NETWORK" || !err.response) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return err.response?.data?.message || "Something went wrong. Please try again.";
}

export default api;
