import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthLayout from "./AuthLayout";
import AuthBackButton from "../../../AuthBackButton";
import Txt from "../../../Txt";
import { styles } from "./styles";
import { theme } from "../../../theme";
import { api } from "../../../api/api";

export default function VerifyProvider({ navigation }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  /* =====================================================
     LOAD EMAIL USING VERIFY TOKEN
  ===================================================== */
  useEffect(() => {
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
  }, []);

  /* =====================================================
     VERIFY OTP
  ===================================================== */
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
      const verifyToken = await AsyncStorage.getItem("verifyToken");

      const res = await api.post("/auth/verify-provider", {
        verifyToken,
        code: otp.trim(),
      });

      await AsyncStorage.setItem("token", res.data.token);
      await AsyncStorage.removeItem("verifyToken");

      navigation.reset({
        index: 0,
        routes: [{ name: "EditProvider" }],
      });
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

  /* =====================================================
     SAVE EMAIL + RESEND CODE
  ===================================================== */
  const handleSaveEmail = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Error",
        "Email is required.\n\nBarua pepe inahitajika."
      );
      return;
    }

    try {
      setLoading(true);
      const verifyToken = await AsyncStorage.getItem("verifyToken");

      await api.post("/auth/update-email", {
        verifyToken,
        email,
      });

      Alert.alert(
        "Code sent",
        "Verification code has been sent to your new email.\n\nNamba ya uthibitisho imetumwa kwenye barua pepe mpya."
      );

      setEditingEmail(false);
      setOtp("");
    } catch {
      Alert.alert(
        "Error",
        "Failed to resend code.\n\nImeshindikana kutuma namba mpya."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     REQUEST NEW CODE (NO EMAIL CHANGE)
  ===================================================== */
  const handleRequestCode = async () => {
    try {
      const verifyToken = await AsyncStorage.getItem("verifyToken");

      await api.post("/auth/request-code", { verifyToken });

      Alert.alert(
        "Code sent",
        "A new verification code has been sent.\n\nNamba mpya ya uthibitisho imetumwa."
      );
    } catch {
      Alert.alert(
        "Error",
        "Failed to send verification code.\n\nImeshindikana kutuma namba ya uthibitisho."
      );
    }
  };

  /* =====================================================
     UI
  ===================================================== */
  return (
    <AuthLayout>
      <AuthBackButton />

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Txt
          en="Verify your email"
          sw="Thibitisha barua pepe"
          style={styles.title}
        />

        <Txt
          en="Enter the verification code sent to your email."
          sw="Weka namba ya uthibitisho iliyotumwa kwenye barua pepe yako."
          style={styles.subtitle}
        />

        {/* EMAIL INPUT */}
        <TextInput
          value={email}
          editable={editingEmail}
          onChangeText={setEmail}
          style={[
            styles.input,
            {
              opacity: editingEmail ? 1 : 0.6,
              backgroundColor: theme.colors.surfaceSoft,
              color: theme.colors.text,
            },
          ]}
        />

        {/* EDIT EMAIL LINK */}
        {!editingEmail && (
          <TouchableOpacity onPress={() => setEditingEmail(true)}>
            <Txt
              en="Edit email"
              sw="Badilisha barua pepe"
              style={[styles.linkText, { color: theme.colors.accent }]}
            />
          </TouchableOpacity>
        )}

        {/* EDITING EMAIL MODE */}
        {editingEmail ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Txt
                en="Save & Send Code"
                sw="Hifadhi na tuma namba"
                style={styles.buttonText}
              />
            )}
          </TouchableOpacity>
        ) : (
          <>
            {/* OTP INPUT */}
            <TextInput
              placeholder="Verification code"
              placeholderTextColor={theme.colors.textVeryMuted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  color: theme.colors.text,
                },
              ]}
            />

            {/* VERIFY BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Txt
                  en="Verify & Continue"
                  sw="Thibitisha na endelea"
                  style={styles.buttonText}
                />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* REQUEST NEW CODE */}
        <TouchableOpacity onPress={handleRequestCode}>
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
