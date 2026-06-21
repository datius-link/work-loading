import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen, { SettingDivider } from "./SettingsScreen";

const FAQS = [
  ["How do I post a job?", "Ninawekaje kazi?"],
  ["How do I hire someone directly?", "Ninaajirije mtu moja kwa moja?"],
  ["Why can’t I see contacts?", "Kwa nini sioni mawasiliano?"],
  ["How do ratings work?", "Ratings zinafanyaje kazi?"],
  ["How do recommendations work?", "Mapendekezo yanafanyaje kazi?"],
  ["How do notifications work?", "Notifications zinafanyaje kazi?"],
  ["How do I change language or theme?", "Ninabadilishaje lugha au theme?"],
];

export default function HelpCenter({ onBack }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(null);

  return (
    <SettingsScreen titleEn="Help Center" titleSw="Kituo cha Msaada" onBack={onBack}>
      <View style={styles.panel}>
        {FAQS.map(([en, sw], index) => (
          <React.Fragment key={en}>
            {index ? <SettingDivider /> : null}
            <TouchableOpacity style={styles.question} onPress={() => setOpen(open === index ? null : index)}>
              <Txt en={en} sw={sw} style={styles.title} />
              <AppIcon name={open === index ? "minus" : "plus"} size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            {open === index ? (
              <Txt
                en="The detailed answer will be added here. If you need help now, use Contact Admin."
                sw="Maelezo kamili yataongezwa hapa. Ukihitaji msaada sasa, tumia Wasiliana na Admin."
                style={styles.answer}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
    question: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    title: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
    answer: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 17, paddingBottom: 11, paddingRight: 20 },
  });
