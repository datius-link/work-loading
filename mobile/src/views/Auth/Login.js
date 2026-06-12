import React from "react";
import LoginModal from "./LoginModal";

export default function Login({ route, navigation }) {
  return (
    <LoginModal
      visible
      initialMode="login"
      onClose={() => navigation.goBack()}
      onSuccess={route.params?.onSuccess}
    />
  );
}
