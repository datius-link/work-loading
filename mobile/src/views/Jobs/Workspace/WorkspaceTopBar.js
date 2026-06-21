import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AppIcon from "../../../icons/AppIcon";
import { useAppTheme } from "../../../theme";
import { StatusBadge } from "../jobsUI";
import { useLanguage } from "../../../LanguageContext";

export default function WorkspaceTopBar({ job, role, jobStatus, tab, onBack, onTabChange }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const s = useMemo(() => createStyles(theme), [theme]);

  const TABS = [
    { id: "chat",     icon: "message",   en: "Chat",     sw: "Mazungumzo" },
    { id: "progress", icon: "activity",  en: "Progress", sw: "Maendeleo" },
    { id: "details",  icon: "file-text", en: "Details",  sw: "Maelezo" },
  ];

  return (
    <View>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <AppIcon name="arrowLeft" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>{job.title}</Text>
          <Text style={s.code}>
            {job.job_code || job.code || "JOB"} ·{" "}
            <Text style={s.codeSub}>
              {role === "hirer"
                ? (language === "sw" ? "Ulichapisha" : "You posted")
                : (language === "sw" ? "Uliomba" : "You applied")}
            </Text>
          </Text>
        </View>
        <StatusBadge status={jobStatus} size="sm" />
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[s.tabBtn, active && s.tabBtnActive]}
              onPress={() => onTabChange(t.id)}
            >
              <AppIcon
                name={t.icon}
                size={16}
                color={active ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text style={[s.tabLbl, active && s.tabLblActive]}>{language === "sw" ? t.sw : t.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
    code: { fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginTop: 1 },
    codeSub: { color: theme.colors.textMuted },

    tabBar: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderBottomWidth: 2.5,
      borderBottomColor: "transparent",
    },
    tabBtnActive: { borderBottomColor: theme.colors.primary },
    tabLbl: { fontSize: 13, fontWeight: "700", color: theme.colors.textMuted },
    tabLblActive: { color: theme.colors.primary },
  });
