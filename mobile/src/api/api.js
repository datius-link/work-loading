import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearUserSession, getUserToken } from "../utils/userSession";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Remove viewer token accidentally left on the shared axios instance. */
export function clearViewerAuthOverride() {
  delete api.defaults.headers.common.Authorization;
}

export async function getViewerAuthHeaders() {
  const viewerToken = await getUserToken();
  if (!viewerToken) return null;
  return { Authorization: `Bearer ${viewerToken}` };
}

export async function getProviderAuthHeaders() {
  const authToken = await AsyncStorage.getItem("token");
  if (!authToken) return null;
  return { Authorization: `Bearer ${authToken}` };
}

export async function getSocialAuthHeaders(preferredActor = "viewer") {
  const viewerHeaders = await getViewerAuthHeaders();
  const providerHeaders = await getProviderAuthHeaders();

  if (preferredActor === "provider") {
    if (providerHeaders) return { headers: providerHeaders, actor: "provider" };
    if (viewerHeaders) return { headers: viewerHeaders, actor: "viewer" };
  } else {
    if (viewerHeaders) return { headers: viewerHeaders, actor: "viewer" };
    if (providerHeaders) return { headers: providerHeaders, actor: "provider" };
  }

  return { headers: null, actor: null };
}

export async function viewerRequest(method, url, data, config = {}) {
  const viewerHeaders = await getViewerAuthHeaders();
  if (!viewerHeaders) {
    console.log("[USER REQUEST] missing user token", { method, url });
    const err = new Error("User not logged in");
    err.response = { status: 401 };
    throw err;
  }

  const request = {
    method,
    url,
    ...config,
    authActor: "viewer",
    headers: {
      ...config.headers,
      ...viewerHeaders,
    },
  };

  if (data !== undefined && data !== null) {
    request.data = data;
  }

  return api.request(request);
}

export async function socialRequest(method, url, data, config = {}) {
  const { preferredAuthActor = "viewer", ...requestConfig } = config;
  const { headers: socialHeaders, actor } = await getSocialAuthHeaders(preferredAuthActor);
  if (!socialHeaders) {
    console.log("[SOCIAL REQUEST] missing auth", { method, url, preferredAuthActor });
    const err = new Error("Social actor not logged in");
    err.response = { status: 401 };
    throw err;
  }
  console.log("[SOCIAL REQUEST] using auth", { method, url, preferredAuthActor, actor });

  const request = {
    method,
    url,
    ...requestConfig,
    authActor: actor,
    headers: {
      ...requestConfig.headers,
      ...socialHeaders,
    },
  };

  if (data !== undefined && data !== null) {
    request.data = data;
  }

  return api.request(request);
}

api.interceptors.request.use(
  async (config) => {
    clearViewerAuthOverride();

    const url = config.url || "";

    if (config.headers?.Authorization) {
      return config;
    }

    if (url.startsWith("/auth/")) {
      const verifyToken = await AsyncStorage.getItem("verifyToken");
      if (verifyToken) {
        config.headers.Authorization = `Bearer ${verifyToken}`;
        config.authActor = "verify";
      }
      return config;
    }

    const isViewerRoute =
      url.startsWith("/posts/public") ||
      url.startsWith("/posts/provider/") ||
      /\/posts\/\d+\/(like|comments)/.test(url) ||
      /\/posts\/follow\//.test(url) ||
      url.startsWith("/profiles/") ||
      url.startsWith("/hiring/") ||
      url.startsWith("/recommendations") ||
      url.startsWith("/notifications");

    if (isViewerRoute) {
      const viewerToken = await getUserToken();
      if (viewerToken) {
        config.headers.Authorization = `Bearer ${viewerToken}`;
        config.authActor = "viewer";
        return config;
      }
    }

    const authToken = await AsyncStorage.getItem("token");
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      config.authActor = "provider";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      clearViewerAuthOverride();

      const url = error.config?.url || "";
      const authActor = error.config?.authActor;
      const isViewerAction =
        /\/posts\/[^/]+\/(like|comments)/.test(url) ||
        /\/posts\/follow\//.test(url) ||
        url.startsWith("/profiles/") ||
        url.startsWith("/hiring/") ||
        url.startsWith("/recommendations") ||
        url.startsWith("/notifications");
      const isSocialAction =
        /\/posts\/[^/]+\/(like|comments)/.test(url) ||
        /\/posts\/follow\//.test(url);

      console.log("[API 401]", {
        url,
        authActor,
        isSocialAction,
        data: error.response?.data || null,
      });

      if (isSocialAction) {
        return Promise.reject(error);
      }

      if (authActor === "viewer" || (isViewerAction && !authActor)) {
        await clearUserSession();
      } else {
        await AsyncStorage.multiRemove(["token"]);
      }
    }
    return Promise.reject(error);
  }
);
