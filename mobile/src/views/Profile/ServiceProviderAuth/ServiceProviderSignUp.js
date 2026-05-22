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

export default function ServiceProviderSignUp({ navigation }) {
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

      Alert.alert(
        "Code sent",
        "Your verification code is shown in the backend terminal."
      );

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
        <View style={localStyles.iconWrap}>
          <AppIcon name="plusUser" size={28} color={theme.colors.primary} />
        </View>

        <Txt
          en="Become a Service Provider"
          sw="Kuwa Mtoa Huduma"
          style={styles.title}
        />

        <Txt
          en="Create a full provider account for posting work, receiving requests, and building your profile."
          sw="Fungua akaunti kamili ya mtoa huduma kwa kupost kazi, kupokea maombi, na kujenga profile yako."
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

        <TextInput
          placeholder="Confirm password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Txt en="Continue" sw="Endelea" style={styles.buttonText} />
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
