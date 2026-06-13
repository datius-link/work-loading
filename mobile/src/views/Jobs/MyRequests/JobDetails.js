import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [directActioning, setDirectActioning] = useState(false);
  const [directAcceptNote, setDirectAcceptNote] = useState("");
  const [directStartDate, setDirectStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [directDurationValue, setDirectDurationValue] = useState("");
  const [directDurationUnit, setDirectDurationUnit] = useState("days");
  const [directBudget, setDirectBudget] = useState("");
  const [directNotes, setDirectNotes] = useState("");

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

  const respondDirectHire = async (accepted) => {
    if (directActioning || !job?.id) return;
    setDirectActioning(true);
    try {
      const endpoint = accepted ? "accept-direct" : "decline-direct";
      const res = await viewerRequest("post", `/hiring/jobs/${job.id}/${endpoint}`, accepted ? {
        provider_start_note: directAcceptNote,
        provider_start_date: directStartDate,
        estimated_duration_value: directDurationValue,
        estimated_duration_unit: directDurationUnit,
        budget: directBudget,
        notes: directNotes,
      } : undefined);
      setJob(res?.data?.job || job);
      if (accepted)navigation.navigate("JobWorkspace", {
          jobId: job.id,
          jobCode: job.job_code,
        }); 
      else loadJob();
    } catch (err) {
      console.log("direct hire response error:", err?.response?.data || err?.message);
    } finally {
      setDirectActioning(false);
    }
  };

  const publishPublicly = async () => {
    if (directActioning || !job?.id) return;
    setDirectActioning(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${job.id}/publish`);
      setJob(res?.data?.job || job);
      loadJob();
    } catch (err) {
      console.log("publish direct job error:", err?.response?.data || err?.message);
    } finally {
      setDirectActioning(false);
    }
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
  const isDirect = job.hire_type === "direct" || !!job.target_provider_uuid || !!job.direct_status;
  const directProvider = job.assigned_provider || job.target_provider;
  const workspaceReady = !!job.assigned_provider_uuid && ["active", "start_pending", "working", "completion_pending", "completed", "closed", "filled"].includes(String(job.status || ""));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.colors.surface} />
      <FlatList
        data={isDirect ? [] : applications}
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

              {!isDirect ? (
                <View style={styles.countBand}>
                  <Text style={styles.countNumber}>{count}</Text>
                  <Text style={styles.countLabel}>{count === 1 ? "application" : "applications"}</Text>
                </View>
              ) : null}

              {job.can_accept_direct_hire ? (
                <View style={styles.directBox}>
                  <Text style={styles.directHint}>Accept the offer and add how you will perform the job.</Text>
                  <TextInput
                    value={directAcceptNote}
                    onChangeText={setDirectAcceptNote}
                    placeholder="What will you do first?"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.directInput}
                    multiline
                  />
                  <View style={styles.dateRow}>
                    {[
                      { label: "Today", days: 0 },
                      { label: "Tomorrow", days: 1 },
                      { label: "Next week", days: 7 },
                    ].map((item) => {
                      const date = new Date();
                      date.setDate(date.getDate() + item.days);
                      const value = date.toISOString().slice(0, 10);
                      const active = directStartDate === value;
                      return (
                        <TouchableOpacity key={item.label} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setDirectStartDate(value)}>
                          <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{item.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.directSmall}>Start date: {directStartDate}</Text>
                  <View style={styles.durationRow}>
                    <TextInput
                      value={directDurationValue}
                      onChangeText={setDirectDurationValue}
                      placeholder="Duration"
                      keyboardType="numeric"
                      placeholderTextColor={theme.colors.textMuted}
                      style={[styles.directInput, styles.durationInput]}
                    />
                    {["hours", "days", "weeks", "months"].map((unit) => (
                      <TouchableOpacity key={unit} style={[styles.unitChip, directDurationUnit === unit && styles.unitChipActive]} onPress={() => setDirectDurationUnit(unit)}>
                        <Text style={[styles.unitText, directDurationUnit === unit && styles.unitTextActive]}>{unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    value={directBudget}
                    onChangeText={setDirectBudget}
                    placeholder="Budget or price note"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.directInput}
                  />
                  <TextInput
                    value={directNotes}
                    onChangeText={setDirectNotes}
                    placeholder="Extra notes for the hirer"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.directInput}
                    multiline
                  />
                  <View style={styles.directActions}>
                    <TouchableOpacity style={[styles.directBtn, styles.declineBtn]} onPress={() => respondDirectHire(false)} disabled={directActioning}>
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.directBtn, styles.acceptBtn]} onPress={() => respondDirectHire(true)} disabled={directActioning}>
                      {directActioning ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.acceptText}>Accept & Open Workspace</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {isDirect && !job.can_accept_direct_hire ? (
                <View style={styles.directSummary}>
                  <Text style={styles.sectionTitle}>Direct hire</Text>
                  {directProvider ? (
                    <View style={styles.directProviderRow}>
                      {directProvider.profile_pic ? <Image source={{ uri: directProvider.profile_pic }} style={styles.directAvatar} /> : <View style={[styles.directAvatar, styles.avatarPlaceholder]}><AppIcon name="user" size={18} color={theme.colors.textMuted} /></View>}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.username}>@{directProvider.username || "provider"}</Text>
                        <Text style={styles.fullName}>{directProvider.full_name || "Selected provider"}</Text>
                      </View>
                    </View>
                  ) : null}
                  {job.direct_status === "declined" || job.status === "declined" ? (
                    <TouchableOpacity style={[styles.directBtn, styles.acceptBtn]} onPress={publishPublicly} disabled={directActioning}>
                      {directActioning ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.acceptText}>Post Publicly</Text>}
                    </TouchableOpacity>
                  ) : workspaceReady ? (
                    <TouchableOpacity style={[styles.directBtn, styles.acceptBtn]} onPress={() => navigation.navigate("JobWorkspace", {
                      jobId: job.id,
                      jobCode: job.job_code,
                    })}>
                      <Text style={styles.acceptText}>Open Workspace</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.directHint}>Waiting for the selected provider to accept or decline.</Text>
                  )}
                </View>
              ) : null}

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

              {!isDirect ? <Text style={styles.appSectionTitle}>Provider Applications</Text> : null}
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
            <Text style={styles.emptyTitle}>{isDirect ? "No public applications" : "No applications yet"}</Text>
            <Text style={styles.emptyText}>{isDirect ? "Direct hires are accepted or declined by the selected provider." : "Applications will appear here after providers apply."}</Text>
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
    directBox: { gap: 10, paddingVertical: 12 },
    directSummary: { gap: 12, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, marginTop: 10 },
    directHint: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700" },
    directSmall: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
    directInput: { minHeight: 82, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: "top" },
    dateRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    dateChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    dateChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    dateChipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900" },
    dateChipTextActive: { color: theme.colors.primary },
    durationRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    durationInput: { minHeight: 44, width: 96, flexGrow: 0 },
    unitChip: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    unitChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    unitText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900" },
    unitTextActive: { color: theme.colors.primary },
    directActions: { flexDirection: "row", gap: 10 },
    directBtn: { flex: 1, minHeight: 46, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    acceptBtn: { backgroundColor: theme.colors.primary },
    declineBtn: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    acceptText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    declineText: { color: theme.colors.text, fontSize: 13, fontWeight: "900" },
    directProviderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    directAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.surfaceSoft },
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
