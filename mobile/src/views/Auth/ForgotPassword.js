import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import EkaziLogo from "../../../assets/e-kazi-logo.svg";
import { api, getFriendlyApiError } from "../../api/api";
import { useLanguage } from "../../LanguageContext";

export default function ForgotPassword({ navigation, route }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState(route?.params?.email || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const valid = normalizedEmail.includes("@") && normalizedEmail.includes(".");

  const requestReset = async () => {
    if (!valid || loading) return;
    try {
      setLoading(true);
      setMessage("");
      await api.post("/auth/password/forgot", { email: normalizedEmail });
      navigation.navigate("ResetPassword", { email: normalizedEmail });
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
        <Txt en="Forgot password" sw="Umesahau nywila" style={styles.headerTitle} />
        <View style={styles.logoBadge}>
          <EkaziLogo width={18} height={18} />
        </View>
      </View>
      <View style={styles.bodyWrap}>
        <Txt en="Enter your email to receive a reset code." sw="Weka email yako upokee code ya kubadili nywila." style={styles.body} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email address"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        {!!message ? <Text style={styles.message}>{message}</Text> : null}
        <TouchableOpacity style={[styles.primaryBtn, (!valid || loading) && styles.disabled]} disabled={!valid || loading} onPress={requestReset}>
          {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Send reset code" sw="Tuma code" style={styles.primaryText} />}
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
    headerTitle: { flex: 1, color: theme.colors.text, fontSize: 20, fontWeight: "900" },
    logoBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
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
