import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Txt from "../../Txt";
import { api } from "../../api/api";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";

function ratingColor(score, theme) {
  if (score >= 8) return theme.colors.success || "#16a34a";
  if (score >= 5) return theme.colors.warning || "#f59e0b";
  return theme.colors.danger || "#dc2626";
}

export default function RecommendationsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profileUuid = route.params?.profileUuid;
  const username = route.params?.username || "";
  const fallbackCount = Number(route.params?.count || 0);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!profileUuid) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await api.get(`/recommendations/users/${profileUuid}`);
      setItems(Array.isArray(res?.data?.recommendations) ? res.data.recommendations : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileUuid]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const renderItem = ({ item }) => {
    const score = Number(item.score || 0);
    const recommender = item.recommender?.visible
      ? item.recommender.full_name || item.recommender.username || "Client"
      : "Recommended by a client";
    return (
      <View style={styles.row}>
        <View style={[styles.scoreBadge, { backgroundColor: ratingColor(score, theme) }]}>
          <Text style={styles.scoreText}>{score || "-"}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title || "Completed job"}</Text>
          <Text style={styles.jobCode}>{item.job_code || `Job #${item.job_id}`}</Text>
          {item.service_type ? <Text style={styles.serviceText}>Recommended for {item.service_type}</Text> : null}
          {(item.started_at || item.completed_at) ? (
            <Text style={styles.timelineText}>
              {item.started_at ? `Started ${new Date(item.started_at).toLocaleDateString()}` : "Start not confirmed"}
              {" | "}
              {item.completed_at ? `Completed ${new Date(item.completed_at).toLocaleDateString()}` : "Completion not confirmed"}
            </Text>
          ) : null}
          <Text style={styles.reason}>{item.reason}</Text>
          <View style={styles.recommenderRow}>
            <AppIcon name={item.recommender?.visible ? "user" : "lock"} size={14} color={theme.colors.textMuted} />
            <Text style={styles.recommender}>{recommender}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={19} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Txt en="Recommendations" sw="Mapendekezo" style={styles.headerTitle} />
          <Text style={styles.headerSub}>{username ? `@${username}` : `${items.length || fallbackCount} received`}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length || fallbackCount}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Txt en="Retry" sw="Jaribu tena" style={styles.retryText} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={items.length ? styles.list : styles.emptyWrap}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="star" size={28} color={theme.colors.textMuted} />
              <Txt en="No recommendations yet" sw="Hakuna mapendekezo bado" style={styles.emptyTitle} />
              <Txt
                en="Recommendations appear after a completed job is rated."
                sw="Mapendekezo yataonekana baada ya kazi kukamilika na kupewa rating."
                style={styles.emptyText}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  headerSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  countPill: { minWidth: 42, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  countText: { color: theme.colors.primary, fontSize: 14, fontWeight: "900" },
  list: { padding: 14, gap: 10 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scoreBadge: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  scoreText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  rowBody: { flex: 1, minWidth: 0 },
  jobTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
  jobCode: { color: theme.colors.primary, fontSize: 12, fontWeight: "900", marginTop: 2 },
  serviceText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 4 },
  timelineText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  reason: { color: theme.colors.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  recommenderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  recommender: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: theme.colors.danger, fontSize: 14, fontWeight: "800", textAlign: "center" },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, minHeight: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  retryText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
  emptyWrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  empty: { alignItems: "center" },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
