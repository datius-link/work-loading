import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import { api, viewerRequest } from "../../../api/api";
import { getLightUserSession } from "../../../utils/lightUserSession";
import AppIcon from "../../../icons/AppIcon";

const T = {
  en: {
    profile: "Profile",
    edit: "Edit profile",
    jobs: "Jobs",
    postedJobs: "Posted jobs",
    completed: "Completed",
    phone: "Phone",
    noPhone: "No phone number",
    about: "About",
    noBio: "No bio yet",
    emptyJobs: "No jobs yet",
    retry: "Try again",
  },
  sw: {
    profile: "Profaili",
    edit: "Hariri profaili",
    jobs: "Kazi",
    postedJobs: "Kazi zilizowekwa",
    completed: "Zilizokamilika",
    phone: "Simu",
    noPhone: "Hakuna namba ya simu",
    about: "Kuhusu",
    noBio: "Hakuna maelezo bado",
    emptyJobs: "Hakuna kazi bado",
    retry: "Jaribu tena",
  },
};

function avatarFor(profile) {
  if (profile?.profile_pic) return profile.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || profile?.email || "U")}&background=0B6B63&color=fff`;
}

function phase(job) {
  const status = String(job?.status || "open");
  const applicants = Number(job?.applicant_count || 0);
  if (["closed", "filled"].includes(status)) return "completed";
  if (status === "active") return "in_progress";
  if (status === "pending") return "waiting_approval";
  if (status === "applied" || applicants > 0) return "applications";
  return "posted";
}

function phaseLabel(value, language) {
  const sw = language === "sw";
  const labels = {
    posted: sw ? "Imewekwa" : "Posted",
    applications: sw ? "Maombi" : "Applications",
    waiting_approval: sw ? "Inasubiri mtoa huduma" : "Waiting approval",
    in_progress: sw ? "Inaendelea" : "In progress",
    completed: sw ? "Imekamilika" : "Completed",
  };
  return labels[value] || value;
}

function Stat({ label, value, styles }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function LightUserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isMine, setIsMine] = useState(false);

  const loadProfile = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError("");
      const session = await getLightUserSession();
      const uuid = route.params?.uuid || session.profile?.uuid || session.user?.uuid;
      const mine = !!uuid && uuid === (session.profile?.uuid || session.user?.uuid);
      setIsMine(mine);
      if (!uuid) throw new Error("Light user not found");

      const profileRes = await api.get(`/profiles/${uuid}`);
      setProfile(profileRes?.data?.profile || null);

      if (mine) {
        const jobsRes = await viewerRequest("get", "/hiring/my-jobs");
        setJobs(Array.isArray(jobsRes?.data?.jobs) ? jobsRes.data.jobs : []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.uuid]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const completedCount = jobs.filter((job) => phase(job) === "completed").length;

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <View style={styles.emptyIcon}><AppIcon name="warning" size={30} color={theme.colors.danger} /></View>
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadProfile()}>
          <Text style={styles.secondaryText}>{t.retry}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile({ refresh: true })}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <View style={styles.profileMeta}>
            <Text style={styles.username}>@{profile?.username || "lightuser"}</Text>
            <Text style={styles.email}>{profile?.email || ""}</Text>
            <Text style={styles.fullName}>{profile?.full_name || profile?.username || ""}</Text>
          </View>
        </View>

        {isMine && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("EditLightUserProfile", { profile })}
          >
            <AppIcon name="edit" size={17} color={theme.colors.onPrimary} />
            <Text style={styles.primaryText}>{t.edit}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <Stat label={t.postedJobs} value={jobs.length || profile?.posted_jobs_count || 0} styles={styles} />
          <Stat label={t.completed} value={completedCount || profile?.completed_jobs_count || 0} styles={styles} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <AppIcon name="phone" size={17} color={theme.colors.primary} />
            <View>
              <Text style={styles.infoLabel}>{t.phone}</Text>
              <Text style={styles.infoText}>{profile?.phone_number || t.noPhone}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <AppIcon name="user" size={17} color={theme.colors.primary} />
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>{t.about}</Text>
              <Text style={styles.infoText}>{profile?.bio || t.noBio}</Text>
            </View>
          </View>
        </View>

        {isMine && (
          <>
            <Text style={styles.sectionTitle}>{t.jobs}</Text>
            {jobs.length ? jobs.map((job) => {
              const jobPhase = phase(job);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  activeOpacity={0.86}
                  onPress={() => navigation.navigate("JobDetails", { jobId: job.id })}
                >
                  <View style={styles.jobTop}>
                    <View style={styles.jobText}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                      <Text style={styles.jobMeta} numberOfLines={1}>
                        {job.job_code ? `${job.job_code} - ` : ""}{job.service_type || "Service"}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, styles[`${jobPhase}Pill`]]}>
                      <Text style={[styles.statusText, styles[`${jobPhase}Text`]]}>{phaseLabel(jobPhase, language)}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyJobs}>
                <Text style={styles.emptyText}>{t.emptyJobs}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg, padding: 24 },
    content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: 12 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.soft,
    },
    avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: theme.colors.surfaceSoft },
    profileMeta: { flex: 1, minWidth: 0 },
    username: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
    email: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700", marginTop: 3 },
    fullName: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: "700", marginTop: 7 },
    primaryBtn: {
      minHeight: 48,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
    statsRow: { flexDirection: "row", gap: 10 },
    statBox: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    statValue: { color: theme.colors.primary, fontSize: 22, fontWeight: "900" },
    statLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: 14,
      ...theme.shadow.soft,
    },
    infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    infoBody: { flex: 1 },
    infoLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    infoText: { color: theme.colors.text, fontSize: 14, fontWeight: "700", marginTop: 3, lineHeight: 20 },
    sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900", marginTop: 4 },
    jobCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    jobTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    jobText: { flex: 1, minWidth: 0 },
    jobTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    jobMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 3 },
    jobDesc: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
    statusPill: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
    statusText: { fontSize: 11, fontWeight: "900" },
    postedPill: { backgroundColor: theme.colors.primarySoft },
    postedText: { color: theme.colors.primary },
    applicationsPill: { backgroundColor: theme.colors.primarySoft },
    applicationsText: { color: theme.colors.primary },
    waiting_approvalPill: { backgroundColor: theme.colors.warningSoft || theme.colors.accentSoft },
    waiting_approvalText: { color: theme.colors.warning || theme.colors.accent },
    in_progressPill: { backgroundColor: theme.colors.accentSoft },
    in_progressText: { color: theme.colors.accent },
    completedPill: { backgroundColor: theme.colors.successSoft || theme.colors.primarySoft },
    completedText: { color: theme.colors.success || theme.colors.primary },
    emptyJobs: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 24,
      alignItems: "center",
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
    emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: "center" },
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
    secondaryText: { color: theme.colors.text, fontWeight: "900" },
  });
