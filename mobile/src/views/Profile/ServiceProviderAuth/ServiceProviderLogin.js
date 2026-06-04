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

export default function ServiceProviderLogin({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: cleanEmail,
        password,
      });

      if (res.data.requireVerification) {
        await AsyncStorage.multiSet([
          ["verifyToken", res.data.verifyToken],
          ["pendingUuid", res.data.uuid],
        ]);
        return navigation.replace("VerifyProvider");
      }

      await AsyncStorage.multiSet([["token", res.data.token]]);
      await AsyncStorage.multiRemove(["verifyToken", "pendingUuid"]);

      navigation.reset({
        index: 0,
        routes: [{ name: "ProviderTabs" }],
      });
    } catch (err) {
      Alert.alert("Login failed", err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={styles.card}>
        <AuthBrand />

        <Txt en="Sign in" sw="Ingia" style={styles.title} />
        <Txt
          en="Manage your posts, requests and profile."
          sw="Simamia posts, maombi na profile yako."
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

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Txt en="Login" sw="Ingia" style={styles.buttonText} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Txt
            en="Forgot password?"
            sw="Umesahau nenosiri?"
            style={[styles.linkText, { color: theme.colors.accent }]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.replace("ServiceProviderSignUp")}
        >
          <Txt
            en="No account? Sign up"
            sw="Huna akaunti? Jisajili"
            style={styles.linkText}
          />
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
