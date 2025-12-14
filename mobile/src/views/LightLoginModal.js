import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export default function LightLoginModal({ visible, onClose, onSuccess }) {
  const [mode, setMode] = useState("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");

  /* ---------------------------
   * PHONE INPUT (same logic as SignUp)
   * --------------------------- */
  const handlePhoneInput = (value) => {
    setPhoneError("");

    const cleaned = value.replace(/\s+/g, "");

    if (!/^\d*$/.test(cleaned)) {
      setPhoneError("Phone number must contain digits only.");
      return;
    }

    if (cleaned.startsWith("0")) {
      setPhoneError("Do not start with 0. Example: 712345678");
    }

    if (cleaned.length > 9) {
      setPhoneError("Phone number must be exactly 9 digits.");
    }

    setPhone(cleaned);
  };

  const isValid =
    mode === "phone"
      ? phone.length === 9 && phoneError === ""
      : email.includes("@") && email.includes(".");

  const handleContinue = () => {
    if (!isValid) return;

    if (mode === "phone") {
      onSuccess({
        contact: "+255" + phone,
        type: "phone",
      });
    } else {
      onSuccess({
        contact: email.toLowerCase(),
        type: "email",
      });
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          {/* HEADER */}
          <Text style={styles.title}>Login lightly before posting a job</Text>
          <Text style={styles.subtitle}>
            This helps service providers contact you
          </Text>

          {/* MODE SWITCH */}
          <View style={styles.switchRow}>
            <TouchableOpacity
              onPress={() => setMode("phone")}
              style={[
                styles.switchBtn,
                mode === "phone" && styles.switchActive,
              ]}
            >
              <Text
                style={[
                  styles.switchText,
                  mode === "phone" && styles.switchTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("email")}
              style={[
                styles.switchBtn,
                mode === "email" && styles.switchActive,
              ]}
            >
              <Text
                style={[
                  styles.switchText,
                  mode === "email" && styles.switchTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* PHONE INPUT (MATCHES SIGN UP) */}
          {mode === "phone" && (
            <>
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+255</Text>

                <View style={styles.inputRowPhone}>
                  <Feather
                    name="phone"
                    size={18}
                    color="#777"
                    style={styles.icon}
                  />
                  <TextInput
                    placeholder="Phone Number"
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={handlePhoneInput}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                </View>
              </View>

              {phoneError !== "" && (
                <Text style={styles.errorText}>{phoneError}</Text>
              )}
            </>
          )}

          {/* EMAIL INPUT */}
          {mode === "email" && (
            <View style={[styles.inputRow, { marginTop: 16 }]}>
              <Feather name="mail" size={18} color="#777" style={styles.icon} />
              <TextInput
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>
          )}

          {/* CONTINUE */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isValid}
            style={[
              styles.continueBtn,
              !isValid && styles.continueDisabled,
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------------------------
 * STYLES
 * --------------------------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },

  /* SWITCH */
  switchRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    padding: 4,
  },

  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  switchActive: {
    backgroundColor: "#fff",
  },

  switchText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777",
  },

  switchTextActive: {
    color: "#0B6B63",
    fontWeight: "800",
  },

  /* PHONE STYLE (FROM SIGN UP) */
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  prefix: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
    color: "#111",
  },

  inputRowPhone: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },

  phoneInput: {
    flex: 1,
    fontSize: 14,
    paddingLeft: 6,
  },

  /* EMAIL INPUT */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },

  input: {
    flex: 1,
    fontSize: 14,
    paddingLeft: 6,
  },

  icon: {
    marginRight: 4,
  },

  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#D32F2F",
  },

  /* BUTTONS */
  continueBtn: {
    marginTop: 20,
    backgroundColor: "#0B6B63",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  continueDisabled: {
    opacity: 0.5,
  },

  continueText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  cancel: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 14,
    color: "#777",
  },
});
