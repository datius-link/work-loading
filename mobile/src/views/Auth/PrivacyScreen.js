import React from "react";
import PrivacyPolicy from "../Settings/PrivacyPolicy";

// Reachable pre-login from Register (assignment: PrivacyPolicyActivity must
// be visible, never gated behind an account) without depending on the
// authenticated Settings tab.
export default function PrivacyScreen({ navigation }) {
  return <PrivacyPolicy onBack={() => navigation.goBack()} />;
}
