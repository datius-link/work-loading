import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "./api/api";

export default function AuthLoading({ navigation }) {
  useEffect(() => {
    const bootstrap = async () => {
      const token = await AsyncStorage.getItem("token");

      // 1️⃣ Hakuna token → public app
      if (!token) {
        navigation.replace("MainTabs");
        return;
      }

      try {
        // 2️⃣ Token ipo → muulize backend huyu ni nani
        const res = await API.get("/auth/me");

        const user = res.data;

        // 3️⃣ Hajaverified → VerifyProvider
        if (!user.isVerified) {
          navigation.replace("VerifyProvider");
          return;
        }

        // 4️⃣ Verified → ProviderTabs
        navigation.replace("ProviderTabs");
      } catch (err) {
        // token mbovu / expired
        await AsyncStorage.multiRemove(["token", "role"]);
        navigation.replace("MainTabs");
      }
    };

    bootstrap();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#4ECDC4" />
    </View>
  );
}
