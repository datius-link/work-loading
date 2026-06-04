import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { api } from "../../api/api";

export default function LightLoginModal({ visible, onClose, onSuccess }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = email.includes("@") && email.includes(".");
  const codeValid = code.trim().length >= 4;

  const reset = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setLoading(false);
  };

  const closeModal = () => {
    reset();
    onClose?.();
  };

  const handleRequestCode = async () => {
    if (!emailValid || loading) return;
    try {
      setLoading(true);
      await api.post("/auth/viewer/request-code", { email: email.trim().toLowerCase() });
      setStep("otp");
    } catch (err) {
      console.log("request code error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!codeValid || loading) return;
    try {
      setLoading(true);
      const res = await api.post("/auth/viewer/verify", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      const token = res?.data?.token;
      if (!token) return;
      await AsyncStorage.setItem("viewer_token", token);
      onSuccess?.({ token, viewer: res?.data?.viewer });
      closeModal();
    } catch (err) {
      console.log("verify error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconWrap}>
            <AppIcon name="mail" size={24} color={theme.colors.primary} />
          </View>
          {step === "email" ? (
            <>
              <Txt en="Continue with email" sw="Endelea kwa email" style={styles.title} />
              <Txt en="We'll send a one-time verification code." sw="Tutakutumia code ya uthibitisho." style={styles.subtitle} />
              <View style={styles.inputRow}>
                <AppIcon name="mail" size={18} color={theme.colors.textMuted} />
                <TextInput
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.textVeryMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </View>
              <TouchableOpacity
                onPress={handleRequestCode}
                disabled={!emailValid || loading}
                style={[styles.continueBtn, (!emailValid || loading) && styles.continueDisabled]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Txt en="Continue" sw="Endelea" style={styles.continueText} />}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Txt en="Enter verification code" sw="Weka code ya uthibitisho" style={styles.title} />
              <Txt en={`Code sent to ${email}`} sw={`Code imetumwa ${email}`} style={styles.subtitle} />
              <View style={styles.inputRow}>
                <AppIcon name="shield" size={18} color={theme.colors.textMuted} />
                <TextInput
                  placeholder="OTP code"
                  placeholderTextColor={theme.colors.textVeryMuted}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  style={styles.input}
                />
              </View>
              <TouchableOpacity
                onPress={handleVerify}
                disabled={!codeValid || loading}
                style={[styles.continueBtn, (!codeValid || loading) && styles.continueDisabled]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Txt en="Verify & Continue" sw="Thibitisha" style={styles.continueText} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("email")} style={styles.resendBtn}>
                <Txt en="Change email" sw="Badili email" style={styles.resendText} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
            <Txt en="Cancel" sw="Ghairi" style={styles.cancel} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
    modal: { width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: theme.colors.surface, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 14, backgroundColor: theme.colors.primarySoft },
    title: { fontSize: 19, fontWeight: "900", color: theme.colors.text },
    subtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: theme.colors.textMuted },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 12, height: 54, marginTop: 20, backgroundColor: theme.colors.surfaceSoft },
    input: { flex: 1, fontSize: 15, color: theme.colors.text },
    continueBtn: { marginTop: 18, minHeight: 54, backgroundColor: theme.colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    continueDisabled: { opacity: 0.5 },
    continueText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    resendBtn: { marginTop: 16, alignSelf: "center" },
    resendText: { color: theme.colors.primary, fontWeight: "700" },
    cancelBtn: { paddingVertical: 16 },
    cancel: { textAlign: "center", fontSize: 14, fontWeight: "700", color: theme.colors.textMuted },
  });