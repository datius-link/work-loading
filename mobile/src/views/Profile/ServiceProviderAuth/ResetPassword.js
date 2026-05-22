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
import Txt from "../../../Txt";
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";

export default function ResetPassword({ navigation, route }) {
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("resetPasswordToken").then((token) => {
      if (!token) {
        Alert.alert(
          "Reset session missing",
          "Please verify your reset code first."
        );
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

      await api.post("/auth/password/reset", {
        resetToken,
        password,
      });

      await AsyncStorage.removeItem("resetPasswordToken");

      Alert.alert(
        "Password updated",
        "You can now login with your new password."
      );

      navigation.reset({
        index: 0,
        routes: [{ name: "ServiceProviderLogin" }],
      });
    } catch (err) {
      Alert.alert(
        "Reset failed",
        err.response?.data?.message || "Failed to reset password"
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
          <AppIcon name="lock" size={26} color={theme.colors.primary} />
        </View>

        <Txt
          en="Create a new password"
          sw="Weka nenosiri jipya"
          style={styles.title}
        />

        <Txt
          en={`Use a password you will remember for ${route?.params?.email || "your provider account"}.`}
          sw={`Tumia nenosiri utakumbuka kwa ${route?.params?.email || "akaunti yako ya mtoa huduma"}.`}
          style={styles.subtitle}
        />

        <TextInput
          placeholder="New password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Confirm new password"
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleReset}
          disabled={loading || !resetToken}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Txt en="Reset password" sw="Badilisha nenosiri" style={styles.buttonText} />
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
