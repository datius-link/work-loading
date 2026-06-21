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
import { api, getFriendlyApiError } from "../../../api/api";
import { formatRelativeDate } from "../jobDate";
import { C, StatusBadge } from "../jobsUI";
import AppIcon from "../../../icons/AppIcon";
import { useLanguage } from "../../../LanguageContext";
import { cachedGet } from "../../../utils/offlineCache";
import CachedDataNotice from "../../../components/CachedDataNotice";

const FILTERS = [
  { key: "all", en: "All", sw: "Zote" },
  { key: "requested", en: "Requested", sw: "Zilizoombwa" },
  { key: "approved", en: "Approved", sw: "Zilizokubaliwa" },
  { key: "closed", en: "Closed", sw: "Zilizofungwa" },
  { key: "not_attained", en: "Not Attained", sw: "Hukupata" },
];

function mapStatus(job, language) {
  const sw = language === "sw";
  if (job.you_got_this_job || ["active", "start_pending", "started", "working", "submitted", "completion_pending", "completed"].includes(job.status))
    return { status: "approved", statusLabel: sw ? "Imekubaliwa" : "Approved" };
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

function reqNote(job, language) {
  const sw = language === "sw";
  if (job.hire_type === "direct" || job.target_provider_uuid) return sw ? "Imetumwa kwa mtoa huduma aliyechaguliwa" : "Sent to selected provider";
  if (job.you_got_this_job) return sw ? "Umechaguliwa" : "You were selected";
  if (job.my_application) return sw ? "Ombi limetumwa" : "Application sent";
  if (job.status === "closed" || job.status === "filled") return sw ? "Kazi imejazwa." : "Job filled. Keep moving.";
  return sw ? "Gusa kuona maelezo" : "Tap to view details";
}

function toReq(job, language) {
  const m = mapStatus(job, language);
  const sw = language === "sw";
  return {
    ...job,
    ...m,
    code: job.job_code || job.code || "JOB",
    postedAt: formatRelativeDate(job.created_at),
    requestType:
      job.hire_type === "direct" || job.target_provider_uuid
        ? (sw ? "Ajira ya Moja kwa Moja" : "Direct Hire")
        : job.has_applied
        ? (sw ? "Ombi" : "Application")
        : (sw ? "Ombi" : "Request"),
    note: reqNote(job, language),
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
  const {theme}=useAppTheme();
  const {language}=useLanguage();
  const s=useMemo(()=>createStyles(theme),[theme]);
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showingCached,setShowingCached]=useState(false);
  const [error,setError]=useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const result = await cachedGet("hiring:requests",()=>api.get("/hiring/requests").then(res=>res.data));
      const res={data:result.data};
      setShowingCached(result.fromCache);
      setRequests(
        (res?.data?.jobs || [])
          .filter((j) => j.has_applied || j.target_provider_uuid || j.you_got_this_job)
          .map((job) => toReq(job, language))
      );
    } catch (e) {
      setError(getFriendlyApiError(e,language));
      setShowingCached(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

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
      <CachedDataNotice visible={showingCached}/>
      {error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryText}>{language==="sw"?"Jaribu tena":"Retry"}</Text></TouchableOpacity></View>:null}
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
              <Text style={[s.chipTxt, active && s.chipActiveTxt]}>{language==="sw"?f.sw:f.en}</Text>
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
                <Text style={s.workspaceBtnTxt}>{language === "sw" ? "Fungua Eneo la Kazi" : "Open Job Workspace"}</Text>
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

const createStyles=(theme)=>StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: C.teal,
  },
  chipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  chipActiveTxt: {
    color: C.teal,
    fontWeight: "700",
  },
  chipBadge: {
    backgroundColor: theme.colors.surfaceSoft,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.border,
  },

  // Note
  noteBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noteTxt: {
    flex: 1,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.primarySoft,
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
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
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  errorBox:{marginHorizontal:16,marginTop:8,padding:12,borderRadius:10,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.surface,alignItems:"center",gap:8},
  errorText:{color:theme.colors.text,fontSize:12,textAlign:"center"},
  retryBtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:8,backgroundColor:theme.colors.primary},
  retryText:{color:theme.colors.onPrimary,fontSize:12,fontWeight:"800"},
});
