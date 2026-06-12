import React from "react";
import LoginModal from "./LoginModal";

export default function Register({ route, navigation }) {
  return (
    <LoginModal
      visible
      initialMode="register"
      onClose={() => navigation.goBack()}
      onSuccess={route.params?.onSuccess}
    />
  );
}
