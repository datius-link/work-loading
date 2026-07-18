import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen from "./SettingsScreen";
import EkaziLogo from "../../../assets/e-kazi-logo.svg";

export default function AboutEkazi({ onBack, version = "1.0.0" }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SettingsScreen titleEn="About e-kazi" titleSw="Kuhusu e-kazi" onBack={onBack}>
      <View style={styles.logo}><EkaziLogo width={48} height={48} /></View>
      <Txt
        en="e-kazi is a community marketplace for finding work, offering services, hiring people, and building trust through ratings and recommendations."
        sw="e-kazi ni soko la kijamii la kutafuta kazi, kutoa huduma, kuajiri watu na kujenga uaminifu kupitia ratings na mapendekezo."
        style={styles.body}
      />
      <View style={styles.info}>
        <Txt en="App version" sw="Toleo la app" style={styles.label} />
        <Txt en={version} sw={version} style={styles.value} />
      </View>
      <Txt
        en="Need help? Use Help Center, Contact us, or Support Actions in Settings."
        sw="Unahitaji msaada? Tumia Kituo cha Msaada, Wasiliana nasi, au Support Actions kwenye Settings."
        style={styles.support}
      />
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    logo: { width: 72, height: 72, borderRadius: 18, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", alignSelf: "center", marginVertical: 8 },
    body: { color: theme.colors.textSecondary, fontSize: 12.5, lineHeight: 20, textAlign: "center" },
    info: { minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
    value: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
    support: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 18, textAlign: "center" },
  });
