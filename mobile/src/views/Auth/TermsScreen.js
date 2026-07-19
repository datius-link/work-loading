import React from "react";
import TermsOfService from "../Settings/TermsOfService";

// Reachable pre-login from Register (assignment: legal text must be visible,
// never gated behind an account) without depending on the authenticated
// Settings tab.
export default function TermsScreen({ navigation }) {
  return <TermsOfService onBack={() => navigation.goBack()} />;
}
