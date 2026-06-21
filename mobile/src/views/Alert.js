import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import { getFriendlyApiError, viewerRequest } from "../api/api";
import AppIcon from "../icons/AppIcon";
import LoginModal from "./Auth/LoginModal";
import { cachedGet } from "../utils/offlineCache";
import CachedDataNotice from "../components/CachedDataNotice";

const T = {
  en: {
    title: "Alerts",
    subtitle: "Job requests, applications, approvals, and provider responses.",
    loginTitle: "Login to your account",
    loginBody: "Sign in to follow what is happening with your jobs.",
    login: "Login",
    emptyTitle: "No activities yet",
    emptyBody: "Updates about posted jobs, direct hires, applications, and job progress will appear here.",
    retry: "Try again",
  },
  sw: {
    title: "Shughuli",
    subtitle: "Maombi ya kazi, waombaji, majibu, na hatua za kazi.",
    loginTitle: "Ingia kwenye akaunti yako",
    loginBody: "Ingia kufuatilia kinachoendelea kwenye kazi zako.",
    login: "Ingia",
    emptyTitle: "Hakuna shughuli bado",
    emptyBody: "Taarifa za kazi ulizochapisha, direct hire, maombi, na maendeleo ya kazi zitaonekana hapa.",
    retry: "Jaribu tena",
  },
};

function typeIcon(type) {
  if (String(type || "").includes("accepted") || String(type || "").includes("assigned")) return "check";
  if (String(type || "").includes("declined") || String(type || "").includes("cancelled")) return "warning";
  if (String(type || "").includes("application")) return "users";
  if (String(type || "").includes("direct")) return "send";
  return "activity";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Alerts() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showingCached, setShowingCached] = useState(false);

  const loadAlerts = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError("");
      setNeedsLogin(false);
      const result = await cachedGet("notifications", () => viewerRequest("get", "/notifications").then((res) => res.data));
      const res = { data: result.data };
      setNotifications(Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
      setShowingCached(result.fromCache);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setNeedsLogin(true);
        setNotifications([]);
      } else {
        setError(getFriendlyApiError(err, language));
        setShowingCached(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const openActivity = async (item) => {
    if (!item?.read) {
      try {
        await viewerRequest("post", `/notifications/${item.id}/read`);
        setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
      } catch {
        // keep navigation responsive even if read state fails
      }
    }
    if (item?.job_id) {
      navigation.navigate("JobDetails", { jobId: item.job_id });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      activeOpacity={0.86}
      onPress={() => openActivity(item)}
    >
      <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
        <AppIcon name={typeIcon(item.type)} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title || "e-kazi"}
          </Text>
          <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.itemText} numberOfLines={2}>{item.body}</Text>
      </View>
      <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const empty = () => {
    if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }
    if (needsLogin) {
      return (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><AppIcon name="lock" size={30} color={theme.colors.primary} /></View>
          <Text style={styles.emptyTitle}>{t.loginTitle}</Text>
          <Text style={styles.emptyText}>{t.loginBody}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
            <Text style={styles.primaryBtnText}>{t.login}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><AppIcon name="warning" size={30} color={theme.colors.danger} /></View>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadAlerts()}>
            <Text style={styles.secondaryBtnText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}><AppIcon name="activity" size={30} color={theme.colors.primary} /></View>
        <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={styles.emptyText}>{t.emptyBody}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>
      <CachedDataNotice visible={showingCached} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAlerts({ refresh: true })}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.list, !notifications.length && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />
      <LoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          setShowLogin(false);
          loadAlerts();
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
    subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
    list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: 10 },
    listEmpty: { flexGrow: 1 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: theme.spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.soft,
    },
    itemUnread: { borderColor: theme.colors.primary + "66" },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
    },
    iconWrapUnread: { backgroundColor: theme.colors.accentSoft || theme.colors.primarySoft },
    itemBody: { flex: 1, minWidth: 0 },
    itemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    itemTitle: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: "900" },
    itemDate: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
    itemText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 48 },
    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: 16,
    },
    emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
    emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
    primaryBtn: {
      marginTop: 18,
      minHeight: 46,
      borderRadius: 8,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    primaryBtnText: { color: theme.colors.onPrimary, fontWeight: "900" },
    secondaryBtn: {
      marginTop: 18,
      minHeight: 46,
      borderRadius: 8,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: { color: theme.colors.text, fontWeight: "900" },
  });
