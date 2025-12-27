import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { API } from "../../api/api";

export default function VerifyProvider({ navigation, route }) {
 


  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [info, setInfo] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [cooldown, setCooldown] = useState(0);

  /* -------------------------------
   * BLOCK BACK BUTTON
   * ------------------------------- */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );


  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await API.get("/auth/me");

        setEmail(res.data.email);
        setPhone(res.data.phone.replace("+255", ""));
      } catch (err) {
        Alert.alert("Error", "Failed to load user data");
      }
    };

    loadUser();
  }, []);


  /* -------------------------------
   * PHONE INPUT HANDLER
   * ------------------------------- */
  const handlePhoneInput = (value) => {
    setPhoneError("");
    const cleaned = value.replace(/\s+/g, "");

    if (!/^\d*$/.test(cleaned)) {
      setPhoneError("Digits only.");
      return;
    }
    if (cleaned.startsWith("0")) {
      setPhoneError("Do not start with 0. Example: 712345678");
      return;
    }
    if (cleaned.length > 9) {
      setPhoneError("Phone must be exactly 9 digits.");
      return;
    }

    setPhone(cleaned);
  };

  /* -------------------------------
   * SAVE DETAILS + SEND OTP
   * ------------------------------- */
  const handleSaveContacts = async () => {
    if (!email || phone.length !== 9) {
      Alert.alert("Invalid data", "Check email and phone number.");
      return;
    }

    try {
      setLoading(true);
      setInfo("Saving details...");

      await API.post("/auth/update-service-provider-details", {
        email,
        phone: "+255" + phone,
      });

      setIsEditing(false);
      setPhoneOtp("");
      setEmailOtp("");

      setInfo("Details saved. Sending OTP...");
      await requestOtp(true);
    } catch (err) {
      Alert.alert("Error", "Failed to update details");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------
   * REQUEST OTP
   * ------------------------------- */
  const requestOtp = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      await API.post("/auth/send-verification-otp", {
        email,
        phone: "+255" + phone,
      });

      setCooldown(60);
      setInfo("Verification codes sent.");
    } catch (err) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /* -------------------------------
   * VERIFY OTP
   * ------------------------------- */
  const handleVerify = async () => {
    if (phoneOtp.length !== 6 || emailOtp.length !== 6) {
      Alert.alert("Error", "Enter both OTP codes");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/verify-otp", {
        otpPhone: phoneOtp,
        otpEmail: emailOtp,
      });

      if (!res.data.success) {
        Alert.alert("Verification failed", res.data.message);
        return;
      }

      /**
       * 🔥 THIS IS THE MOST IMPORTANT PART
       * We REMOVE old token and SAVE the NEW one
       */
      await AsyncStorage.multiRemove(["token", "role"]);

      await AsyncStorage.multiSet([
        ["token", res.data.token],
        ["role", "serviceProvider"],
      ]);

      /**
       * OPTIONAL DEBUG (weka mara ya kwanza tu)
       */
      const savedToken = await AsyncStorage.getItem("token");
      console.log("✅ NEW TOKEN SAVED:", savedToken);

      /**
       * RESET navigation → user anaingia app clean
       */
      navigation.reset({
        index: 0,
        routes: [{ name: "ProviderTabs" }],
      });

    } catch (err) {
      console.log("VERIFY ERROR:", err);
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoading(false);
    }
  };


  /* -------------------------------
   * RENDER
   * ------------------------------- */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Confirm your details and enter verification codes
        </Text>

        {/* EMAIL */}
        <View style={styles.section}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.locked]}
            value={email}
            editable={isEditing}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>

        {/* PHONE */}
        <View style={styles.section}>
          <Text style={styles.label}>Phone</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+255</Text>
            <View style={styles.inputRowPhone}>
              <Feather name="phone" size={20} color="#777" />
              <TextInput
                style={[
                  styles.phoneInput,
                  !isEditing && styles.lockedInput,
                ]}
                value={phone}
                editable={isEditing}
                onChangeText={handlePhoneInput}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
          </View>
          {phoneError !== "" && (
            <Text style={styles.errorText}>{phoneError}</Text>
          )}
        </View>

        {/* EDIT / SAVE */}
        {!isEditing ? (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.linkText}>Edit details</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleSaveContacts}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Saving..." : "Save & Send OTP"}
            </Text>
          </TouchableOpacity>
        )}

        {/* REQUEST OTP */}
        <TouchableOpacity
          style={[
            styles.verifyBtn,
            (cooldown > 0 || isEditing) && { opacity: 0.5 },
          ]}
          disabled={cooldown > 0 || loading || isEditing}
          onPress={() => requestOtp()}
        >
          <Text style={styles.btnText}>
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Request OTP"}
          </Text>
        </TouchableOpacity>

        {/* OTP INPUTS */}
        <View style={styles.section}>
          <Text style={styles.label}>Verification Codes</Text>
          <TextInput
            placeholder="Phone OTP"
            style={styles.otp}
            keyboardType="numeric"
            maxLength={6}
            value={phoneOtp}
            editable={!isEditing}
            onChangeText={setPhoneOtp}
          />
          <TextInput
            placeholder="Email OTP"
            style={styles.otp}
            keyboardType="numeric"
            maxLength={6}
            value={emailOtp}
            editable={!isEditing}
            onChangeText={setEmailOtp}
          />
        </View>

        {info !== "" && <Text style={styles.info}>{info}</Text>}

        {/* VERIFY */}
        <TouchableOpacity
          style={[styles.verifyBtn, loading && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={loading || isEditing}
        >
          <Text style={styles.btnText} >
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* -------------------------------
 * STYLES
 * ------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FFFD" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0B6B63",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 32,
  },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFF",
  },
  locked: { backgroundColor: "#F8F8F8", color: "#888" },
  phoneRow: { flexDirection: "row", alignItems: "center" },
  prefix: { fontWeight: "bold", marginRight: 8 },
  inputRowPhone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  phoneInput: { flex: 1, padding: 16 },
  lockedInput: { backgroundColor: "#F8F8F8", color: "#888" },
  errorText: { color: "red", marginTop: 6 },
  linkBtn: { alignSelf: "center", marginBottom: 12 },
  linkText: { color: "#0B6B63", fontWeight: "600" },
  editBtn: {
    backgroundColor: "#FFA726",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  otp: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 8,
  },
  info: { textAlign: "center", marginTop: 12, color: "#007BFF" },
  verifyBtn: {
    marginTop: 24,
    backgroundColor: "#0B6B63",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#FFF", fontWeight: "bold" },
});
