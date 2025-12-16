import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../api/api";

export default function VerifyProvider({ navigation, route }) {
  const { email, phone } = route.params;

  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  /* -------------------------
   * REQUEST MOCK OTP
   * ------------------------- */
  useEffect(() => {
    const requestMockOTP = async () => {
      try {
        setInfo("Sending verification codes...");

        await API.post("/auth/mock-send-otp", {
          email,
          phone,
        });

        setInfo(
          `Mock OTPs sent to ${phone} and ${email}`
        );
      } catch (err) {
        console.log("OTP request error:", err);
        setInfo("Failed to send OTPs");
      }
    };

    requestMockOTP();
  }, []);

  /* -------------------------
   * VERIFY OTP (MOCK)
   * ------------------------- */
  const handleVerify = async () => {
    if (phoneOtp.length < 6 || emailOtp.length < 6) {
      Alert.alert("Invalid OTP", "Enter the full 6-digit verification codes");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/mock-verify-otp", {
        email,
        phone,
        otpPhone: phoneOtp,
        otpEmail: emailOtp,
      });

      if (!res.data.success) {
        Alert.alert("Verification failed", res.data.message);
        setLoading(false);
        return;
      }

      // ✅ Save token now (final step)
      if (res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        await AsyncStorage.setItem("role", "serviceProvider");
      }

      // ✅ Reset navigation → dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: "ProviderTabs" }],
      });
    } catch (err) {
      console.log("Verify error:", err);
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify Your Account</Text>

      <Text style={styles.subtitle}>
        Enter the codes sent to your phone and email
      </Text>

      <View style={styles.section}>
        <Text style={styles.contactLabel}>Phone:</Text>
        <Text style={styles.contact}>{phone}</Text>
        <TextInput
          placeholder="Enter Phone OTP"
          keyboardType="numeric"
          maxLength={6}
          value={phoneOtp}
          onChangeText={setPhoneOtp}
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.contactLabel}>Email:</Text>
        <Text style={styles.contact}>{email}</Text>
        <TextInput
          placeholder="Enter Email OTP"
          keyboardType="numeric"
          maxLength={6}
          value={emailOtp}
          onChangeText={setEmailOtp}
          style={styles.input}
        />
      </View>

      {info !== "" && (
        <Text style={styles.info}>{info}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.btn,
          loading && { opacity: 0.6 },
        ]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? "Verifying..." : "Verify"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

/* -------------------------
 * STYLES
 * ------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FFFD",
    padding: 24,
  },

  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  backText: {
    fontSize: 18,
    color: "#777",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B6B63",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
    color: "#555",
  },

  section: {
    marginTop: 24,
  },

  contactLabel: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },

  contact: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: "#111",
  },

  info: {
    marginTop: 14,
    textAlign: "center",
    color: "#007BFF",
    fontSize: 13,
  },

  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 6,
    backgroundColor: "#fff",
  },

  btn: {
    marginTop: 24,
    backgroundColor: "#0B6B63",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});