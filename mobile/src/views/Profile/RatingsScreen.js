import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/api";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RatingsScreen() {
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
      const res = await api.get(`/recommendations/users/${profileUuid}/ratings`);
      setItems(Array.isArray(res?.data?.ratings) ? res.data.ratings : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load ratings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileUuid]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{item.score || "-"}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.jobCode}>{item.job_code || `Job #${item.job_id}`}</Text>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title || "Completed job"}</Text>
        {item.service_type ? <Text style={styles.serviceText}>{item.service_type}</Text> : null}
        {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={19} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Txt en="Ratings" sw="Ukadiriaji" style={styles.headerTitle} />
          <Text style={styles.headerSub}>{username ? `@${username}` : `${items.length || fallbackCount} received`}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length || fallbackCount}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
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
              <Txt en="No ratings yet" sw="Hakuna ukadiriaji bado" style={styles.emptyTitle} />
              <Txt en="Ratings appear after a completed job is reviewed." sw="Ukadiriaji utaonekana baada ya kazi kukamilika." style={styles.emptyText} />
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  headerSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  countPill: { minWidth: 42, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  countText: { color: theme.colors.primary, fontSize: 14, fontWeight: "900" },
  list: { padding: 14, gap: 10 },
  row: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  scoreBadge: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  scoreText: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: "900" },
  rowBody: { flex: 1, minWidth: 0 },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  jobCode: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" },
  dateText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
  jobTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900", marginTop: 3 },
  serviceText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  noteText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: theme.colors.danger, fontSize: 14, fontWeight: "800", textAlign: "center" },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, minHeight: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  retryText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
  emptyWrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  empty: { alignItems: "center" },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
