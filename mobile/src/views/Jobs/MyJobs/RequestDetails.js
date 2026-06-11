import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { getUserSession } from "../../../utils/userSession";
import { viewerRequest } from "../../../api/api";
import { formatDeadline, formatJobDate, formatRelativeDate } from "../jobDate";

function mediaUrls(media) {
  if (!Array.isArray(media)) return [];
  return media.map((item) => (typeof item === "string" ? item : item?.url || item?.uri)).filter(Boolean);
}

function statusLabel(value) {
  return String(value || "open").replace(/_/g, " ");
}

function applicationFrom(job) {
  return job?.my_application || job?.application || job?.request || null;
}

function formatBudget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Not set";
  if (/^TZS\b/i.test(raw)) return raw;
  const numeric = raw.replace(/[^\d.]/g, "");
  return numeric ? `TZS ${Number(numeric).toLocaleString("en-US")}` : raw;
}

export default function RequestDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const routeJob = route.params?.job || null;
  const [detailJob, setDetailJob] = useState(null);
  const [ratingScore, setRatingScore] = useState(10);
  const [recommendProvider, setRecommendProvider] = useState(false);
  const [recommendReason, setRecommendReason] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [myUuid, setMyUuid] = useState(null);
  const job = detailJob || routeJob;
  const previewApplication = !!route.params?.previewApplication;

  useEffect(() => {
    const id = routeJob?.id;
    if (!id) return;
    let cancelled = false;
    viewerRequest("get", `/hiring/jobs/${id}`)
      .then((res) => {
        if (!cancelled && res?.data?.job) setDetailJob(res.data.job);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [routeJob?.id]);

  useEffect(() => {
    let cancelled = false;
    getUserSession()
      .then((session) => {
        if (!cancelled) setMyUuid(session?.profile?.uuid || session?.user?.uuid || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Job Post" navigation={navigation} theme={theme} styles={styles} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Job not available</Text>
          <Text style={styles.emptyText}>Open an available job from Requests.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const code = job.job_code || job.code || "JOB";
  const categories = (job.categories || [job.service_type || job.service]).filter(Boolean);
  const images = mediaUrls(job.media || job.images);
  const poster = job.poster || {};
  const contacts = job.contact_details || null;
  const otherParty = contacts?.viewer_role === "hirer" ? contacts?.service_provider : contacts?.hirer;
  const app = applicationFrom(job);
  const alreadyApplied = !!job.has_applied || !!app;
  const closed = ["closed", "filled", "cancelled"].includes(String(job.status || "").toLowerCase());
  const gotJob = !!job.you_got_this_job;
  const ownerUuid = job.client_user_uuid || job.created_by || job.poster_uuid || poster.uuid || poster.profile_uuid || job.profile_uuid;
  const ownerName = poster.username || job.poster_username || job.username || "user";
  const routeUserUuid = job.current_user_uuid || job.viewer_uuid || route.params?.currentUserUuid || myUuid;
  const routeSaysOwnJob = !!routeUserUuid && !!ownerUuid && routeUserUuid === ownerUuid;
  const canApply = !closed && !alreadyApplied && !gotJob && !routeSaysOwnJob;
  const bottomInset = insets.bottom + 14;
  const assignedProviderUuid = job.assigned_provider_uuid || contacts?.service_provider?.uuid || otherParty?.uuid;
  const canRateProvider = routeSaysOwnJob && assignedProviderUuid && ["filled", "closed"].includes(String(job.status || "").toLowerCase());

  const openProfile = () => {
    if (!ownerUuid) return;
    navigation.navigate("UserProfile", { uuid: ownerUuid });
  };

  const applyForJob = async () => {
    const session = await getUserSession();
    const myUuid = session.profile?.uuid || session.user?.uuid;
    if ((myUuid && ownerUuid && myUuid === ownerUuid) || routeSaysOwnJob) return;
    navigation.navigate("JobApplication", { job: { ...job, code } });
  };

  const submitRating = async () => {
    if (!canRateProvider || ratingSaving) return;
    try {
      setRatingSaving(true);
      setRatingMessage("");
      await viewerRequest("post", `/recommendations/jobs/${job.id}/rate`, {
        provider_uuid: assignedProviderUuid,
        score: ratingScore,
        recommend: recommendProvider,
        reason: recommendProvider ? recommendReason : "",
        recommender_visible: false,
      });
      setRatingMessage(recommendProvider ? "Rating and recommendation saved." : "Rating saved.");
    } catch (err) {
      setRatingMessage(err?.response?.data?.message || "Could not save rating.");
    } finally {
      setRatingSaving(false);
    }
  };

  const actionLabel = routeSaysOwnJob
    ? "You Posted This Job"
    : closed
      ? "Applications Closed"
      : alreadyApplied
        ? "Already Applied"
        : "Apply For Job";

  const previewMode = previewApplication || (alreadyApplied && !!app);
  const selectedElsewhere = closed && alreadyApplied && !gotJob;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title={previewMode ? "My Request" : "Job Post"} navigation={navigation} theme={theme} styles={styles} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 108 + bottomInset }]}
      >
        <View style={styles.statusRow}>
          <Text style={styles.jobCode}>[{code}]</Text>
          <Text style={styles.status}>{previewMode ? statusLabel(app?.status || job.application_status || job.status) : statusLabel(job.status)}</Text>
        </View>

        <Text style={styles.heroTitle}>{job.title}</Text>

        <View style={styles.metaWrap}>
          <Text style={styles.meta}>{job.location || "Location not set"}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>Posted {formatRelativeDate(job.created_at) || "Today"}</Text>
          {job.tender_closes_at ? (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.meta}>{formatDeadline(job.tender_closes_at)}</Text>
            </>
          ) : null}
          {ownerName ? (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.meta}>@{ownerName}</Text>
            </>
          ) : null}
        </View>

        {previewMode ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Application</Text>
            {selectedElsewhere ? <Text style={styles.filledNote}>Job filled. Keep moving.</Text> : null}
            <InfoLine label="Budget" value={formatBudget(app?.budget)} styles={styles} />
            <InfoLine label="Duration" value={app?.duration || app?.estimated_time || "Not set"} styles={styles} />
            <InfoLine label="Availability" value={app?.available_from || app?.availableFrom || "Not set"} styles={styles} />
            <InfoLine label="Experience" value={app?.experience || "Not set"} styles={styles} />
            <Text style={styles.bodyText}>{app?.message || app?.explanation || "No plan submitted."}</Text>
            {app?.notes ? <Text style={styles.noteText}>{app.notes}</Text> : null}
            {mediaUrls(app?.media || app?.images).length ? (
              <ImageStrip images={mediaUrls(app?.media || app?.images)} styles={styles} />
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this job</Text>
              <Text style={styles.bodyText}>{job.description || "No description provided."}</Text>
            </View>

            {categories.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Required services</Text>
                <View style={styles.tags}>
                  {categories.map((category) => (
                    <Text key={category} style={styles.tag}>{category}</Text>
                  ))}
                </View>
              </View>
            ) : null}

            {images.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attached images</Text>
                <ImageStrip images={images} styles={styles} />
              </View>
            ) : null}

            <View style={styles.posterBlock}>
              {poster.profile_pic || poster.profilePic ? (
                <Image source={{ uri: poster.profile_pic || poster.profilePic }} style={styles.posterPic} />
              ) : (
                <View style={[styles.posterPic, styles.avatarPlaceholder]}>
                  <AppIcon name="user" size={22} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.posterInfo}>
                <Text style={styles.posterUsername}>@{ownerName}</Text>
                <Text style={styles.posterName}>{poster.full_name || poster.fullName || "User"}</Text>
              </View>
              <TouchableOpacity style={styles.profileBtn} onPress={openProfile} disabled={!ownerUuid}>
                <Text style={styles.profileBtnText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {otherParty ? (
          <ContactSection contact={otherParty} styles={styles} theme={theme} />
        ) : null}
        {canRateProvider ? (
          <RatingSection
            score={ratingScore}
            setScore={setRatingScore}
            recommend={recommendProvider}
            setRecommend={setRecommendProvider}
            reason={recommendReason}
            setReason={setRecommendReason}
            saving={ratingSaving}
            message={ratingMessage}
            onSubmit={submitRating}
            styles={styles}
            theme={theme}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.bottomAction, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.applyBtn, !canApply && styles.applyBtnDisabled]}
          disabled={!canApply}
          onPress={applyForJob}
        >
          <Text style={[styles.applyText, !canApply && styles.applyTextDisabled]}>{actionLabel}</Text>
        </TouchableOpacity>
        {previewMode && !closed ? (
          <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.navigate("JobApplication", { job, application: app })}>
            <Text style={styles.updateText}>Update Application</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Header({ title, navigation, theme, styles }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <AppIcon name="arrowLeft" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function InfoLine({ label, value, styles }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ImageStrip({ images, styles }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
      {images.map((uri, index) => (
        <Image key={`${uri}-${index}`} source={{ uri }} style={styles.jobImage} />
      ))}
    </ScrollView>
  );
}

function RatingSection({ score, setScore, recommend, setRecommend, reason, setReason, saving, message, onSubmit, styles, theme }) {
  return (
    <View style={styles.ratingSection}>
      <Text style={styles.sectionTitle}>Rate this provider</Text>
      <View style={styles.scoreGrid}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.scoreBtn, score === value && styles.scoreBtnActive]}
            onPress={() => setScore(value)}
          >
            <Text style={[styles.scoreText, score === value && styles.scoreTextActive]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.recommendToggle} onPress={() => setRecommend(!recommend)}>
        <AppIcon name={recommend ? "check-circle" : "plus-circle"} size={18} color={theme.colors.primary} />
        <Text style={styles.recommendToggleText}>Add recommendation</Text>
      </TouchableOpacity>
      {recommend ? (
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Why do you recommend this provider?"
          placeholderTextColor={theme.colors.textVeryMuted}
          multiline
          style={styles.recommendInput}
        />
      ) : null}
      {!!message ? <Text style={styles.ratingMessage}>{message}</Text> : null}
      <TouchableOpacity style={[styles.saveRatingBtn, saving && styles.applyBtnDisabled]} onPress={onSubmit} disabled={saving}>
        <Text style={styles.saveRatingText}>{saving ? "Saving..." : "Save rating"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ContactSection({ contact, styles, theme }) {
  const rows = [
    contact.phone_number ? { icon: "phone", label: "Phone", value: contact.phone_number } : null,
    contact.email ? { icon: "mail", label: "Email", value: contact.email } : null,
  ].filter(Boolean);
  const socials = Array.isArray(contact.socials) ? contact.socials : [];

  return (
    <View style={styles.contactSection}>
      <Text style={styles.sectionTitle}>Assigned Job Contact</Text>
      <View style={styles.posterBlock}>
        {contact.profile_pic ? (
          <Image source={{ uri: contact.profile_pic }} style={styles.posterPic} />
        ) : (
          <View style={[styles.posterPic, styles.avatarPlaceholder]}>
            <AppIcon name="user" size={22} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.posterInfo}>
          <Text style={styles.posterUsername}>@{contact.username || "user"}</Text>
          <Text style={styles.posterName}>{contact.full_name || "Assigned party"}</Text>
        </View>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.contactRow}>
          <AppIcon name={row.icon} size={16} color={theme.colors.primary} />
          <Text style={styles.contactLabel}>{row.label}</Text>
          <Text style={styles.contactValue}>{row.value}</Text>
        </View>
      ))}
      {socials.length ? (
        <Text style={styles.contactValue}>{socials.map((item) => item.handle || item.url || item.platform || String(item)).join("  ")}</Text>
      ) : null}
      {!rows.length && !socials.length ? (
        <Text style={styles.noteText}>Contact details are hidden by privacy settings.</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
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
    headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
    scrollContent: { padding: theme.spacing.md },
    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    jobCode: { color: theme.colors.primary, fontSize: 13, fontWeight: "900" },
    status: { color: theme.colors.primary, fontSize: 13, fontWeight: "900", textTransform: "capitalize" },
    heroTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 36, fontWeight: "900", marginBottom: 10 },
    metaWrap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 18 },
    meta: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800" },
    dot: { color: theme.colors.textVeryMuted || theme.colors.textMuted, fontSize: 13, fontWeight: "900" },
    section: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
    bodyText: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 23 },
    noteText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 12 },
    filledNote: {
      color: theme.colors.warning || theme.colors.accent,
      fontWeight: "900",
      marginBottom: 10,
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: {
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xs,
      paddingHorizontal: 11,
      paddingVertical: 7,
      fontSize: 13,
      fontWeight: "900",
      overflow: "hidden",
    },
    imagesRow: { gap: 10, paddingRight: 10 },
    jobImage: { width: 132, height: 96, borderRadius: theme.radius.xs, backgroundColor: theme.colors.surfaceSoft },
    posterBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    posterPic: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.surfaceSoft },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    posterInfo: { flex: 1, minWidth: 0 },
    posterUsername: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
    posterName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700", marginTop: 2 },
    profileBtn: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: theme.colors.surface,
    },
    profileBtnText: { color: theme.colors.text, fontSize: 12, fontWeight: "900" },
    contactSection: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    ratingSection: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    scoreBtn: {
      width: 42,
      height: 38,
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    scoreBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    scoreText: { color: theme.colors.textMuted, fontWeight: "900" },
    scoreTextActive: { color: theme.colors.onPrimary },
    recommendToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
    recommendToggleText: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
    recommendInput: {
      minHeight: 92,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      textAlignVertical: "top",
      backgroundColor: theme.colors.surface,
    },
    ratingMessage: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 10 },
    saveRatingBtn: {
      minHeight: 46,
      borderRadius: theme.radius.xs,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      backgroundColor: theme.colors.primary,
    },
    saveRatingText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    contactLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900", width: 54 },
    contactValue: { color: theme.colors.text, fontSize: 13, fontWeight: "800", flex: 1 },
    infoLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800" },
    infoValue: { color: theme.colors.text, fontSize: 13, fontWeight: "900", flex: 1, textAlign: "right" },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", marginBottom: 8 },
    emptyText: { color: theme.colors.textMuted, textAlign: "center" },
    bottomAction: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 12,
    },
    applyBtn: {
      minHeight: 54,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    applyBtnDisabled: { backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border },
    applyText: { color: theme.colors.onPrimary, fontSize: 17, fontWeight: "900" },
    applyTextDisabled: { color: theme.colors.textMuted },
    updateBtn: {
      minHeight: 46,
      borderRadius: theme.radius.xs,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
    },
    updateText: { color: theme.colors.primary, fontWeight: "900" },
  });
