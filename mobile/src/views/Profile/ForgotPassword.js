import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { API } from "../../api/api";
import { Feather } from "@expo/vector-icons";

export default function ForgotPassword({ navigation }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!identifier) {
      Alert.alert("Required", "Enter email or phone number");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/forgot-password", {
        identifier,
      });

      if (!res.data.success) {
        Alert.alert("Error", res.data.message);
        return;
      }

      navigation.navigate("ResetPassword", { identifier });
    } catch (err) {
      Alert.alert("Error", "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email or phone to receive a reset code
      </Text>

      <View style={styles.inputRow}>
        <Feather name="user" size={20} color="#777" />
        <TextInput
          style={styles.input}
          placeholder="Email or phone number"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={handleSendOtp}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? "Sending..." : "Send Code"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F4FFFD",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0B6B63",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#0B6B63",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
