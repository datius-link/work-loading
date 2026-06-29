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
  },
};

const TYPE_STYLES = {
  message: { icon: "message", color: "#1683C7", label: "Message" },
  follow: { icon: "plusUser", color: "#0B6B63", label: "Follow" },
  like: { icon: "heart", color: "#E63946", label: "Like" },
  comment: { icon: "comment", color: "#7C3AED", label: "Comment" },
  mention: { icon: "tag", color: "#D97706", label: "Mention" },
  directHire: { icon: "direct-hire", color: "#0F766E", label: "Direct hire" },
  application: { icon: "users", color: "#2563EB", label: "Application" },
  jobStatus: { icon: "briefcase", color: "#16A34A", label: "Job update" },
  followedPost: { icon: "posts", color: "#0891B2", label: "Followed post" },
  warning: { icon: "warning", color: "#F59E0B", label: "Attention" },
  general: { icon: "bell", color: "#64748B", label: "e-kazi" },
};

function typeTone(item) {
  const raw = `${item?.type || ""} ${item?.system || ""} ${item?.title || ""}`.toLowerCase();
  const metaAction = String(item?.meta?.action || "").toLowerCase();

  if (raw.includes("message")) return TYPE_STYLES.message;
  if (raw.includes("follow")) return raw.includes("post") ? TYPE_STYLES.followedPost : TYPE_STYLES.follow;
  if (raw.includes("like") || raw.includes("reaction")) return TYPE_STYLES.like;
  if (raw.includes("comment") || raw.includes("reply")) return TYPE_STYLES.comment;
  if (raw.includes("mention") || raw.includes("tag")) return TYPE_STYLES.mention;
  if (raw.includes("direct")) return TYPE_STYLES.directHire;
  if (raw.includes("application") || raw.includes("applicant") || raw.includes("provider_withdrew")) return TYPE_STYLES.application;
  if (
    raw.includes("accepted") ||
    raw.includes("assigned") ||
    raw.includes("confirmed") ||
    raw.includes("completed") ||
    raw.includes("start_") ||
    raw.includes("completion_") ||
    raw.includes("filled") ||
    metaAction.includes("workspace") ||
    metaAction.includes("confirm")
  ) return TYPE_STYLES.jobStatus;
  if (raw.includes("declined") || raw.includes("cancelled") || raw.includes("warning")) return TYPE_STYLES.warning;
  if (raw.includes("post") || item?.post_id) return TYPE_STYLES.followedPost;
  return TYPE_STYLES.general;
}


function notificationDestination(item) {
  const raw = `${item?.type || ""} ${item?.system || ""} ${item?.title || ""}`.toLowerCase();
  const action = String(item?.meta?.action || "").toLowerCase();
  const jobId = item?.job_id || item?.meta?.job_id;
  const post = item?.meta?.post || null;
  const postId = item?.post_id || item?.meta?.post_id;

  const isMessage = raw.includes("message") || action.includes("message");
  const isProgress =
    raw.includes("start_") ||
    raw.includes("completion_") ||
    raw.includes("completed") ||
    raw.includes("confirmed") ||
    raw.includes("rejected") ||
    raw.includes("cancelled") ||
    raw.includes("filled") ||
    action.includes("progress") ||
    action.includes("confirm") ||
    action.includes("rate");

  if (jobId && isMessage) {
    return { name: "JobWorkspace", params: { jobId, tab: "chat", unreadMessageId: item?.meta?.message_id } };
  }

  if (jobId && isProgress) {
    return { name: "JobWorkspace", params: { jobId, tab: "progress", notificationId: item?.id } };
  }

  if (post) {
    return { name: "PostFeedView", params: { posts: [post], initialPostId: post.id || postId, preferredAuthActor: "viewer" } };
  }

  if (jobId) {
    return { name: "JobDetails", params: { jobId } };
  }

  return null;
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
  const unreadCount = useMemo(() => notifications.filter((item) => !item?.read).length, [notifications]);

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
