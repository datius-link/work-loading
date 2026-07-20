import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import EkaziLogo from "../../assets/e-kazi-logo.svg";
import { useUserSession } from "../utils/userSession";
import { api, getFriendlyApiError, viewerRequest } from "../api/api";
import Txt from "../Txt";
import PrivacySettings from "./Settings/PrivacySettings";
import ChangePassword from "./Settings/ChangePassword";
import NotificationSettings, { DEFAULT_NOTIFICATION_SETTINGS } from "./Settings/NotificationSettings";
import HelpCenter from "./Settings/HelpCenter";
import ContactUs from "./Settings/ContactUs";
import PrivacyPolicy from "./Settings/PrivacyPolicy";
import AboutEkazi from "./Settings/AboutEkazi";
import BluetoothShare from "./Settings/BluetoothShare";
import SupportActionSheet from "./Settings/SupportActionSheet";
import UserFeedback from "./Settings/UserFeedback";
import { cachedGet } from "../utils/offlineCache";
import CachedDataNotice from "../components/CachedDataNotice";
import { setCachedNotificationSettings } from "../notifications/notificationSettingsCache";

const DEFAULT_PRIVACY = {
  show_phone_in_jobs: true,
  show_email_in_jobs: false,
  show_socials_in_jobs: false,
  show_public_insights: true,
  show_profile_in_recommendations: false,
  notification_settings: DEFAULT_NOTIFICATION_SETTINGS,
};

const APP_VERSION = "1.0.0";

export default function Settings() {
  const { theme, mode, toggleTheme } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { email, profile, user, clearSession, refresh } = useUserSession();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState("");
  const [activeScreen, setActiveScreen] = useState(route.params?.openScreen || null);
  const [showLogout, setShowLogout] = useState(false);
  const [showSupportActions, setShowSupportActions] = useState(false);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showingCached, setShowingCached] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const isDark = mode === "dark";

  const profileUuid = profile?.uuid || user?.uuid || null;

  const nextLanguage = language === "en" ? "sw" : "en";
  const nextLanguageLabel = language === "en" ? "Kiswahili" : "English";

  const visible = (..._terms) => {
    const q = query.trim().toLowerCase();
    return !q;
  };

  // Allow other screens (e.g. Home's overflow menu) to deep-link straight
  // into a Settings sub-screen via navigation.navigate("Settings", { openScreen: "help" }).
  useEffect(() => {
    if (route.params?.openScreen) setActiveScreen(route.params.openScreen);
  }, [route.params?.openScreen]);

  // Sub-screens here are plain component state, not navigator routes, so the
  // hardware back button would otherwise leave the whole Settings tab (or the
  // app) instead of stepping back to the Settings root. Only intercept while
  // this tab is focused and a sub-screen is open.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (activeScreen) {
          setActiveScreen(null);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [activeScreen])
  );

  useEffect(() => {
    const uuid = profile?.uuid || user?.uuid;
    if (!email || !uuid) return;
    cachedGet(`profile:${uuid}`, () => api.get(`/profiles/${uuid}`).then((res) => res.data))
      .then((result) => {
        const saved = result?.data?.profile?.privacy_settings || {};
        setShowingCached(result.fromCache);
        const mergedNotificationSettings = {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(saved.notification_settings || {}),
        };
        setPrivacy({
          ...DEFAULT_PRIVACY,
          ...saved,
          notification_settings: mergedNotificationSettings,
        });
        setCachedNotificationSettings(mergedNotificationSettings);
      })
      .catch((err) => setSettingsError(getFriendlyApiError(err, language)));
  }, [email, language, profile?.uuid, user?.uuid]);

  const updatePrivacyObject = async (next, previous) => {
    setPrivacy(next);
    if (next?.notification_settings) setCachedNotificationSettings(next.notification_settings);
    setSavingPrivacy(true);
    try {
      setSettingsError("");
      await viewerRequest("put", "/profiles/me", { privacy_settings: next });
    } catch (err) {
      setPrivacy(previous);
      if (previous?.notification_settings) setCachedNotificationSettings(previous.notification_settings);
      setSettingsError(getFriendlyApiError(err, language));
      console.log("privacy update error:", err?.response?.data || err?.message);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const updatePrivacy = (key, value) => {
    const previous = privacy;
    updatePrivacyObject({ ...privacy, [key]: value }, previous);
  };

  const updateNotification = (key, value) => {
    const previous = privacy;
    updatePrivacyObject({
      ...privacy,
      notification_settings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(privacy.notification_settings || {}),
        [key]: value,
      },
    }, previous);
  };

  const openProtected = (screen) => {
    if (!email) {
      navigation.navigate("Login", { onSuccess: async () => { await refresh(); } });
      return;
    }
    setActiveScreen(screen);
  };

  const searchItems = [
    { icon: "lock", en: "Change Password", sw: "Badili Nywila", terms: "change password nywila security usalama", action: () => openProtected("changePassword") },
    { icon: "shield", en: "Privacy", sw: "Faragha", terms: "privacy contacts faragha mawasiliano", action: () => openProtected("privacy") },
    { icon: "bell", en: "Notification Settings", sw: "Mipangilio ya Notifications", terms: "notification messages jobs sound vibration popup ujumbe kazi sauti", action: () => openProtected("notifications") },
    { icon: "globe", en: "Language", sw: "Lugha", terms: "language english swahili kiswahili lugha", action: () => setLanguage(nextLanguage) },
    { icon: isDark ? "moon" : "sun", en: "Theme", sw: "Muonekano", terms: "theme appearance dark light muonekano nyeusi nyepesi", action: toggleTheme },
    { icon: "help", en: "Help", sw: "Msaada", terms: "help faq support msaada", action: () => setActiveScreen("help") },
    { icon: "mail", en: "Contact us", sw: "Wasiliana nasi", terms: "contact us support wasiliana msaada", action: () => openProtected("contact") },
    { icon: "message", en: "Send Feedback", sw: "Tuma Maoni", terms: "feedback suggestion bug maoni pendekezo", action: () => openProtected("feedback") },
    { icon: "warning", en: "Complaints", sw: "Malalamiko", terms: "complaint problem scam fraud harassment fake malalamiko tatizo utapeli unyanyasaji", action: () => email ? setShowSupportActions(true) : navigation.navigate("Login", { onSuccess: async () => { await refresh(); } }) },
    { icon: "file-text", en: "Privacy Policy", sw: "Sera ya Faragha", terms: "legal privacy policy sheria sera faragha", action: () => setActiveScreen("privacyPolicy") },
    { icon: "logo", en: "About Work Loading", sw: "Kuhusu Work Loading", terms: "about version kuhusu toleo", action: () => setActiveScreen("about") },
    { icon: "bluetooth", en: "Bluetooth Share", sw: "Bluetooth Share", terms: "bluetooth share quick share nearby", action: () => setActiveScreen("bluetooth") },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? searchItems.filter((item) => `${item.en} ${item.sw} ${item.terms}`.toLowerCase().includes(normalizedQuery)).slice(0, 7)
    : [];

  if (activeScreen === "changePassword") return <ChangePassword onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "privacy") {
    return <PrivacySettings onBack={() => setActiveScreen(null)} privacy={privacy} saving={savingPrivacy} onChange={updatePrivacy} />;
  }
  if (activeScreen === "notifications") {
    return (
      <NotificationSettings
        onBack={() => setActiveScreen(null)}
        settings={privacy.notification_settings}
        saving={savingPrivacy}
        onChange={updateNotification}
      />
    );
  }
  if (activeScreen === "help") return <HelpCenter onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "contact") return <ContactUs onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "feedback") return <UserFeedback onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "privacyPolicy") return <PrivacyPolicy onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "about") return <AboutEkazi version={APP_VERSION} onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "bluetooth") return <BluetoothShare onBack={() => setActiveScreen(null)} />;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={styles.logoBadge}>
            <EkaziLogo width={20} height={20} />
          </View>
          <Txt en="Settings" sw="Mipangilio" style={styles.title} />
        </View>
        <CachedDataNotice visible={showingCached} />
        {settingsError ? (
          <View style={styles.inlineError}>
            <AppIcon name="warning" size={15} color={theme.colors.danger} />
            <Txt en={settingsError} sw={settingsError} style={styles.inlineErrorText} />
          </View>
        ) : null}

        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={language === "sw" ? "Tafuta mipangilio..." : "Search settings..."}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <AppIcon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {normalizedQuery ? (
          <View style={styles.searchDropdown}>
            {searchResults.length ? searchResults.map((item, index) => (
              <React.Fragment key={item.en}>
                {index ? <View style={styles.searchDivider} /> : null}
                <TouchableOpacity
                  style={styles.searchResult}
                  onPress={() => {
                    setQuery("");
                    item.action();
                  }}
                >
                  <AppIcon name={item.icon} size={16} color={theme.colors.primary} />
                  <Txt en={item.en} sw={item.sw} style={styles.searchResultText} />
                  <AppIcon name="chevron-right" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </React.Fragment>
            )) : (
              <Txt en="No matching settings" sw="Hakuna mipangilio inayolingana" style={styles.noResults} />
            )}
          </View>
        ) : null}

        {visible("bluetooth share offline nearby documents files tuma faili bila mtandao") ? (
          <>
            <Section en="Offline Share" sw="Kutuma Bila Mtandao" styles={styles} />
            <View style={styles.panel}>
              <SettingRow icon="bluetooth" en="Bluetooth Share" sw="Bluetooth Share" bodyEn="Send messages, photos and documents to a nearby phone — no internet needed at all." bodySw="Tuma ujumbe, picha na nyaraka kwa simu ya karibu — bila intaneti kabisa." onPress={() => setActiveScreen("bluetooth")} styles={styles} theme={theme} />
            </View>
          </>
        ) : null}

        {visible("account login register privacy notifications language theme akaunti faragha lugha muonekano") ? (
          <>
            <Section en="Account" sw="Akaunti" styles={styles} />
            <View style={styles.panel}>
              {!email && visible("login register account ingia jisajili akaunti") ? (
                <>
                  <SettingRow icon="login" en="Login / Register" sw="Ingia / Jisajili" bodyEn="One account for hiring and work." bodySw="Akaunti moja kwa kuajiri na kufanya kazi." onPress={() => navigation.navigate("Login", { onSuccess: async () => { await refresh(); } })} styles={styles} theme={theme} />
                  <Divider styles={styles} />
                </>
              ) : null}
              {email && visible("change password nywila security usalama") ? (
                <>
                  <SettingRow icon="lock" en="Change Password" sw="Badili Nywila" bodyEn="Update the password you use to login." bodySw="Sasisha nywila unayotumia kuingia." onPress={() => openProtected("changePassword")} styles={styles} theme={theme} />
                  <Divider styles={styles} />
                </>
              ) : null}
              {visible("privacy contacts faragha mawasiliano") ? (
                <>
                  <SettingRow icon="shield" en="Privacy" sw="Faragha" bodyEn="Job contact and profile visibility." bodySw="Mawasiliano ya kazi na mwonekano wa profaili." onPress={() => openProtected("privacy")} styles={styles} theme={theme} />
                  <Divider styles={styles} />
                </>
              ) : null}
              {visible("notification messages jobs sound vibration popup ujumbe kazi sauti mtetemo") ? (
                <>
                  <SettingRow icon="bell" en="Notification Settings" sw="Mipangilio ya Notifications" bodyEn="Messages, jobs, sound, vibration, and previews." bodySw="Ujumbe, kazi, sauti, mtetemo na previews." onPress={() => openProtected("notifications")} styles={styles} theme={theme} />
                  <Divider styles={styles} />
                </>
              ) : null}
              {visible("language english swahili kiswahili lugha") ? (
                <>
                  <View style={styles.row}>
                    <IconBox name="globe" styles={styles} theme={theme} />
                    <View style={styles.rowText}>
                      <Txt en="Language" sw="Lugha" style={styles.rowTitle} />
                      <Txt en={language === "en" ? "English" : "Kiswahili"} sw={language === "en" ? "English" : "Kiswahili"} style={styles.rowBody} />
                    </View>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => setLanguage(nextLanguage)}>
                      <Txt en={nextLanguageLabel} sw={nextLanguageLabel} style={styles.smallBtnText} />
                    </TouchableOpacity>
                  </View>
                  <Divider styles={styles} />
                </>
              ) : null}
              {visible("theme appearance dark light muonekano nyeusi nyepesi") ? (
                <View style={styles.row}>
                  <IconBox name={isDark ? "moon" : "sun"} styles={styles} theme={theme} />
                  <View style={styles.rowText}>
                    <Txt en="Theme" sw="Muonekano" style={styles.rowTitle} />
                    <Txt en={isDark ? "Dark" : "Light"} sw={isDark ? "Nyeusi" : "Nyepesi"} style={styles.rowBody} />
                  </View>
                  <View style={styles.modeSwitch}>
                    <TouchableOpacity style={[styles.modeBtn, !isDark && styles.modeActive]} onPress={() => isDark && toggleTheme()}>
                      <Txt en="Light" sw="Light" style={[styles.modeText, !isDark && styles.modeTextActive]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modeBtn, isDark && styles.modeActive]} onPress={() => !isDark && toggleTheme()}>
                      <Txt en="Dark" sw="Dark" style={[styles.modeText, isDark && styles.modeTextActive]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {visible("support help contact us feedback complaint problem msaada maoni malalamiko") ? (
          <>
            <Section en="Support" sw="Msaada" styles={styles} />
            <View style={styles.panel}>
              <SettingRow icon="help" en="Help" sw="Msaada" bodyEn="Frequently asked questions." bodySw="Maswali yanayoulizwa mara kwa mara." onPress={() => setActiveScreen("help")} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <SettingRow icon="mail" en="Contact us" sw="Wasiliana nasi" bodyEn="Send a private support message." bodySw="Tuma ujumbe wa faragha wa msaada." onPress={() => openProtected("contact")} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <SettingRow icon="message" en="Send Feedback" sw="Tuma Maoni" bodyEn="Share suggestions or bugs about the app." bodySw="Toa mapendekezo au hitilafu za app." onPress={() => openProtected("feedback")} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <SettingRow icon="warning" en="Complaints" sw="Malalamiko" bodyEn="Report a scam, fake job, harassment, or other problem." bodySw="Ripoti utapeli, kazi bandia, unyanyasaji au tatizo lingine." onPress={() => email ? setShowSupportActions(true) : navigation.navigate("Login", { onSuccess: async () => { await refresh(); } })} styles={styles} theme={theme} />
            </View>
          </>
        ) : null}

        {visible("legal privacy policy sheria sera faragha") ? (
          <>
            <Section en="Legal" sw="Sheria" styles={styles} />
            <View style={styles.panel}>
              <SettingRow icon="file-text" en="Privacy Policy" sw="Sera ya Faragha" bodyEn="How Work Loading handles your information." bodySw="Jinsi Work Loading inavyotumia taarifa zako." onPress={() => setActiveScreen("privacyPolicy")} styles={styles} theme={theme} />
            </View>
          </>
        ) : null}

        {visible("about version bluetooth logout kuhusu toleo toka") ? (
          <>
            <Section en="About" sw="Kuhusu" styles={styles} />
            <View style={styles.panel}>
              <SettingRow icon="logo" en="About Work Loading" sw="Kuhusu Work Loading" bodyEn="Jobs, services, hiring, and trust." bodySw="Kazi, huduma, kuajiri na uaminifu." onPress={() => setActiveScreen("about")} styles={styles} theme={theme} />
              <Divider styles={styles} />
              <View style={styles.row}>
                <IconBox name="file-text" styles={styles} theme={theme} />
                <View style={styles.rowText}><Txt en="App Version" sw="Toleo la App" style={styles.rowTitle} /></View>
                <Txt en={APP_VERSION} sw={APP_VERSION} style={styles.version} />
              </View>
              {email ? (
                <>
                  <Divider styles={styles} />
                  <SettingRow icon="logout" en="Logout" sw="Toka" danger onPress={() => setShowLogout(true)} styles={styles} theme={theme} />
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <SupportActionSheet visible={showSupportActions} onClose={() => setShowSupportActions(false)} initialAction="report" />
      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.logoutIcon}><AppIcon name="logout" size={21} color={theme.colors.danger} /></View>
            <Txt en="Logout" sw="Toka" style={styles.sheetTitle} />
            <Txt en="Your jobs and profile will remain saved." sw="Kazi na profaili yako vitabaki salama." style={styles.sheetBody} />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogout(false)}>
                <Txt en="Cancel" sw="Ghairi" style={styles.cancelText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={async () => {
                  setShowLogout(false);
                  await clearSession();
                  navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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

function IconBox({ name, styles, theme }) {
  return <View style={styles.iconWrap}><AppIcon name={name} size={17} color={theme.colors.primary} /></View>;
}

function SettingRow({ icon, en, sw, bodyEn, bodySw, onPress, danger, styles, theme }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.75}>
      <IconBox name={icon} styles={styles} theme={theme} />
      <View style={styles.rowText}>
        <Txt en={en} sw={sw} style={[styles.rowTitle, danger && { color: theme.colors.danger }]} />
        {bodyEn ? <Txt en={bodyEn} sw={bodySw} style={styles.rowBody} /> : null}
      </View>
      {onPress ? <AppIcon name="chevron-right" size={15} color={danger ? theme.colors.danger : theme.colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    content: { padding: 14, gap: 9 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
    title: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
    searchBox: { height: 41, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 11 },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "700" },
    searchDropdown: { marginTop: -4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, paddingHorizontal: 10, backgroundColor: theme.colors.surface },
    searchResult: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9 },
    searchResultText: { flex: 1, color: theme.colors.text, fontSize: 12.5, fontWeight: "800" },
    searchDivider: { height: 1, marginLeft: 25, backgroundColor: theme.colors.border },
    noResults: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 13 },
    inlineError: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.danger + "55", backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center", gap: 7 },
    inlineErrorText: { flex: 1, color: theme.colors.text, fontSize: 11.5, lineHeight: 16 },
    section: { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: "900", textTransform: "uppercase", marginTop: 5 },
    panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: theme.colors.surface },
    row: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 5 },
    iconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: theme.colors.text, fontSize: 13.5, fontWeight: "900" },
    rowBody: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 1 },
    divider: { height: 1, marginLeft: 43, backgroundColor: theme.colors.border },
    smallBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.colors.primarySoft },
    smallBtnText: { color: theme.colors.primary, fontWeight: "900", fontSize: 11 },
    modeSwitch: { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, padding: 2, backgroundColor: theme.colors.surfaceSoft },
    modeBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
    modeActive: { backgroundColor: theme.colors.primary },
    modeText: { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: "900" },
    modeTextActive: { color: theme.colors.onPrimary },
    version: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
    sheet: { width: "100%", maxWidth: 400, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 18, alignItems: "center" },
    logoutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft, marginBottom: 9 },
    sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    sheetBody: { color: theme.colors.textMuted, textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: 5 },
    sheetActions: { flexDirection: "row", gap: 9, marginTop: 15, width: "100%" },
    cancelBtn: { flex: 1, minHeight: 43, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
    cancelText: { color: theme.colors.text, fontSize: 12, fontWeight: "900" },
    confirmBtn: { flex: 1, minHeight: 43, borderRadius: 9, backgroundColor: theme.colors.danger, alignItems: "center", justifyContent: "center" },
    confirmText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "900" },
  });
