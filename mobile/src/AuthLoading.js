import React, { useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api/api";

export default function AuthLoading({ navigation }) {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        // 1️⃣ No token → public user
        if (!token) {
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
          return;
        }

        // 2️⃣ Validate token + profile from backend
        const res = await api.get("/service-provider/me");

        // 3️⃣ Profile exists → provider app
        if (res?.data?.provider) {
          navigation.reset({
            index: 0,
            routes: [{ name: "ProviderTabs" }],
          });
          return;
        }

        // 4️⃣ Fallback (shouldn't happen)
        throw new Error("Profile missing");
      } catch (err) {
        const status = err?.response?.status;

        // 🔥 AUTH TOKEN INVALID / EXPIRED
        if (status === 401) {
          await AsyncStorage.multiRemove([
            "token",
            "verifyToken",
            "pendingUuid",
          ]);

          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
          return;
        }

        // 🧱 PROFILE NOT CREATED YET
        if (status === 404) {
          navigation.reset({
            index: 0,
            routes: [{ name: "EditProvider" }],
          });
          return;
        }

        // 🚨 Unexpected error
        console.error("Auth bootstrap error:", err);
        Alert.alert(
          "Error",
          "Something went wrong while loading your account."
        );

        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      }
    };

    bootstrap();
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}
