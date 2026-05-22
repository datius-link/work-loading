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
import Txt from "../../../Txt";
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";

export default function ForgotPassword({ navigation }) {
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

      Alert.alert(
        "Success",
        "A verification code has been sent. In development, check the backend terminal."
      );

      navigation.replace("VerifyProvider", {
        purpose: "reset-password",
        email: cleanEmail,
      });
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

      <View style={styles.card}>
        <View style={localStyles.iconWrap}>
          <AppIcon name="key" size={26} color={theme.colors.primary} />
        </View>

        <Txt
          en="Forgot your password?"
          sw="Umesahau nenosiri?"
          style={styles.title}
        />

        <Txt
          en="Enter your email and we will send a verification code before you create a new password."
          sw="Weka barua pepe yako tutakutumia namba ya uthibitisho kabla hujaweka nenosiri jipya."
          style={styles.subtitle}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.textVeryMuted}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
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

const localStyles = {
  iconWrap: {
    alignSelf: "center",
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
  },
};
