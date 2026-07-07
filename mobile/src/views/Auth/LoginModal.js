import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { api, getFriendlyApiError, viewerRequest } from "../../api/api";
import { getUserSession, saveUserSession } from "../../utils/userSession";
import { useNavigation } from "@react-navigation/native";
import PrivacyPolicy from "../Settings/PrivacyPolicy";
import TermsOfService from "../Settings/TermsOfService";
import { useLanguage } from "../../LanguageContext";
import OtpStep from "./OtpStep";
import { getDeviceId, getDeviceName } from "../../utils/deviceId";
import {
  isBiometricModuleAvailable,
  isBiometricHardwareReady,
  biometricLabel,
  getSupportedBiometricKinds,
  isBiometricBoundToProfile,
  getBiometricBinding,
  clearBiometricBinding,
  setBiometricLoginEnabled,
  promptBiometricUnlock,
} from "../../utils/biometricAuth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function normalizeDialCode(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  return digits ? `+${digits}` : "";
}

function normalizeLocalPhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
}

function toE164(dialCode, localPhone) {
  const code = normalizeDialCode(dialCode);
  const local = normalizeLocalPhone(localPhone);
  if (!local || !code) return "";
  const combined = `${code}${local}`;
  return /^\+[1-9]\d{6,14}$/.test(combined) ? combined : "";
}

// Small reusable "feels alive" wrapper: scales down on press with a spring,
// and fires a light haptic — used for every primary/important tap target in
// this modal instead of the plain TouchableOpacity dim effect.
function ScaleButton({ onPress, disabled, style, children, haptic = true }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  const handlePress = () => {
    if (!disabled && haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={handlePress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// The "Biometric Authentication Card" — shows only the side(s) the device
// actually supports (never an option the hardware doesn't have), with a
// glass-blur background, a slow pulse on the fingerprint icon, and a soft
// glow behind Face ID, per the redesign spec.
function BiometricCard({ theme, kinds, status, onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.35)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.75, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // "Imekubali" (accepted) → green check pops in. "Imefeli" (failed) → the
  // whole card shakes and flashes red. Both fade back out once the parent
  // resets status to "idle" (or, on success, the modal moves on entirely).
  useEffect(() => {
    if (status === "error") {
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -6, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 6, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
    if (status === "success" || status === "error") {
      feedbackOpacity.setValue(0);
      feedbackScale.setValue(0.6);
      Animated.parallel([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(feedbackScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]).start();
    } else {
      feedbackOpacity.setValue(0);
    }
  }, [status, shakeX, feedbackOpacity, feedbackScale]);

  const pressIn = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };

  const showBoth = kinds.hasFingerprint && kinds.hasFaceId;
  const busy = status === "checking";
  const isSuccess = status === "success";
  const isError = status === "error";
  const borderColor = isSuccess ? theme.colors.success : isError ? theme.colors.danger : theme.colors.border;

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }, { translateX: shakeX }], marginTop: 22, width: "100%" }}>
      <Pressable onPress={handlePress} onPressIn={pressIn} onPressOut={pressOut} disabled={busy || isSuccess}>
        <View style={[cardStyles.card, { borderColor, backgroundColor: theme.colors.surfaceSoft }, theme.shadow.card]}>
          <BlurView intensity={35} tint={theme.mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={cardStyles.row}>
            {kinds.hasFingerprint ? (
              <Animated.View style={[cardStyles.side, { transform: [{ scale: pulse }] }]}>
                <AppIcon name="fingerprint" size={26} color={theme.colors.primary} />
                <Txt en="Use Fingerprint" sw="Tumia Fingerprint" style={[cardStyles.sideTitle, { color: theme.colors.text }]} />
                <Txt en="Tap to sign in fast" sw="Gusa ili kuingia haraka" style={[cardStyles.sideSubtitle, { color: theme.colors.textMuted }]} />
              </Animated.View>
            ) : null}
            {showBoth ? <View style={[cardStyles.sep, { backgroundColor: theme.colors.border }]} /> : null}
            {kinds.hasFaceId ? (
              <View style={cardStyles.side}>
                <Animated.View style={[cardStyles.glow, { opacity: glow, backgroundColor: theme.colors.primarySoft }]} />
                <AppIcon name="faceId" size={26} color={theme.colors.primary} />
                <Txt en="Use Face ID" sw="Tumia Face ID" style={[cardStyles.sideTitle, { color: theme.colors.text }]} />
                <Txt en="Look at the camera" sw="Tazama kamera ili kuingia" style={[cardStyles.sideSubtitle, { color: theme.colors.textMuted }]} />
              </View>
            ) : null}
            {busy ? <ActivityIndicator style={cardStyles.spinner} color={theme.colors.primary} /> : null}
          </View>
          {isSuccess || isError ? (
            <Animated.View
              pointerEvents="none"
              style={[
                cardStyles.feedbackOverlay,
                {
                  opacity: feedbackOpacity,
                  backgroundColor: isSuccess ? theme.colors.successSoft : theme.colors.dangerSoft,
                  transform: [{ scale: feedbackScale }],
                },
              ]}
            >
              <AppIcon
                name={isSuccess ? "check" : "close"}
                size={30}
                color={isSuccess ? theme.colors.success : theme.colors.danger}
                strokeWidth={3}
              />
            </Animated.View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function LoginModal({ visible, onClose, onSuccess, initialMode = "login" }) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState("auth"); // auth | otp | biometric-offer | success
  const [dialCode, setDialCode] = useState("+255");
  const [localPhone, setLocalPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalScreen, setLegalScreen] = useState(null);
  const [biometricLabelText, setBiometricLabelText] = useState(Platform.OS === "ios" ? "Face ID" : "Fingerprint");
  const [biometricKinds, setBiometricKinds] = useState({ hasFingerprint: false, hasFaceId: false });
  const [biometricOfferBusy, setBiometricOfferBusy] = useState(false);
  const [biometricHardwareReady, setBiometricHardwareReady] = useState(false);
  const [biometricEnabledOnDevice, setBiometricEnabledOnDevice] = useState(false);
  const [quickBiometricAvailable, setQuickBiometricAvailable] = useState(false);
  const [biometricAttemptStatus, setBiometricAttemptStatus] = useState("idle"); // idle | checking | success | error
  const [showBiometricHint, setShowBiometricHint] = useState(false);
  const [pendingBiometricProfileUuid, setPendingBiometricProfileUuid] = useState(null);
  const [tabsWidth, setTabsWidth] = useState(0);
  const dragStartY = useRef(0);
  const dragStartX = useRef(0);
  const segAnim = useRef(new Animated.Value(initialMode === "login" ? 0 : 1)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const errorFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Animated modal entrance
  useEffect(() => {
    if (visible) {
      modalTranslateY.setValue(SCREEN_HEIGHT * 0.3);
      modalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(modalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 8,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Segmented control: 250ms-ish spring slide + content crossfade whenever
  // the Ingia/Jisajili tab changes.
  useEffect(() => {
    Animated.spring(segAnim, { toValue: mode === "login" ? 0 : 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    contentFade.setValue(0);
    Animated.timing(contentFade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [mode, segAnim, contentFade]);

  useEffect(() => {
    if (errorMessage) {
      errorFade.setValue(0);
      Animated.timing(errorFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [errorMessage, errorFade]);

  useEffect(() => {
    if (step === "success") {
      successScale.setValue(0);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }
  }, [step, successScale]);

  // Whenever this modal opens on the login tab, check right there (in-app,
  // via the OS biometric prompt we trigger ourselves — not some external
  // screen) whether this device already has biometric login switched on for
  // a remembered account, so we can offer a "Tap to login with Face
  // ID/Fingerprint" shortcut the same way returning-user apps (banking apps,
  // Selcom, etc.) do on their PIN screen.
  //
  // The card itself shows as soon as the phone has biometrics set up at the
  // OS level (biometricHardwareReady) — we never enroll fingerprints/face
  // ourselves, only the phone does that, so hardware+enrollment being ready
  // is all we require to surface the option. Whether tapping it can actually
  // sign someone in (quickBiometricAvailable) additionally needs biometric
  // login switched on in-app AND a remembered session to unlock.
  useEffect(() => {
    if (!visible || mode !== "login") {
      setBiometricHardwareReady(false);
      setQuickBiometricAvailable(false);
      setBiometricEnabledOnDevice(false);
      setShowBiometricHint(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const [modAvailable, ready, label, kinds, session] = await Promise.all([
          isBiometricModuleAvailable(),
          isBiometricHardwareReady(),
          biometricLabel(),
          getSupportedBiometricKinds(),
          getUserSession(),
        ]);
        if (cancelled) return;
        const sessionProfileUuid = session?.profile?.uuid || session?.user?.uuid || null;
        // "enabled" here means bound to the account currently sitting in
        // storage, not just switched on for whoever last used it — biometric
        // trust is exclusive per device, one account at a time.
        const enabled = await isBiometricBoundToProfile(sessionProfileUuid);
        if (cancelled) return;
        setBiometricLabelText(label);
        setBiometricKinds(kinds);
        const hardwareReady = !!(modAvailable && ready && (kinds.hasFingerprint || kinds.hasFaceId));
        setBiometricHardwareReady(hardwareReady);
        setBiometricEnabledOnDevice(!!(hardwareReady && enabled));
        setQuickBiometricAvailable(!!(hardwareReady && enabled && session?.isLoggedIn));
      } catch (_err) {
        if (!cancelled) {
          setBiometricHardwareReady(false);
          setQuickBiometricAvailable(false);
          setBiometricEnabledOnDevice(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, mode]);

  const emailValue = email.trim();
  const emailValid = emailValue.includes("@") && emailValue.includes(".");
  const phoneE164 = toE164(dialCode, localPhone);
  const loginIdentifierValue = mode === "login" ? (phoneE164 || emailValue) : emailValue;
  const identifierValid = mode === "login" ? loginIdentifierValue.length >= 3 : emailValid;
  const codeValid = code.trim().length >= 4;
  const passwordValid = password.length >= 4 && (mode === "login" || password === confirmPassword);
  const authValid = identifierValid && passwordValid && (mode !== "register" || agreedToTerms);

  const reset = () => {
    setMode(initialMode);
    setStep("auth");
    setDialCode("+255");
    setLocalPhone("");
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRememberMe(true);
    setErrorMessage("");
    setAgreedToTerms(false);
    setLegalScreen(null);
    setLoading(false);
    setResending(false);
    setBiometricOfferBusy(false);
    setBiometricAttemptStatus("idle");
    setBiometricEnabledOnDevice(false);
    setShowBiometricHint(false);
  };

  // After a real credential login/registration succeeds, offer to switch this
  // device to biometric sign-in — but only if the hardware actually supports
  // it (whatever the phone has: Face ID, fingerprint, or Android face unlock;
  // expo-local-authentication auto-detects which one, no per-platform branching
  // needed) and THIS profile isn't already bound, so we don't nag every login.
  const maybeOfferBiometric = async (profileUuid) => {
    try {
      if (!isBiometricModuleAvailable() || !profileUuid) return false;
      const [ready, alreadyBound] = await Promise.all([isBiometricHardwareReady(), isBiometricBoundToProfile(profileUuid)]);
      if (!ready || alreadyBound) return false;
      setBiometricLabelText(await biometricLabel());
      return true;
    } catch (_err) {
      return false;
    }
  };

  // Shared tail end of every successful sign-in path: fire onSuccess so the
  // rest of the app updates immediately, show a brief success checkmark
  // (matches the spec's "success checkmark animation after login"), then
  // either offer to enable biometrics or just close.
  const finishLogin = async ({ token, viewer, session, skipBiometricOffer = false }) => {
    const profileUuid = session?.profile?.uuid || session?.user?.uuid || viewer?.uuid || null;
    // Biometric is per-device, not per-identity: it can only ever prove
    // "someone who can unlock this phone", never which e-kazi account they
    // meant. So if a DIFFERENT account was biometric-bound on this device,
    // that binding is now stale/wrong the moment a new account logs in —
    // clear it silently rather than letting the old owner's biometric still
    // appear to work here.
    if (profileUuid) {
      const existingBinding = await getBiometricBinding();
      if (existingBinding?.profileUuid && existingBinding.profileUuid !== profileUuid) {
        await clearBiometricBinding();
      }
    }
    setPendingBiometricProfileUuid(profileUuid);
    await onSuccess?.({ token, viewer, session });
    setStep("success");
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (!skipBiometricOffer && (await maybeOfferBiometric(profileUuid))) {
      setStep("biometric-offer");
    } else {
      closeModal();
    }
  };

  // Drives the card's own "accepted" (green check, then proceed into the
  // login) or "failed" (shake + red X, stay put, allow retry) feedback — the
  // OS biometric prompt itself gives no visual continuity with our UI, so
  // this closes that gap.
  const handleQuickBiometricLogin = async () => {
    if (biometricAttemptStatus === "checking") return;
    setBiometricAttemptStatus("checking");
    setErrorMessage("");
    try {
      const confirmed = await promptBiometricUnlock(`Login to e-kazi with ${biometricLabelText}`);
      if (!confirmed) {
        // Spec: on failure/cancel, stay on the login screen and allow retry —
        // never silently drop them or auto-switch to password.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setBiometricAttemptStatus("error");
        setErrorMessage(language === "sw" ? "Imeshindikana. Jaribu tena." : "That didn't work. Please try again.");
        setTimeout(() => setBiometricAttemptStatus("idle"), 900);
        return;
      }
      const session = await getUserSession();
      if (!session?.isLoggedIn) {
        // Device flag says biometric is on, but the remembered session is
        // gone (e.g. a full logout happened elsewhere) — fall back to
        // password right here instead of pretending it worked.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setBiometricAttemptStatus("error");
        setQuickBiometricAvailable(false);
        setErrorMessage(
          language === "sw"
            ? "Muda wa kikao umeisha. Tafadhali ingia kwa nywila."
            : "Your session has expired. Please login with your password."
        );
        setTimeout(() => setBiometricAttemptStatus("idle"), 900);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setBiometricAttemptStatus("success");
      // Let the green check land on the card for a beat before the whole
      // modal moves into the bigger "Welcome!" success screen.
      await new Promise((resolve) => setTimeout(resolve, 480));
      await finishLogin({ token: session.token, viewer: session.user, session, skipBiometricOffer: true });
    } catch (_err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setBiometricAttemptStatus("error");
      setErrorMessage(language === "sw" ? "Hitilafu imetokea. Jaribu tena." : "Something went wrong. Please try again.");
      setTimeout(() => setBiometricAttemptStatus("idle"), 900);
    }
  };

  // The card is visible whenever the phone itself has biometrics set up —
  // but an actual login attempt should only fire when there is a remembered
  // session to unlock (quickBiometricAvailable). Checking biometricEnabledOnDevice
  // here instead was the real bug behind "always fails": that flag can be
  // true (switched on for a previous session) with no session currently
  // stored — e.g. after a real logout, or while just browsing as a guest —
  // and every attempt would then deterministically hit the "no session"
  // failure, no matter how many times it's retried. Route those cases to the
  // explanatory hint instead of a doomed login attempt.
  const handleBiometricButtonPress = () => {
    if (quickBiometricAvailable) {
      handleQuickBiometricLogin();
      return;
    }
    setShowBiometricHint(true);
  };

  const handleEnableBiometric = async () => {
    if (biometricOfferBusy) return;
    setBiometricOfferBusy(true);
    try {
      const confirmed = await promptBiometricUnlock(`Enable ${biometricLabelText} for e-kazi`);
      if (confirmed && pendingBiometricProfileUuid) {
        await setBiometricLoginEnabled(true, pendingBiometricProfileUuid);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Best-effort server sync — enforces "one account per device" on the
        // backend too, and automatically revokes any other account's trust
        // for this exact device. Never blocks the UI.
        (async () => {
          try {
            const deviceId = await getDeviceId();
            await viewerRequest("post", "/devices/trust", { device_id: deviceId, device_name: getDeviceName() });
          } catch (_err) {
            // ignore — device trust sync is best-effort
          }
        })();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } finally {
      closeModal();
    }
  };

  const switchMode = (nextMode) => {
    if (loading || mode === nextMode) return;
    setMode(nextMode);
    setStep("auth");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage("");
    setAgreedToTerms(false);
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.spring(modalTranslateY, {
        toValue: SCREEN_HEIGHT * 0.3,
        useNativeDriver: true,
        speed: 16,
        bounciness: 8,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      reset();
      onClose?.();
    });
  };

  const openForgotPassword = () => {
    const initialEmail = emailValue.includes("@") ? emailValue.toLowerCase() : "";
    closeModal();
    setTimeout(() => {
      navigation.navigate("ForgotPassword", { email: initialEmail });
    }, 300);
  };

  const requestCodePayload = () => ({
    identifier: loginIdentifierValue,
    email: emailValue.includes("@") ? emailValue.toLowerCase() : undefined,
    password,
    confirmPassword: mode === "register" ? confirmPassword : undefined,
    mode,
  });

  const handleRequestCode = async () => {
    if (!authValid || loading) return;
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post("/auth/viewer/request-code", requestCodePayload());
      const token = res?.data?.token;
      if (token) {
        const normalizedEmail = res?.data?.viewer?.email || (emailValue.includes("@") ? emailValue.toLowerCase() : "");
        const session = await saveUserSession({
          token,
          viewer: res?.data?.viewer,
          email: normalizedEmail,
          remember: mode === "register" ? true : rememberMe,
        });
        console.log("[user LOGIN] mobile success", {
          uuid: session?.profile?.uuid || res?.data?.viewer?.uuid,
          email: normalizedEmail,
        });
        await finishLogin({ token, viewer: res?.data?.viewer, session });
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

  const handleResendOtp = async () => {
    if (resending) return;
    setResending(true);
    setErrorMessage("");
    try {
      await api.post("/auth/viewer/request-code", requestCodePayload());
      setCode("");
    } catch (err) {
      setErrorMessage(getFriendlyApiError(err, language));
    } finally {
      setResending(false);
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
      const session = await saveUserSession({
        token,
        viewer: res?.data?.viewer,
        email: normalizedEmail,
        remember: mode === "register" ? true : rememberMe,
      });
      console.log("[user LOGIN] mobile success", {
        uuid: session?.profile?.uuid || res?.data?.viewer?.uuid,
        email: normalizedEmail,
        verifiedByOtp: true,
      });
      await finishLogin({ token, viewer: res?.data?.viewer, session });
    } catch (err) {
      setErrorMessage(getFriendlyApiError(err, language));
      console.log("verify error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const segIndicatorWidth = tabsWidth ? (tabsWidth - 8) / 2 : 0;

  const renderLoginContent = () => (
    <>
      {biometricHardwareReady ? (
        <>
          <BiometricCard theme={theme} kinds={biometricKinds} status={biometricAttemptStatus} onPress={handleBiometricButtonPress} />
          {showBiometricHint && !quickBiometricAvailable ? (
            <Txt
              en={
                biometricEnabledOnDevice
                  ? `${biometricLabelText} is on, but there's no signed-in session to unlock right now. Login with your password to continue.`
                  : `${biometricLabelText} is set up on your phone, but not turned on for e-kazi yet. Login with your password once, then turn it on in Settings.`
              }
              sw={
                biometricEnabledOnDevice
                  ? `${biometricLabelText} imewashwa, lakini hakuna kikao kilichoingia cha kufungua sasa hivi. Ingia kwa nywila yako kuendelea.`
                  : `${biometricLabelText} imeshawekwa kwenye simu yako, ila haijawashwa kwa e-kazi bado. Ingia kwa nywila yako mara moja, kisha uiwashe kwenye Mipangilio.`
              }
              style={styles.biometricHintText}
            />
          ) : null}
          <View style={styles.orDividerRow}>
            <View style={styles.orDividerLine} />
            <Txt en="or continue manually" sw="au endelea kwa mikono" style={styles.orDividerText} />
            <View style={styles.orDividerLine} />
          </View>
        </>
      ) : null}
      <View style={styles.phoneRow}>
        <View style={[styles.inputRow, styles.dialCodeRow]}>
          <TextInput
            placeholder="+255"
            placeholderTextColor={theme.colors.textVeryMuted}
            keyboardType="phone-pad"
            value={dialCode}
            onChangeText={(text) => setDialCode(normalizeDialCode(text))}
            style={styles.input}
          />
          <Txt en="▾" sw="▾" style={styles.dialChevron} />
        </View>
        <View style={[styles.inputRow, styles.phoneNumberRow]}>
          <AppIcon name="phone" size={18} color={theme.colors.textMuted} />
          <TextInput
            placeholder={language === "sw" ? "Namba ya simu" : "Phone number"}
            placeholderTextColor={theme.colors.textVeryMuted}
            keyboardType="phone-pad"
            value={localPhone}
            onChangeText={(text) => setLocalPhone(normalizeLocalPhone(text))}
            style={styles.input}
          />
        </View>
      </View>
      <View style={styles.miniDividerRow}>
        <View style={styles.miniDividerLine} />
        <Txt en="or" sw="au" style={styles.miniDividerText} />
        <View style={styles.miniDividerLine} />
      </View>
      <View style={styles.inputRow}>
        <AppIcon name="mail" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder={language === "sw" ? "Email au username" : "Email or username"}
          placeholderTextColor={theme.colors.textVeryMuted}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>
      {renderPasswordField()}
      <View style={styles.metaRow}>
        <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.8}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe ? <AppIcon name="check" size={12} color={theme.colors.onPrimary} strokeWidth={3} /> : null}
          </View>
          <Txt en="Remember me" sw="Nikumbuke" style={styles.rememberText} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openForgotPassword}>
          <Txt en="Forgot password?" sw="Umesahau nywila?" style={styles.forgotText} />
        </TouchableOpacity>
      </View>
      {renderError()}
      <ScaleButton
        onPress={handleRequestCode}
        disabled={!authValid || loading}
        style={[styles.continueBtn, (!authValid || loading) && styles.continueDisabled]}
      >
        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Login" sw="Ingia" style={styles.continueText} />}
      </ScaleButton>
    </>
  );

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

  const renderError = () =>
    !!errorMessage ? (
      <Animated.View style={{ opacity: errorFade }}>
        <Txt en={errorMessage} sw={errorMessage} style={styles.errorText} />
      </Animated.View>
    ) : null;

  const renderRegisterContent = () => (
    <>
      <View style={styles.onboardWrap}>
        <View style={styles.onboardIconWrap}>
          <AppIcon name="plusUser" size={26} color={theme.colors.accent} />
        </View>
        <Txt
          en="Create your account, then verify OTP"
          sw="Fungua akaunti yako kisha thibitisha OTP"
          style={styles.onboardText}
        />
      </View>
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
        <Txt en="Passwords do not match" sw="Nywila hazifanani" style={styles.errorText} />
      ) : null}
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
      {renderError()}
      <ScaleButton
        onPress={handleRequestCode}
        disabled={!authValid || loading}
        style={[styles.continueBtn, (!authValid || loading) && styles.continueDisabled]}
      >
        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Register" sw="Jisajili" style={styles.continueText} />}
      </ScaleButton>
    </>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
          <BlurView
            intensity={Platform.OS === "ios" ? 30 : 20}
            tint={theme.mode === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]} pointerEvents="none" />
          
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: modalTranslateY }],
                opacity: modalOpacity,
              }
            ]}
          >
            <View 
              style={styles.modal}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                dragStartY.current = event.nativeEvent.pageY;
                dragStartX.current = event.nativeEvent.pageX;
              }}
              onResponderMove={(event) => {
                const dy = event.nativeEvent.pageY - dragStartY.current;
                if (dy > 0) {
                  modalTranslateY.setValue(dy);
                }
              }}
              onResponderRelease={(event) => {
                const dy = event.nativeEvent.pageY - dragStartY.current;
                if (dy > 80) {
                  closeModal();
                } else {
                  Animated.spring(modalTranslateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    speed: 16,
                    bounciness: 8,
                  }).start();
                }
              }}
            >
              {/* Pull handle with improved design */}
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
                <View style={styles.handleGlow} />
              </View>
              
              <View style={styles.headerRow}>
                <View style={styles.headerIconWrap}>
                  <Image source={require("../../../assets/icon.png")} style={styles.headerIconImg} />
                </View>
                <View style={{ flex: 1 }} />
                <ScaleButton onPress={closeModal} haptic={false} style={styles.closeBtn}>
                  <AppIcon name="close" size={16} color={theme.colors.textMuted} />
                </ScaleButton>
              </View>

              {step === "auth" ? (
                <>
                  <Txt en="User account" sw="Akaunti ya mtumiaji" style={styles.title} />
                  <View style={styles.tabs} onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.tabIndicator,
                        {
                          width: segIndicatorWidth,
                          transform: [
                            {
                              translateX: segAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, segIndicatorWidth],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode("login")} activeOpacity={0.85}>
                      <Txt en="Login" sw="Ingia" style={[styles.tabText, mode === "login" && styles.tabTextActive]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode("register")} activeOpacity={0.85}>
                      <Txt en="Register" sw="Jisajili" style={[styles.tabText, mode === "register" && styles.tabTextActive]} />
                    </TouchableOpacity>
                  </View>
                  <Animated.View style={{ opacity: contentFade, width: "100%" }}>
                    {mode === "login" ? renderLoginContent() : renderRegisterContent()}
                  </Animated.View>
                </>
              ) : step === "otp" ? (
                <OtpStep
                  theme={theme}
                  language={language}
                  email={email}
                  code={code}
                  onChangeCode={setCode}
                  onSubmit={handleVerify}
                  onResend={handleResendOtp}
                  loading={loading}
                  resending={resending}
                  errorMessage={errorMessage}
                />
              ) : step === "biometric-offer" ? (
                <View style={{ alignItems: "center", width: "100%" }}>
                  <View style={styles.offerIconWrap}>
                    <AppIcon name="fingerprint" size={30} color={theme.colors.primary} />
                  </View>
                  <Txt
                    en="Enable Fingerprint or Face ID?"
                    sw="Je, ungependa kuwezesha Fingerprint au Face ID?"
                    style={[styles.title, { textAlign: "center" }]}
                  />
                  <Txt
                    en="Sign in instantly next time, without typing your password."
                    sw="Ingia papo hapo wakati mwingine, bila kuandika nywila."
                    style={[styles.subtitle, { textAlign: "center" }]}
                  />
                  <Txt
                    en={`Anyone who can unlock this phone with ${biometricLabelText} will also be able to open this account. Only one account can have this on per phone.`}
                    sw={`Mtu yeyote anayeweza kufungua simu hii kwa ${biometricLabelText} ataweza pia kufungua akaunti hii. Akaunti moja tu inaweza kuwa nayo kwa wakati mmoja kwenye simu hii.`}
                    style={styles.biometricHintText}
                  />
                  <ScaleButton
                    onPress={handleEnableBiometric}
                    disabled={biometricOfferBusy}
                    style={[styles.continueBtn, biometricOfferBusy && styles.continueDisabled]}
                  >
                    {biometricOfferBusy ? (
                      <ActivityIndicator color={theme.colors.onPrimary} />
                    ) : (
                      <Txt en="Enable" sw="Washa" style={styles.continueText} />
                    )}
                  </ScaleButton>
                  <TouchableOpacity onPress={closeModal} style={styles.forgotBtn} disabled={biometricOfferBusy}>
                    <Txt en="Later" sw="Baadaye" style={styles.forgotText} />
                  </TouchableOpacity>
                </View>
              ) : step === "success" ? (
                <View style={{ alignItems: "center", width: "100%", paddingVertical: 24 }}>
                  <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
                    <AppIcon name="check" size={34} color={theme.colors.success} strokeWidth={3} />
                  </Animated.View>
                  <Txt en="Welcome!" sw="Karibu!" style={[styles.title, { marginTop: 16 }]} />
                </View>
              ) : null}
            </View>
          </Animated.View>
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

const cardStyles = StyleSheet.create({
  card: { 
    borderRadius: 24, 
    borderWidth: 1.5, 
    padding: 18, 
    overflow: "hidden",
    borderColor: "transparent",
  },
  row: { flexDirection: "row", alignItems: "center" },
  side: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 6 },
  sideTitle: { fontSize: 14, fontWeight: "800", marginTop: 6, letterSpacing: -0.3 },
  sideSubtitle: { fontSize: 11, fontWeight: "500", textAlign: "center", opacity: 0.8 },
  sep: { width: 1.5, alignSelf: "stretch", marginVertical: 4 },
  glow: { position: "absolute", width: 50, height: 50, borderRadius: 25, top: -10 },
  spinner: { position: "absolute", right: 8, top: 8 },
  feedbackOverlay: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    alignItems: "center", 
    justifyContent: "center", 
    borderRadius: 24 
  },
});

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    modalContainer: {
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    modal: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      ...theme.shadow.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 20,
    },
    handleWrapper: {
      alignItems: "center",
      paddingVertical: 8,
      position: "relative",
    },
    handle: { 
      width: 48, 
      height: 5, 
      borderRadius: 3, 
      backgroundColor: theme.colors.border,
      opacity: 0.6,
    },
    handleGlow: {
      position: "absolute",
      top: 4,
      width: 60,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
      opacity: 0.05,
    },
    headerRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    headerIconWrap: { 
      width: 44, 
      height: 44, 
      borderRadius: 22, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: theme.colors.primarySoft,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerIconImg: { width: 44, height: 44, resizeMode: "cover" },
    closeBtn: { 
      width: 36, 
      height: 36, 
      borderRadius: 18, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    offerIconWrap: { 
      width: 64, 
      height: 64, 
      borderRadius: 32, 
      alignItems: "center", 
      justifyContent: "center", 
      marginBottom: 16, 
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    successCircle: { 
      width: 72, 
      height: 72, 
      borderRadius: 36, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: theme.colors.successSoft,
      borderWidth: 2,
      borderColor: theme.colors.success,
    },
    title: { 
      fontSize: 22, 
      fontWeight: "900", 
      color: theme.colors.text, 
      marginTop: 2,
      letterSpacing: -0.5,
    },
    tabs: { 
      flexDirection: "row", 
      gap: 0, 
      marginTop: 18, 
      padding: 4, 
      borderRadius: theme.radius.md, 
      borderWidth: 1.5, 
      borderColor: theme.colors.border, 
      backgroundColor: theme.colors.surfaceSoft,
      position: "relative",
    },
    tabIndicator: { 
      position: "absolute", 
      left: 4, 
      top: 4, 
      bottom: 4, 
      borderRadius: theme.radius.sm, 
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    tabBtn: { 
      flex: 1, 
      minHeight: 44, 
      borderRadius: theme.radius.sm, 
      alignItems: "center", 
      justifyContent: "center",
      zIndex: 1,
    },
    tabText: { 
      color: theme.colors.textMuted, 
      fontSize: 14, 
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    tabTextActive: { 
      color: theme.colors.onPrimary,
      fontWeight: "800",
    },
    subtitle: { 
      marginTop: 8, 
      fontSize: 14, 
      lineHeight: 22, 
      color: theme.colors.textMuted,
      letterSpacing: 0.2,
    },
    inputRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 10, 
      borderWidth: 1.5, 
      borderColor: theme.colors.border, 
      borderRadius: theme.radius.md, 
      paddingHorizontal: 14, 
      height: 56, 
      marginTop: 14, 
      backgroundColor: theme.colors.surfaceSoft,
      transition: "all 0.2s",
    },
    input: { 
      flex: 1, 
      fontSize: 15, 
      color: theme.colors.text,
      fontWeight: "500",
      paddingVertical: 4,
    },
    phoneRow: { flexDirection: "row", gap: 10 },
    dialCodeRow: { width: 96 },
    dialChevron: { color: theme.colors.textMuted, fontSize: 11, marginLeft: -4 },
    phoneNumberRow: { flex: 1 },
    miniDividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
    miniDividerLine: { flex: 1, height: 1.5, backgroundColor: theme.colors.border },
    miniDividerText: { 
      color: theme.colors.textMuted, 
      fontSize: 12, 
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    biometricHintText: { 
      marginTop: 12, 
      fontSize: 12, 
      lineHeight: 18, 
      textAlign: "center", 
      color: theme.colors.textMuted, 
      paddingHorizontal: 8,
      opacity: 0.8,
    },
    orDividerRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 12, 
      marginTop: 20,
      marginBottom: 4,
    },
    orDividerLine: { flex: 1, height: 1.5, backgroundColor: theme.colors.border },
    orDividerText: { 
      color: theme.colors.textMuted, 
      fontSize: 12, 
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    errorText: { 
      marginTop: 12, 
      color: theme.colors.danger, 
      fontSize: 13, 
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    hintText: { 
      marginTop: 8, 
      color: theme.colors.textMuted, 
      fontSize: 12, 
      fontWeight: "500",
      paddingLeft: 4,
    },
    metaRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      justifyContent: "space-between", 
      marginTop: 16,
      paddingHorizontal: 4,
    },
    rememberRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 10,
    },
    rememberText: { 
      color: theme.colors.textMuted, 
      fontSize: 13, 
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    onboardWrap: { alignItems: "center", marginBottom: 6 },
    onboardIconWrap: { 
      width: 58, 
      height: 58, 
      borderRadius: 29, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: theme.colors.accentSoft, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    onboardText: { 
      fontSize: 14, 
      lineHeight: 20, 
      color: theme.colors.textMuted, 
      textAlign: "center", 
      paddingHorizontal: 16,
      fontWeight: "500",
    },
    consentRow: { 
      flexDirection: "row", 
      alignItems: "flex-start", 
      gap: 10, 
      marginTop: 18,
      paddingHorizontal: 4,
    },
    checkbox: { 
      width: 22, 
      height: 22, 
      borderRadius: 6, 
      borderWidth: 2, 
      borderColor: theme.colors.border, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: theme.colors.surfaceSoft,
      marginTop: 1,
    },
    checkboxChecked: { 
      borderColor: theme.colors.primary, 
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    consentTextWrap: { 
      flex: 1, 
      flexDirection: "row", 
      flexWrap: "wrap", 
      alignItems: "center",
      lineHeight: 20,
    },
    consentText: { 
      color: theme.colors.textMuted, 
      fontSize: 12.5, 
      lineHeight: 20,
      fontWeight: "500",
    },
    legalLink: { 
      color: theme.colors.primary, 
      fontSize: 12.5, 
      lineHeight: 20, 
      fontWeight: "800",
      textDecorationLine: "underline",
      textDecorationColor: theme.colors.primarySoft,
    },
    continueBtn: { 
      marginTop: 22, 
      minHeight: 58, 
      backgroundColor: theme.colors.primary, 
      borderRadius: theme.radius.md, 
      alignItems: "center", 
      justifyContent: "center",
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    continueDisabled: { opacity: 0.5, shadowOpacity: 0 },
    continueText: { 
      color: theme.colors.onPrimary, 
      fontSize: 16, 
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    forgotBtn: { 
      alignSelf: "center", 
      paddingVertical: 16, 
      paddingHorizontal: 12,
      marginTop: 4,
    },
    forgotText: { 
      color: theme.colors.primary, 
      fontSize: 14, 
      fontWeight: "800",
      letterSpacing: 0.2,
    },
  });