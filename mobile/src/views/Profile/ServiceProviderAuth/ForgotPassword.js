import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AuthLayout from "./AuthLayout";
import AuthBackButton from "../../../AuthBackButton";
import Txt from "../../../Txt";
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("Error", "Email is required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password/forgot", { email });

      Alert.alert(
        "Success",
        "A verification code has been sent to your email"
      );

      navigation.replace("ResetPassword", { email });
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to send reset code"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Txt
          en="Forgot your password?"
          sw="Umesahau nenosiri?"
          style={[styles.title, { color: theme.colors.text }]}
        />

        <Txt
          en="Enter your email address and we’ll send you a verification code to reset your password."
          sw="Weka barua pepe yako tutakutumia namba ya uthibitisho ili kubadilisha nenosiri."
          style={[styles.subtitle, { color: theme.colors.textMuted }]}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.textVeryMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceSoft,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Txt
              en="Send verification code"
              sw="Tuma namba ya uthibitisho"
              style={styles.buttonText}
            />
          )}
        </TouchableOpacity>

        {/* BACK TO LOGIN */}
        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.replace("ServiceProviderLogin")}
        >
          <Txt
            en="Back to login"
            sw="Rudi kuingia"
            style={[styles.linkText, { color: theme.colors.primary }]}
          />
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
