import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "../../api/api";
import styles from "./styles/serviceProviderStyles";

export default function ForgotPassword({ navigation }) {
  /* -----------------------------
   * STATE
   * ----------------------------- */
  const [method, setMethod] = useState("phone"); 
  const [step, setStep] = useState("REQUEST"); 

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* -----------------------------
   * PHONE INPUT (MATCH SIGNUP)
   * ----------------------------- */
  const handlePhoneInput = (value) => {
    setPhoneError("");
    const cleaned = value.replace(/\s+/g, "");

    if (!/^\d*$/.test(cleaned)) {
      setPhoneError("Digits only");
      return;
    }

    if (cleaned.startsWith("0")) {
      setPhoneError("Do not start with 0");
    }

    if (cleaned.length > 9) {
      setPhoneError("Must be 9 digits");
    }

    setPhone(cleaned);
  };

  /* -----------------------------
   * IDENTIFIER
   * ----------------------------- */
  const getIdentifier = () => {
    if (method === "email") {
      if (!email.trim()) throw "Email is required";
      if (!/\S+@\S+\.\S+/.test(email)) throw "Invalid email";
      return email.trim();
    }

    if (!/^\d{9}$/.test(phone)) throw "Invalid phone number";
    if (phoneError) throw phoneError;

    return `+255${phone}`;
  };

  /* -----------------------------
   * SEND OTP
   * ----------------------------- */
  const sendOtp = async () => {
    setError("");

    let identifier = "";
    try {
      identifier = getIdentifier();
    } catch (e) {
      return setError(e);
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/forgot-password", {
        identifier,
      });

      if(res.data.success) {
        setStep("OTP");
      }

      if (!res.data.success) {
        return setError(res.data.message || "Failed to send OTP");
      }

      setStep("OTP");
    } catch {
      setError("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
   * VERIFY OTP
   * ----------------------------- */
  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      return setError("Enter valid OTP");
    }

    const identifier =
      method === "email" ? email : `+255${phone}`;

    const res = await API.post("/auth/verify-reset-otp", {
      identifier,
      otp,
    });

    if (!res.data.success) {
      return setError(res.data.message);
    }

    navigation.navigate("ResetPassword", {
      identifier,
      otp,
    });
  };


  /* -----------------------------
   * UI
   * ----------------------------- */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          justifyContent: "center",
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Forgot Password</Text>

        {step === "REQUEST" && (
          <>
            {/* METHOD SWITCH */}
            <View style={styles.segmented}>
              <TouchableOpacity
                onPress={() => setMethod("email")}
                style={[
                  styles.segmentBtn,
                  method === "email" && styles.segmentActive,
                ]}
              >
                <Feather name="mail" size={18} color="#fff" />
                <Text style={styles.segmentTextActive}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMethod("phone")}
                style={[
                  styles.segmentBtn,
                  method === "phone" && styles.segmentActive,
                ]}
              >
                <Feather name="phone" size={18} color="#fff" />
                <Text style={styles.segmentTextActive}>Phone</Text>
              </TouchableOpacity>
            </View>

            {/* INPUT */}
            {method === "email" ? (
              <View style={styles.inputRow}>
                <Feather name="mail" size={20} />
                <TextInput
                  placeholder="Email"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+255</Text>
                <TextInput
                  placeholder="712345678"
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={handlePhoneInput}
                  keyboardType="numeric"
                  maxLength={9}
                />
              </View>
            )}

            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={sendOtp}>
              <Text style={styles.btnText}>
                {loading ? "Sending..." : "Send OTP"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "OTP" && (
          <>
            <Text style={styles.subtitle}>Enter OTP</Text>

            <View style={styles.inputRow}>
              <Feather name="lock" size={20} />
              <TextInput
                placeholder="Enter OTP"
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={verifyOtp}>
              <Text style={styles.btnText}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={sendOtp}>
              <Text style={styles.backText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
