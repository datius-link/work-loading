import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import AppIcon from "../../../icons/AppIcon";
import { getUserSession } from "../../../utils/userSession";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { formatDeadline, formatJobDate, formatRelativeDate } from "../jobDate";
import { C, StatusBadge, NavHeader, SectionHeading, Card, PrimaryButton, OutlineButton } from "../jobsUI";
import { useLanguage } from "../../../LanguageContext";
import { useAppTheme } from "../../../theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          <AppIcon name="direct-hire" size={24} color={C.teal} />
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
              : <><AppIcon name="x" size={16} color={C.red} /><Text style={s.declineTxt}>Decline</Text></>
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
  const canRateProvider    = isOwnJob && assignedProviderUuid && ["filled", "closed", "completed"].includes(jobStatus.toLowerCase());

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
    try {
      setRatingSaving(true);
      setRatingMessage("");
      await viewerRequest("post", `/recommendations/jobs/${job.id}/rate`, {
        provider_uuid: assignedProviderUuid,
        score: ratingScore,
        recommend: ratingScore === 5 && recommendProvider,
        reason: recommendProvider ? recommendReason : "",
        recommender_visible: false,
      });
      await publishRealtimeEvent({
        channel: `profile:${assignedProviderUuid}`,
        actorUuid: myUuid || undefined,
        event: "rating_submitted",
      });
      setRatingMessage(ratingScore === 5 && recommendProvider ? "Rating and recommendation saved." : "Rating saved.");
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
        {/* ── Job hero ── */}
        <View style={[s.hero, isWide && s.desktopCard]}>
          <View style={s.heroTop}>
            <View style={s.codePill}><Text style={s.codeTxt}>{code}</Text></View>
            <StatusBadge status={jobStatus} size="sm" />
          </View>
          <Text style={s.heroTitle}>{job.title}</Text>
          <View style={s.metaRow}>
            <AppIcon name="map-pin" size={13} color={C.slate} />
            <Text style={s.meta}>{job.location || tx("Location not set", "Eneo halijawekwa")}</Text>
          </View>
          <View style={s.metaRow}>
            <AppIcon name="clock" size={13} color={C.slate} />
            <Text style={s.meta}>
              {tx("Posted", "Ilichapishwa")} {formatRelativeDate(job.created_at) || tx("Today", "Leo")}
              {job.tender_closes_at ? `  ·  ${formatDeadline(job.tender_closes_at)}` : ""}
            </Text>
          </View>
          {ownerName ? (
            <TouchableOpacity style={s.metaRow} onPress={() => ownerUuid && navigation.navigate("UserProfile", { uuid: ownerUuid })}>
              <AppIcon name="user" size={13} color={C.teal} />
              <Text style={[s.meta, { color: C.teal, fontWeight: "700" }]}>@{ownerName}</Text>
            </TouchableOpacity>
          ) : null}
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
          <Card style={s.section}>
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
                <AppIcon name="message-circle" size={15} color={C.teal} />
                <Text style={s.workspaceBtnTxt}>{tx("Open Job Workspace", "Fungua Eneo la Kazi")}</Text>
                <AppIcon name="chevron-right" size={15} color={C.teal} />
              </TouchableOpacity>
            )}
            <InfoLine label={tx("Budget", "Bajeti")} value={formatBudget(app?.budget)} />
            <InfoLine label={tx("Duration", "Muda")} value={app?.duration || app?.estimated_time || tx("Not set", "Haijawekwa")} />
            <InfoLine label={tx("Availability", "Upatikanaji")} value={app?.available_from || app?.availableFrom || tx("Not set", "Haijawekwa")} />
            <InfoLine label={tx("Experience", "Uzoefu")} value={app?.experience || tx("Not set", "Haijawekwa")} />
            {app?.message || app?.explanation ? (
              <Text style={s.appPlan}>{app.message || app.explanation}</Text>
            ) : null}
            {mediaUrls(app?.media || app?.images).length ? (
              <ImageStrip images={mediaUrls(app?.media || app?.images)} />
            ) : null}
          </Card>
        )}

        {/* ── Job description ── */}
        {!previewMode && (
          <Card style={s.section}>
            <SectionHeading label="About this job" />
            <Text style={s.bodyText}>{job.description || "No description provided."}</Text>
          </Card>
        )}

        {/* ── Required services ── */}
        {!previewMode && categories.length ? (
          <Card style={s.section}>
            <SectionHeading label="Required services" />
            <View style={s.tags}>
              {categories.map((cat) => (
                <View key={cat} style={s.tag}>
                  <Text style={s.tagTxt}>{cat}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* ── Job images ── */}
        {!previewMode && images.length ? (
          <Card style={s.section}>
            <SectionHeading label="Attached images" />
            <ImageStrip images={images} />
          </Card>
        ) : null}

        {/* ── Poster info ── */}
        {!previewMode && (
          <Card style={s.section}>
            <SectionHeading label="Posted by" />
            <View style={s.posterRow}>
              {poster.profile_pic || poster.profilePic ? (
                <Image source={{ uri: poster.profile_pic || poster.profilePic }} style={s.posterAvatar} />
              ) : (
                <Image source={{ uri: avatarUri(poster) }} style={s.posterAvatar} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.posterUsername}>@{ownerName}</Text>
                <Text style={s.posterFull}>{poster.full_name || poster.fullName || ""}</Text>
              </View>
              {ownerUuid ? (
                <TouchableOpacity style={s.viewProfileBtn} onPress={() => navigation.navigate("UserProfile", { uuid: ownerUuid })}>
                  <Text style={s.viewProfileTxt}>View Profile</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        )}

        {/* ── Contact section (visible once assigned) ── */}
        {otherParty ? (
          <Card style={s.section}>
            <SectionHeading label={tx("Assigned Job Contact", "Mawasiliano ya Kazi")} />
            <View style={s.posterRow}>
              <Image source={{ uri: avatarUri(otherParty) }} style={s.posterAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.posterUsername}>@{otherParty.username || "user"}</Text>
                <Text style={s.posterFull}>{otherParty.full_name || "Assigned party"}</Text>
              </View>
            </View>
            {otherParty.phone_number ? (
              <View style={s.contactRow}>
                <AppIcon name="phone" size={14} color={C.teal} />
                <Text style={s.contactLabel}>{tx("Phone", "Simu")}</Text>
                <Text style={s.contactValue}>{otherParty.phone_number}</Text>
              </View>
            ) : null}
            {otherParty.email ? (
              <View style={s.contactRow}>
                <AppIcon name="mail" size={14} color={C.teal} />
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue}>{otherParty.email}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* ── Rating section (hirer rates provider after completion) ── */}
        {canRateProvider && (
          <Card style={s.section}>
            <SectionHeading label="Rate this provider" />
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} style={[s.scoreBtn, n <= ratingScore && s.scoreBtnActive]} onPress={() => setRatingScore(n)}>
                  <Text style={[s.scoreTxt, n <= ratingScore && s.scoreTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.recommendToggle} onPress={() => setRecommendProvider(!recommendProvider)}>
              <AppIcon name={recommendProvider ? "check-circle" : "plus-circle"} size={18} color={C.teal} />
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
            {ratingMessage ? <Text style={s.ratingMsg}>{ratingMessage}</Text> : null}
            <TouchableOpacity style={[s.saveRatingBtn, ratingSaving && { opacity: 0.6 }]} onPress={submitRating} disabled={ratingSaving}>
              {ratingSaving
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.saveRatingTxt}>Save Rating</Text>
              }
            </TouchableOpacity>
          </Card>
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

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  keyboard: { flex: 1 },
  webScroller: { height: "100vh" },
  scroll: { paddingBottom: 40 },
  scrollWide: { alignItems: "center", paddingTop: 16 },
  contentShell: { width: "100%" },
  contentShellWide: { maxWidth: 1040, gap: 12 },

  // Hero
  hero: { backgroundColor: theme.colors.surface, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 8 },
  desktopCard: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  codePill: { backgroundColor: theme.colors.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  codeTxt: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
  heroTitle: { fontSize: 28, fontWeight: "900", color: theme.colors.text, lineHeight: 34 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 20 },

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
  directSub: { fontSize: 12, color: C.teal, marginTop: 2 },
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
  moneyPrefix: { paddingHorizontal: 10, color: C.teal, fontWeight: "800", fontSize: 13 },
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
  durationUnitText: { color: C.teal, fontSize: 12, fontWeight: "800" },
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

  // Workspace shortcut
  workspaceBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: theme.colors.primarySoft, borderRadius: 10, padding: 12, marginBottom: 10,
  },
  workspaceBtnTxt: { flex: 1, color: C.teal, fontSize: 13, fontWeight: "700" },

  // Sections
  section: { marginHorizontal: 16, marginTop: 12 },
  bodyText: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22 },

  // Tags
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: C.tealLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagTxt: { color: C.teal, fontSize: 13, fontWeight: "700" },

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
    borderRadius: 10, borderWidth: 1.5, borderColor: C.teal,
  },
  viewProfileTxt: { color: C.teal, fontSize: 12, fontWeight: "700" },

  // Contact
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8 },
  contactLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", width: 48 },
  contactValue: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "700" },

  // Application preview
  infoLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "600" },
  infoValue: { color: theme.colors.text, fontSize: 13, fontWeight: "700", flex: 1, textAlign: "right" },
  appPlan: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22, marginTop: 12 },
  filledBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.amberLight, borderRadius: 8, padding: 10, marginBottom: 10 },
  filledTxt: { color: C.amber, fontSize: 13, fontWeight: "700" },

  // Rating
  starsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  scoreBtn: { width: 38, height: 36, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  scoreBtnActive: { backgroundColor: C.teal, borderColor: C.teal },
  scoreTxt: { color: C.slate, fontWeight: "800", fontSize: 13 },
  scoreTxtActive: { color: C.white },
  recommendToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  recommendTxt: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  recommendInput: { minHeight: 88, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, color: theme.colors.text, textAlignVertical: "top", backgroundColor: theme.colors.surface, marginBottom: 8 },
  ratingMsg: { color: C.slate, fontSize: 13, marginTop: 4 },
  saveRatingBtn: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.teal, marginTop: 6 },
  saveRatingTxt: { color: C.white, fontSize: 15, fontWeight: "800" },

  // Bottom bar (public apply)
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    gap: 8, backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingHorizontal: 16, paddingTop: 12,
  },
  applyBtn: {
    minHeight: 54, borderRadius: 14, backgroundColor: C.teal,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  applyBtnDisabled: { backgroundColor: theme.colors.surfaceSoft, shadowOpacity: 0 },
  applyTxt: { color: C.white, fontSize: 17, fontWeight: "800" },
  applyTxtDisabled: { color: C.slate },
  updateBtn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.tealLight, borderWidth: 1.5, borderColor: C.teal },
  updateTxt: { color: C.teal, fontWeight: "800", fontSize: 15 },

  // Empty state
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" },
});
