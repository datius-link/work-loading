import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthLayout from "./AuthLayout";
import AuthBackButton from "../../../AuthBackButton";
import AuthBrand from "./AuthBrand";
import Txt from "../../../Txt";
import { createAuthStyles } from "./auth.js";
import { useAppTheme } from "../../../theme";
import { api } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";

export default function ForgotPassword({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Error", "Email is required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password/forgot", { email: cleanEmail });
      Alert.alert("Code sent", "Check the backend terminal for your verification code.");
      navigation.replace("VerifyProvider", {
        purpose: "reset-password",
        email: cleanEmail,
      });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={styles.card}>
        <AuthBrand />

        <Txt en="Reset password" sw="Weka upya nenosiri" style={styles.title} />
        <Txt
          en="Enter your email and we'll send you a code."
          sw="Weka barua pepe yako, tutakutumia namba."
          style={styles.subtitle}
        />

        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <AppIcon name="mail" size={19} color={theme.colors.primary} />
          </View>
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.colors.textVeryMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleSendCode}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Txt en="Send code" sw="Tuma namba" style={styles.buttonText} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.replace("ServiceProviderLogin")}
        >
          <Txt en="Back to login" sw="Rudi kuingia" style={styles.linkText} />
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
