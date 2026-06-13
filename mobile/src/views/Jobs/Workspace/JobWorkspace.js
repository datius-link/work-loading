import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { viewerRequest } from "../../../api/api";
import { getUserSession } from "../../../utils/userSession";
import { formatJobDate, formatRelativeDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { C, StatusBadge, NavHeader, SectionHeading, Card, PrimaryButton, OutlineButton, InfoRow } from "../jobsUI";

// ─── Pipeline steps ──────────────────────────────────────────────────────────
const PIPELINE = [
  { key: "hired",      label: "Hired",      icon: "check-circle"  },
  { key: "started",    label: "Started",    icon: "play-circle"   },
  { key: "in_progress",label: "Working",    icon: "tool"          },
  { key: "submitted",  label: "Submitted",  icon: "upload-cloud"  },
];

function pipelineIndex(status) {
  const map = { hired:0, assigned:0, active:0, start_pending:1, started:2, working:2, in_progress:2, completion_pending:3, submitted:3, completed:3, filled:3, closed:3 };
  return map[String(status||"hired").toLowerCase()] ?? 0;
}

function workspaceStatus(job) {
  const status = String(job?.status || "hired").toLowerCase();
  if (status === "closed" && job?.assigned_provider_uuid) return "assigned";
  return status;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=0B6B63&color=fff&bold=true&rounded=true`;
}

function formatBudget(v) {
  const raw = String(v||"").trim();
  if (!raw) return "TBD";
  if (/^TZS\b/i.test(raw)) return raw;
  const n = raw.replace(/[^\d.]/g,"");
  return n ? `TZS ${Number(n).toLocaleString("en-US")}` : raw;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function JobWorkspace() {
  const nav        = useNavigation();
  const route      = useRoute();
  const { theme }  = useAppTheme();
  const insets     = useSafeAreaInsets();
  const jobId      = route.params?.jobId;

  const [job,       setJob]       = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [progress,  setProgress]  = useState([]);
  const [myUuid,    setMyUuid]    = useState(null);
  const [role,      setRole]      = useState("provider"); // "hirer" | "provider"
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [tab,       setTab]       = useState("chat");   // chat | progress | details
  const [notice,    setNotice]    = useState(null);

  // Chat
  const [msgText,   setMsgText]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [draftBudget, setDraftBudget] = useState("");
  const [draftDetails, setDraftDetails] = useState("");
  const flatRef = useRef(null);

  // Progress actions
  const [startRemark,   setStartRemark]   = useState("");
  const [startingJob,   setStartingJob]   = useState(false);
  const [showStartForm, setShowStartForm] = useState(false);
  const [submitNote,    setSubmitNote]    = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [disputeNote,   setDisputeNote]   = useState("");
  const [disputing,     setDisputing]     = useState(false);

  // Rating (hirer rates provider after completion)
  const [ratingScore,   setRatingScore]   = useState(5);
  const [ratingNote,    setRatingNote]    = useState("");
  const [ratingSaving,  setRatingSaving]  = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    try {
      const session = await getUserSession();
      const me = session.profile?.uuid || session.user?.uuid;
      setMyUuid(me);

      const jobRes = await viewerRequest("get", `/hiring/jobs/${jobId}/workspace`);

      const j = jobRes?.data?.job || null;
      if (j) {
        setJob(j);
        const ownerUuid = j.client_user_uuid || j.created_by || j.poster?.uuid;
        setRole(jobRes?.data?.role || (ownerUuid && me && ownerUuid === me ? "hirer" : "provider"));
        setMessages(Array.isArray(jobRes?.data?.messages) ? jobRes.data.messages : []);
        setProgress([]);
      }
    } catch (e) {
      console.log("workspace load error", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll chat
  useEffect(() => {
    if (messages.length && tab === "chat") {
      const timeout = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [messages, tab]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text || sending) return;
    setSending(true);
    const tempId = `pending-${Date.now()}`;
    const optimistic = {
      id: tempId,
      job_id: jobId,
      sender_uuid: myUuid,
      message: text,
      created_at: new Date().toISOString(),
      sender: { uuid: myUuid },
      _pending: true,
    };
    setMsgText("");
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/messages`, { message: text });
      const saved = res?.data?.message;
      setMessages((prev) => prev.map((item) => (item.id === tempId ? saved || { ...optimistic, _pending: false } : item)));
    } catch (e) {
      setMessages((prev) => prev.map((item) => (item.id === tempId ? { ...item, _pending: false, _failed: true } : item)));
      setNotice({ type: "error", title: "Message not sent", body: e?.response?.data?.message || "Please try again." });
    } finally {
      setSending(false);
    }
  };

  const startJob = async () => {
    if (startingJob) return;
    setStartingJob(true);
    try {
      const endpoint = role === "hirer" ? "start-confirm" : "start-suggest";
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/${endpoint}`, {
        started_at: new Date().toISOString(),
        provider_start_note: startRemark,
      });
      setJob(res?.data?.job || job);
      setShowStartForm(false);
      setStartRemark("");
      setNotice({ type: "success", title: role === "hirer" ? "Start confirmed" : "Start submitted", body: role === "hirer" ? "Official start time is now recorded." : "The hirer can now confirm the start time." });
    } catch (e) {
      setNotice({ type: "error", title: "Could not update start", body: e?.response?.data?.message || "Please try again." });
    } finally {
      setStartingJob(false);
    }
  };

  const submitJob = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const endpoint = role === "hirer" ? "complete-confirm" : "complete-suggest";
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/${endpoint}`, {
        completed_at: new Date().toISOString(),
        provider_completion_note: submitNote,
      });
      setJob(res?.data?.job || job);
      setSubmitNote("");
      setNotice({ type: "success", title: role === "hirer" ? "Completion confirmed" : "Completion submitted", body: role === "hirer" ? "The job is now completed." : "The hirer can now confirm completion." });
    } catch (e) {
      setNotice({ type: "error", title: "Could not update completion", body: e?.response?.data?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const saveRating = async () => {
    if (ratingSaving) return;
    setRatingSaving(true);
    const assignedUuid = job?.contact_details?.service_provider?.uuid || job?.assigned_provider_uuid;
    try {
      await viewerRequest("post", `/recommendations/jobs/${jobId}/rate`, {
        provider_uuid: assignedUuid,
        score: ratingScore,
        recommend: ratingScore > 6 && !!ratingNote,
        reason: ratingNote,
        recommender_visible: false,
      });
      setNotice({ type: "success", title: "Rating saved", body: "Thank you for your feedback." });
    } catch (e) {
      setNotice({ type: "error", title: "Could not save rating", body: e?.response?.data?.message || "Please try again." });
    } finally {
      setRatingSaving(false);
    }
  };

  const reportDispute = async () => {
    const reason = disputeNote.trim();
    if (disputing || reason.length < 8) {
      setNotice({ type: "error", title: "Add more detail", body: "Please explain why the date or completion is unfair." });
      return;
    }
    setDisputing(true);
    try {
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/dispute`, { reason });
      setJob(res?.data?.job || job);
      setDisputeNote("");
      setNotice({ type: "success", title: "Report submitted", body: "Your dispute has been recorded on this job." });
    } catch (e) {
      setNotice({ type: "error", title: "Could not report", body: e?.response?.data?.message || "Please try again." });
    } finally {
      setDisputing(false);
    }
  };

  // ── Render sub-screens ────────────────────────────────────────────────────
  const renderChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 120}
    >
      <View style={s.draftCard}>
        <Text style={s.draftTitle}>Draft job details</Text>
        <TextInput
          style={s.draftInput}
          placeholder="Budget or payment note"
          placeholderTextColor={C.slate}
          value={draftBudget}
          onChangeText={setDraftBudget}
        />
        <TextInput
          style={[s.draftInput, s.draftTextArea]}
          placeholder="Draft details to discuss in chat"
          placeholderTextColor={C.slate}
          value={draftDetails}
          onChangeText={setDraftDetails}
          multiline
        />
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={s.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.chatEmpty}>
            <AppIcon name="message" size={36} color={C.slate} />
            <Text style={s.chatEmptyTxt}>No messages yet. Say hello!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.sender_uuid === myUuid;
          return (
            <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
              {!mine && (
                <Image source={{ uri: avatarUri(item.sender || {}) }} style={s.bubbleAvatar} />
              )}
              <View style={[s.bubbleBody, mine ? s.bubbleBodyMine : s.bubbleBodyTheirs]}>
                {!mine && item.sender?.username ? (
                  <Text style={s.bubbleSender}>@{item.sender.username}</Text>
                ) : null}
                <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{item.message}</Text>
                <Text style={[s.bubbleTime, mine && s.bubbleTimeMine]}>
                  {item._pending ? "Sending…" : item._failed ? "Failed" : formatRelativeDate(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {/* Input bar */}
      <View style={[s.chatInputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.chatInput}
          placeholder="Type a message…"
          placeholderTextColor={C.slate}
          value={msgText}
          onChangeText={setMsgText}
          multiline
          maxLength={800}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!msgText.trim() || sending) && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!msgText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={C.white} size="small" />
            : <AppIcon name="send" size={18} color={C.white} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderProgress = () => {
    const jobStatus = workspaceStatus(job);
    const pipeIdx   = pipelineIndex(jobStatus);
    const isProvider = role === "provider";
    const isHirer    = role === "hirer";
    const canStart   = isProvider && jobStatus === "active" && !job?.provider_suggested_start_at;
    const canConfirmStart = isHirer && ["active", "start_pending"].includes(jobStatus) && !job?.started_at;
    const canSubmit  = isProvider && jobStatus === "working" && !job?.provider_suggested_completed_at;
    const canConfirmCompletion = isHirer && ["working", "completion_pending"].includes(jobStatus) && !job?.completed_at;
    const isComplete = ["completed", "closed", "filled"].includes(jobStatus);
    const waitingStart = isProvider && jobStatus === "start_pending";
    const waitingCompletion = isProvider && jobStatus === "completion_pending";

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.progScroll}>
        {/* Pipeline visual */}
        <Card style={s.pipelineCard}>
          <SectionHeading label="Job pipeline" />
          <View style={s.pipeline}>
            {PIPELINE.map((step, i) => {
              const done    = i <= pipeIdx;
              const current = i === pipeIdx;
              return (
                <React.Fragment key={step.key}>
                  <View style={s.pipeStep}>
                    <View style={[s.pipeCircle, done && s.pipeCircleDone, current && s.pipeCircleCurrent]}>
                      <AppIcon name={step.icon} size={14} color={done ? C.white : C.slate} />
                    </View>
                    <Text style={[s.pipeLabel, done && { color: C.teal, fontWeight: "700" }]}>{step.label}</Text>
                  </View>
                  {i < PIPELINE.length - 1 && (
                    <View style={[s.pipeLine, done && i < pipeIdx && s.pipeLineDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Card>

        <Card style={{ gap: 8 }}>
          <SectionHeading label="Activity log" />
          <View style={s.logRow}>
            <View style={s.logDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.logTitle}>Provider assigned</Text>
              <Text style={s.logNote}>The job workspace is open for the hirer and provider.</Text>
              <Text style={s.logTime}>{formatRelativeDate(job?.updated_at || job?.created_at) || "Today"}</Text>
            </View>
          </View>
        </Card>

        {(job?.provider_suggested_start_at || job?.started_at) && (
          <Card>
            <SectionHeading label="Start time" />
            <InfoRow icon="clock" label="Provider suggested" value={formatJobDate(job.provider_suggested_start_at) || "Not suggested"} />
            <InfoRow icon="check-circle" label="Official start" value={formatJobDate(job.started_at) || "Waiting confirmation"} />
            {job.provider_start_note ? <Text style={s.formHint}>{job.provider_start_note}</Text> : null}
          </Card>
        )}

        {(waitingStart || waitingCompletion) && (
          <Card>
            <SectionHeading label={waitingStart ? "Waiting for start confirmation" : "Waiting for completion confirmation"} />
            <Text style={s.formHint}>
              {waitingStart
                ? "The hirer needs to confirm this start time before the job is marked as working."
                : "The hirer needs to confirm completion before the job closes and ratings open."}
            </Text>
          </Card>
        )}

        {/* Start Job */}
        {(canStart || canConfirmStart) && (
          <Card>
            <SectionHeading label={isHirer ? "Confirm start time" : "Start this job"} />
            {!showStartForm ? (
              <PrimaryButton
                label={isHirer ? "Confirm Start" : "Suggest Start"}
                icon="play-circle"
                onPress={() => setShowStartForm(true)}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={s.formHint}>Add a remark (optional) — e.g. "Starting now, will arrive in 30 minutes"</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g. Nipo njiani, nitafika dakika 20…"
                  placeholderTextColor={C.slate}
                  value={startRemark}
                  onChangeText={setStartRemark}
                  multiline
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <OutlineButton label="Cancel" onPress={() => setShowStartForm(false)} color={C.slate} />
                  <PrimaryButton label={isHirer ? "Confirm Start" : "Submit Start"} onPress={startJob} loading={startingJob} />
                </View>
              </View>
            )}
          </Card>
        )}

        {(job?.provider_suggested_completed_at || job?.completed_at) && (
          <Card>
            <SectionHeading label="Completion time" />
            <InfoRow icon="clock" label="Provider submitted" value={formatJobDate(job.provider_suggested_completed_at) || "Not submitted"} />
            <InfoRow icon="check-circle" label="Official completion" value={formatJobDate(job.completed_at) || "Waiting confirmation"} />
            {job.provider_completion_note ? <Text style={s.formHint}>{job.provider_completion_note}</Text> : null}
          </Card>
        )}

        {/* Submit or confirm completed work */}
        {(canSubmit || canConfirmCompletion) && (
          <Card>
            <SectionHeading label={isHirer ? "Confirm completion" : "Submit your work"} />
            <Text style={s.formHint}>{isHirer ? "Confirm only when the work is complete. This closes the job and enables rating." : "Only submit when the work is fully done. The hirer will verify and close the job."}</Text>
            <TextInput
              style={[s.formInput, { marginTop: 10 }]}
              placeholder="Add a handover note (optional)…"
              placeholderTextColor={C.slate}
              value={submitNote}
              onChangeText={setSubmitNote}
              multiline
            />
            <View style={{ marginTop: 10 }}>
              <PrimaryButton label={isHirer ? "Confirm Completed" : "Submit Completed Work"} icon="upload-cloud" onPress={submitJob} loading={submitting} />
            </View>
          </Card>
        )}

        {/* Hirer: rating after completion */}
        {isComplete && isHirer && (
          <Card>
            <SectionHeading label="Rate the provider" />
            <View style={s.starsRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setRatingScore(n)} style={s.starBtn}>
                  <Text style={[s.scoreChip, n <= ratingScore && s.scoreChipActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[s.formInput, { marginTop: 10 }]}
              placeholder="Write a recommendation (optional)…"
              placeholderTextColor={C.slate}
              value={ratingNote}
              onChangeText={setRatingNote}
              multiline
            />
            <Text style={s.formHint}>{ratingScore > 6 ? "Ratings above 6 can become recommendations." : "Ratings 6 and below will not recommend this provider."}</Text>
            <View style={{ marginTop: 10 }}>
              <PrimaryButton label="Save Rating" onPress={saveRating} loading={ratingSaving} />
            </View>
          </Card>
        )}

        {isComplete && (
          <Card style={s.completedBanner}>
            <AppIcon name="award" size={28} color={C.green} />
            <Text style={s.completedTitle}>Job Completed</Text>
            <Text style={s.completedSub}>This job has been closed. Thank you!</Text>
          </Card>
        )}

        {isProvider && ["completed", "closed", "filled"].includes(jobStatus) && !job?.dispute_created_at ? (
          <Card>
            <SectionHeading label="Report an issue" />
            <Text style={s.formHint}>Use this only if the confirmed start or completion details are unfair.</Text>
            <TextInput
              style={[s.formInput, { marginTop: 10 }]}
              placeholder="Explain what happened..."
              placeholderTextColor={C.slate}
              value={disputeNote}
              onChangeText={setDisputeNote}
              multiline
            />
            <View style={{ marginTop: 10 }}>
              <OutlineButton label="Report Issue" onPress={reportDispute} loading={disputing} color={C.red} />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    );
  };

  const renderDetails = () => {
    if (!job) return null;
    const contact = job.contact_details;
    const otherParty = contact?.viewer_role === "hirer" ? contact?.service_provider : contact?.hirer;
    const code = job.job_code || job.code || "JOB";
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.detailsScroll}>
        <Card>
          <SectionHeading label="Job summary" />
          <View style={s.codePill}><Text style={s.codeText}>{code}</Text></View>
          <Text style={s.detailTitle}>{job.title}</Text>
          <InfoRow icon="map-pin" label="Location"  value={job.location||"Not set"} />
          <InfoRow icon="calendar" label="Posted"   value={formatRelativeDate(job.created_at)||"Today"} />
          <InfoRow icon="clock"    label="Deadline"  value={formatJobDate(job.tender_closes_at)||"—"} />
          <InfoRow icon="play-circle" label="Started" value={formatJobDate(job.started_at) || "Not confirmed"} />
          <InfoRow icon="award" label="Completed" value={formatJobDate(job.completed_at) || "Not confirmed"} />
          <InfoRow icon="dollar-sign" label="Budget" value={formatBudget(job.assigned_budget||job.budget)} />
        </Card>

        {job.description ? (
          <Card>
            <SectionHeading label="Description" />
            <Text style={s.detailBody}>{job.description}</Text>
          </Card>
        ) : null}

        {otherParty ? (
          <Card>
            <SectionHeading label="Your contact" />
            <View style={s.contactCard}>
              <Image source={{ uri: avatarUri(otherParty) }} style={s.contactAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.contactName}>@{otherParty.username||"user"}</Text>
                <Text style={s.contactFull}>{otherParty.full_name||""}</Text>
              </View>
              <TouchableOpacity style={s.profileBtn} onPress={()=>nav.navigate("UserProfile",{uuid:otherParty.uuid})}>
                <Text style={s.profileBtnTxt}>View Profile</Text>
              </TouchableOpacity>
            </View>
            {otherParty.phone_number && <InfoRow icon="phone" label="Phone" value={otherParty.phone_number}/>}
            {otherParty.email && <InfoRow icon="mail" label="Email" value={otherParty.email}/>}
          </Card>
        ) : null}
      </ScrollView>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.loadingCenter}>
        <ActivityIndicator color={C.teal} size="large" />
        <Text style={s.loadingTxt}>Loading workspace…</Text>
      </View>
    </SafeAreaView>
  );

  if (!job) return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <NavHeader title="Job Workspace" onBack={()=>nav.goBack()}/>
      <View style={s.loadingCenter}>
        <AppIcon name="alert-circle" size={36} color={C.red}/>
        <Text style={s.loadingTxt}>Job not found.</Text>
      </View>
    </SafeAreaView>
  );

  const jobStatus = workspaceStatus(job);
  const pipeIdx = pipelineIndex(jobStatus);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.workspaceHeader}>
        <TouchableOpacity style={s.backBtn} onPress={()=>nav.goBack()}>
          <AppIcon name="arrowLeft" size={20} color="#1A1A2E"/>
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.wsTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.wsCode}>{job.job_code||job.code||"JOB"} · <Text style={{ color: C.slate }}>{role === "hirer" ? "You posted" : "You applied"}</Text></Text>
        </View>
        <StatusBadge status={jobStatus} size="sm"/>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {[
          { id:"chat",     icon:"message", label:"Chat"     },
          { id:"progress", icon:"activity",       label:"Progress" },
          { id:"details",  icon:"file-text",      label:"Details"  },
        ].map(t2=>{
          const active = tab === t2.id;
          return(
            <TouchableOpacity key={t2.id} style={[s.tabBtn,active&&s.tabBtnActive]} onPress={()=>setTab(t2.id)}>
              <AppIcon name={t2.icon} size={16} color={active?C.teal:C.slate}/>
              <Text style={[s.tabLbl,active&&s.tabLblActive]}>{t2.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === "chat"     && renderChat()}
        {tab === "progress" && renderProgress()}
        {tab === "details"  && renderDetails()}
      </View>

      <HiringNoticeModal
        visible={!!notice} type={notice?.type}
        title={notice?.title} body={notice?.body}
        onPrimary={()=>setNotice(null)} onClose={()=>setNotice(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:{ flex:1, backgroundColor:C.bg },
  loadingCenter:{ flex:1, alignItems:"center", justifyContent:"center", gap:12 },
  loadingTxt:{ color:C.slate, fontSize:15, fontWeight:"600" },

  // Header
  workspaceHeader:{ flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:16, paddingVertical:12, backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:"#EEF0F4" },
  backBtn:{ width:38, height:38, borderRadius:19, backgroundColor:C.slateLight, alignItems:"center", justifyContent:"center" },
  wsTitle:{ fontSize:16, fontWeight:"800", color:"#1A1A2E" },
  wsCode:{ fontSize:11, fontWeight:"700", color:C.teal, marginTop:1 },

  // Tabs
  tabBar:{ flexDirection:"row", backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:"#EEF0F4" },
  tabBtn:{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:11, borderBottomWidth:2.5, borderBottomColor:"transparent" },
  tabBtnActive:{ borderBottomColor:C.teal },
  tabLbl:{ fontSize:13, fontWeight:"700", color:C.slate },
  tabLblActive:{ color:C.teal },

  // Chat
  chatList:{ padding:16, gap:12, paddingBottom:16 },
  chatEmpty:{ alignItems:"center", paddingTop:60, gap:12 },
  chatEmptyTxt:{ color:C.slate, fontSize:14, fontWeight:"600" },
  draftCard:{ margin:16, marginBottom:0, padding:12, borderRadius:12, backgroundColor:C.white, borderWidth:1, borderColor:"#EEF0F4", gap:8 },
  draftTitle:{ fontSize:13, fontWeight:"800", color:"#1A1A2E" },
  draftInput:{ minHeight:42, borderRadius:10, backgroundColor:C.slateLight, paddingHorizontal:12, paddingVertical:9, color:"#1A1A2E", fontSize:14 },
  draftTextArea:{ minHeight:76, textAlignVertical:"top" },
  bubble:{ flexDirection:"row", alignItems:"flex-end", gap:8 },
  bubbleMine:{ justifyContent:"flex-end" },
  bubbleTheirs:{ justifyContent:"flex-start" },
  bubbleAvatar:{ width:30, height:30, borderRadius:15 },
  bubbleBody:{ maxWidth:"75%", borderRadius:16, padding:12 },
  bubbleBodyMine:{ backgroundColor:C.teal, borderBottomRightRadius:4 },
  bubbleBodyTheirs:{ backgroundColor:C.white, borderBottomLeftRadius:4, borderWidth:1, borderColor:"#EEF0F4" },
  bubbleSender:{ fontSize:10, fontWeight:"800", color:C.teal, marginBottom:3 },
  bubbleText:{ fontSize:14, color:"#1A1A2E", lineHeight:20 },
  bubbleTextMine:{ color:C.white },
  bubbleTime:{ fontSize:10, color:C.slate, marginTop:4, alignSelf:"flex-end" },
  bubbleTimeMine:{ color:"rgba(255,255,255,0.6)" },
  chatInputBar:{ flexDirection:"row", alignItems:"flex-end", gap:10, paddingHorizontal:16, paddingTop:10, backgroundColor:C.white, borderTopWidth:1, borderTopColor:"#EEF0F4" },
  chatInput:{ flex:1, minHeight:44, maxHeight:120, borderRadius:22, backgroundColor:C.slateLight, paddingHorizontal:16, paddingVertical:10, fontSize:15, color:"#1A1A2E" },
  sendBtn:{ width:44, height:44, borderRadius:22, backgroundColor:C.teal, alignItems:"center", justifyContent:"center", shadowColor:C.teal, shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:6, elevation:4 },
  sendBtnDisabled:{ backgroundColor:"#B0C4C2" },

  // Progress
  progScroll:{ padding:16, gap:12, paddingBottom:100 },
  pipelineCard:{ gap:16 },
  pipeline:{ flexDirection:"row", alignItems:"center", justifyContent:"center" },
  pipeStep:{ alignItems:"center", gap:6, flex:1 },
  pipeCircle:{ width:32, height:32, borderRadius:16, backgroundColor:C.slateLight, alignItems:"center", justifyContent:"center" },
  pipeCircleDone:{ backgroundColor:C.teal },
  pipeCircleCurrent:{ backgroundColor:C.teal, shadowColor:C.teal, shadowOffset:{width:0,height:2}, shadowOpacity:0.4, shadowRadius:6, elevation:4 },
  pipeLabel:{ fontSize:10, fontWeight:"600", color:C.slate, textAlign:"center" },
  pipeLine:{ flex:1, height:2, backgroundColor:C.slateLight, marginBottom:18 },
  pipeLineDone:{ backgroundColor:C.teal },

  logRow:{ flexDirection:"row", gap:12, alignItems:"flex-start" },
  logDot:{ width:8, height:8, borderRadius:4, backgroundColor:C.teal, marginTop:5 },
  logTitle:{ fontSize:14, fontWeight:"700", color:"#1A1A2E" },
  logNote:{ fontSize:13, color:C.slate, lineHeight:19, marginTop:2 },
  logTime:{ fontSize:11, color:C.slate, marginTop:4 },

  formHint:{ fontSize:13, color:C.slate, lineHeight:20, marginBottom:4 },
  formInput:{ minHeight:88, borderRadius:12, borderWidth:1, borderColor:"#EEF0F4", backgroundColor:C.slateLight, color:"#1A1A2E", paddingHorizontal:14, paddingVertical:12, fontSize:14, textAlignVertical:"top" },

  starsRow:{ flexDirection:"row", gap:6, flexWrap:"wrap" },
  starBtn:{ padding:4 },
  star:{ fontSize:28, color:"#D1D5DB" },
  starActive:{ color:C.amber },
  scoreChip:{ minWidth:30, height:30, borderRadius:8, borderWidth:1, borderColor:"#D1D5DB", color:C.slate, textAlign:"center", textAlignVertical:"center", fontSize:13, fontWeight:"900", lineHeight:28 },
  scoreChipActive:{ borderColor:C.amber, backgroundColor:"#FEF3C7", color:"#92400E" },

  completedBanner:{ alignItems:"center", gap:8, backgroundColor:C.greenLight, borderColor:C.green },
  completedTitle:{ fontSize:18, fontWeight:"800", color:C.green },
  completedSub:{ fontSize:13, color:C.green },

  // Details
  detailsScroll:{ padding:16, gap:12, paddingBottom:100 },
  codePill:{ backgroundColor:C.tealLight, paddingHorizontal:10, paddingVertical:4, borderRadius:10, alignSelf:"flex-start", marginBottom:8 },
  codeText:{ color:C.teal, fontSize:12, fontWeight:"800" },
  detailTitle:{ fontSize:20, fontWeight:"800", color:"#1A1A2E", lineHeight:26, marginBottom:8 },
  detailBody:{ fontSize:14, color:C.slate, lineHeight:22 },
  contactCard:{ flexDirection:"row", alignItems:"center", gap:12, marginBottom:8 },
  contactAvatar:{ width:48, height:48, borderRadius:24 },
  contactName:{ fontSize:15, fontWeight:"800", color:"#1A1A2E" },
  contactFull:{ fontSize:12, color:C.slate },
  profileBtn:{ paddingHorizontal:12, paddingVertical:7, borderRadius:10, borderWidth:1, borderColor:C.teal },
  profileBtnTxt:{ color:C.teal, fontSize:12, fontWeight:"700" },
});
