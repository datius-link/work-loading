import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../Txt";
import LanguageSwitch from "../LanguageSwitch";
import { theme } from "../theme";
import AppIcon from "../icons/AppIcon";

export default function You() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + theme.spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Txt en="You" sw="Wewe" style={styles.pageTitle} />
          <Txt en="Choose the account level you need." sw="Chagua kiwango cha akaunti unachohitaji." style={styles.pageSubtitle} />
        </View>
        <LanguageSwitch />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <AppIcon name="shield" size={32} color={theme.colors.primary} />
        </View>
        <Txt
          en="You are browsing as a normal user"
          sw="Unavinjari kama user wa kawaida"
          style={styles.heroTitle}
        />
        <Txt
          en="You can explore service providers without signing in. When you hire someone, light authentication only asks for your email."
          sw="Unaweza kugundua watoa huduma bila kuingia. Ukiajiri mtu, light authentication itaomba email yako tu."
          style={styles.heroBody}
        />
      </View>

      <View style={styles.infoGrid}>
        <InfoCard
          icon="mail"
          titleEn="Light authentication"
          titleSw="Light authentication"
          bodyEn="For people hiring providers. We only collect your email so the provider can contact you about the job."
          bodySw="Kwa watu wanaoajiri watoa huduma. Tunachukua email tu ili mtoa huduma akupate kuhusu kazi."
        />
        <InfoCard
          icon="plusUser"
          titleEn="Full provider authentication"
          titleSw="Full provider authentication"
          bodyEn="For service providers. You create an account, verify email, complete your profile, post work, and receive requests."
          bodySw="Kwa watoa huduma. Unafungua akaunti, unathibitisha email, unakamilisha profile, unapost kazi, na unapokea maombi."
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderLogin")}
        >
          <AppIcon name="login" size={22} color="#fff" />
          <View style={styles.actionTextWrap}>
            <Txt
              en="Login as Service Provider"
              sw="Ingia kama Mtoa Huduma"
              style={styles.primaryText}
            />
            <Txt
              en="Use this if you already have a full provider account"
              sw="Tumia hapa kama tayari una akaunti kamili ya mtoa huduma"
              style={styles.subTextLight}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderSignUp")}
        >
          <AppIcon name="plusUser" size={22} color={theme.colors.primary} />
          <View style={styles.actionTextWrap}>
            <Txt
              en="Become a Service Provider"
              sw="Kuwa Mtoa Huduma"
              style={styles.secondaryText}
            />
            <Txt
              en="Create a provider account and start building your work profile"
              sw="Fungua akaunti ya mtoa huduma na anza kujenga profile yako ya kazi"
              style={styles.subTextDark}
            />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoCard({ icon, titleEn, titleSw, bodyEn, bodySw }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <AppIcon name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Txt en={titleEn} sw={titleSw} style={styles.infoTitle} />
      <Txt en={bodyEn} sw={bodySw} style={styles.infoText} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  heroBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  infoGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.primarySoft,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  infoText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  actions: {
    gap: theme.spacing.md,
  },
  actionBtn: {
    minHeight: 72,
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
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  subTextLight: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.78)",
  },
  subTextDark: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
});
