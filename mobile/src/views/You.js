import React from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../Txt";
import { theme } from "../theme";

export default function You() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + theme.spacing.md },
      ]}
    >
      {/* ACCOUNT STATUS */}
      <View style={styles.headerCard}>
        <FontAwesome5
          name="user"
          size={32}
          color={theme.colors.primary}
        />

        <Txt
          en={"You're using a normal account\nUnatumia akaunti ya kawaida"}
          sw={"Unatumia akaunti ya kawaida\nYou're using a normal account"}
          style={styles.headerTitle}
        />

        <Txt
          en={
            "Browse services, request help, and chat with professionals.\n\nTo earn and offer services, switch to Provider Mode."
          }
          sw={
            "Vinjari huduma, omba msaada, na wasiliana na wataalamu.\n\nIli kutoa huduma na kupata kipato, badilisha kwenda Provider Mode."
          }
          style={styles.headerBody}
        />
      </View>

      {/* PROVIDER MODE INFO */}
      <View style={styles.infoCard}>
        <Txt
          en={"What is Provider Mode?\nProvider Mode ni nini?"}
          sw={"Provider Mode ni nini?\nWhat is Provider Mode?"}
          style={styles.infoTitle}
        />

        <Txt
          en={
            "Provider Mode gives you tools to work professionally:"
          }
          sw={
            "Provider Mode inakupa zana za kufanya kazi kitaalamu:"
          }
          style={styles.infoText}
        />

        <View style={styles.bullets}>
          <Txt en="• Post offers & updates" sw="• Chapisha matangazo na taarifa" style={styles.bullet} />
          <Txt en="• Receive job requests" sw="• Pokea maombi ya kazi" style={styles.bullet} />
          <Txt en="• Get alerts & notifications" sw="• Pata arifa na taarifa" style={styles.bullet} />
          <Txt en="• Build your provider profile" sw="• Jenga wasifu wako wa huduma" style={styles.bullet} />
        </View>

        <Txt
          en={
            "If you already have a provider account, log in.\nOtherwise, create one to get started."
          }
          sw={
            "Ikiwa tayari una akaunti ya mtoa huduma, ingia.\nVinginevyo, fungua akaunti mpya uanze."
          }
          style={styles.note}
        />
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderLogin")}
        >
          <FontAwesome5 name="sign-in-alt" size={20} color="#fff" />
          <View style={styles.actionTextWrap}>
            <Txt
              en={"Login as Service Provider\nIngia kama Mtoa Huduma"}
              sw={"Ingia kama Mtoa Huduma\nLogin as Service Provider"}
              style={styles.primaryText}
            />
            <Txt
              en="Use this if you already have a provider account"
              sw="Tumia hapa kama tayari una akaunti ya huduma"
              style={styles.subTextLight}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderSignUp")}
        >
          <FontAwesome5
            name="user-plus"
            size={20}
            color={theme.colors.primary}
          />
          <View style={styles.actionTextWrap}>
            <Txt
              en={"Become a Service Provider\nKuwa Mtoa Huduma"}
              sw={"Kuwa Mtoa Huduma\nBecome a Service Provider"}
              style={styles.secondaryText}
            />
            <Txt
              en="Create a provider account and start earning"
              sw="Fungua akaunti ya huduma na uanze kupata kipato"
              style={styles.subTextDark}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* SETTINGS */}
      <TouchableOpacity
        style={styles.settingsCard}
        onPress={() => navigation.navigate("Settings")}
      >
        <FontAwesome5 name="cog" size={22} color={theme.colors.accent} />
        <View style={styles.settingsText}>
          <Txt
            en={"Settings & Preferences\nMipangilio"}
            sw={"Mipangilio\nSettings & Preferences"}
            style={styles.settingsTitle}
          />
          <Txt
            en="Customize the app to your liking"
            sw="Badilisha mipangilio ya programu"
            style={styles.settingsDesc}
          />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },

  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  headerTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },

  headerBody: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },

  infoText: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },

  bullets: {
    marginTop: theme.spacing.sm,
  },

  bullet: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },

  note: {
    marginTop: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textVeryMuted,
    fontStyle: "italic",
  },

  actions: {
    marginBottom: theme.spacing.lg,
  },

  actionBtn: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
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
    fontWeight: "700",
    color: "#fff",
  },

  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },

  secondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  subTextLight: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },

  subTextDark: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  settingsCard: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  settingsText: {
    flex: 1,
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },

  settingsDesc: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
