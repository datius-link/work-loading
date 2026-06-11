import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../theme";
import { api } from "../../api/api";
import { useLanguage } from "../../LanguageContext";
import { getUserSession } from "../../utils/userSession";
import { formatRelativeDate, formatJobDate } from "./jobDate";

const T = {
  en: {
    search: "Search jobs...",
    open: "Open",
    empty: "No jobs found.",
  },
  sw: {
    search: "Tafuta kazi...",
    open: "Wazi",
    empty: "Hakuna kazi zilizopatikana.",
  },
};

function toJobRow(job) {
  const poster = job.poster || {};
  return {
    ...job,
    code: job.job_code || job.code || "JOB",
    service: job.service_type || job.service || "",
    postedAt: formatRelativeDate(job.created_at),
    deadline: formatJobDate(job.tender_closes_at),
    posterUsername: poster.username || job.poster_username || job.username || "",
    applicants: Number(job.applicant_count || job.applicants_count || 0),
    statusLabel: String(job.status || "open").replace(/_/g, " "),
  };
}

export default function BrowseJobs() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const session = await getUserSession();
      const myUuid = session.profile?.uuid || session.user?.uuid || null;
      const res = await api.get("/hiring/requests", { params: { q: search.trim() || undefined, scope: "browse" } });
      const nextJobs = (res?.data?.jobs || [])
        .filter((job) => {
          const ownerUuid = job.created_by || job.client_user_uuid || job.poster_uuid || job.poster?.uuid;
          return !job.has_applied && ["open", "applied"].includes(job.status) && !(ownerUuid && myUuid && ownerUuid === myUuid);
        })
        .map(toJobRow);
      setJobs(nextJobs);
    } catch (err) {
      console.log("load browse jobs error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadJobs();
    }, [loadJobs])
  );

  const filteredJobs = jobs.filter((job) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(job.title || "").toLowerCase().includes(q) ||
      String(job.code || "").toLowerCase().includes(q) ||
      String(job.location || "").toLowerCase().includes(q) ||
      String(job.service || "").toLowerCase().includes(q)
    );
  });

  const openJob = (job) => {
    navigation.navigate("RequestDetails", { job });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredJobs}
      keyExtractor={(item) => String(item.id)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJobs(); }} />}
      ListHeaderComponent={
        <TextInput
          style={styles.search}
          placeholder={t.search}
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => openJob(item)} activeOpacity={0.86}>
          <View style={styles.rowBody}>
            <View style={styles.topRow}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[
                item.location || "Location not set",
                item.posterUsername ? `@${item.posterUsername}` : null,
                `Posted ${item.postedAt || "Today"}`,
              ].filter(Boolean).join(" • ")}
            </Text>
            <Text style={styles.subMeta} numberOfLines={1}>
              {[
                item.deadline ? `Deadline ${item.deadline}` : null,
                `${item.applicants} applicant${item.applicants === 1 ? "" : "s"}`,
              ].filter(Boolean).join(" • ")}
            </Text>
          </View>
          <View style={styles.side}>
            <Text style={styles.status}>{item.statusLabel}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t.empty}</Text>
        </View>
      }
    />
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    content: { paddingHorizontal: theme.spacing.md, paddingTop: 10, paddingBottom: 100 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    search: {
      minHeight: 52,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 15,
      fontSize: 16,
      marginBottom: 14,
    },
    row: {
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 10,
      paddingHorizontal: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    rowBody: { flex: 1, minWidth: 0 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
    code: {
      color: theme.colors.primary,
      fontWeight: "900",
      fontSize: 12,
      minWidth: 42,
    },
    title: { color: theme.colors.text, fontSize: 15, fontWeight: "900", flex: 1 },
    meta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
    subMeta: { color: theme.colors.textVeryMuted || theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
    side: { alignItems: "flex-end", paddingTop: 1, maxWidth: 116 },
    status: { color: theme.colors.primary, fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
    empty: { paddingVertical: 40, alignItems: "center" },
    emptyText: { color: theme.colors.textMuted, fontWeight: "800" },
  });
