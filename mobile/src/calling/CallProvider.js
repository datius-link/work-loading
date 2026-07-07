// Real in-app audio calling — a genuine WebRTC peer connection between two
// e-kazi users, signaled through Convex (the same realtime backbone already
// used for job workspace chat). This is the WhatsApp/Bolt-style "call inside
// the app" experience, not the tel: native-dialer handoff used elsewhere.
//
// Native module note: react-native-webrtc requires a custom dev client (see
// eas.json) — it cannot run inside Expo Go. Guarded like bluetoothService.js
// so the rest of the app doesn't crash if this build doesn't include it yet.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";
import { getUserSession, subscribeUserSession } from "../utils/userSession";
import { viewerRequest } from "../api/api";
import { ICE_SERVERS } from "./webrtcConfig";
import { displayIncomingCallNative, endNativeCall, isCallKeepSupported, onNativeAnswer, onNativeEnd, setupCallKeep } from "./callKeepBridge";

let RTC = null;
try {
  RTC = require("react-native-webrtc");
} catch {
  RTC = null;
}

// Routes call audio to the speaker instead of the earpiece. A separate
// native module from react-native-webrtc — WebRTC gives you the audio
// stream, but not a speaker/earpiece switch — guarded the same way so a
// build without it yet just disables the button instead of crashing.
let InCallManager = null;
try {
  InCallManager = require("react-native-incall-manager").default;
} catch {
  InCallManager = null;
}

export function isCallingSupported() {
  return !!RTC?.RTCPeerConnection && !!RTC?.mediaDevices;
}

export function isSpeakerToggleSupported() {
  return !!InCallManager;
}

const CallContext = createContext(null);

export function useCall() {
  return useContext(CallContext);
}

const CALL_STATE = {
  IDLE: "idle",
  OUTGOING: "outgoing",
  INCOMING: "incoming",
  ACTIVE: "active",
};

// Longer than any real phone ring - beyond this, a still-"ringing" row is
// either a crash-orphaned leftover or a call the caller already gave up on.
const RING_STALE_MS = 45000;

export function CallProvider({ children }) {
  const [myUuid, setMyUuid] = useState(null);
  const [myToken, setMyToken] = useState(null);
  const [myName, setMyName] = useState("");
  const [myPhoto, setMyPhoto] = useState(null);
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [callId, setCallId] = useState(null);
  const [otherParty, setOtherParty] = useState(null); // { uuid, name, photo }
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [error, setError] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const appliedIceIndexRef = useRef(0);
  const handledIncomingIdsRef = useRef(new Set());
  // Tracked outside React state (refs, not re-rendered) purely so the
  // history-logging helper and the ICE connection-state callback — both of
  // which fire from callbacks that could otherwise close over stale state —
  // always see the current call's identity.
  const jobRef = useRef(null); // { jobId, jobTitle }
  const initiatedAtRef = useRef(null);
  const callStateRef = useRef(CALL_STATE.IDLE);
  const isCallerRef = useRef(false); // true if *I* placed this call, false if I received it
  const loggedRef = useRef(false); // guards against double-logging the same call
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const createCallMutation = useMutation(convexApi.calls.create);
  const answerCallMutation = useMutation(convexApi.calls.answer);
  const setStatusMutation = useMutation(convexApi.calls.setStatus);
  const addIceCandidateMutation = useMutation(convexApi.calls.addIceCandidate);

  const incomingCall = useQuery(
    convexApi.calls.incomingFor,
    myUuid && myToken ? { authToken: myToken, calleeUuid: myUuid } : "skip"
  );
  const liveCall = useQuery(
    convexApi.calls.get,
    callId && myToken ? { authToken: myToken, callId } : "skip"
  );
  const iceCandidates = useQuery(
    convexApi.calls.listIceCandidates,
    callId && myToken ? { authToken: myToken, callId } : "skip"
  );

  // ── Who am I (for signaling identity + CallKeep display name) ────────────
  useEffect(() => {
    getUserSession().then((session) => {
      const uuid = session.profile?.uuid || session.user?.uuid || null;
      setMyUuid(uuid);
      setMyToken(session.token || null);
      setMyName(session.profile?.full_name || session.profile?.username || session.user?.full_name || "e-kazi user");
      setMyPhoto(session.profile?.profile_pic || session.user?.profile_pic || null);
    });
    return subscribeUserSession((session) => {
      setMyUuid(session?.profile?.uuid || session?.user?.uuid || null);
      setMyToken(session?.token || null);
    });
  }, []);

  useEffect(() => {
    if (isCallKeepSupported()) setupCallKeep();
  }, []);

  // Writes the permanent job_calls row once a call reaches a terminal state
  // (see node/src/calls/calls.controller.js#logCallOutcome). To avoid both
  // participants writing the same call twice, logging responsibility is
  // split: the caller's client logs completed/cancelled/missed/busy (it has
  // full visibility of the whole lifecycle), the callee's client only logs
  // declined (the one outcome only it can actually decide).
  const logOutcome = useCallback(
    (outcome) => {
      if (loggedRef.current) return;
      if (!callId || !myUuid || !otherParty?.uuid || !jobRef.current?.jobId) return;
      loggedRef.current = true;
      const isCaller = isCallerRef.current;
      viewerRequest("post", "/calls/log", {
        job_id: jobRef.current.jobId,
        caller_uuid: isCaller ? myUuid : otherParty.uuid,
        callee_uuid: isCaller ? otherParty.uuid : myUuid,
        convex_call_id: callId,
        outcome,
        initiated_at: initiatedAtRef.current ? new Date(initiatedAtRef.current).toISOString() : undefined,
        answered_at: callStartedAt ? new Date(callStartedAt).toISOString() : undefined,
        ended_at: new Date().toISOString(),
      }).catch((err) => console.log("call history log error:", err?.response?.data || err?.message));
    },
    [callId, myUuid, otherParty, callStartedAt]
  );

  const cleanup = useCallback(() => {
    peerConnectionRef.current?.close?.();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    localStreamRef.current = null;
    appliedIceIndexRef.current = 0;
    setCallState(CALL_STATE.IDLE);
    setCallId(null);
    setOtherParty(null);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setCallStartedAt(null);
    jobRef.current = null;
    initiatedAtRef.current = null;
    loggedRef.current = false;
    InCallManager?.stop();
  }, []);

  const createPeerConnection = useCallback(
    (onLocalIce) => {
      const pc = new RTC.RTCPeerConnection(ICE_SERVERS);
      pc.onicecandidate = (event) => {
        if (event.candidate) onLocalIce(event.candidate);
      };
      // A silent network drop (nobody tapped End) would otherwise leave the
      // call stuck in ACTIVE forever with no duration ever recorded. Once
      // connected, "disconnected/failed/closed" is treated the same as a
      // real hangup, just logged as "failed" instead of "completed" so the
      // history tab can tell the two apart.
      pc.oniceconnectionstatechange = () => {
        if (callStateRef.current !== CALL_STATE.ACTIVE) return;
        if (["disconnected", "failed", "closed"].includes(pc.iceConnectionState)) {
          logOutcome("failed");
          endNativeCall();
          cleanup();
        }
      };
      return pc;
    },
    [logOutcome, cleanup]
  );

  // ── Outgoing call ─────────────────────────────────────────────────────────
  const startCall = useCallback(
    async ({ calleeUuid, calleeName, calleePhoto, jobId, jobTitle }) => {
      if (!isCallingSupported()) {
        setError("Calling needs a dev-client build (react-native-webrtc is a native module — it can't run in Expo Go).");
        return;
      }
      if (!jobId) {
        setError("A call must be started from inside a job workspace.");
        return;
      }
      if (!myUuid || !myToken || callState !== CALL_STATE.IDLE) return;
      try {
        setError(null); // clear a leftover "not available"/error message from the previous call
        setOtherParty({ uuid: calleeUuid, name: calleeName || "e-kazi user", photo: calleePhoto || null });
        setCallState(CALL_STATE.OUTGOING);
        isCallerRef.current = true;
        jobRef.current = { jobId: String(jobId), jobTitle: jobTitle || null };
        initiatedAtRef.current = Date.now();
        InCallManager?.start({ media: "audio" });

        const stream = await RTC.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pendingCandidates = [];
        let localCallId = null;
        const pc = createPeerConnection((candidate) => {
          if (localCallId) addIceCandidateMutation({ authToken: myToken, callId: localCallId, fromUuid: myUuid, candidate: JSON.stringify(candidate) });
          else pendingCandidates.push(candidate);
        });
        peerConnectionRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        const newCallId = await createCallMutation({
          authToken: myToken,
          callerUuid: myUuid,
          callerName: myName,
          callerPhoto: myPhoto || undefined,
          calleeUuid,
          jobId: String(jobId),
          jobTitle: jobTitle || undefined,
          offerSdp: offer.sdp,
        });
        localCallId = String(newCallId);
        setCallId(localCallId);
        pendingCandidates.forEach((c) => addIceCandidateMutation({ authToken: myToken, callId: localCallId, fromUuid: myUuid, candidate: JSON.stringify(c) }));

        // Best-effort push so the callee's phone can ring even if they don't
        // currently have a live Convex subscription open (background/killed).
        viewerRequest("post", "/calls/notify", { calleeUuid, callId: localCallId, callerName: myName, jobId }).catch((err) => {
          console.log("call notify push error:", err?.message);
        });
      } catch (err) {
        const message = err?.message || "";
        if (message.startsWith("GLARE:")) {
          // The callee was already calling *me* about this same pairing —
          // that row already exists and CallProvider's own incoming-call
          // listener (subscribed to incomingFor) will surface it as a real
          // incoming call within one reactive tick. Just back out of the
          // outgoing attempt quietly instead of showing an error.
          cleanup();
          return;
        }
        setError(message || "Could not start the call");
        cleanup();
      }
    },
    [myUuid, myToken, myName, myPhoto, callState, createPeerConnection, createCallMutation, addIceCandidateMutation, cleanup]
  );

  // ── Incoming call detection (works from a cold start too) ─────────────────
  // Deliberately NOT gated on "was this call created after CallProvider
  // mounted" - a call placed while the app was closed/killed has a
  // createdAt from before this mount, and would always look "stale" under
  // that check even though it's still actively ringing. Instead we only
  // drop rows old enough that they can't possibly still be a live ring
  // (crash-orphaned row, or a call the caller gave up on ages ago).
  useEffect(() => {
    if (!incomingCall || incomingCall.status !== "ringing") return;
    if (Date.now() - incomingCall.createdAt > RING_STALE_MS) return;
    const id = String(incomingCall._id);
    if (handledIncomingIdsRef.current.has(id)) return;
    if (callState !== CALL_STATE.IDLE) return; // already on a call
    handledIncomingIdsRef.current.add(id);
    isCallerRef.current = false;
    jobRef.current = { jobId: incomingCall.jobId, jobTitle: incomingCall.jobTitle || null };
    initiatedAtRef.current = incomingCall.createdAt;
    setError(null); // clear a leftover message from whatever the previous call ended with
    setCallId(id);
    setOtherParty({ uuid: incomingCall.callerUuid, name: incomingCall.callerName || "e-kazi user", photo: incomingCall.callerPhoto || null });
    setCallState(CALL_STATE.INCOMING);
    InCallManager?.start({ media: "audio" });
    if (isCallKeepSupported()) {
      displayIncomingCallNative({ callId: id, callerName: incomingCall.callerName || "e-kazi user" });
    }
  }, [incomingCall, callState]);

  // ── Accept ─────────────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!isCallingSupported() || !liveCall || callState !== CALL_STATE.INCOMING) return;
    try {
      const stream = await RTC.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = createPeerConnection((candidate) => {
        addIceCandidateMutation({ authToken: myToken, callId, fromUuid: myUuid, candidate: JSON.stringify(candidate) });
      });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTC.RTCSessionDescription({ type: "offer", sdp: liveCall.offerSdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await answerCallMutation({ authToken: myToken, callId, answerSdp: answer.sdp });
      setCallState(CALL_STATE.ACTIVE);
      setCallStartedAt(Date.now());
    } catch (err) {
      setError(err?.message || "Could not accept the call");
      cleanup();
    }
  }, [liveCall, callState, callId, myUuid, myToken, createPeerConnection, addIceCandidateMutation, answerCallMutation, cleanup]);

  // ── Caller side: notice the callee answered ───────────────────────────────
  // Busy and missed are both states the *callee* never actively produces in
  // real time (busy is decided server-side the instant the call is created;
  // missed is the scheduled ring-timeout firing) — so logging them here, on
  // the caller's own client, is the one place that's guaranteed to happen
  // exactly once per call.
  const BUSY_MESSAGE = "Sorry, the person you are calling is not available right now. Please try again later.";
  useEffect(() => {
    if (callState !== CALL_STATE.OUTGOING || !liveCall) return;
    if (liveCall.status === "accepted" && liveCall.answerSdp && peerConnectionRef.current) {
      peerConnectionRef.current
        .setRemoteDescription(new RTC.RTCSessionDescription({ type: "answer", sdp: liveCall.answerSdp }))
        .then(() => {
          setCallState(CALL_STATE.ACTIVE);
          setCallStartedAt(Date.now());
        })
        .catch((err) => setError(err?.message));
    } else if (liveCall.status === "declined") {
      cleanup();
    } else if (liveCall.status === "busy") {
      logOutcome("busy");
      setError(BUSY_MESSAGE);
      endNativeCall();
      cleanup();
    } else if (liveCall.status === "missed") {
      logOutcome("missed");
      setError(BUSY_MESSAGE);
      endNativeCall();
      cleanup();
    }
  }, [liveCall, callState, cleanup, logOutcome]);

  // ── Either side: remote ended the call ────────────────────────────────────
  // Only fires for whichever party did *not* just call endCall() themselves
  // (their own callState has already left ACTIVE by the time this observes
  // the change) — so this never double-logs the outcome the other side
  // already recorded.
  useEffect(() => {
    if (callState === CALL_STATE.ACTIVE && liveCall?.status === "ended") {
      cleanup();
    }
  }, [liveCall, callState, cleanup]);

  // ── Callee side: the caller cancelled, or the ring simply timed out,
  // before I ever answered ─────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== CALL_STATE.INCOMING || !liveCall) return;
    if (liveCall.status === "ended" || liveCall.status === "missed") {
      endNativeCall();
      cleanup();
    }
  }, [liveCall, callState, cleanup]);

  // ── ICE candidates from the other party ───────────────────────────────────
  useEffect(() => {
    if (!Array.isArray(iceCandidates) || !peerConnectionRef.current || !myUuid) return;
    const fresh = iceCandidates.slice(appliedIceIndexRef.current);
    fresh.forEach((row) => {
      if (row.fromUuid === myUuid) return;
      try {
        peerConnectionRef.current.addIceCandidate(new RTC.RTCIceCandidate(JSON.parse(row.candidate)));
      } catch (err) {
        console.log("addIceCandidate error:", err?.message);
      }
    });
    appliedIceIndexRef.current = iceCandidates.length;
  }, [iceCandidates, myUuid]);

  const declineCall = useCallback(() => {
    logOutcome("declined");
    if (callId) setStatusMutation({ authToken: myToken, callId, status: "declined" }).catch(() => {});
    endNativeCall();
    cleanup();
  }, [callId, myToken, setStatusMutation, cleanup, logOutcome]);

  const endCall = useCallback(() => {
    // Whoever presses End/Cancel logs the outcome, whichever side they're
    // on — the other party's own effect (watching this same call go
    // "ended") only cleans up locally, it never logs again.
    logOutcome(callStateRef.current === CALL_STATE.ACTIVE ? "completed" : "cancelled");
    if (callId) setStatusMutation({ authToken: myToken, callId, status: "ended" }).catch(() => {});
    endNativeCall();
    cleanup();
  }, [callId, myToken, setStatusMutation, cleanup, logOutcome]);

  // Bridge CallKeep's native ringing-screen buttons (answer/hang up) back
  // into the same accept/decline/end logic the in-app CallOverlay uses, so
  // it doesn't matter whether the user tapped the native notification or the
  // in-app buttons — both paths end up in the same place.
  useEffect(() => {
    const offAnswer = onNativeAnswer(() => {
      if (callState === CALL_STATE.INCOMING) acceptCall();
    });
    const offEnd = onNativeEnd(() => {
      if (callState === CALL_STATE.INCOMING) declineCall();
      else if (callState !== CALL_STATE.IDLE) endCall();
    });
    return () => {
      offAnswer();
      offEnd();
    };
  }, [callState, acceptCall, declineCall, endCall]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = isMuted; // currently muted -> enable, and vice versa
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    if (!InCallManager) return;
    InCallManager.setForceSpeakerphoneOn(!isSpeakerOn);
    setIsSpeakerOn((prev) => !prev);
  }, [isSpeakerOn]);

  const value = useMemo(
    () => ({
      supported: isCallingSupported(),
      speakerSupported: isSpeakerToggleSupported(),
      callState,
      otherParty,
      jobTitle: jobRef.current?.jobTitle || null,
      isMuted,
      isSpeakerOn,
      error,
      callStartedAt,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      clearError: () => setError(null),
    }),
    [callState, otherParty, isMuted, isSpeakerOn, error, callStartedAt, startCall, acceptCall, declineCall, endCall, toggleMute, toggleSpeaker]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export { CALL_STATE };
