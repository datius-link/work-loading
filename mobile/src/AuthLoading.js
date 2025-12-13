import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthLoading({ navigation }) {
  useEffect(() => {
    const checkRole = async () => {
      const role = await AsyncStorage.getItem("role");
      const token = await AsyncStorage.getItem("token");

      if (token && role === "SERVICE_PROVIDER") {
        navigation.replace("ProviderTabs");
      } else {
        navigation.replace("Main");
      }
    };

    checkRole();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#4ECDC4" />
    </View>
  );
}
