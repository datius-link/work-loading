import React, { useMemo } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen, { SettingDivider } from "./SettingsScreen";

const ITEMS = [
  ["show_phone_in_jobs", "Show phone", "Onyesha simu"],
  ["show_email_in_jobs", "Show email", "Onyesha email"],
  ["show_socials_in_jobs", "Show social links", "Onyesha mitandao"],
  ["show_public_insights", "Show public insights", "Onyesha takwimu za umma"],
  ["show_profile_in_recommendations", "Show profile in recommendations", "Onyesha profaili kwenye mapendekezo"],
];

export default function PrivacySettings({ onBack, privacy, saving, onChange }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SettingsScreen titleEn="Privacy" titleSw="Faragha" onBack={onBack}>
      <View style={styles.note}>
        <Txt en="Assigned job contacts" sw="Mawasiliano ya kazi uliyopangiwa" style={styles.noteTitle} />
        <Txt
          en="Phone, email, and social details are only shown inside assigned job screens, not on public profiles."
          sw="Simu, email na mitandao huonekana ndani ya screen za kazi iliyopangiwa tu, si kwenye profaili ya umma."
          style={styles.noteBody}
        />
      </View>
      <View style={styles.panel}>
        {ITEMS.map(([key, en, sw], index) => (
          <React.Fragment key={key}>
            {index ? <SettingDivider /> : null}
            <View style={styles.row}>
              <Txt en={en} sw={sw} style={styles.label} />
              <Switch
                value={!!privacy?.[key]}
                disabled={saving}
                onValueChange={(value) => onChange(key, value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
                thumbColor={privacy?.[key] ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
          </React.Fragment>
        ))}
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    note: { padding: 12, borderRadius: 10, backgroundColor: theme.colors.primarySoft },
    noteTitle: { color: theme.colors.primary, fontSize: 13, fontWeight: "900" },
    noteBody: { color: theme.colors.textSecondary, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
    panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
    row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    label: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  });
