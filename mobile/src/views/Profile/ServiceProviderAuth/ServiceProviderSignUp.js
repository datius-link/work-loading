import React, { useState } from "react";
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

export default function ServiceProviderSignUp({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        email: cleanEmail,
        password,
      });

      await AsyncStorage.multiSet([
        ["verifyToken", res.data.verifyToken],
        ["pendingUuid", res.data.uuid],
      ]);

      Alert.alert("Code sent", "Check the backend terminal for your verification code.");

      navigation.replace("VerifyProvider");
    } catch (err) {
      Alert.alert(
        "Registration failed",
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={styles.card}>
        <AuthBrand />

        <Txt en="Create account" sw="Fungua akaunti" style={styles.title} />
        <Txt
          en="Post work, receive requests and build your profile."
          sw="Post kazi, pokea maombi na jenga profile yako."
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

        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <AppIcon name="lock" size={19} color={theme.colors.primary} />
          </View>
          <TextInput
            placeholder="Password"
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
            placeholder="Confirm password"
            placeholderTextColor={theme.colors.textVeryMuted}
            secureTextEntry
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Txt en="Continue" sw="Endelea" style={styles.buttonText} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.replace("ServiceProviderLogin")}
        >
          <Txt
            en="Already have an account? Login"
            sw="Una akaunti? Ingia"
            style={styles.linkText}
          />
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
