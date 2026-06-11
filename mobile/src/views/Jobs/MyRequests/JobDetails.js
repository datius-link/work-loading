import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { viewerRequest } from "../../../api/api";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { formatDeadline, formatJobDate, formatRelativeDate } from "../jobDate";

function mediaUrls(media) {
  if (!Array.isArray(media)) return [];
  return media.map((m) => (typeof m === "string" ? m : m?.url || m?.uri)).filter(Boolean);
}

function applicationToRequest(application, job) {
  return {
    id: application.id,
    status: job.status === "filled" || job.status === "closed" ? "closed" : "open",
    provider: {
      uuid: application.uuid,
      username: application.username,
      fullName: application.full_name,
      profilePic: application.profile_pic,
      rating: application.ratings,
      services: application.services,
    },
    explanation: application.message,
    budget: application.budget,
    duration: application.duration,
    availableFrom: application.available_from,
    experience: application.experience,
    notes: application.notes,
    images: mediaUrls(application.media),
    job: {
      id: job.id,
      code: job.job_code,
      title: job.title,
      location: job.location,
      category: job.service_type,
      postedAt: job.created_at,
      deadline: job.tender_closes_at,
    },
  };
}

function statusLabel(value) {
  return String(value || "open").replace(/_/g, " ");
}

export default function JobDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const jobId = route.params?.jobId;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      const res = await viewerRequest("get", `/hiring/jobs/${jobId}`);
      setJob(res?.data?.job || null);
      setApplications(res?.data?.applications || []);
    } catch (err) {
      console.log("JobDetails error:", err?.response?.data || err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useFocusEffect(useCallback(() => { setLoading(true); loadJob(); }, [loadJob]));

  const openApplication = (application) => {
    navigation.navigate("JobApplicantDetails", { request: applicationToRequest(application, job) });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const images = mediaUrls(job.media);
  const count = applications.length || Number(job.applicant_count || 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.colors.surface} />
      <FlatList
        data={applications}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJob(); }} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.navHeader}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <AppIcon name="arrowLeft" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Job Details</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.statusRow}>
                <Text style={styles.code}>[{job.job_code || "JOB"}]</Text>
                <Text style={styles.status}>{statusLabel(job.status)}</Text>
              </View>
              <Text style={styles.title}>{job.title}</Text>
              <View style={styles.metaWrap}>
                <Text style={styles.meta}>{job.location || "Location not set"}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.meta}>Posted {formatRelativeDate(job.created_at) || "Today"}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.meta}>{formatDeadline(job.tender_closes_at)}</Text>
              </View>

              <View style={styles.countBand}>
                <Text style={styles.countNumber}>{count}</Text>
                <Text style={styles.countLabel}>{count === 1 ? "application" : "applications"}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About this job</Text>
                <Text style={styles.bodyText}>{job.description || "No description provided."}</Text>
              </View>

              {images.length ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Attached images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                    {images.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} style={styles.jobImage} />)}
                  </ScrollView>
                </View>
              ) : null}

              <Text style={styles.appSectionTitle}>Provider Applications</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.appRow} activeOpacity={0.86} onPress={() => openApplication(item)}>
            {item.profile_pic ? (
              <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <AppIcon name="user" size={21} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.appBody}>
              <View style={styles.appTop}>
                <Text style={styles.username} numberOfLines={1}>@{item.username || "provider"}</Text>
                <Text style={styles.offer} numberOfLines={1}>{item.budget || "No budget"}</Text>
              </View>
              <Text style={styles.fullName} numberOfLines={1}>{item.full_name || "Provider"}</Text>
              <Text style={styles.appMeta} numberOfLines={1}>
                {[item.duration || "Time not set", item.experience || "Experience not set"].join(" • ")}
              </Text>
              <Text style={styles.preview} numberOfLines={2}>{item.message || "No proposal provided."}</Text>
            </View>
            <AppIcon name="chevron-right" size={18} color={theme.colors.textVeryMuted || theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>Applications will appear here after providers apply.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 32 },
    navHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
    body: { padding: theme.spacing.md },
    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    code: { color: theme.colors.primary, fontSize: 13, fontWeight: "900" },
    status: { color: theme.colors.primary, fontSize: 13, fontWeight: "900", textTransform: "capitalize" },
    title: { color: theme.colors.text, fontSize: 29, lineHeight: 35, fontWeight: "900", marginBottom: 10 },
    metaWrap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 14 },
    meta: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800" },
    dot: { color: theme.colors.textVeryMuted || theme.colors.textMuted, fontWeight: "900" },
    countBand: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 14,
      marginBottom: 2,
    },
    countNumber: { color: theme.colors.text, fontSize: 28, fontWeight: "900" },
    countLabel: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "800" },
    section: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginBottom: 9 },
    bodyText: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 23 },
    imageRow: { gap: 10, paddingRight: 10 },
    jobImage: { width: 132, height: 96, borderRadius: theme.radius.xs, backgroundColor: theme.colors.surfaceSoft },
    appSectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900", marginTop: 18 },
    appRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceSoft },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    appBody: { flex: 1, minWidth: 0 },
    appTop: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between" },
    username: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    offer: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" },
    fullName: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    appMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 4 },
    preview: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    empty: { alignItems: "center", padding: theme.spacing.md, paddingTop: 30 },
    emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    emptyText: { color: theme.colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  });
