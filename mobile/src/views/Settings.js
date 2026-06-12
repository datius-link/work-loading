import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import LoginModal from "./Auth/LoginModal";
import { useUserSession } from "../utils/userSession";
import { api, viewerRequest } from "../api/api";
import Txt from "../Txt";

const DEFAULT_PRIVACY = {
  show_phone_in_jobs: true,
  show_email_in_jobs: false,
  show_socials_in_jobs: false,
  show_public_insights: true,
  show_profile_in_recommendations: false,
};

export default function Settings() {
  const { theme, mode, toggleTheme } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { email, loaded, profile, user, clearSession, refresh } = useUserSession();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const isDark = mode === "dark";
  const nextLanguage = language === "en" ? "sw" : "en";
  const nextLanguageLabel = language === "en" ? "Kiswahili" : "English";

  const visible = (...terms) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return terms.join(" ").toLowerCase().includes(q);
  };

  useEffect(() => {
    const uuid = profile?.uuid || user?.uuid;
    if (!email || !uuid) return;
    api.get(`/profiles/${uuid}`)
      .then((res) => {
        setPrivacy({ ...DEFAULT_PRIVACY, ...(res?.data?.profile?.privacy_settings || {}) });
      })
      .catch(() => {});
  }, [email, profile?.uuid, user?.uuid]);

  const updatePrivacy = async (key, value) => {
    const previous = privacy;
    const next = { ...privacy, [key]: value };
    setPrivacy(next);
    setSavingPrivacy(true);
    try {
      await viewerRequest("put", "/profiles/me", { privacy_settings: next });
    } catch (err) {
      setPrivacy(previous);
      console.log("privacy update error:", err?.response?.data || err?.message);
    } finally {
      setSavingPrivacy(false);
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]} showsVerticalScrollIndicator={false}>
        <Txt en="Settings" sw="Mipangilio" style={styles.title} />

        <View style={styles.searchBox}>
          <AppIcon name="search" size={17} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={language === "sw" ? "Tafuta account, privacy, lugha..." : "Search account, privacy, language..."}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <AppIcon name="close" size={17} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {visible("account login register logout user akaunti ingia jisajili toka") ? (
          <>
            <Section en="Account" sw="Akaunti" styles={styles} />
            <View style={styles.panel}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <AppIcon name={email ? "user" : "lock"} size={19} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  {email ? (
                    <>
                      <Txt en={email} sw={email} style={styles.rowTitle} />
                      <Txt en="User account" sw="Akaunti ya mtumiaji" style={styles.rowBody} />
                    </>
                  ) : (
                    <>
                      <Txt en="Login / Register" sw="Ingia / Jisajili" style={styles.rowTitle} />
                      <Txt en="One account for hiring and work." sw="Akaunti moja kwa kuajiri na kazi." style={styles.rowBody} />
                    </>
                  )}
                </View>
              </View>
              {email ? (
                <TouchableOpacity style={styles.dangerBtn} onPress={() => setShowLogout(true)}>
                  <AppIcon name="logout" size={16} color={theme.colors.danger} />
                  <Txt en="Logout" sw="Toka" style={styles.dangerText} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
                  <AppIcon name="login" size={16} color={theme.colors.onPrimary} />
                  <Txt en="Login / Register" sw="Ingia / Jisajili" style={styles.primaryText} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : null}

        {email && visible("privacy contact phone email socials assigned job faragha simu barua pepe mitandao") ? (
          <>
            <Section en="Privacy" sw="Faragha" styles={styles} />
            <View style={styles.panel}>
              <Txt en="Assigned job contacts" sw="Mawasiliano ya kazi uliyopewa" style={styles.rowTitle} />
              <Txt
                en="These details are only shared inside assigned job screens, never on public profiles."
                sw="Taarifa hizi zinaonekana ndani ya screen ya kazi iliyopewa tu, si kwenye public profile."
                style={styles.rowBody}
              />
              <Divider styles={styles} />
              <PrivacyToggle en="Show phone" sw="Onyesha simu" value={!!privacy.show_phone_in_jobs} disabled={savingPrivacy} onValueChange={(value) => updatePrivacy("show_phone_in_jobs", value)} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <PrivacyToggle en="Show email" sw="Onyesha email" value={!!privacy.show_email_in_jobs} disabled={savingPrivacy} onValueChange={(value) => updatePrivacy("show_email_in_jobs", value)} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <PrivacyToggle en="Show socials" sw="Onyesha mitandao" value={!!privacy.show_socials_in_jobs} disabled={savingPrivacy} onValueChange={(value) => updatePrivacy("show_socials_in_jobs", value)} styles={styles} theme={theme} />
              <PrivacyToggle en="Show public insights" sw="Onyesha maarifa hadharani" value={!!privacy.show_public_insights} disabled={savingPrivacy} onValueChange={(value) => updatePrivacy("show_public_insights", value)} styles={styles} theme={theme} />
              <PrivacyToggle en="Show name in recommendations" sw="Onyesha jina kwenye mapendekezo" value={!!privacy.show_profile_in_recommendations} disabled={savingPrivacy} onValueChange={(value) => updatePrivacy("show_profile_in_recommendations", value)} styles={styles} theme={theme} />
            </View>
          </>
        ) : null}

        {visible("preferences language appearance theme kiswahili english muonekano lugha") ? (
          <>
            <Section en="Preferences" sw="Mapendeleo" styles={styles} />
            <View style={styles.panel}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <AppIcon name="globe" size={19} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Txt en="Language" sw="Lugha" style={styles.rowTitle} />
                  <Txt en={language === "en" ? "English" : "Kiswahili"} sw={language === "en" ? "English" : "Kiswahili"} style={styles.rowBody} />
                </View>
                <TouchableOpacity style={styles.smallBtn} onPress={() => setLanguage(nextLanguage)}>
                  <Txt en={nextLanguageLabel} sw={nextLanguageLabel} style={styles.smallBtnText} />
                </TouchableOpacity>
              </View>
              <Divider styles={styles} />
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <AppIcon name={isDark ? "moon" : "sun"} size={19} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Txt en="Appearance" sw="Muonekano" style={styles.rowTitle} />
                  <Txt en={isDark ? "Dark" : "Light"} sw={isDark ? "Nyeusi" : "Nyepesi"} style={styles.rowBody} />
                </View>
                <View style={styles.modeSwitch}>
                  <TouchableOpacity style={[styles.modeBtn, !isDark && styles.modeActive]} onPress={() => isDark && toggleTheme()}>
                    <Txt en="Light" sw="Nyepesi" style={[styles.modeText, !isDark && styles.modeTextActive]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modeBtn, isDark && styles.modeActive]} onPress={() => !isDark && toggleTheme()}>
                    <Txt en="Dark" sw="Nyeusi" style={[styles.modeText, isDark && styles.modeTextActive]} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {visible("help support msaada profile posts jobs notifications") ? (
          <>
            <Section en="Help" sw="Msaada" styles={styles} />
            <View style={styles.panel}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <AppIcon name="help" size={19} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Txt en="Help Center" sw="Kituo cha Msaada" style={styles.rowTitle} />
                  <Txt en="Get support for account, jobs, profile, posts, and notifications." sw="Pata msaada kuhusu akaunti, kazi, profaili, posts, na notifications." style={styles.rowBody} />
                </View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <LoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={async () => {
          setShowLogin(false);
          await refresh();
        }}
      />
      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.logoutIcon}>
              <AppIcon name="logout" size={22} color={theme.colors.danger} />
            </View>
            <Txt en="Logout" sw="Toka" style={styles.sheetTitle} />
            <Txt en="You will be signed out of this user account. Your jobs and profile will remain saved." sw="Utatoka kwenye akaunti hii. Kazi na profaili yako vitabaki." style={styles.sheetBody} />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogout(false)}>
                <Txt en="Cancel" sw="Ghairi" style={styles.cancelText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={async () => {
                  setShowLogout(false);
                  await clearSession();
                }}
              >
                <Txt en="Logout" sw="Toka" style={styles.confirmText} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ en, sw, styles }) {
  return <Txt en={en} sw={sw} style={styles.section} />;
}

function Divider({ styles }) {
  return <View style={styles.divider} />;
}

function PrivacyToggle({ en, sw, value, disabled, onValueChange, styles, theme }) {
  return (
    <View style={styles.privacyRow}>
      <Txt en={en} sw={sw} style={styles.rowTitle} />
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    content: { padding: theme.spacing.md, gap: 12 },
    title: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
    searchBox: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: "700" },
    section: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: 6 },
    panel: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 10,
      gap: 12,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    rowBody: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: "700" },
    privacyRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    divider: { height: 1, backgroundColor: theme.colors.border },
    primaryBtn: {
      minHeight: 46,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
    dangerBtn: {
      minHeight: 46,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    dangerText: { color: theme.colors.danger, fontWeight: "900" },
    smallBtn: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: theme.colors.primarySoft,
    },
    smallBtnText: { color: theme.colors.primary, fontWeight: "900", fontSize: 12 },
    modeSwitch: {
      flexDirection: "row",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 3,
      backgroundColor: theme.colors.surfaceSoft,
    },
    modeBtn: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 6 },
    modeActive: { backgroundColor: theme.colors.primary },
    modeText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900" },
    modeTextActive: { color: theme.colors.onPrimary },
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
    sheet: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      alignItems: "center",
    },
    logoutIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
      marginBottom: 12,
    },
    sheetTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
    sheetBody: { color: theme.colors.textMuted, textAlign: "center", lineHeight: 20, marginTop: 8 },
    sheetActions: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
    cancelBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: { color: theme.colors.text, fontWeight: "900" },
    confirmBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 8,
      backgroundColor: theme.colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });
