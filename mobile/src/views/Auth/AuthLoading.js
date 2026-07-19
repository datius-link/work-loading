import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import EkaziLogo from "../../../assets/e-kazi-logo.svg";
import { getUserSession } from "../../utils/userSession";

// Assignment gate (SplashActivity -> LoginActivity -> DashboardActivity):
// the bottom tabs are only reachable with a real, logged-in session. No
// session -> straight to Login, no peeking at MainTabs first.
export default function AuthLoading({ navigation }) {
  useEffect(() => {
    const bootstrap = async () => {
      const session = await getUserSession();
      navigation.reset({
        index: 0,
        routes: [{ name: session?.isLoggedIn ? "MainTabs" : "Login" }],
      });
    };

    bootstrap();
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 18,
      }}
    >
      <EkaziLogo width={64} height={64} />
      <ActivityIndicator size="large" />
    </View>
  );
}
