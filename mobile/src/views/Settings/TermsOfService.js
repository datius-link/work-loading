import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen from "./SettingsScreen";

const TERMS = [
  ["Use one honest account", "Tumia akaunti moja ya kweli", "Provide accurate information and do not impersonate another person.", "Toa taarifa sahihi na usijifanye kuwa mtu mwingine."],
  ["Jobs and agreements", "Kazi na makubaliano", "Users are responsible for reviewing job details, agreeing on scope, and acting lawfully and safely.", "Watumiaji wanawajibika kukagua maelezo ya kazi, kukubaliana kuhusu kazi yenyewe, na kutenda kwa usalama na kwa kufuata sheria."],
  ["Respect and safety", "Heshima na usalama", "Fraud, harassment, fake jobs, fake profiles, and harmful or illegal activity are not allowed.", "Utapeli, unyanyasaji, kazi bandia, profaili bandia na shughuli hatari au haramu haziruhusiwi."],
  ["Content and media", "Maudhui na media", "Only upload content you have the right to use. You remain responsible for what you post or send.", "Pakia maudhui ambayo una haki ya kuyatumia tu. Unawajibika kwa unachopost au kutuma."],
  ["Ratings and recommendations", "Ratings na mapendekezo", "Feedback should reflect genuine completed work and must not be manipulated.", "Maoni yaakisi kazi halisi iliyokamilika na hayapaswi kubadilishwa kwa udanganyifu."],
];

export default function TermsOfService({ onBack }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SettingsScreen titleEn="Terms of Service" titleSw="Masharti ya Huduma" onBack={onBack}>
      <Txt
        en="By creating an account, you agree to use e-kazi responsibly and follow these terms."
        sw="Kwa kufungua akaunti, unakubali kutumia e-kazi kwa uwajibikaji na kufuata masharti haya."
        style={styles.intro}
      />
      {TERMS.map(([en, sw, bodyEn, bodySw]) => (
        <View key={en} style={styles.section}>
          <Txt en={en} sw={sw} style={styles.title} />
          <Txt en={bodyEn} sw={bodySw} style={styles.body} />
        </View>
      ))}
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    intro: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    section: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    title: { color: theme.colors.text, fontSize: 13, fontWeight: "900" },
    body: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 18, marginTop: 4 },
  });
