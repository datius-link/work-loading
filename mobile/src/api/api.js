import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const viewerToken = await AsyncStorage.getItem("viewer_token");
  if (!viewerToken) return null;
  return { Authorization: `Bearer ${viewerToken}` };
}

export async function viewerRequest(method, url, data, config = {}) {
  const viewerHeaders = await getViewerAuthHeaders();
  if (!viewerHeaders) {
    const err = new Error("Viewer not logged in");
    err.response = { status: 401 };
    throw err;
  }

  return api.request({
    method,
    url,
    data,
    ...config,
    headers: {
      ...config.headers,
      ...viewerHeaders,
    },
  });
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
      }
      return config;
    }

    const viewerFeedRoute =
      url.startsWith("/posts/public") ||
      url.startsWith("/posts/provider/");

    if (viewerFeedRoute) {
      const viewerToken = await AsyncStorage.getItem("viewer_token");
      if (viewerToken) {
        config.headers.Authorization = `Bearer ${viewerToken}`;
        return config;
      }
    }

    const authToken = await AsyncStorage.getItem("token");
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
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
      const isViewerAction =
        /\/posts\/[^/]+\/(like|comments)/.test(url) ||
        /\/posts\/follow\//.test(url);

      if (isViewerAction) {
        await AsyncStorage.removeItem("viewer_token");
      } else {
        await AsyncStorage.multiRemove(["token"]);
      }
    }
    return Promise.reject(error);
  }
);
