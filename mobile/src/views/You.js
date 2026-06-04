import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext"; // adjust import to your actual context
import AppIcon from "../icons/AppIcon";

export default function You() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme, isDark } = useAppTheme();
  const { language, setLanguage } = useLanguage(); // "en" | "sw"
  const styles = createStyles(theme);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + theme.spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page header ── */}
      <View style={styles.topRow}>
        <Txt en="You" sw="Wewe" style={styles.pageTitle} />
        <Txt
          en="Manage your account & preferences."
          sw="Simamia akaunti na mipangilio yako."
          style={styles.pageSubtitle}
        />
      </View>

      {/* ── Preferences section ── */}
      <View style={styles.sectionHeader}>
        <AppIcon name="settings" size={15} color={theme.colors.textMuted} />
        <Txt en="Preferences" sw="Mipangilio" style={styles.sectionLabel} />
      </View>

      <View style={styles.settingsGroup}>
        {/* Language card */}
        <View style={styles.settingCard}>
          <View style={styles.settingCardTop}>
            <View style={styles.settingIconWrap}>
              <AppIcon name="globe" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.settingCardText}>
              <Txt en="Language" sw="Lugha" style={styles.settingTitle} />
              <Txt
                en="Switch between English and Swahili"
                sw="Badilisha kati ya Kiingereza na Kiswahili"
                style={styles.settingDesc}
              />
            </View>
            <View style={styles.tagWrap}>
              <Txt
                en={language === "en" ? "EN" : "SW"}
                sw={language === "sw" ? "SW" : "EN"}
                style={styles.tagText}
              />
            </View>
          </View>

          <View style={styles.langToggleRow}>
            <TouchableOpacity
              style={[
                styles.langBtn,
                language === "en" && styles.langBtnActive,
              ]}
              onPress={() => setLanguage("en")}
              activeOpacity={0.8}
            >
              <Txt en="English" sw="English" style={[
                styles.langBtnText,
                language === "en" && styles.langBtnTextActive,
              ]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langBtn,
                language === "sw" && styles.langBtnActive,
              ]}
              onPress={() => setLanguage("sw")}
              activeOpacity={0.8}
            >
              <Txt en="Kiswahili" sw="Kiswahili" style={[
                styles.langBtnText,
                language === "sw" && styles.langBtnTextActive,
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme card */}
        <View style={styles.settingCard}>
          <View style={styles.settingCardTop}>
            <View style={styles.settingIconWrap}>
              <AppIcon
                name={isDark ? "moon" : "sun"}
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.settingCardText}>
              <Txt en="Appearance" sw="Muonekano" style={styles.settingTitle} />
              <Txt
                en="Choose light or dark mode"
                sw="Chagua hali nyepesi au nyeusi"
                style={styles.settingDesc}
              />
            </View>
            <View style={[
              styles.tagWrap,
              isDark && styles.tagWrapDark,
            ]}>
              <Txt
                en={isDark ? "Dark" : "Light"}
                sw={isDark ? "Nyeusi" : "Nyepesi"}
                style={[
                  styles.tagText,
                  isDark && styles.tagTextDark,
                ]}
              />
            </View>
          </View>

          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                !isDark && styles.themeBtnActive,
              ]}
              onPress={() => isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <AppIcon
                name="sun"
                size={16}
                color={!isDark ? theme.colors.primary : theme.colors.textMuted}
              />
              <Txt
                en="Light"
                sw="Nyepesi"
                style={[
                  styles.themeBtnText,
                  !isDark && styles.themeBtnTextActive,
                ]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                isDark && styles.themeBtnActive,
              ]}
              onPress={() => !isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <AppIcon
                name="moon"
                size={16}
                color={isDark ? theme.colors.primary : theme.colors.textMuted}
              />
              <Txt
                en="Dark"
                sw="Nyeusi"
                style={[
                  styles.themeBtnText,
                  isDark && styles.themeBtnTextActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Account section ── */}
      <View style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
        <AppIcon name="shield" size={15} color={theme.colors.textMuted} />
        <Txt en="Account" sw="Akaunti" style={styles.sectionLabel} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <AppIcon name="shield" size={28} color={theme.colors.primary} />
        </View>
        <Txt
          en="You are browsing as a guest"
          sw="Unavinjari kama mgeni"
          style={styles.heroTitle}
        />
        <Txt
          en="Explore service providers freely. When you're ready to hire, we only ask for your email so the provider can reach you."
          sw="Gundua watoa huduma bila vikwazo. Ukiwa tayari kuajiri, tunaomba email yako tu ili mtoa huduma akuwasiliane nawe."
          style={styles.heroBody}
        />
      </View>

      <View style={styles.infoGrid}>
        <InfoCard
          icon="mail"
          titleEn="Light authentication"
          titleSw="Uthibitisho mwepesi"
          bodyEn="For people hiring providers. We only collect your email so the provider can contact you about the job."
          bodySw="Kwa watu wanaoajiri watoa huduma. Tunachukua email tu ili mtoa huduma akupate kuhusu kazi."
          theme={theme}
        />
        <InfoCard
          icon="plusUser"
          titleEn="Full provider account"
          titleSw="Akaunti kamili ya mtoa huduma"
          bodyEn="For service providers. Create an account, verify your email, complete your profile, post work, and receive requests."
          bodySw="Kwa watoa huduma. Fungua akaunti, thibitisha email, kamilisha profile yako, post kazi, na upokee maombi."
          theme={theme}
        />
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderLogin")}
          activeOpacity={0.88}
        >
          <AppIcon name="login" size={22} color={theme.colors.onPrimary} />
          <View style={styles.actionTextWrap}>
            <Txt
              en="Login as Service Provider"
              sw="Ingia kama Mtoa Huduma"
              style={styles.primaryText}
            />
            <Txt
              en="Already have a full provider account"
              sw="Una akaunti kamili ya mtoa huduma tayari"
              style={styles.subTextLight}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderSignUp")}
          activeOpacity={0.88}
        >
          <AppIcon name="plusUser" size={22} color={theme.colors.primary} />
          <View style={styles.actionTextWrap}>
            <Txt
              en="Become a Service Provider"
              sw="Kuwa Mtoa Huduma"
              style={styles.secondaryText}
            />
            <Txt
              en="Create a provider account and build your work profile"
              sw="Fungua akaunti na anza kujenga profile yako ya kazi"
              style={styles.subTextDark}
            />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoCard({ icon, titleEn, titleSw, bodyEn, bodySw, theme }) {
  const styles = createInfoCardStyles(theme);
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={20} color={theme.colors.primary} />
      </View>
      <Txt en={titleEn} sw={titleSw} style={styles.title} />
      <Txt en={bodyEn} sw={bodySw} style={styles.body} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.bg,
    },
    container: {
      width: "100%",
      maxWidth: 820,
      alignSelf: "center",
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },

    // Header
    topRow: {
      marginBottom: theme.spacing.lg,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: "900",
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      marginTop: 4,
      fontSize: 14,
      color: theme.colors.textMuted,
      fontWeight: "500",
    },

    // Section labels
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },

    // Settings group
    settingsGroup: {
      gap: theme.spacing.sm,
    },

    // Individual setting card
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
      ...theme.shadow.soft,
    },
    settingCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    settingIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
    },
    settingCardText: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.text,
    },
    settingDesc: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
      fontWeight: "500",
    },

    // Tag badge
    tagWrap: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.colors.primary + "40",
    },
    tagWrapDark: {
      backgroundColor: "rgba(255,255,255,0.06)",
      borderColor: "rgba(255,255,255,0.12)",
    },
    tagText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.primary,
      letterSpacing: 0.5,
    },
    tagTextDark: {
      color: theme.colors.textSecondary,
    },

    // Language toggle row
    langToggleRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    langBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    langBtnActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    langBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    langBtnTextActive: {
      color: theme.colors.primary,
    },

    // Theme toggle row
    themeToggleRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    themeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    themeBtnActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    themeBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    themeBtnTextActive: {
      color: theme.colors.primary,
    },

    // Hero
    hero: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.soft,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.primarySoft,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.text,
    },
    heroBody: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textMuted,
      fontWeight: "500",
    },

    // Info grid
    infoGrid: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },

    // Actions
    actions: {
      gap: theme.spacing.sm,
    },
    actionBtn: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: 14,
      ...theme.shadow.card,
    },
    actionTextWrap: {
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary,
    },
    primaryText: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    secondaryBtn: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    secondaryText: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.primary,
    },
    subTextLight: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: "rgba(255,255,255,0.72)",
      fontWeight: "500",
    },
    subTextDark: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: theme.colors.textMuted,
      fontWeight: "500",
    },
  });

const createInfoCardStyles = (theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.primarySoft,
    },
    title: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.text,
    },
    body: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textMuted,
      fontWeight: "500",
    },
  });
