import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create axios instance
export const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },


});

// Attach token globally
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("API BASE URL 👉", process.env.EXPO_PUBLIC_API_URL);

    return config;
  },
  (error) => Promise.reject(error)
);
