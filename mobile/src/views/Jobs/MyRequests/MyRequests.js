import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import { api } from "../../../api/api";
import { formatRelativeDate } from "../jobDate";

const filters = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "closed", label: "Closed" },
  { key: "not_attained", label: "Not Attained" },
];

function mapRequestStatus(job) {
  if (job.you_got_this_job || job.status === "active") return { status: "approved", statusLabel: "Approved" };
  if ((job.status === "filled" || job.status === "closed") && !job.you_got_this_job && job.has_applied) return { status: "not_attained", statusLabel: "Not Attained" };
  if (["closed", "cancelled", "declined"].includes(job.status)) return { status: "closed", statusLabel: "Closed" };
  if (job.hire_type === "direct" || job.target_provider_uuid) return { status: "requested", statusLabel: "Waiting Approval" };
  return { status: "requested", statusLabel: "Requested" };
}

function requestType(job) {
  if (job.hire_type === "direct" || job.target_provider_uuid) return "Direct hire";
  if (job.my_application || job.has_applied) return "Application";
  return "Request";
}

function requestNote(job) {
  if (job.hire_type === "direct" || job.target_provider_uuid) return "Sent to selected provider";
  if (job.you_got_this_job) return "You were selected";
  if (job.my_application) return "Application sent";
  if (job.status === "closed" || job.status === "filled") return "Job filled. Keep moving.";
  return "Tap to view details";
}

function toRequest(job) {
  const mapped = mapRequestStatus(job);
  return {
    ...job,
    ...mapped,
    code: job.job_code || job.code || "JOB",
    postedAt: formatRelativeDate(job.created_at),
    requestType: requestType(job),
    note: requestNote(job),
  };
}

export default function MyRequests() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.get("/hiring/requests");
      const nextRequests = (res?.data?.jobs || [])
        .filter((job) => job.has_applied || job.target_provider_uuid || job.you_got_this_job)
        .map(toRequest);
      setRequests(nextRequests);
    } catch (err) {
      console.log("load my requests error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRequests();
    }, [loadRequests])
  );

  const filteredRequests =
    activeFilter === "all"
      ? requests
      : requests.filter((item) => item.status === activeFilter);

  const openRequest = (item) => {
    navigation.navigate("RequestDetails", { job: item, previewApplication: !!(item.my_application || item.has_applied) });
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
      data={filteredRequests}
      keyExtractor={(item) => String(item.id)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} />}
      ListHeaderComponent={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filter,
                activeFilter === filter.key && styles.activeFilter,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => openRequest(item)} activeOpacity={0.86}>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.requestType, `Posted ${item.postedAt || "Today"}`].join(" • ")}
            </Text>
            <Text style={styles.subMeta} numberOfLines={1}>{item.note}</Text>
          </View>
          <Text style={[styles.status, styles[`${item.status}Text`]]} numberOfLines={1}>
            {item.statusLabel}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No requests found.</Text>
        </View>
      }
    />
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: 8,
      paddingBottom: 100,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    filters: {
      gap: 8,
      paddingBottom: 10,
    },
    filter: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeFilter: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    filterText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "900",
    },
    activeFilterText: {
      color: theme.colors.primary,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
    code: { color: theme.colors.primary, fontWeight: "900", fontSize: 12, minWidth: 42 },
    title: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    meta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
    subMeta: { color: theme.colors.textVeryMuted || theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
    status: {
      maxWidth: 130,
      paddingTop: 1,
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "right",
    },
    requestedText: { color: theme.colors.warning || theme.colors.accent },
    approvedText: { color: theme.colors.success || theme.colors.primary },
    closedText: { color: theme.colors.textMuted },
    not_attainedText: { color: theme.colors.danger },
    empty: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontWeight: "800",
    },
  });
