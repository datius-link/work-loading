import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../../../../icons/AppIcon";
import { C, SectionHeading, InfoRow, PrimaryButton, OutlineButton } from "../../../Jobs/jobsUI";
import { formatJobDate, formatRelativeDate } from "../../../Jobs/jobDate";
import { getFriendlyApiError, viewerRequest } from "../../../../api/api";
import { useLanguage } from "../../../../LanguageContext";
import { useAppTheme } from "../../../../theme";

// ─── Pipeline definition (strict 5‑stage workflow) ──────────────────────────
const PIPELINE = [
  { key: "hired", en: "Hired", sw: "Ameajiriwa" },
  { key: "started", en: "Started", sw: "Imeanza" },
  { key: "working", en: "Working", sw: "Inaendelea" },
  { key: "submitted", en: "Submission", sw: "Imewasilishwa" },
  { key: "completed", en: "Completed", sw: "Imekamilika" },
];

function pipelineIndex(status) {
  const map = {
    hired: 0, assigned: 0, active: 0,
    start_pending: 1, started: 1,
    working: 2, in_progress: 2,
    completion_pending: 3, submitted: 3,
    completed: 4, filled: 4, closed: 4, rated: 4, recommended: 4,
  };
  return map[String(status || "hired").toLowerCase()] ?? 0;
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

  // Strict pipeline flags (provider first, then hirer confirms)
  const canStart            = isProvider && jobStatus === "active" && !job?.provider_suggested_start_at;
  const canConfirmStart     = isHirer   && jobStatus === "start_pending" && !!job?.provider_suggested_start_at && !job?.started_at;
  const canSubmit           = isProvider && jobStatus === "working" && !job?.provider_suggested_completed_at;
  const canConfirmCompletion = isHirer   && jobStatus === "completion_pending" && !!job?.provider_suggested_completed_at && !job?.completed_at;

  const waitingStart        = isProvider && jobStatus === "start_pending";
  const waitingCompletion   = isProvider && jobStatus === "completion_pending";

  // Post-completion flags
  const isComplete    = ["completed", "filled", "closed", "rated", "recommended"].includes(jobStatus);
  const isClosed      = ["closed"].includes(jobStatus);
  const hasRating     = !!job?.rating_submitted_at || !!job?.rating;
  const hasRecommend  = !!job?.recommendation_submitted_at || !!job?.recommendation;

  // Start form
  const [showStartForm,  setShowStartForm]  = useState(false);
  const [startRemark,    setStartRemark]    = useState("");
  const [startingJob,    setStartingJob]    = useState(false);

  // Completion form
  const [submitNote,     setSubmitNote]     = useState("");
  const [submitting,     setSubmitting]     = useState(false);

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

  // Dispute
  const [disputeNote,    setDisputeNote]    = useState("");
  const [disputing,      setDisputing]      = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startJob = async () => {
    if (startingJob) return;
    setStartingJob(true);
    try {
      const endpoint = isHirer ? "start-confirm" : "start-suggest";
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/${endpoint}`, {
        started_at: new Date().toISOString(),
        provider_start_note: startRemark,
      });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.(isHirer ? "start_confirmed" : "start_requested");
      setShowStartForm(false);
      setStartRemark("");
      onNotice({
        type: "success",
        title: isHirer ? "Start confirmed" : "Start submitted",
        body: isHirer ? "Official start time recorded." : "Waiting for hirer to confirm."
      });
    } catch (e) {
      onNotice({
        type: "error",
        title: "Could not update start",
        body: getFriendlyApiError(e, language)
      });
    } finally {
      setStartingJob(false);
    }
  };

  const submitJob = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const endpoint = isHirer ? "complete-confirm" : "complete-suggest";
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/${endpoint}`, {
        completed_at: new Date().toISOString(),
        provider_completion_note: submitNote,
      });
      onJobUpdate(res?.data?.job || job);
      await onRealtimeChange?.(isHirer ? "completion_confirmed" : "completion_requested");
      setSubmitNote("");
      onNotice({
        type: "success",
        title: isHirer ? "Completion confirmed" : "Submitted for review",
        body: isHirer ? "Job is now completed." : "Waiting for hirer confirmation."
      });
    } catch (e) {
      onNotice({
        type: "error",
        title: "Could not submit",
        body: getFriendlyApiError(e, language)
      });
    } finally {
      setSubmitting(false);
    }
  };

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
      setRecoDone(!!res?.data?.recommendation);
      setShowRecoForm(false);
      onJobUpdate({
        ...job,
        ...(res?.data?.job || {}),
        recommendation: res?.data?.recommendation || null,
        recommendation_submitted_at: res?.data?.recommendation?.created_at || null,
      });
      await onRealtimeChange?.("recommendation_submitted");
      onNotice({ type: "success", title: "Recommendation saved ✓", body: "Your recommendation has been recorded." });
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
      setDisputeNote("");
      onNotice({ type: "success", title: isHirer && jobStatus === "completion_pending" ? "Completion rejected" : "Report submitted", body: isHirer && jobStatus === "completion_pending" ? "The provider has been notified and can submit completion again when ready." : "Your dispute has been recorded." });
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
      {/* ── Pipeline visual (refined) ── */}
      <Section style={st.pipelineCard}>
        <SectionHeading label={tx("Job pipeline", "Hatua za kazi")} />
        <View style={st.pipeline}>
          {PIPELINE.map((step, i) => {
            const done = i <= pipeIdx;
            const current = i === pipeIdx;
            return (
              <React.Fragment key={step.key}>
                <View style={st.pipeStep}>
                  <View style={[st.pipeCircle, done && st.pipeCircleDone, current && st.pipeCircleCurrent]}>
                    {done ? (
                      <AppIcon name="check" size={13} color={C.white} />
                    ) : (
                      <View style={st.pipeDot} />
                    )}
                  </View>
                  <Text style={[st.pipeLabel, done && st.pipeLabelDone]}>{language === "sw" ? step.sw : step.en}</Text>
                </View>
                {i < PIPELINE.length - 1 && (
                  <View style={[st.pipeLine, done && i < pipeIdx && st.pipeLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Post-completion checklist */}
        {isComplete && (
          <View style={st.checkList}>
            <ReputationRow done={ratingDone} label={tx("Rated", "Imepimwa")} />
            <ReputationRow done={recoDone} label={tx("Recommended", "Imependekezwa")} />
            <ReputationRow done={isClosed} label={tx("Closed", "Imefungwa")} />
          </View>
        )}
      </Section>

      {/* ── Activity log ── */}
      <Section style={{ gap: 8 }}>
        <SectionHeading label={tx("Activity log", "Historia ya shughuli")} />
        <LogRow title={tx("Provider assigned", "Mtoa huduma amepangiwa")} note={tx("Workspace is open for both parties.", "Eneo la kazi liko wazi kwa pande zote mbili.")} time={formatRelativeDate(job?.updated_at || job?.created_at)} />
        {job?.provider_suggested_start_at && (
          <LogRow title={tx("Start time suggested", "Muda wa kuanza umependekezwa")} note={job.provider_start_note || ""} time={formatJobDate(job.provider_suggested_start_at)} />
        )}
        {job?.started_at && (
          <LogRow title={tx("Start confirmed", "Kuanza kumethibitishwa")} note={tx("Official start time recorded.", "Muda rasmi wa kuanza umehifadhiwa.")} time={formatJobDate(job.started_at)} />
        )}
        {job?.provider_suggested_completed_at && (
          <LogRow title={tx("Completion submitted", "Kukamilika kumewasilishwa")} note={job.provider_completion_note || ""} time={formatJobDate(job.provider_suggested_completed_at)} />
        )}
        {job?.completed_at && (
          <LogRow title={tx("Job completed", "Kazi imekamilika")} note={tx("Both parties confirmed. Rating stage open.", "Pande zote zimethibitisha. Hatua ya kupima imefunguliwa.")} time={formatJobDate(job.completed_at)} />
        )}
        {ratingDone && <LogRow title={tx("Rated", "Imepimwa")} note={tx("Employer submitted a rating for the provider.", "Mwajiri amewasilisha kipimo cha mtoa huduma.")} />}
        {recoDone && <LogRow title={tx("Recommended", "Imependekezwa")} note={tx("Employer wrote a recommendation.", "Mwajiri ameandika pendekezo.")} />}
        {isClosed && <LogRow title={tx("Closed", "Imefungwa")} note={tx("This job is now part of history.", "Kazi hii sasa ipo kwenye historia.")} />}
      </Section>

      {/* ── Start time info ── */}
      {(job?.provider_suggested_start_at || job?.started_at) && (
        <Section>
          <SectionHeading label={tx("Start time", "Muda wa kuanza")} />
          <InfoRow icon="clock" label={tx("Provider suggested", "Mtoa huduma alipendekeza")} value={formatJobDate(job.provider_suggested_start_at) || tx("Not suggested", "Haujapendekezwa")} />
          <InfoRow icon="check-circle" label={tx("Official start", "Mwanzo rasmi")} value={formatJobDate(job.started_at) || tx("Waiting confirmation", "Inasubiri uthibitisho")} />
          {job.provider_start_note ? <Text style={st.hint}>{job.provider_start_note}</Text> : null}
        </Section>
      )}

      {/* ── Waiting banners ── */}
      {waitingStart && (
        <WaitingBanner
          icon="clock"
          title={tx("Waiting for start confirmation", "Inasubiri uthibitisho wa kuanza")}
          body={tx("The hirer needs to confirm the start time before the job becomes active.", "Mwajiri anahitaji kuthibitisha muda wa kuanza kabla kazi haijaanza rasmi.")}
        />
      )}
      {waitingCompletion && (
        <WaitingBanner
          icon="clock"
          title={tx("Waiting for completion confirmation", "Inasubiri uthibitisho wa kukamilika")}
          body={tx("The hirer needs to confirm that the work is done before ratings open.", "Mwajiri anahitaji kuthibitisha kuwa kazi imekamilika kabla ya kipimo kufunguliwa.")}
        />
      )}

      {/* ── Start form (provider suggests, hirer confirms) ── */}
      {(canStart || canConfirmStart) && (
        <Section>
          <SectionHeading label={isHirer ? tx("Confirm start time", "Thibitisha muda wa kuanza") : tx("Start this job", "Anza kazi hii")} />
          {!showStartForm ? (
            <PrimaryButton
              label={isHirer ? tx("Confirm Start", "Thibitisha Kuanza") : tx("Suggest Start", "Pendekeza Kuanza")}
              icon="play-circle"
              onPress={() => setShowStartForm(true)}
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={st.hint}>Add a remark (optional) — e.g. "Nipo njiani, nitafika dakika 20"</Text>
              <TextInput
                style={st.textarea}
                placeholder={tx("Remark…", "Maelezo…")}
                placeholderTextColor={C.slate}
                value={startRemark}
                onChangeText={setStartRemark}
                multiline
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <OutlineButton label={tx("Cancel", "Ghairi")} onPress={() => setShowStartForm(false)} color={theme.colors.textMuted} />
                <PrimaryButton label={isHirer ? tx("Confirm Start", "Thibitisha Kuanza") : tx("Submit Start", "Wasilisha Kuanza")} onPress={startJob} loading={startingJob} />
              </View>
            </View>
          )}
        </Section>
      )}

      {/* ── Completion time info ── */}
      {(job?.provider_suggested_completed_at || job?.completed_at) && (
        <Section>
          <SectionHeading label={tx("Completion time", "Muda wa kukamilika")} />
          <InfoRow icon="clock" label={tx("Provider submitted", "Mtoa huduma aliwasilisha")} value={formatJobDate(job.provider_suggested_completed_at) || tx("Not submitted", "Haijawasilishwa")} />
          <InfoRow icon="check-circle" label={tx("Official completion", "Kukamilika rasmi")} value={formatJobDate(job.completed_at) || tx("Waiting confirmation", "Inasubiri uthibitisho")} />
          {job.provider_completion_note ? <Text style={st.hint}>{job.provider_completion_note}</Text> : null}
        </Section>
      )}

      {/* ── Submit / confirm work ── */}
      {(canSubmit || canConfirmCompletion) && (
        <Section>
          <SectionHeading label={isHirer ? tx("Confirm completion", "Thibitisha kukamilika") : tx("Submit your work", "Wasilisha kazi yako")} />
          <Text style={st.hint}>
            {isHirer
              ? "Confirm only when the work is done. This closes the working stage and opens ratings."
              : "Submit only when everything is finished. The hirer will review and confirm."}
          </Text>
          <TextInput
            style={[st.textarea, { marginTop: 10 }]}
            placeholder={tx("Handover note (optional)…", "Maelezo ya makabidhiano (si lazima)…")}
            placeholderTextColor={C.slate}
            value={submitNote}
            onChangeText={setSubmitNote}
            multiline
          />
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label={isHirer ? tx("Confirm Completed", "Thibitisha Kukamilika") : tx("Submit Completed Work", "Wasilisha Kazi Iliyokamilika")}
              icon="upload-cloud"
              onPress={submitJob}
              loading={submitting}
            />
          </View>
          {isHirer ? (
            <View style={st.rejectBox}>
              <Text style={st.rejectTitle}>{tx("Not finished yet?", "Bado hajamaliza?")}</Text>
              <Text style={st.hint}>{tx("Explain what is missing. The job will return to Working and the provider can submit completion again when ready.", "Eleza kilichobaki. Kazi itarudi Working na mtoa huduma ataweza kuwasilisha tena akikamilisha.")}</Text>
              <TextInput
                style={st.textarea}
                placeholder={tx("What still needs to be finished?", "Nini bado hakijakamilika?")}
                placeholderTextColor={C.slate}
                value={disputeNote}
                onChangeText={setDisputeNote}
                multiline
              />
              <OutlineButton
                label={tx("Reject Completion", "Kataa Kukamilika")}
                onPress={reportDispute}
                loading={disputing}
                color={C.red}
              />
            </View>
          ) : null}
        </Section>
      )}

      {/* ════════════════════ POST-COMPLETION ZONE ════════════════════ */}
      {isComplete && (
        <>
          {/* Completed banner */}
          <Section style={st.completedBanner}>
            <AppIcon name="award" size={28} color={C.green} />
            <Text style={st.completedTitle}>Job Completed</Text>
            <Text style={st.completedSub}>Excellent work! This job is now in the reputation stage.</Text>
          </Section>

          {/* ── HIRER: Rate the provider (5‑stars) ── */}
          {isHirer && !ratingDone && (
            <Section>
              <SectionHeading label="Rate the provider" />
              <Text style={st.hint}>Your honest rating helps the provider build their reputation on the platform.</Text>
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
                <PrimaryButton label="Submit Rating" icon="star" onPress={saveRating} loading={ratingSaving} />
              </View>
            </Section>
          )}

          {isHirer && ratingDone && (
            <Section style={st.doneBanner}>
              <AppIcon name="check-circle" size={20} color={C.teal} />
              <Text style={st.doneTxt}>Rating submitted ✓</Text>
            </Section>
          )}

          {/* ── HIRER: Write a recommendation ── */}
          {isHirer && ratingDone && !recoDone && !isClosed && (
            <Section>
              <SectionHeading label="Write a recommendation" />
              <Text style={st.hint}>This is the final workspace stage. Submit a recommendation decision to close the job.</Text>
              {!showRecoForm ? (
                <PrimaryButton label="Create Recommendation" icon="thumbs-up" onPress={() => setShowRecoForm(true)} />
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={[st.hint, { fontWeight: "700", color: theme.colors.text }]}>{tx("Recommend this provider?", "Unampendekeza mtoa huduma huyu?")}</Text>
                  <View style={st.toggleRow}>
                    <ToggleChip label="Yes" active={recoRecommend} onPress={() => setRecoRecommend(true)} />
                    <ToggleChip label="No"  active={!recoRecommend} onPress={() => setRecoRecommend(false)} />
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
                        <ToggleChip label="Yes" active={recoVisible}  onPress={() => setRecoVisible(true)} />
                        <ToggleChip label="No"  active={!recoVisible} onPress={() => setRecoVisible(false)} />
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
                    <OutlineButton label="Cancel" onPress={() => setShowRecoForm(false)} color={C.slate} />
                    <PrimaryButton label="Submit" onPress={saveRecommendation} loading={recoSaving} />
                  </View>
                </View>
              )}
            </Section>
          )}

          {isHirer && recoDone && (
            <Section style={st.doneBanner}>
              <AppIcon name="check-circle" size={20} color={C.teal} />
              <Text style={st.doneTxt}>Recommendation submitted ✓</Text>
            </Section>
          )}

          {/* ── PROVIDER: What they see ── */}
          {isProvider && (
            <Section>
              <SectionHeading label="Reputation status" />
              {!hasRating ? (
                <View style={st.waitRow}>
                  <AppIcon name="clock" size={16} color={C.slate} />
                  <Text style={st.waitTxt}>Waiting for employer rating…</Text>
                </View>
              ) : (
                <View style={st.waitRow}>
                  <AppIcon name="star" size={16} color={C.amber} filled />
                  <Text style={[st.waitTxt, { color: theme.colors.text, fontWeight: "700" }]}>
                    You received a rating: {job?.rating?.score ?? "—"}/5
                  </Text>
                </View>
              )}
              {hasRecommend && (
                <View style={[st.waitRow, { marginTop: 8 }]}>
                  <AppIcon name="thumbs-up" size={16} color={C.teal} />
                  <Text style={[st.waitTxt, { color: C.teal, fontWeight: "700" }]}>You received a recommendation.</Text>
                </View>
              )}
            </Section>
          )}
        </>
      )}

      {/* ── Provider dispute (post-completion only) ── */}
      {isProvider && isComplete && !job?.dispute_created_at && (
        <Section>
          <SectionHeading label="Report an issue" />
          <Text style={st.hint}>Use this only if the confirmed start or completion details are unfair or incorrect.</Text>
          <TextInput
            style={[st.textarea, { marginTop: 10 }]}
            placeholder="Explain what happened…"
            placeholderTextColor={C.slate}
            value={disputeNote}
            onChangeText={setDisputeNote}
            multiline
          />
          <View style={{ marginTop: 10 }}>
            <OutlineButton label="Report Issue" onPress={reportDispute} loading={disputing} color={C.red} />
          </View>
        </Section>
      )}

      {/* ── Closed read-only banner ── */}
      {isClosed && (
        <Section style={st.completedBanner}>
          <AppIcon name="lock" size={22} color={C.slate} />
          <Text style={[st.completedTitle, { color: C.slate }]}>Workspace Closed</Text>
          <Text style={[st.completedSub, { color: C.slate }]}>The Job has been archived. Data is now on your profile.</Text>
        </Section>
      )}
    </ScrollView>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function LogRow({ title, note, time }) {
  const { theme } = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={st.logRow}>
      <View style={st.logDot} />
      <View style={{ flex: 1 }}>
        <Text style={st.logTitle}>{title}</Text>
        {!!note && <Text style={st.logNote}>{note}</Text>}
        {!!time && <Text style={st.logTime}>{time}</Text>}
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

// ─── Styles (refined pipeline and modern look) ───────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  section: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },

  // Pipeline card
  pipelineCard: { gap: 16, paddingTop: 14 },
  pipeline: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pipeStep: { alignItems: "center", gap: 6, flex: 1 },
  pipeCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center", justifyContent: "center",
  },
  pipeCircleDone: { backgroundColor: theme.colors.primary },
  pipeCircleCurrent: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  pipeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  pipeLabel: { fontSize: 10, fontWeight: "600", color: theme.colors.textMuted, textAlign: "center" },
  pipeLabelDone: { color: theme.colors.primary, fontWeight: "700" },
  pipeLine: { flex: 1, height: 2, backgroundColor: theme.colors.surfaceSoft, marginBottom: 18 },
  pipeLineDone: { backgroundColor: theme.colors.primary },

  // Reputation checklist
  checkList: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, gap: 8 },
  reputRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  reputLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },

  // Activity log
  logRow:   { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 5 },
  logTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  logNote:  { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19, marginTop: 2 },
  logTime:  { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },

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
