import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },


});

/* =====================================================
   REQUEST INTERCEPTOR
   - VERIFY token → auth flows only
   - AUTH token → app flows only
===================================================== */
api.interceptors.request.use(
  async (config) => {
    // Respect manual override
    if (config.headers?.Authorization) return config;

    const url = config.url || "";

    // 🔐 AUTHENTICATION / VERIFICATION FLOW
    if (url.startsWith("/auth/")) {
      const verifyToken = await AsyncStorage.getItem("verifyToken");
      if (verifyToken) {
        config.headers.Authorization = `Bearer ${verifyToken}`;
      }
      return config;
    }

    // 🔑 APPLICATION FLOW (ProviderTabs, Profile, etc)
    const authToken = await AsyncStorage.getItem("token");
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // auth token invalid → kick out of app
      await AsyncStorage.multiRemove(["token"]);
    }
    return Promise.reject(error);
  }
);
