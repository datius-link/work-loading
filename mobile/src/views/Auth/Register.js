import React from "react";
import AuthScreen from "./AuthScreen";

// Standalone full-screen Register (assignment: Sign_up_Activity). Submitting
// sends a real OTP email (SMTP via the backend) and moves into the
// verification step; the account only becomes usable after the code checks out.
export default function Register({ route, navigation }) {
  return (
    <AuthScreen
      initialMode="register"
      onClose={() => navigation.goBack()}
      onSwitchScreen={() => navigation.replace("Login", { onSuccess: route.params?.onSuccess })}
      onSuccess={route.params?.onSuccess}
    />
  );
}
