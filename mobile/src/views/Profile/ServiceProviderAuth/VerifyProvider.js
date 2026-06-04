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

export default function VerifyProvider({ navigation, route }) {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);

  const purpose = route?.params?.purpose || "provider-signup";
  const isPasswordReset = purpose === "reset-password";

  const [email, setEmail] = useState(route?.params?.email || "");
  const [otp, setOtp] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPasswordReset) return;
    const loadEmail = async () => {
      try {
        const verifyToken = await AsyncStorage.getItem("verifyToken");
        if (!verifyToken) return;
        const res = await api.get("/auth/verification-info", {
          headers: { Authorization: `Bearer ${verifyToken}` },
        });
        setEmail(res.data.email);
      } catch {
        Alert.alert("Error", "Failed to load verification details.");
      }
    };
    loadEmail();
  }, [isPasswordReset]);

  const handleVerifyProvider = async () => {
    const verifyToken = await AsyncStorage.getItem("verifyToken");
    const res = await api.post("/auth/verify-provider", {
      verifyToken,
      code: otp.trim(),
    });
    await AsyncStorage.setItem("token", res.data.token);
    await AsyncStorage.multiRemove(["verifyToken", "pendingUuid"]);
    navigation.reset({ index: 0, routes: [{ name: "EditProvider" }] });
  };

  const handleVerifyPasswordReset = async () => {
    const res = await api.post("/auth/password/verify-code", {
      email: email.trim().toLowerCase(),
      code: otp.trim(),
    });
    await AsyncStorage.setItem("resetPasswordToken", res.data.resetToken);
    navigation.replace("ResetPassword", { email: email.trim().toLowerCase() });
  };

  const handleVerify = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    try {
      setLoading(true);
      if (isPasswordReset) {
        await handleVerifyPasswordReset();
      } else {
        await handleVerifyProvider();
      }
    } catch (err) {
      Alert.alert(
        "Verification failed",
        err.response?.data?.message || "Invalid or expired code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Email is required.");
      return;
    }
    try {
      setLoading(true);
      const verifyToken = await AsyncStorage.getItem("verifyToken");
      await api.post(
        "/auth/update-email",
        { email: email.trim().toLowerCase() },
        { headers: { Authorization: `Bearer ${verifyToken}` } }
      );
      Alert.alert("Code sent", "Verification code sent to your new email.");
      setEditingEmail(false);
      setOtp("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    try {
      setLoading(true);
      if (isPasswordReset) {
        await api.post("/auth/password/forgot", { email: email.trim().toLowerCase() });
      } else {
        const verifyToken = await AsyncStorage.getItem("verifyToken");
        await api.post("/auth/request-code", { verifyToken });
      }
      Alert.alert("Code sent", "A new verification code has been sent.");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={styles.card}>
        <AuthBrand />

        <Txt
          en={isPasswordReset ? "Verify code" : "Verify email"}
          sw={isPasswordReset ? "Thibitisha namba" : "Thibitisha barua pepe"}
          style={styles.title}
        />
        <Txt
          en={
            isPasswordReset
              ? "Enter the code from the backend terminal."
              : "Enter the code sent to your email."
          }
          sw={
            isPasswordReset
              ? "Weka namba iliyopo kwenye backend terminal."
              : "Weka namba iliyotumwa kwenye barua pepe yako."
          }
          style={styles.subtitle}
        />

        {/* Email row — editable only when editing */}
        <View
          style={[
            styles.inputRow,
            { opacity: !isPasswordReset && editingEmail ? 1 : 0.65 },
          ]}
        >
          <View style={styles.inputIcon}>
            <AppIcon name="mail" size={19} color={theme.colors.primary} />
          </View>
          <TextInput
            value={email}
            editable={!isPasswordReset && editingEmail}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        {!isPasswordReset && !editingEmail && (
          <TouchableOpacity
            style={{ marginBottom: 12, alignSelf: "flex-start" }}
            onPress={() => setEditingEmail(true)}
          >
            <Txt
              en="Edit email"
              sw="Badilisha barua pepe"
              style={[styles.linkText, { color: theme.colors.accent }]}
            />
          </TouchableOpacity>
        )}

        {editingEmail ? (
          <TouchableOpacity
            style={[styles.button, loading && styles.disabled]}
            onPress={handleSaveEmail}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Txt en="Save & send code" sw="Hifadhi na tuma namba" style={styles.buttonText} />
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <AppIcon name="shield" size={19} color={theme.colors.primary} />
              </View>
              <TextInput
                placeholder="Verification code"
                placeholderTextColor={theme.colors.textVeryMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.disabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Txt
                  en={isPasswordReset ? "Verify" : "Verify & continue"}
                  sw={isPasswordReset ? "Thibitisha" : "Thibitisha na endelea"}
                  style={styles.buttonText}
                />
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.link}
          onPress={handleRequestCode}
          disabled={loading}
        >
          <Txt
            en="Request new code"
            sw="Omba namba mpya"
            style={[styles.linkText, { color: theme.colors.accent }]}
          />
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
