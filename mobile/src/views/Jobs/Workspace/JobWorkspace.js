import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { getUserSession } from "../../../utils/userSession";
import { UploadManager } from "../../../utils/UploadManager";
import HiringNoticeModal from "../HiringNoticeModal";
import { C, NavHeader } from "../jobsUI";
import { StyleSheet } from "react-native";

import WorkspaceTopBar  from "./WorkspaceTopBar";
import WorkspaceChat    from "./workspace/WorkspaceChat";
import WorkspaceProgress from "./workspace/WorkspaceProgress";
import WorkspaceDetails  from "./workspace/WorkspaceDetails";
import WorkspaceCalls   from "./workspace/WorkspaceCalls";
import { useLanguage } from "../../../LanguageContext";

// ─── Status helpers ───────────────────────────────────────────────────────────
function workspaceStatus(job) {
  const status = String(job?.status || "hired").toLowerCase();
  if (status === "closed" && job?.assigned_provider_uuid) return "assigned";
  return status;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function JobWorkspace() {
  const nav    = useNavigation();
  const route  = useRoute();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const s = useMemo(() => createStyles(theme), [theme]);
  const jobId  = route.params?.jobId;

  const [job,        setJob]        = useState(null);
  const [initialMessages, setInitialMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [myUuid,     setMyUuid]     = useState(null);
  const [myProfile,  setMyProfile]  = useState(null);
  const [role,       setRole]       = useState("provider");
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState(route.params?.tab || "chat");
  const [notice,     setNotice]     = useState(null);
  const [sending,    setSending]    = useState(false);
  const [missedCallCount, setMissedCallCount] = useState(0);
  const liveMessages = useQuery(convexApi.jobMessages.list, jobId ? { jobId: String(jobId) } : "skip");
  const workspaceSignal = useQuery(
    convexApi.realtimeEvents.latest,
    jobId ? { channel: `workspace:${jobId}` } : "skip"
  );
  const publishRealtimeEvent = useMutation(convexApi.realtimeEvents.publish);
  const messages = useMemo(() => {
    const merged = new Map();
    [...initialMessages, ...(Array.isArray(liveMessages) ? liveMessages : []), ...pendingMessages].forEach((item) => {
      if (item?.id) merged.set(String(item.id), item);
    });
    return Array.from(merged.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [initialMessages, liveMessages, pendingMessages]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    try {
      const session = await getUserSession();
      const me = session.profile?.uuid || session.user?.uuid;
      setMyUuid(me);
      setMyProfile(session.profile || session.user || null);

      const jobRes = await viewerRequest("get", `/hiring/jobs/${jobId}/workspace`);
      const j = jobRes?.data?.job || null;
      if (j) {
        setJob(j);
        const ownerUuid = j.client_user_uuid || j.created_by || j.poster?.uuid;
        setRole(jobRes?.data?.role || (ownerUuid && me && ownerUuid === me ? "hirer" : "provider"));
        setInitialMessages(Array.isArray(jobRes?.data?.messages) ? jobRes.data.messages : []);
      }
    } catch (e) {
      console.log("workspace load error", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (["chat", "progress", "calls", "details"].includes(route.params?.tab)) {
      setTab(route.params.tab);
    }
  }, [route.params?.tab]);
  useEffect(() => {
    if (workspaceSignal?._id) load();
  }, [workspaceSignal?._id, load]);

  // Just enough of the call history fetched separately from the Calls tab
  // itself (which loads the full list only once it's actually opened) to
  // drive the little missed-call badge on the tab bar — cleared locally the
  // moment the user actually opens the tab, same as an unread count.
  useEffect(() => {
    if (!jobId) return;
    viewerRequest("get", `/calls/job/${jobId}`)
      .then((res) => {
        const rows = Array.isArray(res?.data?.calls) ? res.data.calls : [];
        setMissedCallCount(rows.filter((c) => c.outcome === "missed" && c.direction === "incoming").length);
      })
      .catch(() => {});
  }, [jobId, tab]);

  useEffect(() => {
    if (tab === "calls") setMissedCallCount(0);
  }, [tab]);

  const notifyWorkspaceChanged = useCallback(
    async (event) => {
      if (!jobId) return;
      await publishRealtimeEvent({
        channel: `workspace:${jobId}`,
        actorUuid: myUuid || undefined,
        event,
      });
      if (["rating_submitted", "recommendation_submitted"].includes(event)) {
        const providerUuid = job?.assigned_provider_uuid || job?.contact_details?.service_provider?.uuid;
        if (providerUuid) {
          await publishRealtimeEvent({
            channel: `profile:${providerUuid}`,
            actorUuid: myUuid || undefined,
            event,
          });
        }
      }
    },
    [job, jobId, myUuid, publishRealtimeEvent]
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async ({ text = "", mediaAssets = [] } = {}) => {
    const cleanText = String(text || "").trim();
    if ((!cleanText && !mediaAssets.length) || sending) return false;
    if (!myUuid) {
      setNotice({ type: "error", title: "Sign in required", body: "Please sign in again before sending messages." });
      return false;
    }

    setSending(true);
    const tempId = `pending-${Date.now()}`;
    const optimisticMedia = mediaAssets.map((asset) => ({
      url: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      width: asset.width || null,
      height: asset.height || null,
      duration: asset.duration || null,
      name: asset.fileName || asset.name || null,
      mimeType: asset.mimeType || null,
    }));
    const optimistic = {
      id: tempId,
      job_id: jobId,
      sender_uuid: myUuid,
      message: cleanText,
      media: optimisticMedia,
      message_type: optimisticMedia.length ? "mixed" : "text",
      created_at: new Date().toISOString(),
      sender: {
        uuid: myUuid,
        username: myProfile?.username,
        full_name: myProfile?.full_name || myProfile?.fullName,
        profile_pic: myProfile?.profile_pic || myProfile?.profilePic,
      },
      _pending: true,
    };
    setPendingMessages((prev) => [...prev, optimistic]);

    try {
      const uploadedMedia = mediaAssets.length
        ? await UploadManager.startUpload(mediaAssets, "workspace_messages")
        : [];
      const messageType = uploadedMedia.some((item) => item.type === "video")
        ? uploadedMedia.some((item) => item.type === "image") || cleanText
          ? "mixed"
          : "video"
        : uploadedMedia.length
          ? cleanText ? "mixed" : "image"
          : "text";
      const res = await viewerRequest("post", `/hiring/jobs/${jobId}/messages`, {
        message: cleanText,
        media: uploadedMedia,
        message_type: messageType,
      });
      const saved = res?.data?.message;
      setPendingMessages((prev) => prev.filter((item) => item.id !== tempId));
      if (saved?.id) {
        setInitialMessages((prev) => {
          const nextMessages = prev.filter((item) => String(item.id) !== String(saved.id));
          return [...nextMessages, saved];
        });
      }
      try {
        await notifyWorkspaceChanged("message_sent");
      } catch (eventError) {
        console.log("workspace message realtime error", eventError?.message);
      }
      return true;
    } catch (e) {
      setPendingMessages((prev) =>
        prev.map((item) => (item.id === tempId ? { ...item, _pending: false, _failed: true } : item))
      );
      setNotice({
        type: "error",
        title: language === "sw" ? "Ujumbe haukutumwa" : "Message not sent",
        body: getFriendlyApiError(e, language),
      });
      return false;
    } finally {
      setSending(false);
      UploadManager.reset();
    }
  };

  // Resend a message that failed to send. The local media (if any) is still
  // sitting on the optimistic message with its original device uri and
  // dimensions, so we just remove the failed entry and run it back through
  // sendMessage exactly like a fresh send.
  const retryMessage = async (failedItem) => {
    if (!failedItem?.id) return;
    setPendingMessages((prev) => prev.filter((item) => item.id !== failedItem.id));
    const mediaAssets = (Array.isArray(failedItem.media) ? failedItem.media : []).map((m) => ({
      uri: m.url,
      type: m.type,
      width: m.width,
      height: m.height,
      duration: m.duration,
      fileName: m.name,
      mimeType: m.mimeType,
    }));
    await sendMessage({ text: failedItem.message || "", mediaAssets });
  };

  // States
  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={s.centerTxt}>Loading workspace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <NavHeader title={language === "sw" ? "Eneo la Kazi" : "Job Workspace"} onBack={() => nav.goBack()} />
        <View style={s.center}>
          <AppIcon name="alert-circle" size={36} color={C.red} />
          <Text style={s.centerTxt}>{language === "sw" ? "Kazi haikupatikana." : "Job not found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const jobStatus = workspaceStatus(job);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <WorkspaceTopBar
        job={job}
        role={role}
        jobStatus={jobStatus}
        tab={tab}
        onBack={() => nav.goBack()}
        onTabChange={setTab}
        missedCallCount={missedCallCount}
      />

      <View style={{ flex: 1 }}>
        {tab === "chat" && (
          <WorkspaceChat
            messages={messages}
            myUuid={myUuid}
            sending={sending}
            onSend={sendMessage}
            onRetry={retryMessage}
          />
        )}
        {tab === "progress" && (
          <WorkspaceProgress
            job={job}
            jobId={jobId}
            role={role}
            onJobUpdate={setJob}
            onNotice={setNotice}
            onRealtimeChange={notifyWorkspaceChanged}
          />
        )}
        {tab === "calls" && (
          <WorkspaceCalls
            jobId={jobId}
            jobTitle={job.title}
            otherParty={job.contact_details?.viewer_role === "hirer" ? job.contact_details?.service_provider : job.contact_details?.hirer}
          />
        )}
        {tab === "details" && (
          <WorkspaceDetails job={job} />
        )}
      </View>

      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        onPrimary={() => setNotice(null)}
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe:      { flex: 1, backgroundColor: theme.colors.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerTxt: { color: theme.colors.textMuted, fontSize: 15, fontWeight: "600" },
});
