import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthLayout from "./AuthLayout";
import AuthBackButton from "../../../AuthBackButton";
import Txt from "../../../Txt";
import { styles } from "./styles"; // shared auth styles
import { theme } from "../../../theme"; // ← new theme import
import { api } from "../../../api/api";

export default function ServiceProviderSignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, password });
      await AsyncStorage.multiSet([
        ["verifyToken", res.data.verifyToken],
        ["pendingUuid", res.data.uuid],
      ]);
      navigation.replace("VerifyProvider");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Txt
          en="Become a Service Provider"
          sw="Kuwa Mtoa Huduma"
          style={[styles.title, { color: theme.colors.text }]}
        />

        <Txt
          en="Create a provider account and start earning."
          sw="Fungua akaunti ya mtoa huduma uanze kupata kipato."
          style={[styles.subtitle, { color: theme.colors.textMuted }]}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.textVeryMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceHover,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceHover,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Confirm password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceHover,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Txt
              en="Continue"
              sw="Endelea"
              style={styles.buttonText}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.replace("ServiceProviderLogin")}
        >
          <Txt
            en="Already have a provider account? Login"
            sw="Tayari una akaunti ya mtoa huduma? Ingia"
            style={[styles.linkText, { color: theme.colors.primary }]}
          />
        </TouchableOpacity>

      </View>
    </AuthLayout>
  );
}