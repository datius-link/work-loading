import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import EkaziLogo from "../../../assets/e-kazi-logo.svg";
import { Banner, Toast } from "../../components/Message";
import { api, getFriendlyApiError } from "../../api/api";
import { saveUserSession } from "../../utils/userSession";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../LanguageContext";
import { useNetworkStatus } from "../../utils/network";

// Full-screen auth (assignment: LoginActivity / Sign_up_Activity). No modal,
// no biometrics — just the form, a server+database connectivity check before
// login is allowed, and a single identifier field that adapts to whatever
// the user typed (phone number vs. email/username) instead of showing two
// separate inputs at once.

function isPhoneLike(value) {
  const v = String(value || "").trim();
  return v.length > 0 && /^[+0-9][\d\s-]*$/.test(v) && /\d/.test(v);
}

// Loose E.164-ish normalizer: keeps an explicit "+" country code as-is,
// otherwise assumes a Tanzanian local number (leading 0 dropped, +255 added)
// — good enough for identifying an existing account, the server is the
// source of truth for whether the number is real.
function toE164Loose(value) {
  const raw = String(value || "").trim().replace(/[\s-]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.replace(/^0+/, "");
  return local ? `+255${local}` : "";
}

export default function AuthScreen({
  initialMode = "login",
  onClose,
  onSuccess,
  onSwitchScreen,
}) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [mode] = useState(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null); // { type, text }
  // The login gate is DEVICE connectivity (WiFi/mobile data via NetInfo),
  // NOT backend health: when the free-tier server is asleep or down, telling
  // the user "no internet connection" is a lie — their phone is online. If
  // the device is connected we let the attempt through and the API's own
  // errors (timeout, 5xx) surface with honest messages instead.
  const { isOffline, isConnected } = useNetworkStatus();
  const connStatus = isConnected === null ? "checking" : isOffline ? "offline" : "online";
  const [connAnnounce, setConnAnnounce] = useState(null); // { id, type, text, persistent }
  const prevConnStatus = useRef(connStatus);

  useEffect(() => {
    if (connStatus === "checking") return;
    if (connStatus === "online" && prevConnStatus.current !== "online") {
      setConnAnnounce({
        id: Date.now(),
        type: "success",
        text: language === "sw" ? "Umeunganishwa" : "Connected",
        persistent: false,
      });
    } else if (connStatus === "offline") {
      setConnAnnounce({
        id: Date.now(),
        type: "error",
        text: language === "sw" ? "Hakuna muunganisho" : "No internet connection",
        persistent: true,
      });
    }
    prevConnStatus.current = connStatus;
  }, [connStatus, language]);

  const identifierIsPhone = isPhoneLike(identifier);
  const identifierValue = mode === "login" ? identifier.trim() : email.trim();
  const emailValue = email.trim();
  const emailValid = emailValue.includes("@") && emailValue.includes(".");
  const identifierValid = mode === "login" ? identifierValue.length >= 3 : emailValid;
  const passwordValid = password.length >= 4 && (mode === "login" || password === confirmPassword);
  const authValid = identifierValid && passwordValid;

  // Login/Register is usually the first screen the app lands on when there's
  // no session (see AuthLoading), so there is nothing to "go back" to after
  // a successful sign-in — land on the tabs directly instead.
  const goToApp = () => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  // React Navigation v7 navigate() always pushes a new screen; this guard
  // keeps a double-tap (or re-entry) from stacking the same screen twice.
  const pushOnce = (name, params) => {
    const routes = navigation.getState()?.routes || [];
    if (routes[routes.length - 1]?.name === name) return;
    navigation.navigate(name, params);
  };

  const openForgotPassword = () => {
    const initialEmail = emailValue.includes("@") ? emailValue.toLowerCase() : "";
    pushOnce("ForgotPassword", { email: initialEmail });
  };

  const requestCodePayload = () => ({
    identifier: mode === "login" ? (identifierIsPhone ? toE164Loose(identifier) : identifier.trim()) : emailValue,
    email: mode === "login" ? (identifier.includes("@") ? identifier.trim().toLowerCase() : undefined) : emailValue.toLowerCase(),
    password,
    confirmPassword: mode === "register" ? confirmPassword : undefined,
    mode,
  });

  const handleRequestCode = async () => {
    if (!authValid || loading) return;
    // Only a device with no WiFi/mobile data is blocked — "you are offline"
    // is shown exclusively when the user is actually offline.
    if (connStatus === "offline") {
      setErrorMessage(
        language === "sw"
          ? "Uko offline. Washa WiFi au data kisha ujaribu tena."
          : "You are offline. Turn on WiFi or mobile data and try again."
      );
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post("/auth/viewer/request-code", requestCodePayload());
      const token = res?.data?.token;
      if (token) {
        const normalizedEmail = res?.data?.viewer?.email || (identifier.includes("@") ? identifier.trim().toLowerCase() : emailValue.toLowerCase());
        await saveUserSession({
          token,
          viewer: res?.data?.viewer,
          email: normalizedEmail,
          remember: mode === "register" ? true : rememberMe,
        });
        setToastMessage({ type: "success", text: language === "sw" ? "Karibu!" : "Welcome!" });
        await onSuccess?.({ token, viewer: res?.data?.viewer });
        setTimeout(goToApp, 700);
        return;
      }
      // No OTP step: a fresh registration is created ready-to-use, so send
      // the user straight to Login instead of an email verification screen.
      if (res?.data?.registered) {
        setToastMessage({ type: "success", text: language === "sw" ? "Akaunti imetengenezwa. Ingia sasa." : "Account created. Please login." });
        setTimeout(() => (onSwitchScreen ? onSwitchScreen() : navigation.replace("Login")), 900);
      }
    } catch (err) {
      setErrorMessage(getFriendlyApiError(err, language));
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = () => (
    <>
      <View style={styles.inputRow}>
        <AppIcon name="lock" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder={language === "sw" ? "Nywila" : "Password"}
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name={showPassword ? "eyeOff" : "eye"} size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
      {mode === "register" && !!password && password.length < 4 ? (
        <Txt en="Password must be at least 4 characters" sw="Nywila lazima iwe angalau herufi 4" style={styles.hintText} />
      ) : null}
    </>
  );

  const renderLoginContent = () => (
    <>
      <View style={styles.inputRow}>
        <AppIcon name={identifierIsPhone ? "phone" : "mail"} size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder={language === "sw" ? "Email, namba ya simu, au username" : "Email, phone number, or username"}
          placeholderTextColor={theme.colors.textVeryMuted}
          autoCapitalize="none"
          keyboardType={identifierIsPhone ? "phone-pad" : "default"}
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
        />
      </View>
      {renderPasswordField()}
      <View style={styles.metaRow}>
        <TouchableOpacity onPress={openForgotPassword}>
          <Txt en="Forgot password?" sw="Umesahau nywila?" style={styles.forgotText} />
        </TouchableOpacity>
      </View>
      <Banner type="error" text={errorMessage} />
      <TouchableOpacity
        onPress={handleRequestCode}
        disabled={!authValid || loading}
        style={[styles.continueBtn, (!authValid || loading) && styles.continueDisabled]}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Login" sw="Ingia" style={styles.continueText} />}
      </TouchableOpacity>
    </>
  );

  const renderRegisterContent = () => (
    <>
      <View style={styles.inputRow}>
        <AppIcon name="mail" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder={language === "sw" ? "Anwani ya email" : "Email address"}
          placeholderTextColor={theme.colors.textVeryMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>
      {renderPasswordField()}
      <View style={styles.inputRow}>
        <AppIcon name="lock" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder={language === "sw" ? "Thibitisha nywila" : "Confirm password"}
          placeholderTextColor={theme.colors.textVeryMuted}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name={showConfirmPassword ? "eyeOff" : "eye"} size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
      {!!confirmPassword && password !== confirmPassword ? (
        <Txt en="Passwords do not match" sw="Nywila hazifanani" style={styles.mismatchText} />
      ) : null}
      {/* Terms/Privacy are informational links only — reading them is never
          required to create an account. */}
      <View style={styles.consentTextWrap}>
        <Txt en="By continuing you agree to our " sw="Kwa kuendelea unakubali " style={styles.consentText} />
        <TouchableOpacity onPress={() => pushOnce("Terms")}>
          <Txt en="Terms of Service" sw="Masharti ya Huduma" style={styles.legalLink} />
        </TouchableOpacity>
        <Txt en=" and " sw=" na " style={styles.consentText} />
        <TouchableOpacity onPress={() => pushOnce("Privacy")}>
          <Txt en="Privacy Policy" sw="Sera ya Faragha" style={styles.legalLink} />
        </TouchableOpacity>
        <Txt en="." sw="." style={styles.consentText} />
      </View>
      <Banner type="error" text={errorMessage} />
      <TouchableOpacity
        onPress={handleRequestCode}
        disabled={!authValid || loading}
        style={[styles.continueBtn, (!authValid || loading) && styles.continueDisabled]}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Register" sw="Jisajili" style={styles.continueText} />}
      </TouchableOpacity>
    </>
  );

  // Android already resizes the window for the keyboard (app.json sets
  // softwareKeyboardLayoutMode: "resize"); stacking KeyboardAvoidingView's
  // "height" behavior on top of that double-shrinks the view and exposes a
  // white strip of bare window under the themed background. Only iOS needs
  // the manual "padding" adjustment.
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screenRoot}>
      <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.screenHeader}>
          <EkaziLogo width={36} height={36} />
        </View>

        <Txt en={mode === "login" ? "Welcome Back" : "Create Account"} sw={mode === "login" ? "Karibu Tena" : "Fungua Akaunti"} style={styles.title} />
        <Txt
          en={mode === "login" ? "Sign in to continue." : "Join Work Loading today."}
          sw={mode === "login" ? "Ingia ili kuendelea." : "Jiunge na Work Loading leo."}
          style={styles.subtitle}
        />
        {mode === "login" ? renderLoginContent() : renderRegisterContent()}
        {onSwitchScreen ? (
          <TouchableOpacity onPress={onSwitchScreen} style={styles.footerSwitch}>
            <Txt
              en={mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
              sw={mode === "login" ? "Huna akaunti? Jisajili" : "Una akaunti tayari? Ingia"}
              style={styles.forgotText}
            />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <Toast
        key={connAnnounce?.id || "none"}
        visible={!!connAnnounce}
        type={connAnnounce?.type}
        text={connAnnounce?.text}
        persistent={connAnnounce?.persistent}
        position="top"
        onHide={() => setConnAnnounce(null)}
      />
      <Toast visible={!!toastMessage} type={toastMessage?.type} text={toastMessage?.text} onHide={() => setToastMessage(null)} />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screenRoot: { flex: 1, backgroundColor: theme.colors.surface },
    screenScroll: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: (Platform.OS === "ios" ? 54 : 34) + 8,
    },
    screenHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    title: { fontSize: 24, fontWeight: "900", color: theme.colors.text, marginTop: 18, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, fontWeight: "500", color: theme.colors.textMuted, marginTop: 4 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 54,
      marginTop: 14,
      backgroundColor: theme.colors.surfaceSoft,
    },
    input: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: "500", paddingVertical: 4 },
    hintText: { marginTop: 8, color: theme.colors.textMuted, fontSize: 12, fontWeight: "500", paddingLeft: 4 },
    mismatchText: { marginTop: 8, color: theme.colors.danger, fontSize: 12, fontWeight: "700", paddingLeft: 4 },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 12, paddingHorizontal: 4 },
    consentTextWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
    consentText: { color: theme.colors.textMuted, fontSize: 12.5, lineHeight: 20, fontWeight: "500" },
    legalLink: {
      color: theme.colors.primary,
      fontSize: 12.5,
      lineHeight: 20,
      fontWeight: "800",
      textDecorationLine: "underline",
      textDecorationColor: theme.colors.primarySoft,
    },
    continueBtn: {
      marginTop: 20,
      minHeight: 56,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 5,
    },
    continueDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    continueText: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
    forgotText: { color: theme.colors.primary, fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
    footerSwitch: { alignSelf: "center", paddingVertical: 16, marginTop: 6 },
  });
