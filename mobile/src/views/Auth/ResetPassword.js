import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { api, getFriendlyApiError } from "../../api/api";
import { useLanguage } from "../../LanguageContext";

export default function ResetPassword({ navigation, route }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email] = useState(route?.params?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const passwordValid = password.length >= 4 && password === confirmPassword;
  const valid = email && code.trim().length >= 4 && passwordValid;

  const resetPassword = async () => {
    if (!valid || loading) return;
    try {
      setLoading(true);
      setMessage("");
      const verify = await api.post("/auth/password/verify-code", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      await api.post("/auth/password/reset", {
        resetToken: verify?.data?.resetToken,
        password,
      });
      navigation.navigate("Login");
    } catch (err) {
      setMessage(getFriendlyApiError(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <Txt en="Reset password" sw="Badili nywila" style={styles.headerTitle} />
      </View>
      <View style={styles.bodyWrap}>
        <Txt en={`Code sent to ${email}`} sw={`Code imetumwa ${email}`} style={styles.body} />
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="Reset code"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm password"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        {!!confirmPassword && password !== confirmPassword ? (
          <Txt en="Passwords do not match" sw="Nywila hazifanani" style={styles.message} />
        ) : null}
        {!!message ? <Text style={styles.message}>{message}</Text> : null}
        <TouchableOpacity style={[styles.primaryBtn, (!valid || loading) && styles.disabled]} disabled={!valid || loading} onPress={resetPassword}>
          {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Reset password" sw="Badili nywila" style={styles.primaryText} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.spacing.md },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
    },
    headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
    bodyWrap: { paddingTop: 16, gap: 12 },
    body: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
    input: {
      minHeight: 50,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 14,
    },
    message: { color: theme.colors.danger, fontSize: 13, fontWeight: "800" },
    primaryBtn: {
      minHeight: 50,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    disabled: { opacity: 0.5 },
    primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });
