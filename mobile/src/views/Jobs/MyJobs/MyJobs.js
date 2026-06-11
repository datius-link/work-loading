import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { viewerRequest } from "../../../api/api";
import LoginModal from "../../Auth/LoginModal";
import { getUserSession, useUserSession } from "../../../utils/userSession";
import CreateJobModal from "./CreateJobModal";
import { UploadManager } from "../../../utils/UploadManager";
import { formatRelativeDate, formatJobDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";

const T = {
  en: {
    title: "My Jobs",
    subtitle: "Jobs you posted or sent directly to people.",
    loginTitle: "Login to your account",
    loginBody: "Sign in to see your job posts, direct requests, applications, and responses.",
    loginAction: "Login",
    postJob: "Post Job",
    emptyTitle: "No jobs yet",
    emptyBody: "Use Hire Me on a provider post or create a job request. Your jobs will appear here.",
    retry: "Try again",
    applicants: (count) => `${count} applicant${count === 1 ? "" : "s"}`,
    direct: "Direct hire",
    posted: "Posted job",
    open: "Open",
    postedOk: "Job posted",
    postedOkBody: "People can now see and apply for this job.",
    postFailed: "Could not post job",
  },
  sw: {
    title: "Kazi Zangu",
    subtitle: "Kazi ulizochapisha au kutuma moja kwa moja kwa watoa huduma.",
    loginTitle: "Ingia kwenye akaunti yako",
    loginBody: "Ingia kuona kazi zako, maombi ya kuajiri moja kwa moja, waombaji, na majibu ya watoa huduma.",
    loginAction: "Ingia",
    postJob: "Chapisha Kazi",
    emptyTitle: "Hakuna kazi bado",
    emptyBody: "Tumia Hire Me kwenye post ya mtoa huduma au chapisha ombi la kazi. Kazi zako zitaonekana hapa.",
    retry: "Jaribu tena",
    applicants: (count) => `${count} ${count === 1 ? "mwombaji" : "waombaji"}`,
    direct: "Direct hire",
    posted: "Kazi iliyochapishwa",
    open: "Fungua",
    postedOk: "Kazi imechapishwa",
    postedOkBody: "Watoa huduma sasa wanaweza kuona na kuomba kazi hii.",
    postFailed: "Imeshindikana kuchapisha kazi",
  },
};

function jobPhase(job) {
  const status = String(job?.status || "open");
  const applicants = Number(job?.applicant_count || 0);
  if (["closed", "filled"].includes(status)) return "completed";
  if (["active"].includes(status)) return "in_progress";
  if (status === "pending") return "waiting_approval";
  if (["applied"].includes(status) || applicants > 0) return "applications";
  return "posted";
}

function statusText(status, language = "en") {
  const sw = language === "sw";
  const labels = {
    posted: sw ? "Imewekwa" : "Posted",
    applications: sw ? "Maombi yapo" : "Applications",
    waiting_approval: sw ? "Inasubiri mtoa huduma" : "Waiting approval",
    in_progress: sw ? "Inaendelea" : "In progress",
    completed: sw ? "Imekamilika" : "Completed",
    cancelled: sw ? "Imefutwa" : "Cancelled",
    declined: sw ? "Imekataliwa" : "Declined",
  };
  return labels[status] || String(status || "posted").replace(/_/g, " ");
}

export default function MyJobs({ embedded = false, createJobSignal = 0 }) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [postingJob, setPostingJob] = useState(false);
  const [notice, setNotice] = useState(null);
  const lastCreateSignal = useRef(createJobSignal);
  const { refresh: refreshUserSession } = useUserSession();

  const loadJobs = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError("");
      const session = await getUserSession();
      if (!session.isLoggedIn) {
        setNeedsLogin(true);
        setJobs([]);
        return;
      }

      setNeedsLogin(false);
      const res = await viewerRequest("get", "/hiring/my-jobs");
      setJobs(Array.isArray(res?.data?.jobs) ? res.data.jobs : []);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setNeedsLogin(true);
        setJobs([]);
      } else {
        setError(err?.response?.data?.message || "Failed to load jobs");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const openJob = (job) => {
    if (!job?.id) return;
    navigation.navigate("JobDetails", { jobId: job.id });
  };

  const openPostJob = async () => {
    const session = await getUserSession();
    if (!session.isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setShowCreateJob(true);
  };

  useEffect(() => {
    if (!createJobSignal || createJobSignal === lastCreateSignal.current) return;
    lastCreateSignal.current = createJobSignal;
    openPostJob();
  }, [createJobSignal]);

  const submitPostedJob = async (payload) => {
    if (postingJob) return;
    setPostingJob(true);
    try {
      const media = payload.images?.length
        ? await UploadManager.startUpload(payload.images, "jobs")
        : [];
      await viewerRequest("post", "/hiring/jobs", {
        title: payload.title,
        description: payload.description,
        service_type: payload.service_type,
        location: payload.location,
        tender_closes_at: payload.tender_closes_at,
        availability_required: payload.availability_required,
        scheduled_for: payload.scheduled_for || null,
        availability_notes: payload.availability_notes || null,
        media,
      });
      setShowCreateJob(false);
      await loadJobs({ refresh: true });
      setNotice({ type: "success", title: t.postedOk, body: t.postedOkBody });
    } catch (err) {
      setNotice({ type: "error", title: t.postFailed, body: err?.response?.data?.message || "Please try again." });
    } finally {
      setPostingJob(false);
    }
  };

  const renderJob = ({ item }) => {
    const phase = jobPhase(item);
    const count = Number(item.applicant_count || 0);
    const code = item.job_code || item.code || "JOB";
    const deadline = formatJobDate(item.tender_closes_at);
    const status = statusText(phase, language);

    return (
      <TouchableOpacity style={styles.jobRow} activeOpacity={0.86} onPress={() => openJob(item)}>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.jobCode}>{code}</Text>
            <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={styles.jobMeta} numberOfLines={1}>
            {[item.location || "Location not set", `Posted ${formatRelativeDate(item.created_at) || "Today"}`].join(" • ")}
          </Text>
          <Text style={styles.jobSubMeta} numberOfLines={1}>
            {[deadline ? `Deadline ${deadline}` : null, t.applicants(count)].filter(Boolean).join(" • ")}
          </Text>
        </View>
        <Text style={[styles.rowStatus, statusTextStyle(phase, theme)]} numberOfLines={1}>{status}</Text>
      </TouchableOpacity>
    );
  };

  const listEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      );
    }

    if (needsLogin) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <AppIcon name="lock" size={30} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t.loginTitle}</Text>
          <Text style={styles.emptyText}>{t.loginBody}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
            <AppIcon name="login" size={17} color={theme.colors.onPrimary} />
            <Text style={styles.primaryBtnText}>{t.loginAction}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <AppIcon name="warning" size={30} color={theme.colors.danger} />
          </View>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadJobs()}>
            <Text style={styles.secondaryBtnText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerState}>
        <View style={styles.emptyIcon}>
          <AppIcon name="briefcase" size={30} color={theme.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={styles.emptyText}>{t.emptyBody}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={openPostJob}>
          <AppIcon name="plus" size={17} color={theme.colors.onPrimary} />
          <Text style={styles.primaryBtnText}>{t.postJob}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top"]}>
      {!embedded && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={openPostJob}>
              <AppIcon name="plus" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => loadJobs({ refresh: true })}>
              <AppIcon name="history" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJob}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadJobs({ refresh: true })}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[styles.listContent, !jobs.length && styles.listEmptyContent]}
        showsVerticalScrollIndicator={false}
      />

      <LoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={async () => {
          setShowLogin(false);
          await refreshUserSession();
          loadJobs();
        }}
      />
      <CreateJobModal
        visible={showCreateJob}
        onClose={() => setShowCreateJob(false)}
        mode="indirect"
        onSubmit={submitPostedJob}
        submitting={postingJob}
      />
      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        onPrimary={() => setNotice(null)}
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

function statusTextStyle(status, theme) {
  const normalized = String(status || "open");
  if (normalized === "waiting_approval") return { color: theme.colors.warning || theme.colors.accent };
  if (normalized === "in_progress") return { color: theme.colors.accent };
  if (normalized === "completed") return { color: theme.colors.success || theme.colors.primary };
  if (["cancelled", "declined"].includes(normalized)) return { color: theme.colors.danger };
  return { color: theme.colors.primary };
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerText: { flex: 1 },
    title: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
    subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    listContent: { paddingHorizontal: theme.spacing.md, paddingTop: 8, paddingBottom: theme.spacing.xxl },
    listEmptyContent: { flexGrow: 1 },
    jobRow: {
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
    jobCode: { color: theme.colors.primary, fontSize: 12, fontWeight: "900", minWidth: 42 },
    jobTitle: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    jobMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
    jobSubMeta: { color: theme.colors.textVeryMuted || theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
    rowStatus: { maxWidth: 118, paddingTop: 1, fontSize: 12, fontWeight: "900", textTransform: "capitalize", textAlign: "right" },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingBottom: 48,
    },
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
      minHeight: 48,
      borderRadius: 8,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
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
