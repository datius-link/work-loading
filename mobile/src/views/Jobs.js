import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import EkaziLogo from "../../assets/e-kazi-logo.svg";
import MyJobs from "./Jobs/MyJobs/MyJobs";
import Browse from "./Jobs/Browse";
import MyRequests from "./Jobs/MyRequests/MyRequests";

const T = {
  en: {
    title: "Jobs",
    subtitle: "Post your work, browse open jobs, and track your requests.",
    myJobs: "My Jobs",
    browse: "Browse",
    requests: "My Requests",
  },
  sw: {
    title: "Kazi",
    subtitle: "Chapisha kazi, tafuta kazi zilizopo, na fuatilia maombi yako.",
    myJobs: "Kazi Zangu",
    browse: "Tafuta",
    requests: "Maombi Yangu",
  },
};

const tabs = [
  { key: "myJobs", icon: "briefcase" },
  { key: "browse", icon: "search" },
  { key: "requests", icon: "tasks" },
];

export default function Jobs() {
  const route = useRoute();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || "myJobs");
  const [createJobSignal, setCreateJobSignal] = useState(0);

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.logoBadge}>
            <EkaziLogo width={22} height={22} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          {activeTab === "myJobs" ? (
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => setCreateJobSignal((value) => value + 1)}
              activeOpacity={0.85}
            >
              <AppIcon name="plus" size={18} color={theme.colors.onAccent} />
              <Text style={styles.postBtnText}>{t.myJobs === "My Jobs" ? "Post Job" : "Chapisha"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.segmented}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
              >
                <AppIcon
                  name={tab.icon}
                  size={15}
                  color={active ? theme.colors.onPrimary : theme.colors.textMuted}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t[tab.key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.content}>
        {activeTab === "browse" ? <Browse /> : activeTab === "requests" ? <MyRequests /> : <MyJobs embedded createJobSignal={createJobSignal} />}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 8,
      paddingBottom: 7,
      gap: 7,
    },
    title: { color: theme.colors.text, fontSize: 21, fontWeight: "900" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    logoBadge: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
    titleCopy: { flex: 1, minWidth: 0 },
    subtitle: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
    postBtn: {
      minHeight: 34,
      borderRadius: 8,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    postBtnText: { color: theme.colors.onAccent, fontSize: 12, fontWeight: "900" },
    segmented: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    segment: {
      flex: 1,
      minHeight: 34,
      borderRadius: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 6,
    },
    segmentActive: { backgroundColor: theme.colors.primary },
    segmentText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900" },
    segmentTextActive: { color: theme.colors.onPrimary },
    content: { flex: 1 },
  });
