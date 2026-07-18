import React from "react";
import LoginModal from "./LoginModal";

// Standalone full-screen Login (assignment: LoginActivity). Checks server +
// database connectivity before login (see LoginModal's screen presentation),
// and an unverified account is routed into the OTP verification step
// automatically by the backend's requiresOtp response.
export default function Login({ route, navigation }) {
  return (
    <LoginModal
      visible
      presentation="screen"
      initialMode="login"
      onClose={() => navigation.goBack()}
      onSwitchScreen={() => navigation.replace("Register", { onSuccess: route.params?.onSuccess })}
      onSuccess={route.params?.onSuccess}
    />
  );
}
