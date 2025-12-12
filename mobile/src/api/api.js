import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create axios instance
export const API = axios.create({
  baseURL: "http://10.125.36.51:5000/api",
  timeout: 10000,
});

// Interceptor
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
