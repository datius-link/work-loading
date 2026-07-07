import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
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
import { typeTone, notificationDestination, notificationSection } from "../notifications/notificationRouting";
import { getNotificationsModule } from "../notifications/notificationRuntime";

const T = {
  en: {
    title: "Notifications",
    subtitle: "Messages, follows, job activity, post updates, and mentions.",
    unread: "unread",
    allRead: "All caught up",
    settings: "Notification settings",
    loginTitle: "Login to your account",
    loginBody: "Sign in to follow messages, jobs, posts, and community activity.",
    login: "Login",
    emptyTitle: "No notifications yet",
    emptyBody: "Messages, follows, likes, comments, mentions, job updates, applications, and followed posts will appear here.",
    retry: "Try again",
    unreadLabel: "Unread",
    sectionMessages: "Messages",
    sectionApplications: "Applications",
    sectionActivity: "Activity",
  },
  sw: {
    title: "Notifications",
    subtitle: "Ujumbe, follows, kazi, posts, comments na mentions.",
    unread: "hazijasomwa",
    allRead: "Umesoma zote",
    settings: "Mipangilio ya notifications",
    loginTitle: "Ingia kwenye akaunti yako",
    loginBody: "Ingia kufuatilia ujumbe, kazi, posts, na shughuli za jamii.",
    login: "Ingia",
    emptyTitle: "Hakuna notifications bado",
    emptyBody: "Ujumbe, follows, likes, comments, mentions, updates za kazi, maombi na posts za unaowafuata zitaonekana hapa.",
    retry: "Jaribu tena",
    unreadLabel: "Haijasomwa",
    sectionMessages: "Ujumbe",
    sectionApplications: "Maombi",
    sectionActivity: "Shughuli",
  },
};

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
  const unreadCount = useMemo(() => notifications.filter((item) => !item?.read).length, [notifications]);

  // Only "messages" and "applications" get their own section header — they're
  // the two categories that actually pile up (a chat can have many messages,
  // a popular job many applicants) and benefit from being grouped instead of
  // interleaved. Everything else (follows, likes, comments, job updates,
  // followed posts) stays together in one chronological "Activity" section
  // rather than getting a header each, per the same split used for the OS
  // push notification header (see pushService.js#CATEGORY_HEADERS).
  const sections = useMemo(() => {
    const buckets = { messages: [], applications: [], activity: [] };
    for (const item of notifications) {
      buckets[notificationSection(item)].push(item);
    }
    const out = [];
    if (buckets.messages.length) out.push({ key: "messages", title: t.sectionMessages, data: buckets.messages });
    if (buckets.applications.length) out.push({ key: "applications", title: t.sectionApplications, data: buckets.applications });
    if (buckets.activity.length) out.push({ key: "activity", title: t.sectionActivity, data: buckets.activity });
    return out;
  }, [notifications, t]);

  // Keep the OS app icon badge (iOS, and Android launchers that support it)
  // in sync with what the user actually sees on this screen.
  useEffect(() => {
    const Notifications = getNotificationsModule();
    Notifications?.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

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
    const destination = notificationDestination(item);
    if (destination) {
      navigation.navigate(destination.name, destination.params);
    }
  };

  const renderItem = ({ item, index }) => {
    const tone = typeTone(item);
    const isUnread = !item?.read;
    return (
      <TouchableOpacity
        style={[styles.timelineRow, isUnread && styles.timelineRowUnread]}
        activeOpacity={0.82}
        onPress={() => openActivity(item)}
      >
        <View style={styles.timelineColumn}>
          <View style={[styles.timelineRail, index === 0 && styles.timelineRailTop]} />
          <View style={[styles.typeNode, { borderColor: tone.color, backgroundColor: `${tone.color}14` }, isUnread && { backgroundColor: `${tone.color}22` }]}>
            <AppIcon name={tone.icon} size={17} color={tone.color} />
          </View>
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemMeta}>
            <Text style={[styles.typeLabel, { color: tone.color }]} numberOfLines={1}>{tone.label}</Text>
            <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.titleLine}>
            {isUnread ? <View style={[styles.unreadDot, { backgroundColor: tone.color }]} /> : null}
            <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
              {item.title || "e-kazi"}
            </Text>
          </View>
          <Text style={[styles.itemText, isUnread && styles.itemTextUnread]} numberOfLines={3}>{item.body}</Text>
          {isUnread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{t.unreadLabel}</Text>
            </View>
          ) : null}
        </View>
        <AppIcon name="chevron-right" size={15} color={theme.colors.textVeryMuted} />
      </TouchableOpacity>
    );
  };

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
        <View style={styles.emptyIcon}><AppIcon name="bell" size={30} color={theme.colors.primary} /></View>
        <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={styles.emptyText}>{t.emptyBody}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
        </View>
        <View style={styles.summaryLine}>
          <View style={[styles.summaryDot, unreadCount ? styles.summaryDotUnread : styles.summaryDotRead]} />
          <Text style={styles.summaryText}>
            {unreadCount ? `${unreadCount} ${t.unread}` : t.allRead}
          </Text>
        </View>
      </View>
      <CachedDataNotice visible={showingCached} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <Text style={styles.sectionHeaderCount}>{section.data.length}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
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
    headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerText: { flex: 1, minWidth: 0 },
    title: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
    subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },

    summaryLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
    summaryDot: { width: 8, height: 8, borderRadius: 4 },
    summaryDotUnread: { backgroundColor: theme.colors.primary },
    summaryDotRead: { backgroundColor: theme.colors.textVeryMuted },
    summaryText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "800" },
    list: { paddingHorizontal: theme.spacing.md, paddingVertical: 8, paddingBottom: theme.spacing.xxl },
    listEmpty: { flexGrow: 1 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 14,
      paddingBottom: 6,
      backgroundColor: theme.colors.bg,
    },
    sectionHeaderText: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    sectionHeaderCount: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      backgroundColor: theme.colors.bgElevated,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: "hidden",
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      minHeight: 92,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    timelineRowUnread: { backgroundColor: theme.colors.primarySoft + "55" },
    timelineColumn: { width: 34, alignItems: "center", alignSelf: "stretch" },
    timelineRail: {
      position: "absolute",
      top: -14,
      bottom: -14,
      width: 2,
      backgroundColor: theme.colors.border,
    },
    timelineRailTop: { top: 16 },
    typeNode: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      marginTop: 1,
    },
    itemBody: { flex: 1, minWidth: 0, paddingRight: 2 },
    itemMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
    typeLabel: { flex: 1, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    itemDate: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
    titleLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
    unreadDot: { width: 7, height: 7, borderRadius: 4 },
    itemTitle: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: "800" },
    itemTitleUnread: { fontWeight: "900" },
    itemText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
    itemTextUnread: { color: theme.colors.text },
    unreadPill: {
      alignSelf: "flex-start",
      marginTop: 7,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.colors.bgElevated,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
    },
    unreadPillText: { color: theme.colors.primary, fontSize: 10, fontWeight: "900" },
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
