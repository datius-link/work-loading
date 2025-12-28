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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../api/api";
import styles from "./styles/serviceProviderStyles";

export default function VerifyResetCode({ navigation, route }) {
  const { identifier } = route.params;
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleVerify = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (code.length !== 6) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }

    try {
      setSuccessMsg("Verifying code...");

      const res = await API.post("/auth/verify-reset-code", {
        identifier,
        code,
      });

      if (res.data.success) {
        setSuccessMsg("Code verified!");

        if (res.data.token) {
          await AsyncStorage.setItem("resetToken", res.data.token);
        }

        navigation.navigate("ResetPassword", { identifier });
      } else {
        setErrorMsg(res.data.message || "Invalid or expired code.");
      }
    } catch (err) {
      setErrorMsg("Server error. Please try again.");
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
          <Text style={styles.title}>Enter Reset Code</Text>

          <Text style={{ textAlign: "center", marginBottom: 20, color: "#777" }}>
            We sent a code to {identifier}
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              placeholder="6-digit code"
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleVerify}>
            <Text style={styles.btnText}>Verify Code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}