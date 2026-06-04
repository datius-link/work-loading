import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthLayout from "./AuthLayout";
import AuthBackButton from "../../../AuthBackButton";
import AuthBrand from "./AuthBrand";
import Txt from "../../../Txt";
import { createAuthStyles } from "./auth.js";
import { useAppTheme } from "../../../theme";
import { api } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";

export default function ResetPassword({ navigation, route }) {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("resetPasswordToken").then((token) => {
      if (!token) {
        Alert.alert("Session missing", "Please verify your reset code first.");
        navigation.replace("ForgotPassword");
        return;
      }
      setResetToken(token);
    });
  }, [navigation]);

  const handleReset = async () => {
    if (password.length < 4) {
      Alert.alert("Error", "Password must be at least 4 characters");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/password/reset", { resetToken, password });
      await AsyncStorage.removeItem("resetPasswordToken");
      Alert.alert("Done", "You can now login with your new password.");
      navigation.reset({
        index: 0,
        routes: [{ name: "ServiceProviderLogin" }],
      });
    } catch (err) {
      Alert.alert("Reset failed", err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={styles.card}>
        <AuthBrand />

        <Txt en="New password" sw="Nenosiri jipya" style={styles.title} />
        <Txt
          en={`Set a new password for ${route?.params?.email || "your account"}.`}
          sw={`Weka nenosiri jipya kwa ${route?.params?.email || "akaunti yako"}.`}
          style={styles.subtitle}
        />

        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <AppIcon name="lock" size={19} color={theme.colors.primary} />
          </View>
          <TextInput
            placeholder="New password"
            placeholderTextColor={theme.colors.textVeryMuted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <AppIcon name="shield" size={19} color={theme.colors.primary} />
          </View>
          <TextInput
            placeholder="Confirm new password"
            placeholderTextColor={theme.colors.textVeryMuted}
            secureTextEntry
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleReset}
          disabled={loading || !resetToken}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Txt en="Save password" sw="Hifadhi nenosiri" style={styles.buttonText} />
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
