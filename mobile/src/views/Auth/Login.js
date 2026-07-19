import React from "react";
import AuthScreen from "./AuthScreen";

// Standalone full-screen Login (assignment: LoginActivity). Checks server +
// database connectivity before login, and an unverified account is routed
// into the OTP verification step automatically by the backend's
// requiresOtp response.
export default function Login({ route, navigation }) {
  return (
    <AuthScreen
      initialMode="login"
      onClose={() => navigation.goBack()}
      onSwitchScreen={() => navigation.replace("Register", { onSuccess: route.params?.onSuccess })}
      onSuccess={route.params?.onSuccess}
    />
  );
}
