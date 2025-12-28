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

export default function ResetPassword({ navigation, route }) {
  const { identifier, otp } = route.params; // 🔥 IMPORTANT
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setErrorMsg("");

    if (!newPassword || !confirmPassword) {
      return setErrorMsg("Please fill in both fields.");
    }

    if (newPassword !== confirmPassword) {
      return setErrorMsg("Passwords do not match.");
    }

    if (newPassword.length < 6) {
      return setErrorMsg("Password must be at least 6 characters.");
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/reset-password", {
        identifier,
        otp,
        newPassword,
      });

      if (!res.data.success) {
        return setErrorMsg(res.data.message || "Failed to reset password.");
      }

      // ✅ SUCCESS → GO TO LOGIN
      navigation.replace("ServiceProviderLogin");

    } catch (err) {
      setErrorMsg("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Reset Your Password</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="New Password"
              secureTextEntry
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="Confirm New Password"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Resetting..." : "Reset Password"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
