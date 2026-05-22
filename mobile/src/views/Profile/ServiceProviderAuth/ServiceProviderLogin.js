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
import Txt from "../../../Txt";
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";

export default function ServiceProviderLogin({ navigation }) {
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
        <View style={localStyles.iconWrap}>
          <AppIcon name="login" size={26} color={theme.colors.primary} />
        </View>

        <Txt
          en="Sign in as a Service Provider"
          sw="Ingia kama Mtoa Huduma"
          style={styles.title}
        />

        <Txt
          en="Manage posts, requests, alerts, and your professional profile."
          sw="Simamia posts, maombi, arifa, na profile yako ya kazi."
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

        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
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
            en="Do not have a provider account? Sign up"
            sw="Huna akaunti ya mtoa huduma? Jisajili"
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
