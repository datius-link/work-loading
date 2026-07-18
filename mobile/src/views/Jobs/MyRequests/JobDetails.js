import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { viewerRequest } from "../../../api/api";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { formatJobDate, formatRelativeDate } from "../jobDate";
import { NavHeader, SectionHeading, statusConfig, tokenColors } from "../jobsUI";
import { useCall } from "../../../calling/CallProvider";

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

function formatBudget(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  if (/^TZS\b/i.test(raw)) return raw;
  const n = raw.replace(/[^\d.]/g, "");
  return n ? `TZS ${Number(n).toLocaleString("en-US")}` : raw;
}

function categoryLabel(job) {
  return (Array.isArray(job.categories) && job.categories[0]) || job.service_type || job.service || "General";
}

// Small soft box (icon + label + value) used inside the 2x2 job-summary
// grid — replaces the old plain "1 application" band.
function GridItem({ icon, label, value }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={s.gridItem}>
      <View style={s.gridIconWrap}>
        <AppIcon name={icon} size={15} color={theme.colors.primaryStrong} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.gridLabel} numberOfLines={1}>{label}</Text>
        <Text style={s.gridValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// Lightweight activity timeline — a row of [dot][line] pairs with labels
// underneath. Steps vary depending on whether the job is an open (bid)
// posting or a direct hire.
function ActivityTimeline({ steps, activeIndex }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View>
      <View style={s.timelineRow}>
        {steps.map((label, i) => {
          const done = i <= activeIndex;
          const isLast = i === steps.length - 1;
          return (
            <React.Fragment key={label}>
              <View style={[s.timelineDot, done && s.timelineDotDone]}>
                {done ? <AppIcon name="check" size={10} color={theme.colors.onPrimary} /> : null}
              </View>
              {!isLast ? <View style={[s.timelineLine, i < activeIndex && s.timelineLineDone]} /> : null}
            </React.Fragment>
          );
        })}
      </View>
      <View style={s.timelineLabels}>
        {steps.map((label, i) => (
          <Text key={label} style={[s.timelineLabel, i <= activeIndex && s.timelineLabelDone]} numberOfLines={1}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function JobDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const jobId = route.params?.jobId;
  const call = useCall();

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

  const shareJob = async () => {
    if (!job) return;
    try {
      await Share.share({
        title: job.title || "Job",
        message: [`${job.title || "Job"}`, job.location, `[${job.job_code || "JOB"}]`].filter(Boolean).join(" — "),
      });
    } catch (err) {
      console.log("share job error:", err?.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <NavHeader title="Job Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <NavHeader title="Job Details" onBack={() => navigation.goBack()} />
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
  const cfg = statusConfig(job.status);
  const hasRequirements = !!(job.availability_required || job.availability_notes || job.scheduled_for);

  const budgetValue = formatBudget(job.assigned_budget || job.budget) || (isDirect ? "Pending" : "Set by bids");
  const durationValue = job.estimated_duration_value
    ? `${job.estimated_duration_value} ${job.estimated_duration_unit || ""}`.trim()
    : (isDirect ? "Pending" : "Set by bids");

  // Activity timeline — different shape for open (bid) jobs vs direct hires.
  const timelineSteps = isDirect ? ["Posted", "Accepted", "Workspace"] : ["Posted", "Applications", "Assigned", "Workspace"];
  const timelineActive = isDirect
    ? (workspaceReady ? 2 : (job.direct_status === "accepted" || job.assigned_provider_uuid ? 1 : 0))
    : (workspaceReady ? 3 : (job.assigned_provider_uuid ? 2 : (count > 0 ? 1 : 0)));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.colors.surface} />
      <NavHeader title="Job Details" onBack={() => navigation.goBack()} />
      <FlatList
        data={isDirect ? [] : applications}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJob(); }} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* ── Hero — job facts only, no provider info here. ── */}
            <View style={styles.heroShadow}>
              <LinearGradient
                colors={theme.colors.brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <Svg width="100%" height="100%" style={styles.heroDecoration} pointerEvents="none">
                  <Circle cx="92%" cy="6%" r="70" fill="#FFFFFF" opacity="0.07" />
                  <Circle cx="102%" cy="55%" r="46" fill="#FFFFFF" opacity="0.06" />
                </Svg>

                <View style={styles.heroTop}>
                  <View style={styles.codePill}><Text style={styles.codeTxt}>{job.job_code || "JOB"}</Text></View>
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: tokenColors(theme, cfg.token).color }]} />
                    <Text style={styles.statusPillTxt}>{statusLabel(job.status)}</Text>
                  </View>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{job.title}</Text>
                <View style={styles.metaRow}>
                  <AppIcon name="map-pin" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMeta}>{job.location || "Location not set"}</Text>
                  <Text style={styles.heroMetaDot}>·</Text>
                  <AppIcon name="clock" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMeta}>Posted {formatRelativeDate(job.created_at) || "Today"}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.body}>
              {/* ── Job summary grid — replaces the old "1 application" band. ── */}
              <View style={styles.infoGrid}>
                {isDirect ? (
                  <GridItem icon="direct-hire" label="Type" value="Direct Hire" />
                ) : (
                  <GridItem icon="inbox" label="Applications" value={String(count)} />
                )}
                <GridItem icon="wallet" label="Budget" value={budgetValue} />
                <GridItem icon="clock" label="Duration" value={durationValue} />
                <GridItem icon="tag" label="Category" value={categoryLabel(job)} />
              </View>

              {!isDirect && workspaceReady ? (
                <TouchableOpacity style={styles.workspaceBtn} onPress={() => navigation.navigate("JobWorkspace", {
                  jobId: job.id,
                  jobCode: job.job_code,
                  tab: "progress",
                })}>
                  <AppIcon name="briefcase" size={16} color={theme.colors.onPrimary} />
                  <Text style={styles.workspaceBtnTxt}>Open Workspace</Text>
                  <AppIcon name="chevron-right" size={16} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              ) : null}

              {job.can_accept_direct_hire ? (
                <View style={styles.section}>
                  <SectionHeading label="Respond to Offer" />
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
                <View style={styles.section}>
                  <SectionHeading label="Direct Hire" />
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
                    <TouchableOpacity style={[styles.directBtn, styles.postPubliclyBtn]} onPress={publishPublicly} disabled={directActioning}>
                      {directActioning ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.postPubliclyText}>Post Publicly</Text>}
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

              {/* ── About the job, split into scannable sub-sections. ── */}
              <View style={styles.section}>
                <SectionHeading label="Description" />
                <Text style={styles.bodyText}>{job.description || "No description provided."}</Text>
              </View>

              <View style={styles.section}>
                <SectionHeading label="Requirements" />
                {job.availability_required ? (
                  <View style={styles.reqRow}>
                    <AppIcon name="calendar" size={14} color={theme.colors.primaryStrong} />
                    <Text style={styles.reqText}>
                      Provider must be available{job.scheduled_for ? ` on ${formatJobDate(job.scheduled_for)}` : ""}
                    </Text>
                  </View>
                ) : null}
                {job.availability_notes ? (
                  <Text style={[styles.bodyText, hasRequirements && { marginTop: 8 }]}>{job.availability_notes}</Text>
                ) : null}
                {!hasRequirements ? <Text style={styles.mutedText}>No specific requirements listed.</Text> : null}
              </View>

              {images.length ? (
                <View style={styles.section}>
                  <SectionHeading label="Attachments" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                    {images.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} style={styles.jobImage} />)}
                  </ScrollView>
                </View>
              ) : null}

              {!isDirect ? (
                <View style={[styles.section, { paddingBottom: 0, marginBottom: -4 }]}>
                  <SectionHeading label="Provider Applications" />
                </View>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.appRow} activeOpacity={0.86} onPress={() => openApplication(item)}>
            <View style={styles.appTopRow}>
              {item.profile_pic ? (
                <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <AppIcon name="user" size={21} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.appIdentity}>
                <Text style={styles.username} numberOfLines={1}>@{item.username || "provider"}</Text>
                <Text style={styles.fullName} numberOfLines={1}>{item.full_name || "Provider"}</Text>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.colors.textVeryMuted || theme.colors.textMuted} />
            </View>

            <View style={styles.appStatsRow}>
              <View style={styles.appStat}>
                <Text style={styles.appStatLabel}>Budget</Text>
                <Text style={[styles.appStatValue, styles.appStatMoney]} numberOfLines={1}>{item.budget || "—"}</Text>
              </View>
              <View style={styles.appStat}>
                <Text style={styles.appStatLabel}>Delivery</Text>
                <Text style={styles.appStatValue} numberOfLines={1}>{item.duration || "Not set"}</Text>
              </View>
              <View style={styles.appStat}>
                <Text style={styles.appStatLabel}>Available</Text>
                <Text style={styles.appStatValue} numberOfLines={1}>{item.available_from || "Not set"}</Text>
              </View>
            </View>

            <Text style={styles.appMessage} numberOfLines={2}>{item.message || "No proposal message provided."}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isDirect ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No applications yet</Text>
              <Text style={styles.emptyText}>Applications will appear here after providers apply.</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.body}>
            {/* ── Activity timeline — quick history of this job. ── */}
            <View style={styles.section}>
              <SectionHeading label="Activity" />
              <ActivityTimeline steps={timelineSteps} activeIndex={timelineActive} />
            </View>

            {/* ── Job actions — only real, working actions. ── */}
            <View style={styles.section}>
              <SectionHeading label="Actions" />
              <View style={styles.actionsRow}>
                {workspaceReady ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("JobWorkspace", { jobId: job.id, jobCode: job.job_code })}>
                    <AppIcon name="briefcase" size={15} color={theme.colors.primaryStrong} />
                    <Text style={styles.actionBtnTxt}>Open Workspace</Text>
                  </TouchableOpacity>
                ) : null}
                {workspaceReady && call?.supported && directProvider?.uuid ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => call.startCall({ calleeUuid: directProvider.uuid, calleeName: directProvider.username || directProvider.full_name, calleePhoto: directProvider.profile_pic, jobId: job.id })}
                  >
                    <AppIcon name="message-circle" size={15} color={theme.colors.primaryStrong} />
                    <Text style={styles.actionBtnTxt}>App Call</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.actionBtn} onPress={shareJob}>
                  <AppIcon name="share2" size={15} color={theme.colors.primaryStrong} />
                  <Text style={styles.actionBtnTxt}>Share Job</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    listContent: { paddingBottom: 40 },
    body: { paddingHorizontal: theme.spacing.md },

    // Hero — branded gradient banner, job facts only (no provider info).
    heroShadow: {
      shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 10,
    },
    hero: { padding: 18, paddingBottom: 20, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
    heroDecoration: { position: "absolute", left: 0, top: 0 },
    heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
    codePill: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    codeTxt: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillTxt: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
    heroTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", lineHeight: 29 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    heroMeta: { color: "rgba(255,255,255,0.88)", fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
    heroMetaDot: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginHorizontal: 1 },

    // 2x2 job-summary grid — small soft boxes, not big cards.
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
    gridItem: {
      flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 9,
      backgroundColor: theme.colors.surfaceSoft, borderRadius: 14, padding: 11,
    },
    gridIconWrap: {
      width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primarySoft,
      alignItems: "center", justifyContent: "center",
    },
    gridLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
    gridValue: { color: theme.colors.text, fontSize: 13.5, fontWeight: "800", marginTop: 1, textTransform: "capitalize" },

    // Workspace shortcut — solid, high contrast.
    workspaceBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: theme.colors.primary, borderRadius: 16, padding: 14, marginTop: 16,
      shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
    },
    workspaceBtnTxt: { flex: 1, color: theme.colors.onPrimary, fontSize: 13.5, fontWeight: "800" },

    // Sections flow down the page with breathing room — a thin hairline up
    // top marks a new group instead of a bordered/tinted box.
    section: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
    bodyText: { fontSize: 14.5, color: theme.colors.textSecondary, lineHeight: 22 },
    mutedText: { fontSize: 13.5, color: theme.colors.textMuted, lineHeight: 20, fontStyle: "italic" },

    reqRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    reqText: { flex: 1, fontSize: 13.5, color: theme.colors.text, fontWeight: "600", lineHeight: 20 },

    directHint: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700", marginBottom: 10 },
    directSmall: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
    directInput: { minHeight: 82, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: "top", marginBottom: 10 },
    dateRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
    dateChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    dateChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    dateChipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900" },
    dateChipTextActive: { color: theme.colors.primary },
    durationRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 10 },
    durationInput: { minHeight: 44, width: 96, flexGrow: 0, marginBottom: 0 },
    unitChip: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    unitChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    unitText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900" },
    unitTextActive: { color: theme.colors.primary },
    directActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    directBtn: { flex: 1, minHeight: 46, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    acceptBtn: { backgroundColor: theme.colors.primary },
    postPubliclyBtn: { backgroundColor: theme.colors.accent },
    postPubliclyText: { color: theme.colors.onAccent, fontSize: 13, fontWeight: "900" },
    declineBtn: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    acceptText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    declineText: { color: theme.colors.text, fontSize: 13, fontWeight: "900" },
    directProviderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    directAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.surfaceSoft },

    imageRow: { gap: 10, paddingRight: 10 },
    jobImage: { width: 132, height: 96, borderRadius: theme.radius.xs, backgroundColor: theme.colors.surfaceSoft },

    // Provider application rows — flowing rows (no card boxes). Each row
    // answers 4 questions fast: who, how much, when, and what they said.
    appRow: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 10,
    },
    appTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceSoft },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    appIdentity: { flex: 1, minWidth: 0 },
    username: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    fullName: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    appStatsRow: { flexDirection: "row", gap: 18, marginLeft: 54 },
    appStat: { minWidth: 0 },
    appStatLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
    appStatValue: { color: theme.colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 },
    appStatMoney: { color: theme.colors.primaryStrong },
    appMessage: { marginLeft: 54, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },

    empty: { alignItems: "center", padding: theme.spacing.md, paddingTop: 30 },
    emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    emptyText: { color: theme.colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 20 },

    // Activity timeline.
    timelineRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    timelineDot: {
      width: 18, height: 18, borderRadius: 9,
      alignItems: "center", justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft, borderWidth: 2, borderColor: theme.colors.border,
    },
    timelineDotDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    timelineLine: { flex: 1, height: 2, backgroundColor: theme.colors.border },
    timelineLineDone: { backgroundColor: theme.colors.success },
    timelineLabels: { flexDirection: "row", marginTop: 5 },
    timelineLabel: { flex: 1, fontSize: 10, fontWeight: "700", color: theme.colors.textMuted, textAlign: "center" },
    timelineLabelDone: { color: theme.colors.text, fontWeight: "800" },

    // Job actions — soft pill buttons, real actions only.
    actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    actionBtn: {
      flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      minHeight: 44, borderRadius: 14, backgroundColor: theme.colors.primarySoft,
    },
    actionBtnTxt: { color: theme.colors.primaryStrong, fontSize: 12.5, fontWeight: "800" },
  });
