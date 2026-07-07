import React, { useMemo, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AppIcon from "../../../icons/AppIcon";
import { useAppTheme } from "../../../theme";
import { StatusBadge } from "../jobsUI";
import { useLanguage } from "../../../LanguageContext";
import { useCall } from "../../../calling/CallProvider";

export default function WorkspaceTopBar({ job, role, jobStatus, tab, onBack, onTabChange, missedCallCount = 0 }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const call = useCall();
  const s = useMemo(() => createStyles(theme), [theme]);
  const contact = job?.contact_details;
  const otherParty = contact?.viewer_role === "hirer" ? contact?.service_provider : contact?.hirer;
  const callPress = useRef(new Animated.Value(1)).current;

  const TABS = [
    { id: "chat",     icon: "message",   en: "Chat",     sw: "Mazungumzo" },
    { id: "progress", icon: "activity",  en: "Progress", sw: "Maendeleo" },
    { id: "calls",    icon: "phone",     en: "Calls",    sw: "Simu" },
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
        {call?.supported && otherParty?.uuid ? (
          <TouchableOpacity
            onPressIn={() => Animated.spring(callPress, { toValue: 0.86, useNativeDriver: true, speed: 40 }).start()}
            onPressOut={() => Animated.spring(callPress, { toValue: 1, useNativeDriver: true, speed: 20 }).start()}
            onPress={() =>
              call.startCall({
                calleeUuid: otherParty.uuid,
                calleeName: otherParty.username || otherParty.full_name,
                calleePhoto: otherParty.profile_pic,
                jobId: job?.id,
                jobTitle: job?.title,
              })
            }
          >
            <Animated.View style={[s.callBtn, { transform: [{ scale: callPress }] }]}>
              <AppIcon name="phone" size={16} color={theme.colors.onPrimary} />
            </Animated.View>
          </TouchableOpacity>
        ) : null}
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
              <View>
                <AppIcon
                  name={t.icon}
                  size={16}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                />
                {t.id === "calls" && missedCallCount > 0 ? (
                  <View style={s.missedDot}>
                    <Text style={s.missedDotText}>{missedCallCount > 9 ? "9+" : missedCallCount}</Text>
                  </View>
                ) : null}
              </View>
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
    callBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
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
    missedDot: {
      position: "absolute",
      top: -6,
      right: -10,
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      paddingHorizontal: 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.danger,
    },
    missedDotText: { color: "#fff", fontSize: 8.5, fontWeight: "900" },
  });
