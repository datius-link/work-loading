import React from "react";
import AuthScreen from "./AuthScreen";

// Standalone full-screen email verification entry point. Unverified logins
// switch to the OTP step automatically inside the Login screen; this route
// exists for flows that want to jump straight to verification.
export default function VerifyEmail({ route, navigation }) {
  return (
    <AuthScreen
      initialMode={route.params?.mode || "register"}
      onClose={() => navigation.goBack()}
      onSuccess={route.params?.onSuccess}
    />
  );
}
