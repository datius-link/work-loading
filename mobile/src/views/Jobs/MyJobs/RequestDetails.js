import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import AppIcon from "../../../icons/AppIcon";
import OverallRating from "../../Profile/OverallRating";
import { getUserSession } from "../../../utils/userSession";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { formatDeadline, formatJobDate, formatRelativeDate } from "../jobDate";
import { NavHeader, SectionHeading, statusConfig, tokenColors } from "../jobsUI";
import { useLanguage } from "../../../LanguageContext";
import { useAppTheme } from "../../../theme";

// ─── Progress timeline ──────────────────────────────────────────────────────
// Where the job is in its lifecycle, once you've been assigned/hired.
const TIMELINE_KEYS = ["posted", "assigned", "started", "submitted", "completed"];
const TIMELINE_LABELS = {
  posted: { en: "Posted", sw: "Imechapishwa" },
  assigned: { en: "Assigned", sw: "Amepangiwa" },
  started: { en: "Started", sw: "Imeanza" },
  submitted: { en: "Submitted", sw: "Imewasilishwa" },
  completed: { en: "Completed", sw: "Imekamilika" },
};

function timelineStepIndex(job) {
  const st = String(job?.status || "").toLowerCase();
  if (["completed", "closed", "filled"].includes(st) && job?.you_got_this_job) return 4;
  if (["completion_pending", "submitted"].includes(st)) return 3;
  if (["active", "start_pending", "started", "working"].includes(st)) return 2;
  if (job?.you_got_this_job || job?.assigned_provider_uuid) return 1;
  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// This screen used to import a static color palette (C.teal, C.red, ...)
// that didn't change with the theme, which is why things like the code pill,
// the workspace button and the contact icons all but disappeared in dark
// mode (dark teal text sitting on a dark teal tint). This derives the same
// shape from the active theme instead, so backgrounds/borders/buttons still
// look right — foreground text/icon spots that need extra contrast use
// theme.colors.primaryStrong directly (see below) rather than this shim.
function legacyColors(theme) {
  return {
    teal: theme.colors.primary,
    tealLight: theme.colors.primarySoft,
    white: theme.colors.onPrimary,
    slate: theme.colors.textMuted,
    red: theme.colors.danger,
    redLight: theme.colors.dangerSoft,
    amber: theme.colors.warning,
    amberLight: theme.colors.warningSoft,
  };
}

function mediaUrls(media) {
  if (!Array.isArray(media)) return [];
  return media.map((m) => (typeof m === "string" ? m : m?.url || m?.uri)).filter(Boolean);
}

function applicationFrom(job) {
  return job?.my_application || job?.application || job?.request || null;
}

function formatBudget(v) {
  const raw = String(v || "").trim();
  if (!raw) return "Not set";
  if (/^TZS\b/i.test(raw)) return raw;
  const n = raw.replace(/[^\d.]/g, "");
  return n ? `TZS ${Number(n).toLocaleString("en-US")}` : raw;
}

function avatarUri(u) {
  if (u?.profile_pic || u?.profilePic) return u.profile_pic || u.profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.username || u?.full_name || "U")}&background=0B6B63&color=fff&bold=true&rounded=true`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoLine({ label, value }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={s.infoLine}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// Small soft (not card-y) box used inside the 2x2 info grid — an icon so
// it's not text-only, a label, and the value.
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

// Posted → Assigned → Started → Submitted → Completed, with everything up
// to the current step highlighted. Built with a plain row of [dot][line]
// pairs (no absolute-position math) so it lays out predictably.
function ProgressTimeline({ activeIndex, language }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View>
      <View style={s.timelineRow}>
        {TIMELINE_KEYS.map((key, i) => {
          const done = i <= activeIndex;
          const isLast = i === TIMELINE_KEYS.length - 1;
          return (
            <React.Fragment key={key}>
              <View style={[s.timelineDot, done && s.timelineDotDone]}>
                {done ? <AppIcon name="check" size={10} color={theme.colors.onPrimary} /> : null}
              </View>
              {!isLast ? <View style={[s.timelineLine, i < activeIndex && s.timelineLineDone]} /> : null}
            </React.Fragment>
          );
        })}
      </View>
      <View style={s.timelineLabels}>
        {TIMELINE_KEYS.map((key, i) => (
          <Text key={key} style={[s.timelineLabel, i <= activeIndex && s.timelineLabelDone]} numberOfLines={1}>
            {language === "sw" ? TIMELINE_LABELS[key].sw : TIMELINE_LABELS[key].en}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ImageStrip({ images }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imagesRow}>
      {images.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} style={s.jobImage} />)}
    </ScrollView>
  );
}

// ─── Direct Hire Claim Panel ──────────────────────────────────────────────────
// Shown ONLY when the job was a direct hire targeted at this provider.
// Step 1: Claim / Decline buttons
// Step 2: After tapping Claim → expand inline form "How will you do this?"
// Step 3: Submit → goes to JobWorkspace

function DirectHirePanel({ job, onDeclined }) {
  const { language } = useLanguage();
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const C = useMemo(() => legacyColors(theme), [theme]);
  const navigation = useNavigation();
  const [step, setStep]         = useState("decision"); // "decision" | "plan"
  const [plan, setPlan]         = useState("");
  const [budget, setBudget]     = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("hours");
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining]   = useState(false);
  const [error, setError]       = useState("");

  const decline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      await viewerRequest("post", `/hiring/jobs/${job.id}/decline-direct`);
      onDeclined?.();
    } catch (e) {
      setError(getFriendlyApiError(e, language));
    } finally {
      setDeclining(false);
    }
  };

  const submit = async () => {
    if (!plan.trim()) { setError("Please describe how you'll do this work."); return; }
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await viewerRequest("post", `/hiring/jobs/${job.id}/accept-direct`, {
        provider_start_note: plan.trim(),
        budget: budget.trim() || undefined,
        estimated_duration_value: durationValue ? Number(durationValue) : undefined,
        estimated_duration_unit: durationValue ? durationUnit : undefined,
      });
      navigation.navigate("JobWorkspace", {
        jobId: job.id,
        jobCode: job.job_code,
      });
      
    } catch (e) {
      setError(getFriendlyApiError(e, language));
      setSubmitting(false);
    }
  };

  return (
    <View style={s.directPanel}>
      {/* Header label */}
      <View style={s.directHeader}>
        <View style={s.directIconWrap}>
          <AppIcon name="direct-hire" size={24} color={theme.colors.primaryStrong} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.directTitle}>You were directly hired</Text>
          <Text style={s.directSub}>The job owner selected you for this job.</Text>
        </View>
      </View>

      {step === "decision" && (
        <View style={s.directBtns}>
          <TouchableOpacity
            style={s.declineBtn}
            onPress={decline}
            disabled={declining}
            activeOpacity={0.85}
          >
            {declining
              ? <ActivityIndicator color={C.red} size="small" />
              : <><AppIcon name="close" size={16} color={C.red} /><Text style={s.declineTxt}>Decline</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={s.claimBtn}
            onPress={() => setStep("plan")}
            activeOpacity={0.85}
          >
            <AppIcon name="check" size={16} color={C.white} />
            <Text style={s.claimTxt}>Claim Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "plan" && (
        <View style={s.planForm}>
          <Text style={s.planLabel}>How will you do this work?</Text>
          <Text style={s.planHint}>
            Tell the hirer your approach — what you'll do first, tools you'll use, when you can start.
          </Text>
          <TextInput
            style={s.planInput}
            placeholder="e.g. Nitaanza na kukagua tatizo, kisha…"
            placeholderTextColor={C.slate}
            value={plan}
            onChangeText={setPlan}
            multiline
            textAlignVertical="top"
          />

          {/* Optional budget + duration */}
          <View style={s.planRow}>
            <View style={s.planHalf}>
              <Text style={s.planFieldLabel}>Your Price (TZS)</Text>
              <View style={s.moneyInput}>
                <Text style={s.moneyPrefix}>TZS</Text>
                <TextInput
                  style={s.moneyField}
                  placeholder="50,000"
                  placeholderTextColor={C.slate}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={s.planHalf}>
              <Text style={s.planFieldLabel}>Est. Duration</Text>
              <View style={s.durationField}>
                <TextInput
                  style={[s.planFieldInput, s.durationValueInput]}
                  placeholder="2"
                  placeholderTextColor={C.slate}
                  value={durationValue}
                  onChangeText={(value) => setDurationValue(value.replace(/[^\d.]/g, ""))}
                  keyboardType="decimal-pad"
                />
                <View style={s.durationUnits}>
                  {["hours", "days", "weeks"].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[s.durationUnit, durationUnit === unit && s.durationUnitActive]}
                      onPress={() => setDurationUnit(unit)}
                    >
                      <Text style={[s.durationUnitText, durationUnit === unit && s.durationUnitTextActive]}>
                        {unit.slice(0, 1).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {error ? <Text style={s.errorTxt}>{error}</Text> : null}

          <View style={s.planActions}>
            <TouchableOpacity style={s.planBack} onPress={() => { setStep("decision"); setError(""); }}>
              <AppIcon name="arrowLeft" size={14} color={C.slate} />
              <Text style={s.planBackTxt}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.planSubmit, submitting && { opacity: 0.6 }]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color={C.white} size="small" />
                : <><AppIcon name="check-circle" size={16} color={C.white} /><Text style={s.planSubmitTxt}>Confirm & Open Workspace</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && step === "decision" ? <Text style={s.errorTxt}>{error}</Text> : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RequestDetails() {
  const { language } = useLanguage();
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const C = useMemo(() => legacyColors(theme), [theme]);
  const tx = (en, sw) => language === "sw" ? sw : en;
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 900;

  const routeJob = route.params?.job || null;
  const [detailJob,        setDetailJob]        = useState(null);
  const [myUuid,           setMyUuid]           = useState(null);
  const [ratingScore,      setRatingScore]      = useState(4);
  const [recommendProvider,setRecommendProvider]= useState(false);
  const [recommendReason,  setRecommendReason]  = useState("");
  const [ratingSaving,     setRatingSaving]     = useState(false);
  const [ratingMessage,    setRatingMessage]    = useState("");
  const [declined,         setDeclined]         = useState(false);
  const publishRealtimeEvent = useMutation(convexApi.realtimeEvents.publish);

  const job = detailJob || routeJob;
  const previewApplication = !!route.params?.previewApplication;

  // Fetch full job detail
  useEffect(() => {
    const id = routeJob?.id;
    if (!id) return;
    let cancelled = false;
    viewerRequest("get", `/hiring/jobs/${id}`)
      .then((res) => { if (!cancelled && res?.data?.job) setDetailJob(res.data.job); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [routeJob?.id]);

  // Get my session uuid
  useEffect(() => {
    let cancelled = false;
    getUserSession().then((s) => {
      if (!cancelled) setMyUuid(s?.profile?.uuid || s?.user?.uuid || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!job) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <NavHeader title="Job Post" onBack={() => navigation.goBack()} />
        <View style={s.emptyState}>
          <AppIcon name="alert-circle" size={40} color={C.slate} />
          <Text style={s.emptyTitle}>Job not available</Text>
          <Text style={s.emptyText}>Open an available job from Requests.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const code   = job.job_code || job.code || "JOB";
  const images = mediaUrls(job.media || job.images);
  const poster = job.poster || {};
  const app    = applicationFrom(job);

  const isDirectHire   = job.hire_type === "direct" || !!job.target_provider_uuid;
  const alreadyApplied = !!job.has_applied || !!app;
  const gotJob         = !!job.you_got_this_job;
  const closed         = ["closed", "filled", "cancelled", "completed"].includes(String(job.status || "").toLowerCase());
  const jobStatus      = String(job.status || "open");

  const ownerUuid      = job.client_user_uuid || job.created_by || job.poster_uuid || poster.uuid || poster.profile_uuid || job.profile_uuid;
  const ownerName      = poster.username || job.poster_username || job.username || "user";
  const routeUserUuid  = job.current_user_uuid || job.viewer_uuid || route.params?.currentUserUuid || myUuid;
  const isOwnJob       = !!routeUserUuid && !!ownerUuid && routeUserUuid === ownerUuid;

  const contacts           = job.contact_details || null;
  const otherParty         = contacts?.viewer_role === "hirer" ? contacts?.service_provider : contacts?.hirer;
  const assignedProviderUuid = job.assigned_provider_uuid || contacts?.service_provider?.uuid || otherParty?.uuid;
  const canRateProvider    = isOwnJob && assignedProviderUuid && jobStatus.toLowerCase() === "completed" && !job.rating_submitted_at && !job.rating;

  // The person to show in the header: whoever is actually assigned/matched
  // on this job, falling back to the job poster if no one's been matched
  // yet. Showing this once in the header means we don't need to repeat the
  // same identity again lower down in a "Posted by" / "Assigned Contact" card.
  const headerPerson = otherParty
    ? { uuid: otherParty.uuid, username: otherParty.username, full_name: otherParty.full_name, profile_pic: otherParty.profile_pic, phone: otherParty.phone_number, ratings: otherParty.ratings, ratingsCount: otherParty.ratings_count, role: tx("Assigned to this job", "Amepangiwa kazi hii") }
    : ownerUuid
      ? { uuid: ownerUuid, username: ownerName, full_name: poster.full_name || poster.fullName, profile_pic: poster.profile_pic || poster.profilePic, phone: null, ratings: null, ratingsCount: null, role: tx("Job owner", "Mwenye kazi") }
      : null;

  // Can this provider see the claim panel?
  const canClaimDirect = isDirectHire && !isOwnJob && !gotJob && !alreadyApplied && !closed && !declined && job.can_accept_direct_hire;
  const canApplyPublic = !isDirectHire && !isOwnJob && !alreadyApplied && !gotJob && !closed;

  const previewMode      = previewApplication || (alreadyApplied && !!app);
  const selectedElsewhere = closed && alreadyApplied && !gotJob;
  const categories       = (job.categories || [job.service_type || job.service]).filter(Boolean);

  const bottomInset = insets.bottom + 14;
  const desktopBarInset = isWide ? Math.max((width - 1040) / 2, 0) : 0;

  // ── Rating submit ──────────────────────────────────────────────────────────
  const submitRating = async () => {
    if (!canRateProvider || ratingSaving) return;
    if (ratingScore === 5 && recommendProvider && recommendReason.trim().length < 8) {
      setRatingMessage("Please explain your recommendation in at least 8 characters.");
      return;
    }
    try {
      setRatingSaving(true);
      setRatingMessage("");
      const ratingResponse = await viewerRequest("post", `/recommendations/jobs/${job.id}/rate`, {
        provider_uuid: assignedProviderUuid,
        score: ratingScore,
        comment: "",
      });
      setDetailJob((current) => ({
        ...(current || job),
        rating: ratingResponse?.data?.rating || { score: ratingScore },
        rating_submitted_at: ratingResponse?.data?.rating?.created_at || new Date().toISOString(),
      }));
      let recommendationSaved = false;
      if (ratingScore === 5 && recommendProvider) {
        await viewerRequest("post", `/recommendations/jobs/${job.id}/recommend`, {
          provider_uuid: assignedProviderUuid,
          recommend: true,
          reason: recommendReason,
          recommender_visible: false,
        });
        recommendationSaved = true;
      }
      await publishRealtimeEvent({
        channel: `profile:${assignedProviderUuid}`,
        actorUuid: myUuid || undefined,
        event: "rating_submitted",
      });
      setRatingMessage(recommendationSaved ? "Rating and recommendation saved." : "Rating saved.");
    } catch (err) {
      setRatingMessage(getFriendlyApiError(err, language));
    } finally {
      setRatingSaving(false);
    }
  };

  // ── Action button label (public / own / already applied) ──────────────────
  const publicActionLabel = isOwnJob
    ? "You Posted This Job"
    : closed
      ? "Applications Closed"
      : alreadyApplied
        ? "Already Applied"
        : "Apply For Job";

  const publicActionDisabled = isOwnJob || closed || alreadyApplied;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <NavHeader
        title={previewMode ? tx("My Request", "Ombi Langu") : isDirectHire ? tx("Direct Hire", "Ajira ya Moja kwa Moja") : tx("Job Post", "Tangazo la Kazi")}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
      <ScrollView
        style={Platform.OS === "web" && s.webScroller}
        showsVerticalScrollIndicator={Platform.OS === "web"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.scroll, { paddingBottom: canApplyPublic ? 100 + bottomInset : 32 + bottomInset }, isWide && s.scrollWide]}
      >
        <View style={[s.contentShell, isWide && s.contentShellWide]}>
        {/* ── Job hero — branded banner, holds the job facts + whoever is
             assigned/owns the job, so that identity isn't repeated again
             further down the page. Rounded bottom corners + a soft shadow
             make it read as a floating panel rather than a hard rectangle. ── */}
        <View style={[s.heroShadow, isWide && s.heroShadowWide]}>
        <LinearGradient
          colors={theme.colors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, isWide && s.desktopCard]}
        >
          {/* Purely decorative — two faint circles so the banner isn't a
             flat block of color. Doesn't affect layout (absolute + behind
             everything else, ignored by touches). */}
          <Svg width="100%" height="100%" style={s.heroDecoration} pointerEvents="none">
            <Circle cx="92%" cy="6%" r="70" fill="#FFFFFF" opacity="0.07" />
            <Circle cx="102%" cy="55%" r="46" fill="#FFFFFF" opacity="0.06" />
          </Svg>

          <View style={s.heroTop}>
            <View style={s.codePill}><Text style={s.codeTxt}>{code}</Text></View>
            <View style={s.statusPill}>
              <View style={[s.statusDot, { backgroundColor: tokenColors(theme, statusConfig(jobStatus).token).color }]} />
              <Text style={s.statusPillTxt}>{language === "sw" ? (statusConfig(jobStatus).sw || statusConfig(jobStatus).label) : statusConfig(jobStatus).label}</Text>
            </View>
          </View>
          <Text style={s.heroTitle} numberOfLines={2}>{job.title}</Text>
          <View style={s.metaRow}>
            <AppIcon name="map-pin" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={s.heroMeta}>{job.location || tx("Location not set", "Eneo halijawekwa")}</Text>
            <Text style={s.heroMetaDot}>·</Text>
            <AppIcon name="clock" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={s.heroMeta}>{formatRelativeDate(job.created_at) || tx("Today", "Leo")}</Text>
          </View>

          {headerPerson ? (
            <View style={s.personChip}>
              <TouchableOpacity
                style={s.personMain}
                activeOpacity={0.85}
                onPress={() => headerPerson.uuid && navigation.navigate("UserProfile", { uuid: headerPerson.uuid })}
              >
                <Image source={{ uri: avatarUri(headerPerson) }} style={s.personAvatar} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.personNameRow}>
                    <Text style={[s.personName, { flexShrink: 1 }]} numberOfLines={1}>@{headerPerson.username || "user"}</Text>
                    {headerPerson.ratings != null ? (
                      <View style={{ flexShrink: 0 }}>
                        <OverallRating value={headerPerson.ratings} count={0} theme={theme} compact textColor="#FFFFFF" mutedColor="rgba(255,255,255,0.7)" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.personRole} numberOfLines={1}>{headerPerson.role}</Text>
                </View>
              </TouchableOpacity>

              <View style={s.personActions}>
                {headerPerson.phone ? (
                  <TouchableOpacity style={s.personActionBtn} onPress={() => Linking.openURL(`tel:${headerPerson.phone}`)}>
                    <AppIcon name="phone" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
                {gotJob ? (
                  <TouchableOpacity style={s.personActionBtn} onPress={() => navigation.navigate("JobWorkspace", { jobId: job.id, jobCode: job.job_code, tab: "chat" })}>
                    <AppIcon name="message-circle" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={s.personProfileBtn}
                  onPress={() => headerPerson.uuid && navigation.navigate("UserProfile", { uuid: headerPerson.uuid })}
                >
                  <Text style={s.personProfileTxt}>{tx("View Profile", "Ona Profaili")}</Text>
                  <AppIcon name="chevron-right" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </LinearGradient>
        </View>

        {/* ── Direct hire claim panel (ONLY for targeted provider, before claiming) ── */}
        {canClaimDirect && (
          <DirectHirePanel job={job} onDeclined={() => setDeclined(true)} />
        )}

        {/* Declined confirmation */}
        {declined && (
          <View style={s.declinedBanner}>
            <AppIcon name="x-circle" size={18} color={C.red} />
            <Text style={s.declinedTxt}>You declined this job offer.</Text>
          </View>
        )}

        {/* ── Application preview (provider: already applied or got job) ── */}
        {previewMode && (
          <View style={s.sectionTinted}>
            <SectionHeading label={tx("Your Application", "Ombi Lako")} />
            {selectedElsewhere && (
              <View style={s.filledBanner}>
                <AppIcon name="info" size={14} color={C.amber} />
                <Text style={s.filledTxt}>Job filled. Keep moving.</Text>
              </View>
            )}
            {gotJob && (
              <TouchableOpacity style={s.workspaceBtn} onPress={() => navigation.navigate("JobWorkspace", {
                  jobId: job.id,
                  jobCode: job.job_code,
                })}>
                <AppIcon name="message-circle" size={15} color={theme.colors.onPrimary} />
                <Text style={s.workspaceBtnTxt}>{tx("Open Job Workspace", "Fungua Eneo la Kazi")}</Text>
                <AppIcon name="chevron-right" size={15} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            )}

            {gotJob ? <ProgressTimeline activeIndex={timelineStepIndex(job)} language={language} /> : null}

            {/* 2x2 grid instead of a stacked label/value list — small icons
               so it isn't just plain text. */}
            <View style={s.infoGrid}>
              <GridItem icon="wallet" label={tx("Budget", "Bajeti")} value={formatBudget(app?.budget)} />
              <GridItem icon="clock" label={tx("Duration", "Muda")} value={app?.duration || app?.estimated_time || tx("Not set", "Haijawekwa")} />
              <GridItem icon="calendar" label={tx("Availability", "Upatikanaji")} value={app?.available_from || app?.availableFrom || tx("Not set", "Haijawekwa")} />
              <GridItem icon="award" label={tx("Experience", "Uzoefu")} value={app?.experience || tx("Not set", "Haijawekwa")} />
            </View>

            {app?.message || app?.explanation ? (
              <View style={s.noteBox}>
                <View style={s.noteHeader}>
                  <AppIcon name="comment" size={13} color={theme.colors.primaryStrong} />
                  <Text style={s.noteHeaderTxt}>{tx("Provider Note", "Maelezo ya Mtoa Huduma")}</Text>
                </View>
                <Text style={s.appPlan}>{app.message || app.explanation}</Text>
              </View>
            ) : null}
            {mediaUrls(app?.media || app?.images).length ? (
              <ImageStrip images={mediaUrls(app?.media || app?.images)} />
            ) : null}
          </View>
        )}

        {/* ── Provider actions — bigger, deliberate buttons, separate from
             the quick icons already in the header chip. ── */}
        {gotJob ? (
          <View style={s.sectionSoft}>
            <SectionHeading label={tx("Actions", "Vitendo")} />
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => navigation.navigate("JobWorkspace", { jobId: job.id, jobCode: job.job_code, tab: "chat" })}
              >
                <AppIcon name="message-circle" size={16} color={theme.colors.primaryStrong} />
                <Text style={s.actionBtnTxt}>{tx("Message", "Ujumbe")}</Text>
              </TouchableOpacity>
              {headerPerson?.phone ? (
                <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${headerPerson.phone}`)}>
                  <AppIcon name="phone" size={16} color={theme.colors.primaryStrong} />
                  <Text style={s.actionBtnTxt}>{tx("Call", "Piga Simu")}</Text>
                </TouchableOpacity>
              ) : null}
              {closed ? (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => navigation.navigate("JobWorkspace", { jobId: job.id, jobCode: job.job_code, tab: "progress" })}
                >
                  <AppIcon name="star" size={16} color={theme.colors.primaryStrong} />
                  <Text style={s.actionBtnTxt}>{job.rating ? tx("View Rating", "Ona Tathmini") : tx("Rating", "Tathmini")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Job description ── */}
        {!previewMode && (
          <View style={s.sectionSoft}>
            <SectionHeading label="About this job" />
            <Text style={s.bodyText}>{job.description || "No description provided."}</Text>
          </View>
        )}

        {/* ── Required services ── */}
        {!previewMode && categories.length ? (
          <View style={s.sectionSoft}>
            <SectionHeading label="Required services" />
            <View style={s.tags}>
              {categories.map((cat) => (
                <View key={cat} style={s.tag}>
                  <Text style={s.tagTxt}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Job images ── */}
        {!previewMode && images.length ? (
          <View style={s.sectionSoft}>
            <SectionHeading label="Attached images" />
            <ImageStrip images={images} />
          </View>
        ) : null}

        {/* Phone now lives in the header chip above. Email doesn't fit there,
           so it's the only thing left in this section — and it disappears
           entirely once there's nothing to show. */}
        {otherParty?.email ? (
          <View style={s.section}>
            <SectionHeading label={tx("Contact Details", "Mawasiliano")} />
            <View style={s.contactRow}>
              <AppIcon name="mail" size={14} color={theme.colors.primaryStrong} />
              <Text style={s.contactLabel}>Email</Text>
              <Text style={s.contactValue}>{otherParty.email}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Rating section (hirer rates provider after completion) ── */}
        {canRateProvider && (
          <View style={s.sectionSoft}>
            <SectionHeading label="Rate this provider" />
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={s.scoreBtn}
                  onPress={() => {
                    setRatingScore(n);
                    if (n !== 5) setRecommendProvider(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star rating`}
                >
                  <AppIcon name="star" size={31} color="#F5B301" filled={n <= ratingScore} />
                </TouchableOpacity>
              ))}
            </View>
            {ratingScore === 5 ? (
              <>
                <TouchableOpacity style={s.recommendToggle} onPress={() => setRecommendProvider(!recommendProvider)}>
                  <AppIcon name={recommendProvider ? "check-circle" : "plus-circle"} size={18} color={theme.colors.primaryStrong} />
                  <Text style={s.recommendTxt}>Add a recommendation</Text>
                </TouchableOpacity>
                {recommendProvider ? (
                  <TextInput
                    value={recommendReason}
                    onChangeText={setRecommendReason}
                    placeholder="Why do you recommend this provider?"
                    placeholderTextColor={C.slate}
                    multiline
                    style={s.recommendInput}
                  />
                ) : null}
              </>
            ) : null}
            {ratingMessage ? <Text style={s.ratingMsg}>{ratingMessage}</Text> : null}
            <TouchableOpacity style={[s.saveRatingBtn, ratingSaving && { opacity: 0.6 }]} onPress={submitRating} disabled={ratingSaving}>
              {ratingSaving
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.saveRatingTxt}>Save Rating</Text>
              }
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom action bar — PUBLIC job only ── */}
      {!isDirectHire && !previewMode && (
        <View style={[s.bottomBar, { paddingBottom: bottomInset }, isWide && { left: desktopBarInset, right: desktopBarInset }]}>
          <TouchableOpacity
            style={[s.applyBtn, publicActionDisabled && s.applyBtnDisabled]}
            disabled={publicActionDisabled}
            onPress={() => navigation.navigate("JobApplication", { job: { ...job, code } })}
            activeOpacity={0.88}
          >
            <Text style={[s.applyTxt, publicActionDisabled && s.applyTxtDisabled]}>
              {publicActionLabel}
            </Text>
          </TouchableOpacity>
          {previewMode && !closed ? (
            <TouchableOpacity style={s.updateBtn} onPress={() => navigation.navigate("JobApplication", { job, application: app })}>
              <Text style={s.updateTxt}>Update Application</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Update application bar — preview mode */}
      {previewMode && !closed && !isDirectHire && (
        <View style={[s.bottomBar, { paddingBottom: bottomInset }, isWide && { left: desktopBarInset, right: desktopBarInset }]}>
          <TouchableOpacity style={s.updateBtn} onPress={() => navigation.navigate("JobApplication", { job, application: app })}>
            <Text style={s.updateTxt}>Update Application</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme) => {
  const C = legacyColors(theme);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  keyboard: { flex: 1 },
  webScroller: { height: "100vh" },
  scroll: { paddingBottom: 40 },
  scrollWide: { alignItems: "center", paddingTop: 16 },
  contentShell: { width: "100%" },
  contentShellWide: { maxWidth: 1040, gap: 12 },

  // Hero — a branded gradient banner (theme.colors.brandGradient, teal→accent,
  // fixed per brand rather than per light/dark mode) instead of a plain
  // surface block. Everything inside it is white/translucent-white so it
  // stays legible regardless of theme, and the code/status chips sit on
  // white-tinted glass rather than another teal-on-teal combo.
  // Rounded bottom corners + a shadow on the wrapper (not the gradient
  // itself, since overflow:hidden for the radius would clip the shadow
  // too) make it float above the page instead of ending in a hard edge.
  heroShadow: {
    shadowColor: "#0B6B63", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 10,
  },
  heroShadowWide: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: "hidden" },
  // Trimmed padding/gap vs before — less empty air, so the banner reads as
  // a compact header strip rather than a big block of color.
  hero: { padding: 18, paddingBottom: 20, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  desktopCard: { borderRadius: 24 },
  heroDecoration: { position: "absolute", left: 0, top: 0 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  codePill: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeTxt: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillTxt: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", lineHeight: 27 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 20 },
  heroMeta: { color: "rgba(255,255,255,0.88)", fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  heroMetaDot: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginHorizontal: 1 },

  // The assigned/owner person — with rating, phone, and quick actions —
  // shown once inside the banner instead of repeated in a card further down.
  personChip: {
    backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16,
    padding: 10, marginTop: 8, gap: 10,
  },
  personMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  personAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.3)" },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  personName: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  personRole: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: "600", marginTop: 1 },
  personActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  personActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  personProfileBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    minHeight: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)",
  },
  personProfileTxt: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },

  // No more boxes: sections just flow down the page with breathing room.
  // "Your Application" sits right under the hero so it needs no extra
  // divider; everything after it gets a thin hairline up top to mark a new
  // group, instead of a background block.
  sectionTinted: { marginHorizontal: 16, marginTop: 20 },
  sectionSoft: { marginHorizontal: 16, marginTop: 26, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
  section: { marginHorizontal: 16, marginTop: 26, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },

  // Direct hire panel
  directPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.teal + "40",
    backgroundColor: theme.colors.primarySoft,
    overflow: "hidden",
  },
  directHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.teal + "25",
  },
  directIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.teal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  directTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  directSub: { fontSize: 12, color: theme.colors.primaryStrong, marginTop: 2 },
  directBtns: { flexDirection: "row", gap: 10, padding: 14 },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    minHeight: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.red + "50",
    backgroundColor: C.redLight,
  },
  declineTxt: { color: C.red, fontWeight: "800", fontSize: 15 },
  claimBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 48, borderRadius: 12,
    backgroundColor: C.teal,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  claimTxt: { color: C.white, fontWeight: "800", fontSize: 15 },

  // Plan form (step 2 of direct hire)
  planForm: { padding: 14, gap: 12 },
  planLabel: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
  planHint: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
  planInput: {
    minHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: C.teal + "40",
    backgroundColor: theme.colors.surface, color: theme.colors.text,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, lineHeight: 21, textAlignVertical: "top",
  },
  planRow: { flexDirection: "row", gap: 10 },
  planHalf: { flex: 1, gap: 6 },
  planFieldLabel: { fontSize: 11, fontWeight: "700", color: C.slate, textTransform: "uppercase", letterSpacing: 0.6 },
  moneyInput: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1, borderColor: C.teal + "40",
    backgroundColor: theme.colors.surface, minHeight: 44,
  },
  moneyPrefix: { paddingHorizontal: 10, color: theme.colors.primaryStrong, fontWeight: "800", fontSize: 13 },
  moneyField: { flex: 1, color: theme.colors.text, fontSize: 14, paddingRight: 10 },
  planFieldInput: {
    minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: C.teal + "40",
    backgroundColor: theme.colors.surface, color: theme.colors.text,
    paddingHorizontal: 12, fontSize: 14,
  },
  durationField: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationValueInput: { flex: 1, minWidth: 52 },
  durationUnits: { flexDirection: "row", gap: 4 },
  durationUnit: {
    width: 28, height: 44, borderRadius: 8, borderWidth: 1, borderColor: C.teal + "40",
    alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface,
  },
  durationUnitActive: { backgroundColor: C.teal, borderColor: C.teal },
  durationUnitText: { color: theme.colors.primaryStrong, fontSize: 12, fontWeight: "800" },
  durationUnitTextActive: { color: C.white },
  planActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  planBack: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    minHeight: 44, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  planBackTxt: { color: C.slate, fontWeight: "700", fontSize: 13 },
  planSubmit: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 48, borderRadius: 12, backgroundColor: C.teal,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  planSubmitTxt: { color: C.white, fontWeight: "800", fontSize: 14 },

  errorTxt: { color: C.red, fontSize: 13, fontWeight: "600", textAlign: "center", padding: 4 },
  declinedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: C.redLight, borderRadius: 10, padding: 12,
  },
  declinedTxt: { color: C.red, fontSize: 13, fontWeight: "700" },

  // Workspace shortcut — solid, high-contrast (this used to be a soft teal
  // tint with teal text, which nearly vanished in dark mode).
  workspaceBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: theme.colors.primary, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  workspaceBtnTxt: { flex: 1, color: theme.colors.onPrimary, fontSize: 13.5, fontWeight: "800" },

  bodyText: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22 },

  // Tags
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: C.tealLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagTxt: { color: theme.colors.primaryStrong, fontSize: 13, fontWeight: "700" },

  // Images
  imagesRow: { gap: 10, paddingRight: 4 },
  jobImage: { width: 140, height: 100, borderRadius: 12, backgroundColor: theme.colors.surfaceSoft },

  // Poster
  posterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  posterAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceSoft },
  posterUsername: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  posterFull: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  viewProfileBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.primaryStrong,
  },
  viewProfileTxt: { color: theme.colors.primaryStrong, fontSize: 12, fontWeight: "700" },

  // Contact
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  contactLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", width: 48 },
  contactValue: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "700" },

  // Application preview
  infoLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "600" },
  infoValue: { color: theme.colors.text, fontSize: 13, fontWeight: "700", flex: 1, textAlign: "right" },
  appPlan: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  filledBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.amberLight, borderRadius: 8, padding: 10, marginBottom: 10 },
  filledTxt: { color: C.amber, fontSize: 13, fontWeight: "700" },

  // 2x2 info grid — small soft boxes (not big bordered cards) with an icon
  // each, instead of a stacked label/value text list.
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  gridItem: {
    flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: theme.colors.surfaceSoft, borderRadius: 14, padding: 11,
  },
  gridIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  gridLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  gridValue: { color: theme.colors.text, fontSize: 13.5, fontWeight: "800", marginTop: 1 },

  // Provider note — a small labeled, softly-tinted quote block instead of
  // an unlabeled paragraph floating on its own.
  noteBox: { marginTop: 14, backgroundColor: theme.colors.surfaceSoft, borderRadius: 14, padding: 12 },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  noteHeaderTxt: { color: theme.colors.primaryStrong, fontSize: 11.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  // Progress timeline — Posted → Assigned → Started → Submitted → Completed.
  // A row of dots connected by flexible line segments, then a separate row
  // of evenly-spaced labels underneath (each label owns 1/5 of the width,
  // same as each dot+half-line pair above it, so they line up).
  timelineRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft, borderWidth: 2, borderColor: theme.colors.border,
  },
  timelineDotDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  timelineLine: { flex: 1, height: 2, backgroundColor: theme.colors.border },
  timelineLineDone: { backgroundColor: theme.colors.success },
  timelineLabels: { flexDirection: "row", marginTop: 5 },
  timelineLabel: { flex: 1, fontSize: 9, fontWeight: "700", color: theme.colors.textMuted, textAlign: "center" },
  timelineLabelDone: { color: theme.colors.text, fontWeight: "800" },

  // Provider actions — Message / Call / Rating, bigger deliberate buttons.
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  actionBtn: {
    flexBasis: "30%", flexGrow: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    minHeight: 44, borderRadius: 14, backgroundColor: theme.colors.primarySoft,
  },
  actionBtnTxt: { color: theme.colors.primaryStrong, fontSize: 12.5, fontWeight: "800" },

  // Rating
  starsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  scoreBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  recommendToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  recommendTxt: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  recommendInput: { minHeight: 88, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, color: theme.colors.text, textAlignVertical: "top", backgroundColor: theme.colors.surface, marginBottom: 8 },
  ratingMsg: { color: C.slate, fontSize: 13, marginTop: 4 },
  saveRatingBtn: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.teal, marginTop: 6 },
  saveRatingTxt: { color: C.white, fontSize: 15, fontWeight: "800" },

  // Bottom bar (public apply)
  // Rounded top corners + a shadow instead of a flat top border, so it
  // reads as a floating sheet sitting over the content rather than a
  // hard-edged bar bolted to the bottom of the screen.
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    gap: 8, backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 12,
    paddingHorizontal: 16, paddingTop: 14,
  },
  applyBtn: {
    minHeight: 54, borderRadius: 16, backgroundColor: C.teal,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  applyBtnDisabled: { backgroundColor: theme.colors.surfaceSoft, shadowOpacity: 0 },
  applyTxt: { color: C.white, fontSize: 17, fontWeight: "800" },
  applyTxtDisabled: { color: C.slate },
  updateBtn: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.tealLight, borderWidth: 1.5, borderColor: theme.colors.primaryStrong },
  updateTxt: { color: theme.colors.primaryStrong, fontWeight: "800", fontSize: 15 },

  // Empty state
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" },
  });
};
