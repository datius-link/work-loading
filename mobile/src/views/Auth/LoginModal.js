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
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { api, getFriendlyApiError } from "../../api/api";
import { saveUserSession } from "../../utils/userSession";
import { useNavigation } from "@react-navigation/native";
import PrivacyPolicy from "../Settings/PrivacyPolicy";
import TermsOfService from "../Settings/TermsOfService";
import { useLanguage } from "../../LanguageContext";

export default function LoginModal({ visible, onClose, onSuccess, initialMode = "login" }) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalScreen, setLegalScreen] = useState(null);
  const dragStartY = React.useRef(0);

  const emailValue = email.trim();
  const emailValid = emailValue.includes("@") && emailValue.includes(".");
  const identifierValid = mode === "login" ? emailValue.length >= 3 : emailValid;
  const codeValid = code.trim().length >= 4;
  const passwordValid = password.length >= 4 && (mode === "login" || password === confirmPassword);
  const authValid = identifierValid && passwordValid && (mode !== "register" || agreedToTerms);

  const reset = () => {
    setMode(initialMode);
    setStep("email");
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setAgreedToTerms(false);
    setLegalScreen(null);
    setLoading(false);
  };

  const switchMode = (nextMode) => {
    if (loading || mode === nextMode) return;
    setMode(nextMode);
    setStep("email");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setAgreedToTerms(false);
  };

  const closeModal = () => {
    reset();
    onClose?.();
  };

  const openForgotPassword = () => {
    const initialEmail = emailValue.includes("@") ? emailValue.toLowerCase() : "";
    reset();
    onClose?.();
    navigation.navigate("ForgotPassword", { email: initialEmail });
  };

  const handleRequestCode = async () => {
    if (!authValid || loading) return;
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post("/auth/viewer/request-code", {
        identifier: emailValue,
        email: emailValue.includes("@") ? emailValue.toLowerCase() : undefined,
        password,
        confirmPassword: mode === "register" ? confirmPassword : undefined,
        mode,
      });
      const token = res?.data?.token;
      if (token) {
        const normalizedEmail = res?.data?.viewer?.email || (emailValue.includes("@") ? emailValue.toLowerCase() : "");
        const session = await saveUserSession({ token, viewer: res?.data?.viewer, email: normalizedEmail });
        console.log("[user LOGIN] mobile success", {
          uuid: session?.profile?.uuid || res?.data?.viewer?.uuid,
          email: normalizedEmail,
        });
        await onSuccess?.({ token, viewer: res?.data?.viewer, session });
        closeModal();
        return;
      }
      if (res?.data?.requiresOtp) setStep("otp");
    } catch (err) {
      setErrorMessage(getFriendlyApiError(err, language));
      console.log("request code error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!codeValid || loading) return;
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post("/auth/viewer/verify", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      const token = res?.data?.token;
      if (!token) return;
      const normalizedEmail = res?.data?.viewer?.email || email.trim().toLowerCase();
      const session = await saveUserSession({ token, viewer: res?.data?.viewer, email: normalizedEmail });
      console.log("[user LOGIN] mobile success", {
        uuid: session?.profile?.uuid || res?.data?.viewer?.uuid,
        email: normalizedEmail,
        verifiedByOtp: true,
      });
      await onSuccess?.({ token, viewer: res?.data?.viewer, session });
      closeModal();
    } catch (err) {
      setErrorMessage(getFriendlyApiError(err, language));
      console.log("verify error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
      {/* This is a Modal — its Android window doesn't inherit the Activity's
         adjustResize behavior, so leaving this undefined on Android (as it
         was before) meant the keyboard could cover the email/password
         inputs. "height" is the pattern already used for the other modal
         sheets in this app (see CreateJobModal.js) and actually works here. */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <View style={styles.modal}>
          <View
            style={styles.handle}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(event) => { dragStartY.current = event.nativeEvent.pageY; }}
            onResponderRelease={(event) => {
              if (event.nativeEvent.pageY - dragStartY.current > 70) closeModal();
            }}
          />
          <View style={styles.iconWrap}>
            <AppIcon name="mail" size={24} color={theme.colors.primary} />
          </View>
          {step === "email" ? (
            <>
              <Txt en="User account" sw="Akaunti ya mtumiaji" style={styles.title} />
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tabBtn, mode === "login" && styles.tabBtnActive]}
                  onPress={() => switchMode("login")}
                  activeOpacity={0.85}
                >
                  <Txt en="Login" sw="Ingia" style={[styles.tabText, mode === "login" && styles.tabTextActive]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, mode === "register" && styles.tabBtnActive]}
                  onPress={() => switchMode("register")}
                  activeOpacity={0.85}
                >
                  <Txt en="Register" sw="Jisajili" style={[styles.tabText, mode === "register" && styles.tabTextActive]} />
                </TouchableOpacity>
              </View>
              <Txt
                en={mode === "login" ? "Login with your email and password." : "Create your user account, then verify OTP."}
                sw={mode === "login" ? "Ingia kwa email na nywila." : "Fungua akaunti yako, kisha thibitisha OTP."}
                style={styles.subtitle}
              />
              <View style={styles.inputRow}>
                <AppIcon name="mail" size={18} color={theme.colors.textMuted} />
                <TextInput
                  placeholder={language === "sw" ? (mode === "login" ? "Email au username" : "Anwani ya email") : (mode === "login" ? "Email or username" : "Email address")}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  keyboardType={mode === "login" ? "default" : "email-address"}
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputRow}>
                <AppIcon name="lock" size={18} color={theme.colors.textMuted} />
                <TextInput
                  placeholder={language === "sw" ? "Nywila" : "Password"}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
              </View>
              {mode === "register" ? (
                <View style={styles.inputRow}>
                  <AppIcon name="lock" size={18} color={theme.colors.textMuted} />
                  <TextInput
                    placeholder={language === "sw" ? "Thibitisha nywila" : "Confirm password"}
                    placeholderTextColor={theme.colors.textVeryMuted}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={styles.input}
                  />
                </View>
              ) : null}
              {mode === "register" && !!confirmPassword && password !== confirmPassword ? (
                <Txt en="Passwords do not match" sw="Nywila hazifanani" style={styles.errorText} />
              ) : null}
              {mode === "register" ? (
                <View style={styles.consentRow}>
                  <TouchableOpacity
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: agreedToTerms }}
                  >
                    {agreedToTerms ? <AppIcon name="check" size={14} color={theme.colors.onPrimary} strokeWidth={2.5} /> : null}
                  </TouchableOpacity>
                  <View style={styles.consentTextWrap}>
                    <Txt en="I agree to the " sw="Nakubali " style={styles.consentText} />
                    <TouchableOpacity onPress={() => setLegalScreen("terms")}>
                      <Txt en="Terms of Service" sw="Masharti ya Huduma" style={styles.legalLink} />
                    </TouchableOpacity>
                    <Txt en=" and " sw=" na " style={styles.consentText} />
                    <TouchableOpacity onPress={() => setLegalScreen("privacy")}>
                      <Txt en="Privacy Policy" sw="Sera ya Faragha" style={styles.legalLink} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
              {!!errorMessage ? (
                <Txt en={errorMessage} sw={errorMessage} style={styles.errorText} />
              ) : null}
              <TouchableOpacity
                onPress={handleRequestCode}
                disabled={!authValid || loading}
                style={[styles.continueBtn, (!authValid || loading) && styles.continueDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Txt
                    en={mode === "login" ? "Login" : "Register"}
                    sw={mode === "login" ? "Ingia" : "Jisajili"}
                    style={styles.continueText}
                  />
                )}
              </TouchableOpacity>
              {mode === "login" ? (
                <TouchableOpacity onPress={openForgotPassword} style={styles.forgotBtn}>
                  <Txt en="Forgot password?" sw="Umesahau nywila?" style={styles.forgotText} />
                </TouchableOpacity>
              ) : null}
            </>
          ) : step === "otp" ? (
            <>
              <Txt en="Enter verification code" sw="Weka code ya uthibitisho" style={styles.title} />
              <Txt en={`Code sent to ${email}`} sw={`Code imetumwa ${email}`} style={styles.subtitle} />
              {!!errorMessage ? (
                <Txt en={errorMessage} sw={errorMessage} style={styles.errorText} />
              ) : null}
              <View style={styles.inputRow}>
                <AppIcon name="shield" size={18} color={theme.colors.textMuted} />
                <TextInput
                  placeholder={language === "sw" ? "Code ya OTP" : "OTP code"}
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
                {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Verify & Continue" sw="Thibitisha" style={styles.continueText} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("email")} style={styles.resendBtn}>
                <Txt en="Change email" sw="Badili email" style={styles.resendText} />
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
            <Txt en="Cancel" sw="Ghairi" style={styles.cancel} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={!!legalScreen} animationType="slide" onRequestClose={() => setLegalScreen(null)}>
      {legalScreen === "terms" ? (
        <TermsOfService onBack={() => setLegalScreen(null)} />
      ) : (
        <PrivacyPolicy onBack={() => setLegalScreen(null)} />
      )}
    </Modal>
    </>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
    modal: { width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: theme.colors.surface, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: theme.colors.border, marginBottom: 12 },
    iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 14, backgroundColor: theme.colors.primarySoft },
    title: { fontSize: 19, fontWeight: "900", color: theme.colors.text },
    tabs: { flexDirection: "row", gap: 6, marginTop: 14, padding: 4, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
    tabBtn: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    tabBtnActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "900" },
    tabTextActive: { color: theme.colors.onPrimary },
    subtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: theme.colors.textMuted },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 12, height: 54, marginTop: 20, backgroundColor: theme.colors.surfaceSoft },
    input: { flex: 1, fontSize: 15, color: theme.colors.text },
    errorText: { marginTop: 10, color: theme.colors.danger, fontSize: 12, fontWeight: "700" },
    consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 14 },
    checkbox: { width: 21, height: 21, borderRadius: 5, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft },
    checkboxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
    consentTextWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    consentText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
    legalLink: { color: theme.colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "900" },
    continueBtn: { marginTop: 18, minHeight: 54, backgroundColor: theme.colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    continueDisabled: { opacity: 0.5 },
    continueText: { color: theme.colors.onPrimary, fontSize: 15, fontWeight: "800" },
    forgotBtn: { alignSelf: "center", paddingVertical: 14, paddingHorizontal: 8 },
    forgotText: { color: theme.colors.primary, fontSize: 14, fontWeight: "800" },
    resendBtn: { marginTop: 16, alignSelf: "center" },
    resendText: { color: theme.colors.primary, fontWeight: "700" },
    cancelBtn: { paddingVertical: 16 },
    cancel: { textAlign: "center", fontSize: 14, fontWeight: "700", color: theme.colors.textMuted },
  });
