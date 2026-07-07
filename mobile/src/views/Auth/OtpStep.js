import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import Txt from "../../Txt";
import AppIcon from "../../icons/AppIcon";

const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 45;

// Separate screen (not just another form section): large icon, 6 animated
// boxes backed by one invisible input (so paste / SMS autofill still works),
// a resend countdown, and its own primary action — matches the redesign
// spec's "OTP SCREEN" section.
export default function OtpStep({
  theme,
  language,
  email,
  code,
  onChangeCode,
  onSubmit,
  onResend,
  loading,
  resending,
  errorMessage,
}) {
  const inputRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
  const boxScales = useRef(Array.from({ length: OTP_LENGTH }, () => new Animated.Value(1))).current;
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    const len = code.length;
    if (len > prevLengthRef.current && len > 0 && len <= OTP_LENGTH) {
      const idx = len - 1;
      Animated.sequence([
        Animated.spring(boxScales[idx], { toValue: 1.14, useNativeDriver: true, speed: 40, bounciness: 10 }),
        Animated.spring(boxScales[idx], { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }),
      ]).start();
    }
    prevLengthRef.current = len;
  }, [code, boxScales]);

  const handleResendPress = () => {
    if (secondsLeft > 0 || resending) return;
    setSecondsLeft(OTP_RESEND_SECONDS);
    onResend?.();
  };

  const mm = String(Math.floor(Math.max(secondsLeft, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(secondsLeft, 0) % 60).padStart(2, "0");

  return (
    <View style={local.wrap}>
      <View style={[local.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
        <AppIcon name="shield" size={30} color={theme.colors.primary} />
      </View>
      <Txt en="Verify your account" sw="Thibitisha Akaunti" style={[local.title, { color: theme.colors.text }]} />
      <Txt
        en="We sent a code to your email."
        sw="Tumepeleka msimbo kwenye email yako."
        style={[local.subtitle, { color: theme.colors.textMuted }]}
      />
      {!!email ? <Txt en={email} sw={email} style={[local.emailText, { color: theme.colors.text }]} /> : null}

      <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
        <View style={local.boxesRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const filled = code[i];
            return (
              <Animated.View
                key={i}
                style={[
                  local.box,
                  {
                    borderColor: filled ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.surfaceSoft,
                    transform: [{ scale: boxScales[i] }],
                  },
                ]}
              >
                <Txt en={filled || ""} sw={filled || ""} style={[local.boxText, { color: theme.colors.text }]} />
              </Animated.View>
            );
          })}
        </View>
      </TouchableWithoutFeedback>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(text) => onChangeCode(text.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        style={local.hiddenInput}
        autoFocus
        textContentType="oneTimeCode"
      />

      {!!errorMessage ? (
        <Txt en={errorMessage} sw={errorMessage} style={[local.errorText, { color: theme.colors.danger }]} />
      ) : null}

      <Txt
        en={secondsLeft > 0 ? `Resend code in 00:${ss}` : "Didn't get a code?"}
        sw={secondsLeft > 0 ? `Tuma tena baada ya 00:${ss}` : "Hujapokea msimbo?"}
        style={[local.countdown, { color: theme.colors.textMuted }]}
      />
      <TouchableOpacity onPress={handleResendPress} disabled={secondsLeft > 0 || resending} style={local.resendBtn}>
        {resending ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <Txt
            en="Resend code"
            sw="Tuma tena msimbo"
            style={[local.resendText, { color: secondsLeft > 0 ? theme.colors.textVeryMuted : theme.colors.primary }]}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={code.length < OTP_LENGTH || loading}
        style={[
          local.primaryBtn,
          { backgroundColor: theme.colors.primary },
          (code.length < OTP_LENGTH || loading) && local.primaryBtnDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Txt en="Verify" sw="Thibitisha" style={[local.primaryText, { color: theme.colors.onPrimary }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const local = StyleSheet.create({
  wrap: { alignItems: "center", width: "100%" },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, textAlign: "center" },
  emailText: { marginTop: 2, fontSize: 13, fontWeight: "800", textAlign: "center" },
  boxesRow: { flexDirection: "row", gap: 8, marginTop: 26 },
  box: { width: 44, height: 54, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  boxText: { fontSize: 20, fontWeight: "900" },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  errorText: { marginTop: 14, fontSize: 12, fontWeight: "700", textAlign: "center" },
  countdown: { marginTop: 20, fontSize: 12, fontWeight: "600" },
  resendBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 8, minHeight: 32, justifyContent: "center" },
  resendText: { fontSize: 13, fontWeight: "800" },
  primaryBtn: { marginTop: 16, minHeight: 54, width: "100%", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryText: { fontSize: 15, fontWeight: "800" },
});
