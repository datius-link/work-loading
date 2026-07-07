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
import { StatusBadge } from "../jobsUI";
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

// A job counts as "finished" once it's no longer actionable — this is what
// used to be missing, which made completed/closed jobs still show an
// "Open Job Workspace" button and a "You were selected" note as if the job
// was still active.
function isFinished(job) {
  return ["closed", "completed", "cancelled", "declined", "filled"].includes(job.status);
}

function mapStatus(job, language) {
  const sw = language === "sw";
  if (job.you_got_this_job) {
    if (isFinished(job)) return { status: "completed", statusLabel: sw ? "Imekamilika" : "Completed" };
    return { status: "approved", statusLabel: sw ? "Imekubaliwa" : "Approved" };
  }
  if (["active", "start_pending", "started", "working", "submitted", "completion_pending"].includes(job.status))
    return { status: "approved", statusLabel: sw ? "Imekubaliwa" : "Approved" };
  if ((job.status === "filled" || job.status === "closed" || job.status === "completed") && job.has_applied)
    return { status: "not_attained", statusLabel: sw ? "Hukupata" : "Not Attained" };
  if (isFinished(job))
    return { status: "closed", statusLabel: sw ? "Imefungwa" : "Closed" };
  if (job.hire_type === "direct" || job.target_provider_uuid)
    return { status: "requested", statusLabel: sw ? "Inasubiri" : "Waiting Approval" };
  return { status: "requested", statusLabel: sw ? "Imeombwa" : "Requested" };
}

function reqNote(job, language) {
  const sw = language === "sw";
  if (job.you_got_this_job && isFinished(job)) return sw ? "Kazi imekamilika. Ulichaguliwa." : "Job completed. You were selected.";
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
    rawStatus: job.status,
    code: job.job_code || job.code || "JOB",
    postedAt: formatRelativeDate(job.created_at),
    requestType:
      job.hire_type === "direct" || job.target_provider_uuid
        ? (sw ? "Ajira ya Moja kwa Moja" : "Direct Hire")
        : job.has_applied
        ? (sw ? "Ombi" : "Application")
        : (sw ? "Ombi" : "Request"),
    note: reqNote(job, language),
    // The workspace CTA only makes sense while the job is still actively
    // being worked — once it's finished, show the note only.
    canOpenWorkspace: job.you_got_this_job && !isFinished(job),
  };
}

function statusDotColor(theme, status) {
  switch (status) {
    case "approved":
    case "completed":
      return theme.colors.success;
    case "requested":
      return theme.colors.warning;
    case "not_attained":
      return theme.colors.danger;
    case "closed":
    default:
      return theme.colors.textMuted;
  }
}

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

  const matchesFilter = (r, key) => key === "all" || r.status === key || (key === "closed" && r.status === "completed");
  const filtered = requests.filter((r) => matchesFilter(r, filter));

  const emptyCopy = {
    all: { en: "No requests yet", sw: "Hakuna maombi bado" },
    requested: { en: "No requested jobs yet", sw: "Hakuna maombi yaliyotumwa bado" },
    approved: { en: "No approved jobs yet", sw: "Hakuna kazi zilizokubaliwa bado" },
    closed: { en: "No closed jobs yet", sw: "Hakuna kazi zilizofungwa bado" },
    not_attained: { en: "No missed jobs", sw: "Hakuna kazi ulizokosa" },
  }[filter] || { en: "Nothing here yet", sw: "Hakuna bado" };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );

  return (
    <View style={s.safe}>
      <CachedDataNotice visible={showingCached}/>
      {error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryText}>{language==="sw"?"Jaribu tena":"Retry"}</Text></TouchableOpacity></View>:null}

      {/* Filter bar — compact horizontal-scroll pills, matching Browse's
         filter row style so every Jobs sub-tab shares the same top bar look. */}
      <ScrollView
        horizontal
        style={s.filtersScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === "all"
              ? requests.length
              : requests.filter((r) => matchesFilter(r, f.key)).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.chipTxt, active && s.chipActiveTxt]} numberOfLines={1}>{language==="sw"?f.sw:f.en}</Text>
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
        style={s.listFlex}
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.82}
            onPress={() =>
              nav.navigate("RequestDetails", {
                job: item,
                previewApplication: !!(item.my_application || item.has_applied),
              })
            }
          >
            <View style={s.rowTop}>
              <View style={s.codeRow}>
                <View style={[s.statusDot, { backgroundColor: statusDotColor(theme, item.status) }]} />
                <Text style={s.codeTxt}>{item.code}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>

            <Text style={s.title} numberOfLines={1}>
              {item.title}
            </Text>

            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <AppIcon
                  name={REQUEST_TYPE_ICON[item.requestType] || "tag"}
                  size={11}
                  color={theme.colors.textMuted}
                />
                <Text style={s.metaTxt}>{item.requestType}</Text>
              </View>
              <View style={s.metaDivider} />
              <Text style={s.metaTxt}>{item.postedAt || "Today"}</Text>
            </View>

            {/* Only one of these shows at a time — an active job gets the
               workspace shortcut, a finished one just gets a short note.
               Showing both was the source of the clutter on closed jobs. */}
            {item.canOpenWorkspace ? (
              <TouchableOpacity
                style={s.workspaceBtn}
                onPress={() => nav.navigate("JobWorkspace", {
                  jobId: item.id,
                  jobCode: item.job_code,
                })}
              >
                <AppIcon name="message-circle" size={14} color={theme.colors.primary} />
                <Text style={s.workspaceBtnTxt} numberOfLines={1}>{language === "sw" ? "Fungua Eneo la Kazi" : "Open Job Workspace"}</Text>
                <AppIcon name="chevron-right" size={13} color={theme.colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={s.noteRow}>
                <AppIcon name="info" size={11} color={theme.colors.textMuted} />
                <Text style={s.noteTxt} numberOfLines={1}>{item.note}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <AppIcon name="inbox" size={28} color={theme.colors.primary} />
            </View>
            <Text style={s.emptyTitle}>{language === "sw" ? emptyCopy.sw : emptyCopy.en}</Text>
            <Text style={s.emptyBody}>
              {filter === "all"
                ? (language === "sw" ? "Tafuta kazi na uombe — maombi yako yataonekana hapa." : "Browse open jobs and apply — your requests will appear here.")
                : (language === "sw" ? "Huna maombi ya aina hii kwa sasa." : "You have no requests of this kind at the moment.")}
            </Text>
            {filter === "all" && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => nav.navigate("MainTabs", { screen: "Jobs", params: { initialTab: "browse" } })}
                activeOpacity={0.8}
              >
                <Text style={s.emptyBtnTxt}>{language === "sw" ? "Tafuta Kazi" : "Browse Jobs"}</Text>
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

  // Explicit, non-flexible height so this row never stretches to fill the
  // remaining screen — without this the horizontal ScrollView could grab
  // all the vertical space left after the header, pushing the actual list
  // (and its single/few rows) down with a large blank gap above them.
  filtersScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  // Filters — compact horizontal-scroll pills, matching Browse's filterRow
  // (same height, radius, colors) so the Jobs sub-tabs feel like one bar.
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 30,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  chipTxt: {
    fontSize: 12.5,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  chipActiveTxt: {
    color: theme.colors.primaryStrong,
    fontWeight: "800",
  },
  chipBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chipBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  chipBadgeTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  chipBadgeTxtActive: {
    color: theme.colors.onPrimary,
  },

  // List — explicit flex:1 so it reliably claims all space left below the
  // filter row (matches the "ScrollView needs a concrete flex to resolve"
  // pattern already used in CreateJobModal's sheet), instead of the rows
  // rendering wherever an unstyled ScrollView happens to settle.
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 100,
  },
  listEmpty: {
    flex: 1,
  },

  // Row — compact, flat divider style to match MyJobs instead of a padded
  // shadowed card with a lot of empty space around it.
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 5,
  },
  rowTop: {
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  codeTxt: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    lineHeight: 19,
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
    color: theme.colors.textMuted,
    fontSize: 11.5,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: theme.colors.border,
  },

  // Note (finished / pending jobs)
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteTxt: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },

  // Workspace button (active jobs only)
  workspaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 8,
    marginTop: 1,
  },
  workspaceBtnTxt: {
    flex: 1,
    color: theme.colors.primary,
    fontSize: 12.5,
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
  },
  emptyBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
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
