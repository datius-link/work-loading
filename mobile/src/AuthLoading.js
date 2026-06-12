import React, { useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthLoading({ navigation }) {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        // No token: public user
        if (!token) {
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
          return;
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } catch (err) {
        const status = err?.response?.status;

        // Auth token invalid or expired
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

        // Unexpected error
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
