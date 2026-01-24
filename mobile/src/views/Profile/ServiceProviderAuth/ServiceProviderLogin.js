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
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";

export default function ServiceProviderLogin({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      if (res.data.requireVerification) {
        await AsyncStorage.multiSet([
          ["verifyToken", res.data.verifyToken],
          ["pendingUuid", res.data.uuid],
        ]);
        return navigation.replace("VerifyProvider");
      }

      await AsyncStorage.setItem("token", res.data.token);
      navigation.reset({
        index: 0,
        routes: [{ name: "ProviderTabs" }],
      });
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Txt
          en="Sign in to Provider Account"
          sw="Ingia kwenye Akaunti ya Mtoa Huduma"
          style={[styles.title, { color: theme.colors.text }]}
        />

        <Txt
          en="Offer services, manage jobs, and earn."
          sw="Toa huduma, simamia kazi, na upate kipato."
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

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Txt
              en="Login"
              sw="Ingia"
              style={styles.buttonText}
            />
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
            en="Don’t have a provider account? Sign up"
            sw="Huna akaunti ya mtoa huduma? Jisajili"
            style={[styles.linkText, { color: theme.colors.primary }]}
          />
        </TouchableOpacity>

      </View>
    </AuthLayout>
  );
}