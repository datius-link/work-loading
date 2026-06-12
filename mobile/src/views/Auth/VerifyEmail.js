import React from "react";
import LoginModal from "./LoginModal";

export default function VerifyEmail({ route, navigation }) {
  return (
    <LoginModal
      visible
      initialMode={route.params?.mode || "register"}
      onClose={() => navigation.goBack()}
      onSuccess={route.params?.onSuccess}
    />
  );
}
