import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearUserSession, getUserToken } from "../utils/userSession";
import { isNetworkError, networkErrorMessage } from "../utils/network";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getFriendlyApiError(error, language = "en") {
  if (isNetworkError(error)) return networkErrorMessage(language);
  // Our API's 4xx messages are written for end users ("User is not verified
  // yet. Please verify OTP.", "Invalid credentials") — surfacing them beats
  // a generic "no permission" that hides the real reason from the user.
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim() && status >= 400 && status < 500) {
    return serverMessage;
  }
  if (error?.response?.status === 401) {
    return language === "sw" ? "Tafadhali ingia ili kuendelea." : "Please login to continue.";
  }
  if (error?.response?.status === 403) {
    return language === "sw" ? "Huna ruhusa ya kufanya hili." : "You do not have permission to do this.";
  }
  return language === "sw"
    ? "Kuna tatizo. Tafadhali jaribu tena."
    : "Something went wrong. Please try again.";
}

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
      url.startsWith("/search") ||
      /\/posts\/\d+\/(like|comments)/.test(url) ||
      /\/posts\/follow\//.test(url) ||
      url.startsWith("/profiles/") ||
      url.startsWith("/hiring/") ||
      url.startsWith("/recommendations") ||
      url.startsWith("/notifications") ||
      url.startsWith("/support");

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
        url.startsWith("/notifications") ||
        url.startsWith("/support");
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
