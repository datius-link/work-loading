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

export default function VerifyProvider({ navigation, route }) {
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
        Alert.alert(
          "Error",
          "Failed to load verification details.\n\nImeshindikana kupakua taarifa za uthibitisho."
        );
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

    navigation.reset({
      index: 0,
      routes: [{ name: "EditProvider" }],
    });
  };

  const handleVerifyPasswordReset = async () => {
    const res = await api.post("/auth/password/verify-code", {
      email: email.trim().toLowerCase(),
      code: otp.trim(),
    });

    await AsyncStorage.setItem("resetPasswordToken", res.data.resetToken);

    navigation.replace("ResetPassword", {
      email: email.trim().toLowerCase(),
    });
  };

  const handleVerify = async () => {
    if (!otp.trim()) {
      Alert.alert(
        "Error",
        "Please enter the verification code.\n\nTafadhali ingiza namba ya uthibitisho."
      );
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
        err.response?.data?.message ||
          "Invalid or expired code.\n\nNamba si sahihi au muda umeisha."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Email is required.\n\nBarua pepe inahitajika.");
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

      Alert.alert(
        "Code sent",
        "Verification code has been sent to your new email.\n\nNamba ya uthibitisho imetumwa kwenye barua pepe mpya."
      );

      setEditingEmail(false);
      setOtp("");
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          "Failed to resend code.\n\nImeshindikana kutuma namba mpya."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    try {
      setLoading(true);

      if (isPasswordReset) {
        await api.post("/auth/password/forgot", {
          email: email.trim().toLowerCase(),
        });
      } else {
        const verifyToken = await AsyncStorage.getItem("verifyToken");
        await api.post("/auth/request-code", { verifyToken });
      }

      Alert.alert(
        "Code sent",
        "A new verification code has been sent.\n\nNamba mpya ya uthibitisho imetumwa."
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          "Failed to send verification code.\n\nImeshindikana kutuma namba ya uthibitisho."
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
          <AppIcon
            name={isPasswordReset ? "lock" : "mail"}
            size={26}
            color={theme.colors.primary}
          />
        </View>

        <Txt
          en={isPasswordReset ? "Verify reset code" : "Verify your email"}
          sw={isPasswordReset ? "Thibitisha namba ya reset" : "Thibitisha barua pepe"}
          style={styles.title}
        />

        <Txt
          en={
            isPasswordReset
              ? "Enter the code from the backend terminal, then create a new password."
              : "Enter the verification code sent to your email."
          }
          sw={
            isPasswordReset
              ? "Weka namba iliyopo kwenye backend terminal, kisha weka nenosiri jipya."
              : "Weka namba ya uthibitisho iliyotumwa kwenye barua pepe yako."
          }
          style={styles.subtitle}
        />

        <TextInput
          value={email}
          editable={!isPasswordReset && editingEmail}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            { opacity: !isPasswordReset && editingEmail ? 1 : 0.65 },
          ]}
        />

        {!isPasswordReset && !editingEmail && (
          <TouchableOpacity style={localStyles.inlineLink} onPress={() => setEditingEmail(true)}>
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
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Txt en="Save & send code" sw="Hifadhi na tuma namba" style={styles.buttonText} />
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              placeholder="Verification code"
              placeholderTextColor={theme.colors.textVeryMuted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              style={styles.otpInput}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.disabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Txt
                  en={isPasswordReset ? "Verify code" : "Verify & continue"}
                  sw={isPasswordReset ? "Thibitisha namba" : "Thibitisha na endelea"}
                  style={styles.buttonText}
                />
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.link} onPress={handleRequestCode} disabled={loading}>
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
  inlineLink: {
    marginBottom: theme.spacing.md,
  },
};
