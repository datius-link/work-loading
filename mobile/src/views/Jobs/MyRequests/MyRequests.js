import React, { useCallback, useState } from "react";
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
import { C, StatusBadge } from "../jobsUI";
import AppIcon from "../../../icons/AppIcon";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "closed", label: "Closed" },
  { key: "not_attained", label: "Not Attained" },
];

function mapStatus(job) {
  if (job.you_got_this_job || ["active", "start_pending", "started", "working", "submitted", "completion_pending", "completed"].includes(job.status))
    return { status: "approved", statusLabel: "Approved" };
  if (
    (job.status === "filled" || job.status === "closed" || job.status === "completed") &&
    !job.you_got_this_job &&
    job.has_applied
  )
    return { status: "not_attained", statusLabel: "Not Attained" };
  if (["closed", "completed", "cancelled", "declined"].includes(job.status))
    return { status: "closed", statusLabel: "Closed" };
  if (job.hire_type === "direct" || job.target_provider_uuid)
    return { status: "requested", statusLabel: "Waiting Approval" };
  return { status: "requested", statusLabel: "Requested" };
}

function reqNote(job) {
  if (job.hire_type === "direct" || job.target_provider_uuid) return "Sent to selected provider";
  if (job.you_got_this_job) return "You were selected";
  if (job.my_application) return "Application sent";
  if (job.status === "closed" || job.status === "filled") return "Job filled. Keep moving.";
  return "Tap to view details";
}

function toReq(job) {
  const m = mapStatus(job);
  return {
    ...job,
    ...m,
    code: job.job_code || job.code || "JOB",
    postedAt: formatRelativeDate(job.created_at),
    requestType:
      job.hire_type === "direct" || job.target_provider_uuid
        ? "Direct Hire"
        : job.has_applied
        ? "Application"
        : "Request",
    note: reqNote(job),
  };
}

// Status dot color map
const STATUS_DOT = {
  approved: "#10B981",
  requested: "#F59E0B",
  not_attained: "#EF4444",
  closed: "#94A3B8",
};

const REQUEST_TYPE_ICON = {
  "Direct Hire": "user-check",
  Application: "file-text",
  Request: "send",
};

export default function MyRequests() {
  const nav = useNavigation();
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/hiring/requests");
      setRequests(
        (res?.data?.jobs || [])
          .filter((j) => j.has_applied || j.target_provider_uuid || j.you_got_this_job)
          .map(toReq)
      );
    } catch (e) {
      console.log("requests error", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );

  return (
    <View style={s.safe}>
      {/* Filter chips — compact pill row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === "all"
              ? requests.length
              : requests.filter((r) => r.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.chipTxt, active && s.chipActiveTxt]}>{f.label}</Text>
              {count > 0 && (
                <View style={[s.chipBadge, active && s.chipBadgeActive]}>
                  <Text style={[s.chipBadgeTxt, active && s.chipBadgeTxtActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.teal}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.88}
            onPress={() =>
              nav.navigate("RequestDetails", {
                job: item,
                previewApplication: !!(item.my_application || item.has_applied),
              })
            }
          >
            {/* Card header */}
            <View style={s.cardHead}>
              <View style={s.codeRow}>
                <View style={[s.statusDot, { backgroundColor: STATUS_DOT[item.status] || C.slate }]} />
                <Text style={s.codeTxt}>{item.code}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>

            {/* Title */}
            <Text style={s.title} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Meta row */}
            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <AppIcon
                  name={REQUEST_TYPE_ICON[item.requestType] || "tag"}
                  size={11}
                  color={C.slate}
                />
                <Text style={s.metaTxt}>{item.requestType}</Text>
              </View>
              <View style={s.metaDivider} />
              <View style={s.metaItem}>
                <AppIcon name="clock" size={11} color={C.slate} />
                <Text style={s.metaTxt}>{item.postedAt || "Today"}</Text>
              </View>
            </View>

            {/* Note */}
            <View style={s.noteBubble}>
              <AppIcon name="info" size={11} color={C.slate} />
              <Text style={s.noteTxt} numberOfLines={1}>
                {item.note}
              </Text>
            </View>

            {/* Workspace CTA — only when got job */}
            {item.you_got_this_job && (
              <TouchableOpacity
                style={s.workspaceBtn}
                onPress={() => nav.navigate("JobWorkspace", {
                  jobId: item.id,
                  jobCode: item.job_code,
                })}
              >
                <AppIcon name="message-circle" size={14} color={C.teal} />
                <Text style={s.workspaceBtnTxt}>Open Job Workspace</Text>
                <AppIcon name="chevron-right" size={13} color={C.teal} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <AppIcon name="inbox" size={28} color={C.teal} />
            </View>
            <Text style={s.emptyTitle}>No {filter === "all" ? "" : filter} requests yet</Text>
            <Text style={s.emptyBody}>
              {filter === "all"
                ? "Browse open jobs and apply — your requests will appear here."
                : `You have no ${filter} requests at the moment.`}
            </Text>
            {filter === "all" && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => nav.navigate("Browse")}
                activeOpacity={0.8}
              >
                <Text style={s.emptyBtnTxt}>Browse Jobs</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Filters — compact pill style
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#E8EAF0",
  },
  chipActive: {
    backgroundColor: C.tealLight,
    borderColor: C.teal,
  },
  chipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: C.slate,
  },
  chipActiveTxt: {
    color: C.teal,
    fontWeight: "700",
  },
  chipBadge: {
    backgroundColor: "#E8EAF0",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chipBadgeActive: {
    backgroundColor: C.teal + "25",
  },
  chipBadgeTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: C.slate,
  },
  chipBadgeTxtActive: {
    color: C.teal,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
    gap: 10,
  },
  listEmpty: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  codeTxt: {
    color: C.slate,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A2E",
    lineHeight: 21,
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTxt: {
    color: C.slate,
    fontSize: 12,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#DDE0E8",
  },

  // Note
  noteBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.slateLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noteTxt: {
    flex: 1,
    color: C.slate,
    fontSize: 12,
    fontWeight: "500",
  },

  // Workspace button
  workspaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: C.tealLight,
    borderRadius: 10,
    marginTop: 2,
  },
  workspaceBtnTxt: {
    flex: 1,
    color: C.teal,
    fontSize: 13,
    fontWeight: "700",
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.tealLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
    textTransform: "capitalize",
  },
  emptyBody: {
    fontSize: 13,
    color: C.slate,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.teal,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
