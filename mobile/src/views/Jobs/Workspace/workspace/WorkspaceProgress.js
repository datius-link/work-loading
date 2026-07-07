import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AppIcon from "../../../../icons/AppIcon";
import AnimatedJobPipeline from "./AnimatedJobPipeline";
import { C, SectionHeading, PrimaryButton, OutlineButton } from "../../../Jobs/jobsUI";
import { formatJobDate } from "../../../Jobs/jobDate";
import { getFriendlyApiError, viewerRequest } from "../../../../api/api";
import { useLanguage } from "../../../../LanguageContext";
import { useAppTheme } from "../../../../theme";
import { UploadManager } from "../../../../utils/UploadManager";
import JobReceipt from "./JobReceipt";
import { useCall } from "../../../../calling/CallProvider";

// ─── Status groupings (new lifecycle, tolerant of legacy statuses) ─────────
// assigned(active) -> start_requested -> working -> submitted -> completed
// with a submitted <-> revision_requested loop. Legacy statuses
// (start_pending, completion_pending) are folded into the same UI states so
// jobs created before this feature shipped keep working without a migration.
const ASSIGNED_STATUSES = ["active"];
const START_REQUESTED_STATUSES = ["start_requested", "start_pending"];
const WORKING_STATUSES = ["working", "started"];
const SUBMITTED_STATUSES = ["submitted", "completion_pending"];
const REVISION_STATUSES = ["revision_requested"];
const COMPLETE_STATUSES = ["completed", "filled", "closed", "rated", "recommended"];

// ─── Pipeline stage index (5‑stage, revision loop folds into "Submission") ──
// The visual step labels/icons themselves live in AnimatedJobPipeline.js.
function pipelineIndex(status) {
  const map = {
    hired: 0, assigned: 0, active: 0,
    start_pending: 1, start_requested: 1, started: 1,
    working: 2, in_progress: 2,
    submitted: 3, completion_pending: 3, revision_requested: 3,
    completed: 4, filled: 4, closed: 4, rated: 4, recommended: 4,
  };
  return map[String(status || "hired").toLowerCase()] ?? 0;
}

// ─── Activity log journal — turns a job_activity_logs row into readable copy ──
function describeActivity(entry, tx) {
  const attempt = entry?.meta?.attempt_number;
  switch (entry?.action) {
    case "provider_assigned":
      return { title: tx("Provider assigned", "Mtoa huduma amepangiwa"), body: tx("Workspace is open for both parties.", "Eneo la kazi liko wazi kwa pande zote mbili.") };
    case "start_requested":
      return { title: tx("Provider requested start", "Mtoa huduma ameomba kuanza"), body: entry.note || "" };
    case "start_confirmed":
      return { title: tx("Employer confirmed start", "Mwajiri amethibitisha kuanza"), body: tx("The job is now marked as working.", "Kazi sasa imewekwa kama inaendelea.") };
    case "work_submitted":
      return {
        title: attempt ? tx(`Provider submitted work (attempt #${attempt})`, `Mtoa huduma amewasilisha kazi (jaribio #${attempt})`) : tx("Provider submitted work", "Mtoa huduma amewasilisha kazi"),
        body: entry.note || "",
      };
    case "completion_requested":
      return { title: tx("Provider submitted completion", "Mtoa huduma amewasilisha ukamilishaji"), body: entry.note || "" };
    case "revision_requested":
      return {
        title: tx("Employer requested revision", "Mwajiri ameomba marekebisho"),
        body: entry.note || "",
      };
    case "completion_rejected":
      return { title: tx("Employer rejected completion", "Mwajiri amekataa ukamilishaji"), body: entry.note || "" };
    case "work_accepted":
      return { title: tx("Employer accepted work — job completed", "Mwajiri amekubali kazi — kazi imekamilika"), body: tx("Ratings are now open.", "Kipimo kimefunguliwa.") };
    case "completion_confirmed":
      return { title: tx("Employer confirmed completion", "Mwajiri amethibitisha ukamilishaji"), body: tx("Ratings are now open.", "Kipimo kimefunguliwa.") };
    case "disputed":
      return { title: tx("Dispute reported", "Mgogoro umeripotiwa"), body: entry.note || "" };
    case "cancelled":
      return { title: tx("Job cancelled", "Kazi imeghairiwa"), body: entry.note || "" };
    default:
      return { title: entry?.action || tx("Update", "Sasisho"), body: entry?.note || "" };
  }
}

function formatLogTime(value) {
  if (!value) return "";
  try {
    return formatJobDate(value);
  } catch {
    return "";
  }
}

// ─── 5‑star rating helpers ──────────────────────────────────────────────────
const STARS = [1, 2, 3, 4, 5];

function scoreTier(score, language) {
  if (score <= 2) return { label: language === "sw" ? "Chini" : "Low", color: "#EF4444" };
  if (score <= 4) return { label: language === "sw" ? "Nzuri" : "Good", color: "#3B82F6" };
  return { label: language === "sw" ? "Bora" : "Best", color: C.teal };
}

function StarRating({ score, onChange }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const st = useMemo(() => createStyles(theme), [theme]);
  const tier = scoreTier(score, language);
  return (
    <View style={st.starWrap}>
      <View style={st.starRow}>
        {STARS.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            activeOpacity={0.7}
            style={st.starTouch}
          >
            <AppIcon
              name="star"
              size={32}
              color={n <= score ? tier.color : theme.colors.border}
              filled={n <= score}
            />
          </TouchableOpacity>
        ))}
      </View>
      <View style={[st.tierBadge, { backgroundColor: tier.color + "20", borderColor: tier.color }]}>
        <Text style={[st.tierLabel, { color: tier.color }]}>{score}/5 — {tier.label}</Text>
      </View>
    </View>
  );
}

function Section({ children, style }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  return <View style={[st.section, style]}>{children}</View>;
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function WorkspaceProgress({ job, jobId, role, onJobUpdate, onNotice, onRealtimeChange }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const st = useMemo(() => createStyles(theme), [theme]);
  const tx = (en, sw) => language === "sw" ? sw : en;
  const jobStatus  = String(job?.status || "hired").toLowerCase();
  const pipeIdx    = pipelineIndex(jobStatus);
  const isProvider = role === "provider";
  const isHirer    = role === "hirer";
  const call = useCall();
  const progressContact = job?.contact_details;
  const progressOtherParty = progressContact?.viewer_role === "hirer" ? progressContact?.service_provider : progressContact?.hirer;

  // ── Lifecycle flags (provider requests -> employer confirms -> submit/revise loop) ──
  const canRequestStart   = isProvider && ASSIGNED_STATUSES.includes(jobStatus);
  const canConfirmStart   = isHirer && START_REQUESTED_STATUSES.includes(jobStatus);
  const canSubmitWork     = isProvider && (WORKING_STATUSES.includes(jobStatus) || REVISION_STATUSES.includes(jobStatus));
  const canReviewSubmission = isHirer && SUBMITTED_STATUSES.includes(jobStatus);

  const waitingProviderStart  = isHirer && ASSIGNED_STATUSES.includes(jobStatus);
  const waitingStartConfirm   = isProvider && START_REQUESTED_STATUSES.includes(jobStatus);
  const waitingSubmission     = isHirer && WORKING_STATUSES.includes(jobStatus);
  const waitingReview         = isProvider && SUBMITTED_STATUSES.includes(jobStatus);
  const waitingResubmission   = isHirer && REVISION_STATUSES.includes(jobStatus);

  // Post-completion flags
  const isComplete    = COMPLETE_STATUSES.includes(jobStatus);
  const isClosed      = ["closed"].includes(jobStatus);
  const hasRating     = !!job?.rating_submitted_at || !!job?.rating;
  const hasRecommend  = !!job?.recommendation_submitted_at || !!job?.recommendation;

  // ── Journal data (real activity log + submission history from the backend) ──
  const [submissions, setSubmissions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [journalLoading, setJournalLoading] = useState(true);

  const loadJournal = useCallback(async () => {
    if (!jobId) return;
    try {
      const [subsRes, actRes] = await Promise.all([
        viewerRequest("get", `/hiring/jobs/${jobId}/submissions`),
        viewerRequest("get", `/hiring/jobs/${jobId}/activity`),
      ]);
      setSubmissions(Array.isArray(subsRes?.data?.submissions) ? subsRes.data.submissions : []);
      setActivity(Array.isArray(actRes?.data?.activity) ? actRes.data.activity : []);
    } catch (e) {
      console.log("workspace journal load error", e?.message);
    } finally {
      setJournalLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJournal();
    // Refetch whenever the job's status flips (e.g. from realtime push) so
    // the journal and submission history stay in sync with the visible stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJournal, jobStatus]);

  const latestSubmission = submissions.length ? submissions[submissions.length - 1] : null;

  // Start form (provider requests start)
  const [showStartForm, setShowStartForm] = useState(false);
  const [startNote,     setStartNote]     = useState("");
  const [requestingStart, setRequestingStart] = useState(false);
  const [confirmingStart, setConfirmingStart] = useState(false);

  // Submit-work form (provider) — reused for first submission and every
  // resubmission after a revision request.
  const [submitNote,  setSubmitNote]  = useState("");
  const [submitMedia, setSubmitMedia] = useState([]);
  const [picking,     setPicking]     = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);

  // Review actions (employer)
  const [acceptingWork, setAcceptingWork] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [requestingRevision, setRequestingRevision] = useState(false);

  // Rating form (hirer only) – 5‑star, initial 4
  const [ratingScore,    setRatingScore]    = useState(4);
  const [ratingComment,  setRatingComment]  = useState("");
  const [ratingSaving,   setRatingSaving]   = useState(false);
  const [ratingDone,     setRatingDone]     = useState(hasRating);

  // Recommendation form (hirer only, after rating)
  const [showRecoForm,   setShowRecoForm]   = useState(false);
  const [recoRecommend,  setRecoRecommend]  = useState(true);
  const [recoReason,     setRecoReason]     = useState("");
  const [recoVisible,    setRecoVisible]    = useState(true);
  const [recoSaving,     setRecoSaving]     = useState(false);
  const [recoDone,       setRecoDone]       = useState(hasRecommend);

  // Keep the "done" flags in sync with the canonical job data instead of
  // only reading it once at mount. Without this, switching tabs and back
  // (which remounts this screen) or a realtime workspace refresh landing
  // between renders could otherwise show the rating form again after a
  // rating was already submitted, making the recommendation step seem to
  // have "disappeared".
  useEffect(() => { if (hasRating) setRatingDone(true); }, [hasRating]);
  useEffect(() => { if (hasRecommend) setRecoDone(true); }, [hasRecommend]);

  // Dispute (post-completion only, unchanged legacy flow)
  const [disputeNote,    setDisputeNote]    = useState("");
  const [disputing,      setDisputing]      = useState(false);

  // Receipt modal (post-completion only)
  const [showReceipt, setShowReceipt] = useState(false);

  // ── Lifecycle actions ───────────────────────────────────────────────────
  const requestStart = async () => {
    if (requestingStart) return;
    setRequestingStart(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/start-request`, { provider_start_note: startNote });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("start_requested");
      await loadJournal();
      setShowStartForm(false);
      setStartNote("");
      onNotice({ type: "success", title: tx("Start requested", "Kuanza kumeombwa"), body: tx("Waiting for the employer to confirm.", "Inasubiri mwajiri athibitishe.") });
    } catch (e) {
      onNotice({ type: "error", title: tx("Could not request start", "Imeshindikana kuomba kuanza"), body: getFriendlyApiError(e, language) });
    } finally {
      setRequestingStart(false);
    }
  };

  const confirmStart = async () => {
    if (confirmingStart) return;
    setConfirmingStart(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/start-confirm`, {});
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("start_confirmed");
      await loadJournal();
      onNotice({ type: "success", title: tx("Start confirmed", "Kuanza kumethibitishwa"), body: tx("The job is now marked as working.", "Kazi sasa imewekwa kama inaendelea.") });
    } catch (e) {
      onNotice({ type: "error", title: tx("Could not confirm", "Imeshindikana kuthibitisha"), body: getFriendlyApiError(e, language) });
    } finally {
      setConfirmingStart(false);
    }
  };

  const pickSubmitMedia = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onNotice({ type: "error", title: tx("Permission needed", "Ruhusa inahitajika"), body: tx("Allow photo library access to attach files.", "Ruhusu ufikiaji wa picha ili kuambatanisha faili.") });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (result.canceled) return;
      const mapped = (result.assets || []).map((asset) => ({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }));
      setSubmitMedia((prev) => [...prev, ...mapped].slice(0, 5));
    } finally {
      setPicking(false);
    }
  };

  const removeSubmitMedia = (index) => {
    setSubmitMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const submitWork = async () => {
    if (submittingWork) return;
    if (!submitNote.trim() && !submitMedia.length) {
      onNotice({ type: "error", title: tx("Add details", "Ongeza maelezo"), body: tx("Add a note or at least one photo/video before submitting.", "Ongeza maelezo au picha/video moja kabla ya kuwasilisha.") });
      return;
    }
    setSubmittingWork(true);
    try {
      const uploaded = submitMedia.length ? await UploadManager.startUpload(submitMedia, "job_submissions") : [];
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/submit-work`, {
        note: submitNote.trim(),
        media: uploaded,
      });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("work_submitted");
      await loadJournal();
      setSubmitNote("");
      setSubmitMedia([]);
      onNotice({ type: "success", title: tx("Work submitted", "Kazi imewasilishwa"), body: tx("The employer will review it shortly.", "Mwajiri atapitia hivi karibuni.") });
    } catch (e) {
      onNotice({ type: "error", title: tx("Could not submit", "Imeshindikana kuwasilisha"), body: getFriendlyApiError(e, language) });
    } finally {
      setSubmittingWork(false);
      UploadManager.reset();
    }
  };

  const acceptWork = async () => {
    if (acceptingWork) return;
    setAcceptingWork(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/accept-submission`, {});
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("work_accepted");
      await loadJournal();
      onNotice({ type: "success", title: tx("Work accepted", "Kazi imekubaliwa"), body: tx("Job marked complete. Ratings are now open.", "Kazi imewekwa kama imekamilika. Kipimo kimefunguliwa.") });
    } catch (e) {
      onNotice({ type: "error", title: tx("Could not accept", "Imeshindikana kukubali"), body: getFriendlyApiError(e, language) });
    } finally {
      setAcceptingWork(false);
    }
  };

  const requestRevision = async () => {
    const note = revisionNote.trim();
    if (requestingRevision) return;
    if (note.length < 5) {
      onNotice({ type: "error", title: tx("Add more detail", "Ongeza maelezo"), body: tx("Explain what needs to change (at least 5 characters).", "Eleza kinachohitaji kubadilishwa (angalau herufi 5).") });
      return;
    }
    setRequestingRevision(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/request-revision`, { review_note: note });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("revision_requested");
      await loadJournal();
      setShowRevisionForm(false);
      setRevisionNote("");
      onNotice({ type: "success", title: tx("Revision requested", "Marekebisho yameombwa"), body: tx("The provider can see your notes and resubmit.", "Mtoa huduma anaweza kuona maelezo yako na kuwasilisha tena.") });
    } catch (e) {
      onNotice({ type: "error", title: tx("Could not request revision", "Imeshindikana kuomba marekebisho"), body: getFriendlyApiError(e, language) });
    } finally {
      setRequestingRevision(false);
    }
  };

  // ── Rating / recommendation — unchanged; server already gates these on
  // job.status === "completed", so no changes needed here for requirement 9. ──
  const saveRating = async () => {
    if (ratingSaving) return;
    setRatingSaving(true);
    const providerUuid = job?.contact_details?.service_provider?.uuid || job?.assigned_provider_uuid;
    try {
      const res = await viewerRequest("post", `/recommendations/jobs/${jobId}/rate`, {
        provider_uuid: providerUuid,
        score: ratingScore,
        comment: ratingComment,
      });
      setRatingDone(true);
      if (ratingScore !== 5) setRecoRecommend(false);
      onJobUpdate({
        ...job,
        rating: res?.data?.rating || { score: ratingScore, comment: ratingComment },
        rating_submitted_at: res?.data?.rating?.created_at || new Date().toISOString(),
      });
      await onRealtimeChange?.("rating_submitted");
      onNotice({ type: "success", title: "Rating submitted ✓", body: "Thank you for your feedback." });
    } catch (e) {
      onNotice({
        type: "error",
        title: "Could not save rating",
        body: getFriendlyApiError(e, language)
      });
    } finally {
      setRatingSaving(false);
    }
  };

  const saveRecommendation = async () => {
    const currentScore = Number(job?.rating?.score || ratingScore || 0);
    if (recoSaving || (recoRecommend && recoReason.trim().length < 10)) {
      onNotice({
        type: "error",
        title: "Add more detail",
        body: "Please write a reason of at least 10 characters."
      });
      return;
    }
    if (recoRecommend && currentScore !== 5) {
      onNotice({
        type: "error",
        title: "Recommendation not available",
        body: "Only ratings of 5 can create recommendations."
      });
      return;
    }
    setRecoSaving(true);
    const providerUuid = job?.contact_details?.service_provider?.uuid || job?.assigned_provider_uuid;
    try {
      const res = await viewerRequest("post", `/recommendations/jobs/${jobId}/recommend`, {
        provider_uuid: providerUuid,
        recommend: recoRecommend,
        reason: recoReason,
        recommender_visible: recoVisible,
      });
      const recommendationDecidedAt =
        res?.data?.recommendation?.created_at ||
        res?.data?.recommendation_decided_at ||
        res?.data?.job?.recommendation_decided_at ||
        new Date().toISOString();
      setRecoDone(true);
      setShowRecoForm(false);
      onJobUpdate({
        ...job,
        ...(res?.data?.job || {}),
        recommendation: res?.data?.recommendation || null,
        recommendation_submitted_at: recommendationDecidedAt,
        recommendation_decided_at: recommendationDecidedAt,
      });
      await onRealtimeChange?.("recommendation_submitted");
      onNotice({ type: "success", title: "Recommendation decision saved", body: "This workspace has been closed." });
    } catch (e) {
      onNotice({
        type: "error",
        title: "Could not save",
        body: getFriendlyApiError(e, language)
      });
    } finally {
      setRecoSaving(false);
    }
  };

  const reportDispute = async () => {
    const reason = disputeNote.trim();
    if (disputing || reason.length < 8) {
      onNotice({
        type: "error",
        title: "Add more detail",
        body: "Please explain what happened (at least 8 characters)."
      });
      return;
    }
    setDisputing(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/dispute`, { reason });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.("dispute_submitted");
      await loadJournal();
      setDisputeNote("");
      onNotice({ type: "success", title: "Report submitted", body: "Your dispute has been recorded." });
    } catch (e) {
      onNotice({
        type: "error",
        title: "Could not report",
        body: getFriendlyApiError(e, language)
      });
    } finally {
      setDisputing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
      {/* ── Pipeline visual ── */}
      <Section style={st.pipelineCard}>
        <SectionHeading label={tx("Job pipeline", "Hatua za kazi")} />
        <AnimatedJobPipeline
          activeIndex={pipeIdx}
          language={language}
          disabled={["cancelled", "disputed"].includes(jobStatus)}
        />

        {REVISION_STATUSES.includes(jobStatus) && (
          <View style={st.revisionFlag}>
            <AppIcon name="alert-circle" size={14} color={C.red} />
            <Text style={st.revisionFlagTxt}>{tx("Returned for revision — provider is resubmitting", "Imerudishwa kwa marekebisho — mtoa huduma anawasilisha tena")}</Text>
          </View>
        )}

        {isComplete && (
          <View style={st.checkList}>
            <ReputationRow done={ratingDone} label={tx("Rated", "Imepimwa")} />
            <ReputationRow done={recoDone} label={tx("Recommendation", "Pendekezo")} />
            <ReputationRow done={isClosed} label={tx("Closed", "Imefungwa")} />
          </View>
        )}
      </Section>

      {/* ── Quick call — most useful exactly where you'd be waiting on or
           checking in with the other party. ── */}
      {call?.supported && progressOtherParty?.uuid && !["cancelled", "disputed"].includes(jobStatus) ? (
        <TouchableOpacity
          style={st.callCard}
          activeOpacity={0.85}
          onPress={() => call.startCall({ calleeUuid: progressOtherParty.uuid, calleeName: progressOtherParty.username || progressOtherParty.full_name, calleePhoto: progressOtherParty.profile_pic, jobId })}
        >
          <View style={st.callCardIcon}>
            <AppIcon name="phone" size={16} color={theme.colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.callCardTitle}>{tx(`Call ${progressOtherParty.username || progressOtherParty.full_name || "them"}`, `Piga simu ${progressOtherParty.username || progressOtherParty.full_name || "kwao"}`)}</Text>
            <Text style={st.callCardSub}>{tx("In-app call, no phone number needed", "Simu ndani ya app, hakuna namba inayohitajika")}</Text>
          </View>
          <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {/* ── Waiting banners (both roles, whichever side is not the actor) ── */}
      {waitingProviderStart && (
        <WaitingBanner icon="clock" title={tx("Waiting for the provider to start", "Inasubiri mtoa huduma aanze")} body={tx("They'll tap \"I have started\" once they begin the work.", "Watagusa \"Nimeanza\" mara wataanza kazi.")} />
      )}
      {waitingStartConfirm && (
        <WaitingBanner icon="clock" title={tx("Waiting for employer confirmation", "Inasubiri uthibitisho wa mwajiri")} body={tx("The employer needs to confirm the start before the job becomes active.", "Mwajiri anahitaji kuthibitisha kuanza kabla kazi haijaanza rasmi.")} />
      )}
      {waitingSubmission && (
        <WaitingBanner icon="clock" title={tx("Waiting for submission", "Inasubiri uwasilishaji")} body={tx("The provider is working. You'll be notified once they submit.", "Mtoa huduma anafanya kazi. Utaarifiwa mara atakapowasilisha.")} />
      )}
      {waitingReview && (
        <WaitingBanner icon="clock" title={tx("Waiting for employer review", "Inasubiri mapitio ya mwajiri")} body={tx("The employer is reviewing your submission.", "Mwajiri anapitia uwasilishaji wako.")} />
      )}
      {waitingResubmission && (
        <WaitingBanner icon="clock" title={tx("Waiting for provider resubmission", "Inasubiri uwasilishaji upya")} body={tx("The provider has your revision notes and is working on it.", "Mtoa huduma ana maelezo yako ya marekebisho na anafanyia kazi.")} />
      )}

      {/* ── Provider: request start ── */}
      {canRequestStart && (
        <Section>
          <SectionHeading label={tx("Start this job", "Anza kazi hii")} />
          {!showStartForm ? (
            <PrimaryButton label={tx("I have started", "Nimeanza")} icon="play-circle" onPress={() => setShowStartForm(true)} />
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={st.hint}>{tx('Add a remark (optional) — e.g. "Nipo njiani, nitafika dakika 20"', 'Ongeza maelezo (si lazima) — mfano "Nipo njiani, nitafika dakika 20"')}</Text>
              <TextInput
                style={st.textarea}
                placeholder={tx("Remark…", "Maelezo…")}
                placeholderTextColor={C.slate}
                value={startNote}
                onChangeText={setStartNote}
                multiline
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <OutlineButton label={tx("Cancel", "Ghairi")} onPress={() => setShowStartForm(false)} color={theme.colors.textMuted} />
                <PrimaryButton label={tx("Send Request", "Tuma Ombi")} onPress={requestStart} loading={requestingStart} />
              </View>
            </View>
          )}
        </Section>
      )}

      {/* ── Employer: confirm start ── */}
      {canConfirmStart && (
        <Section>
          <SectionHeading label={tx("Confirm start", "Thibitisha kuanza")} />
          {job?.provider_start_note ? <Text style={st.hint}>{job.provider_start_note}</Text> : null}
          <PrimaryButton label={tx("Confirm Start", "Thibitisha Kuanza")} icon="check-circle" onPress={confirmStart} loading={confirmingStart} />
        </Section>
      )}

      {/* ── Revision notes (shown to provider when returned for correction) ── */}
      {isProvider && REVISION_STATUSES.includes(jobStatus) && latestSubmission?.review_note && (
        <Section style={st.revisionNoteBox}>
          <SectionHeading label={tx("Employer's revision notes", "Maelezo ya marekebisho ya mwajiri")} />
          <Text style={st.revisionNoteTxt}>{latestSubmission.review_note}</Text>
        </Section>
      )}

      {/* ── Provider: submit / resubmit work ── */}
      {canSubmitWork && (
        <Section>
          <SectionHeading label={REVISION_STATUSES.includes(jobStatus) ? tx("Submit again", "Wasilisha tena") : tx("Submit work", "Wasilisha kazi")} />
          <Text style={st.hint}>{tx("Add a note and, optionally, photos or a video of the finished work.", "Ongeza maelezo na, kama unataka, picha au video ya kazi iliyokamilika.")}</Text>
          <TextInput
            style={[st.textarea, { marginTop: 10 }]}
            placeholder={tx("Describe what you completed…", "Eleza ulichokamilisha…")}
            placeholderTextColor={C.slate}
            value={submitNote}
            onChangeText={setSubmitNote}
            multiline
          />
          {submitMedia.length > 0 && (
            <View style={st.mediaRow}>
              {submitMedia.map((m, idx) => (
                <View key={`${m.uri}-${idx}`} style={st.mediaThumbWrap}>
                  {m.type === "video" ? (
                    <View style={[st.mediaThumb, st.mediaThumbVideo]}>
                      <AppIcon name="camera" size={18} color={C.white} />
                    </View>
                  ) : (
                    <Image source={{ uri: m.uri }} style={st.mediaThumb} />
                  )}
                  <TouchableOpacity style={st.mediaRemove} onPress={() => removeSubmitMedia(idx)} activeOpacity={0.8}>
                    <AppIcon name="x-circle" size={16} color={C.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <OutlineButton label={tx("Add Photo/Video", "Ongeza Picha/Video")} icon="camera" onPress={pickSubmitMedia} disabled={picking || submitMedia.length >= 5} />
          </View>
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label={REVISION_STATUSES.includes(jobStatus) ? tx("Submit Again", "Wasilisha Tena") : tx("Submit Work", "Wasilisha Kazi")}
              icon="upload-cloud"
              onPress={submitWork}
              loading={submittingWork}
            />
          </View>
        </Section>
      )}

      {/* ── Employer: review submitted work ── */}
      {canReviewSubmission && (
        <Section>
          <SectionHeading label={tx("Review submitted work", "Pitia kazi iliyowasilishwa")} />
          {latestSubmission ? (
            <>
              {!!latestSubmission.note && <Text style={st.hint}>{latestSubmission.note}</Text>}
              {Array.isArray(latestSubmission.media) && latestSubmission.media.length > 0 && (
                <View style={st.mediaRow}>
                  {latestSubmission.media.map((m, idx) => (
                    m.type === "video" ? (
                      <View key={`${m.url || idx}`} style={[st.mediaThumb, st.mediaThumbVideo]}>
                        <AppIcon name="camera" size={18} color={C.white} />
                      </View>
                    ) : (
                      <Image key={`${m.url || idx}`} source={{ uri: m.url }} style={st.mediaThumb} />
                    )
                  ))}
                </View>
              )}
              <Text style={st.attemptTag}>{tx(`Attempt #${latestSubmission.attempt_number}`, `Jaribio #${latestSubmission.attempt_number}`)}</Text>
            </>
          ) : (
            <Text style={st.hint}>{tx("No submission details found.", "Hakuna maelezo ya uwasilishaji.")}</Text>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <PrimaryButton label={tx("Accept Work", "Kubali Kazi")} icon="check-circle" onPress={acceptWork} loading={acceptingWork} />
          </View>
          {!showRevisionForm ? (
            <View style={{ marginTop: 10 }}>
              <OutlineButton label={tx("Request Revision", "Omba Marekebisho")} icon="edit" onPress={() => setShowRevisionForm(true)} color={C.red} />
            </View>
          ) : (
            <View style={st.rejectBox}>
              <Text style={st.rejectTitle}>{tx("What needs to change?", "Nini kinahitaji kubadilishwa?")}</Text>
              <TextInput
                style={st.textarea}
                placeholder={tx("Explain what still needs to be fixed…", "Eleza kinachohitaji kurekebishwa…")}
                placeholderTextColor={C.slate}
                value={revisionNote}
                onChangeText={setRevisionNote}
                multiline
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <OutlineButton label={tx("Cancel", "Ghairi")} onPress={() => setShowRevisionForm(false)} color={theme.colors.textMuted} />
                <PrimaryButton label={tx("Send Revision Request", "Tuma Ombi la Marekebisho")} onPress={requestRevision} loading={requestingRevision} danger />
              </View>
            </View>
          )}
        </Section>
      )}

      {/* ── Submission history (visible once there's more than one attempt) ── */}
      {submissions.length > 0 && (
        <Section style={{ gap: 10 }}>
          <SectionHeading label={tx("Submission history", "Historia ya uwasilishaji")} />
          {submissions.map((s) => (
            <SubmissionRow key={s.id} submission={s} tx={tx} />
          ))}
        </Section>
      )}

      {/* ── Activity log — the real job journal, built from job_activity_logs ── */}
      <Section style={{ gap: 10 }}>
        <SectionHeading label={tx("Activity log", "Historia ya shughuli")} />
        {journalLoading && !activity.length ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : activity.length ? (
          activity.map((entry) => <ActivityRow key={entry.id} entry={entry} tx={tx} />)
        ) : (
          <Text style={st.hint}>{tx("No activity yet.", "Hakuna shughuli bado.")}</Text>
        )}
      </Section>

      {/* ════════════════════ POST-COMPLETION ZONE ════════════════════ */}
      {isComplete && (
        <>
          {/* Completed banner */}
          <Section style={st.completedBanner}>
            <AppIcon name="award" size={28} color={C.green} />
            <Text style={st.completedTitle}>{tx("Job Completed", "Kazi Imekamilika")}</Text>
            <Text style={st.completedSub}>{tx("Excellent work! This job is now in the reputation stage.", "Kazi nzuri! Kazi hii sasa iko kwenye hatua ya sifa.")}</Text>
            <TouchableOpacity style={st.receiptBtn} onPress={() => setShowReceipt(true)} activeOpacity={0.85}>
              <AppIcon name="file-text" size={15} color={theme.colors.primary} />
              <Text style={st.receiptBtnTxt}>{tx("View Receipt", "Angalia Risiti")}</Text>
            </TouchableOpacity>
          </Section>

          {/* ── HIRER: Rate the provider (5‑stars) ── */}
          {isHirer && !ratingDone && (
            <Section>
              <SectionHeading label={tx("Rate the provider", "Mpimie Mtoa Huduma")} />
              <Text style={st.hint}>{tx("Your honest rating helps the provider build their reputation on the platform.", "Kipimo chako cha kweli kinasaidia mtoa huduma kujenga sifa yake kwenye jukwaa.")}</Text>
              <View style={{ marginVertical: 14 }}>
                <StarRating score={ratingScore} onChange={setRatingScore} />
              </View>
              <Text style={[st.hint, { fontWeight: "700", color: theme.colors.text, marginBottom: 6 }]}>{tx("Comment", "Maoni")}</Text>
              <TextInput
                style={st.textarea}
                placeholder="e.g. Excellent electrician. Arrived on time and finished professionally."
                placeholderTextColor={C.slate}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
              />
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label={tx("Submit Rating", "Wasilisha Kipimo")} icon="star" onPress={saveRating} loading={ratingSaving} />
              </View>
            </Section>
          )}

          {isHirer && ratingDone && (
            <Section style={st.doneBanner}>
              <AppIcon name="check-circle" size={20} color={C.teal} />
              <Text style={st.doneTxt}>{tx("Rating submitted ✓", "Kipimo kimewasilishwa ✓")}</Text>
            </Section>
          )}

          {/* ── HIRER: Write a recommendation ── */}
          {isHirer && ratingDone && !recoDone && !isClosed && (
            <Section>
              <SectionHeading label={tx("Write a recommendation", "Andika Pendekezo")} />
              <Text style={st.hint}>{tx("This is the final workspace stage. Submit a recommendation decision to close the job.", "Hii ni hatua ya mwisho ya eneo la kazi. Wasilisha uamuzi wa pendekezo ili kufunga kazi.")}</Text>
              {!showRecoForm ? (
                <PrimaryButton label={tx("Create Recommendation", "Unda Pendekezo")} icon="thumbs-up" onPress={() => setShowRecoForm(true)} />
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={[st.hint, { fontWeight: "700", color: theme.colors.text }]}>{tx("Recommend this provider?", "Unampendekeza mtoa huduma huyu?")}</Text>
                  <View style={st.toggleRow}>
                    <ToggleChip label={tx("Yes", "Ndiyo")} active={recoRecommend} onPress={() => setRecoRecommend(true)} />
                    <ToggleChip label={tx("No", "Hapana")} active={!recoRecommend} onPress={() => setRecoRecommend(false)} />
                  </View>
                  {recoRecommend && (
                    <>
                      <Text style={[st.hint, { fontWeight: "700", color: theme.colors.text }]}>{tx("Reason", "Sababu")}</Text>
                      <TextInput
                        style={st.textarea}
                        placeholder="e.g. Completed office electrical installation professionally and within schedule."
                        placeholderTextColor={C.slate}
                        value={recoReason}
                        onChangeText={setRecoReason}
                        multiline
                      />
                      <Text style={[st.hint, { fontWeight: "700", color: theme.colors.text, marginTop: 4 }]}>{tx("Show my identity publicly?", "Onyesha utambulisho wangu hadharani?")}</Text>
                      <View style={st.toggleRow}>
                        <ToggleChip label={tx("Yes", "Ndiyo")} active={recoVisible}  onPress={() => setRecoVisible(true)} />
                        <ToggleChip label={tx("No", "Hapana")} active={!recoVisible} onPress={() => setRecoVisible(false)} />
                      </View>
                    </>
                  )}
                  {!recoRecommend && (
                    <TextInput
                      style={st.textarea}
                      placeholder="Optional note before closing this workspace."
                      placeholderTextColor={C.slate}
                      value={recoReason}
                      onChangeText={setRecoReason}
                      multiline
                    />
                  )}
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    <OutlineButton label={tx("Cancel", "Ghairi")} onPress={() => setShowRecoForm(false)} color={C.slate} />
                    <PrimaryButton label={tx("Submit", "Wasilisha")} onPress={saveRecommendation} loading={recoSaving} />
                  </View>
                </View>
              )}
            </Section>
          )}

          {isHirer && recoDone && (
            <Section style={st.doneBanner}>
              <AppIcon name="check-circle" size={20} color={C.teal} />
              <Text style={st.doneTxt}>{tx("Recommendation submitted ✓", "Pendekezo limewasilishwa ✓")}</Text>
            </Section>
          )}

          {/* ── PROVIDER: What they see ── */}
          {isProvider && (
            <Section>
              <SectionHeading label={tx("Reputation status", "Hali ya Sifa")} />
              {!hasRating ? (
                <View style={st.waitRow}>
                  <AppIcon name="clock" size={16} color={C.slate} />
                  <Text style={st.waitTxt}>{tx("Waiting for employer rating…", "Inasubiri kipimo cha mwajiri…")}</Text>
                </View>
              ) : (
                <View style={st.waitRow}>
                  <AppIcon name="star" size={16} color={C.amber} filled />
                  <Text style={[st.waitTxt, { color: theme.colors.text, fontWeight: "700" }]}>
                    {tx(`You received a rating: ${job?.rating?.score ?? "—"}/5`, `Umepokea kipimo: ${job?.rating?.score ?? "—"}/5`)}
                  </Text>
                </View>
              )}
              {hasRecommend && (
                <View style={[st.waitRow, { marginTop: 8 }]}>
                  <AppIcon name="thumbs-up" size={16} color={C.teal} />
                  <Text style={[st.waitTxt, { color: C.teal, fontWeight: "700" }]}>{tx("You received a recommendation.", "Umepokea pendekezo.")}</Text>
                </View>
              )}
            </Section>
          )}
        </>
      )}

      {/* ── Provider dispute (post-completion only) ── */}
      {isProvider && isComplete && !job?.dispute_created_at && (
        <Section>
          <SectionHeading label={tx("Report an issue", "Ripoti Tatizo")} />
          <Text style={st.hint}>{tx("Use this only if the confirmed start or completion details are unfair or incorrect.", "Tumia hii tu ikiwa maelezo ya kuanza au kukamilika ni yasiyo sahihi.")}</Text>
          <TextInput
            style={[st.textarea, { marginTop: 10 }]}
            placeholder={tx("Explain what happened…", "Eleza kilichotokea…")}
            placeholderTextColor={C.slate}
            value={disputeNote}
            onChangeText={setDisputeNote}
            multiline
          />
          <View style={{ marginTop: 10 }}>
            <OutlineButton label={tx("Report Issue", "Ripoti Tatizo")} onPress={reportDispute} loading={disputing} color={C.red} />
          </View>
        </Section>
      )}

      {/* ── Closed read-only banner ── */}
      {isClosed && (
        <Section style={st.completedBanner}>
          <AppIcon name="lock" size={22} color={C.slate} />
          <Text style={[st.completedTitle, { color: C.slate }]}>{tx("Workspace Closed", "Eneo la Kazi Limefungwa")}</Text>
          <Text style={[st.completedSub, { color: C.slate }]}>{tx("The Job has been archived. Data is now on your profile.", "Kazi imehifadhiwa. Data sasa ipo kwenye wasifu wako.")}</Text>
        </Section>
      )}
    </ScrollView>
    <JobReceipt visible={showReceipt} job={job} role={role} onClose={() => setShowReceipt(false)} />
    </KeyboardAvoidingView>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function ActivityRow({ entry, tx }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  const { title, body } = describeActivity(entry, tx);
  const actorLabel = entry?.actor?.full_name || entry?.actor?.username || entry?.actor_name;
  return (
    <View style={st.logRow}>
      <View style={st.logDot} />
      <View style={{ flex: 1 }}>
        <Text style={st.logTitle}>{title}</Text>
        {!!actorLabel && <Text style={st.logActor}>{actorLabel}</Text>}
        {!!body && <Text style={st.logNote}>{body}</Text>}
        {!!entry?.created_at && <Text style={st.logTime}>{formatLogTime(entry.created_at)}</Text>}
      </View>
    </View>
  );
}

const SUBMISSION_STATUS_LABEL = {
  submitted: { en: "Awaiting review", sw: "Inasubiri mapitio", color: C.amber },
  accepted: { en: "Accepted", sw: "Imekubaliwa", color: C.green },
  revision_requested: { en: "Revision requested", sw: "Marekebisho yameombwa", color: C.red },
};

function SubmissionRow({ submission, tx }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  const cfg = SUBMISSION_STATUS_LABEL[submission.status] || SUBMISSION_STATUS_LABEL.submitted;
  return (
    <View style={st.submissionRow}>
      <View style={{ flex: 1 }}>
        <Text style={st.submissionTitle}>{tx(`Attempt #${submission.attempt_number}`, `Jaribio #${submission.attempt_number}`)}</Text>
        {!!submission.note && <Text style={st.logNote}>{submission.note}</Text>}
        {submission.status === "revision_requested" && !!submission.review_note && (
          <Text style={[st.logNote, { color: C.red, fontWeight: "600", marginTop: 4 }]}>{submission.review_note}</Text>
        )}
        {!!submission.submitted_at && <Text style={st.logTime}>{formatLogTime(submission.submitted_at)}</Text>}
      </View>
      <View style={[st.submissionBadge, { borderColor: cfg.color }]}>
        <Text style={[st.submissionBadgeTxt, { color: cfg.color }]}>{tx(cfg.en, cfg.sw)}</Text>
      </View>
    </View>
  );
}

function WaitingBanner({ icon, title, body }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  return (
    <Section style={st.waitingBanner}>
      <AppIcon name={icon} size={18} color={C.amber} />
      <View style={{ flex: 1 }}>
        <Text style={st.waitingTitle}>{title}</Text>
        <Text style={st.waitingBody}>{body}</Text>
      </View>
    </Section>
  );
}

function ReputationRow({ done, label }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={st.reputRow}>
      <AppIcon name={done ? "check-circle" : "circle"} size={15} color={done ? theme.colors.primary : theme.colors.border} />
      <Text style={[st.reputLabel, done && { color: C.teal }]}>{label}</Text>
    </View>
  );
}

function ToggleChip({ label, active, onPress }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={[st.chip, active && st.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[st.chipTxt, active && st.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  section: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },

  // Pipeline card (the pipeline itself is rendered by AnimatedJobPipeline)
  pipelineCard: { gap: 16, paddingTop: 14 },

  // Quick in-app call card
  callCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  callCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  callCardTitle: { color: theme.colors.text, fontSize: 13.5, fontWeight: "800" },
  callCardSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },

  // Revision flag
  revisionFlag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revisionFlagTxt: { fontSize: 12, fontWeight: "700", color: C.red, flex: 1 },

  revisionNoteBox: { backgroundColor: "#FEF2F2" },
  revisionNoteTxt: { fontSize: 14, color: "#991B1B", lineHeight: 20, fontWeight: "600" },

  // Reputation checklist
  checkList: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, gap: 8 },
  reputRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  reputLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },

  // Activity log
  logRow:   { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 5 },
  logTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  logActor: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1, fontStyle: "italic" },
  logNote:  { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19, marginTop: 2 },
  logTime:  { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },

  // Submission history
  submissionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  submissionTitle: { fontSize: 13, fontWeight: "800", color: theme.colors.text },
  submissionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  submissionBadgeTxt: { fontSize: 10, fontWeight: "800" },
  attemptTag: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginTop: 6 },

  // Media thumbnails
  mediaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  mediaThumbWrap: { position: "relative" },
  mediaThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: theme.colors.surfaceSoft },
  mediaThumbVideo: { alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" },
  mediaRemove: {
    position: "absolute", top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center",
  },

  // Forms
  hint: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 20 },
  textarea: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },

  rejectBox: {
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rejectTitle: { fontSize: 14, fontWeight: "900", color: C.red },

  // Waiting banner
  waitingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  waitingTitle: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  waitingBody:  { fontSize: 12, color: "#B45309", lineHeight: 18, marginTop: 2 },

  // Completed banner
  completedBanner: {
    alignItems: "flex-start",
    gap: 8,
  },
  completedTitle: { fontSize: 18, fontWeight: "800", color: C.green },
  completedSub:   { fontSize: 13, color: C.green, textAlign: "center" },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  receiptBtnTxt: { color: theme.colors.primary, fontSize: 13, fontWeight: "800" },

  // Done badge
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doneTxt: { fontSize: 14, fontWeight: "700", color: theme.colors.primary },

  // Provider wait row
  waitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitTxt: { fontSize: 14, color: theme.colors.textMuted },

  // 5‑star rating
  starWrap:  { gap: 10, alignItems: "flex-start" },
  starRow:   { flexDirection: "row", gap: 6 },
  starTouch: { padding: 4 },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  tierLabel: { fontSize: 13, fontWeight: "800" },

  // Toggle chips
  toggleRow: { flexDirection: "row", gap: 10 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  chipTxt:    { fontSize: 14, fontWeight: "700", color: theme.colors.textMuted },
  chipTxtActive: { color: theme.colors.primary },
});
