import { mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireCallerUuid } from "./authToken";

// If nobody answers within this window, the call auto-resolves to "missed" —
// scheduled server-side (see expireRing below) rather than left to a
// client-side timer, so it still fires even if the caller backgrounds or
// kills the app the moment after dialing.
const RING_TIMEOUT_MS = 45000;
// How long a "ringing" row from the other direction is still considered a
// live glare condition (A calling B while B is already calling A) rather
// than just an old, unrelated call.
const GLARE_WINDOW_MS = 8000;

// Real WebRTC signaling over Convex's reactive queries — the callee's client
// is subscribed to `incomingFor`, so the moment the caller inserts a "ringing"
// call doc, the callee's app sees it pushed live (this is the in-app "ring",
// no polling involved).
//
// Every handler below requires `authToken` (the same JWT node/src/auth issues
// at login) and checks it against the call's stored participant uuids —
// without this, anyone who could reach the public Convex deployment URL could
// read, hijack, or spoof any user's call by callId/uuid alone.

// A user is "active on a call" if they're the caller or callee of a row
// that's still ringing or already connected. Busy detection and the glare
// check below both boil down to "find that row, if any."
async function findActiveCallInvolving(ctx, uuid) {
  const asCallee = await ctx.db
    .query("calls")
    .withIndex("by_callee_created", (q) => q.eq("calleeUuid", uuid))
    .order("desc")
    .first();
  if (asCallee && (asCallee.status === "ringing" || asCallee.status === "accepted")) return asCallee;

  const asCaller = await ctx.db
    .query("calls")
    .withIndex("by_caller_created", (q) => q.eq("callerUuid", uuid))
    .order("desc")
    .first();
  if (asCaller && (asCaller.status === "ringing" || asCaller.status === "accepted")) return asCaller;

  return null;
}

export const create = mutation({
  args: {
    authToken: v.string(),
    callerUuid: v.string(),
    callerName: v.optional(v.string()),
    callerPhoto: v.optional(v.string()),
    calleeUuid: v.string(),
    jobId: v.string(),
    jobTitle: v.optional(v.string()),
    offerSdp: v.string(),
  },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    if (authedUuid !== args.callerUuid) throw new Error("Unauthorized");

    // Glare: the callee is already ringing *me*, right now, about (usually)
    // this same job — rather than create a second, competing ringing row,
    // tell the caller's own client to just answer the call that's already
    // there. CallProvider's incoming-call listener will have that row
    // already queued up (or picks it up within one reactive tick), so
    // "answer the existing one" is a real, resolvable instruction, not a
    // dead end.
    const reverseRinging = await ctx.db
      .query("calls")
      .withIndex("by_caller_created", (q) => q.eq("callerUuid", args.calleeUuid))
      .order("desc")
      .first();
    if (
      reverseRinging &&
      reverseRinging.calleeUuid === args.callerUuid &&
      reverseRinging.status === "ringing" &&
      Date.now() - reverseRinging.createdAt <= GLARE_WINDOW_MS
    ) {
      throw new Error(`GLARE:${reverseRinging._id}`);
    }

    // Busy: the callee is already mid-ring or mid-call with someone else
    // (any job). Still write a row — it's the one the caller's screen shows
    // the "not available" message for, and the one /calls/log turns into a
    // "busy" entry in both sides' history — but mark it busy immediately
    // instead of ever showing as "ringing" to either party.
    const busyWith = await findActiveCallInvolving(ctx, args.calleeUuid);
    const now = Date.now();
    if (busyWith) {
      const { authToken, ...callArgs } = args;
      return ctx.db.insert("calls", {
        ...callArgs,
        status: "busy",
        createdAt: now,
        updatedAt: now,
      });
    }

    const { authToken, ...callArgs } = args;
    const callId = await ctx.db.insert("calls", {
      ...callArgs,
      status: "ringing",
      createdAt: now,
      updatedAt: now,
    });

    // Reliability point: this runs on Convex's own scheduler, not a client
    // timer, so a call still auto-resolves to "missed" even if the caller
    // backgrounds the app, loses connectivity, or the app is killed right
    // after dialing.
    await ctx.scheduler.runAfter(RING_TIMEOUT_MS, internal.calls.expireRing, { callId });

    return callId;
  },
});

// Scheduled once per call at creation time (see create() above). If the
// call is still sitting in "ringing" once the timeout elapses, nobody
// picked up — flip it to "missed" so both sides' clients (subscribed to
// this same row via `get`/`incomingFor`) react accordingly.
export const expireRing = internalMutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") return; // already answered/declined/cancelled
    await ctx.db.patch(args.callId, { status: "missed", updatedAt: Date.now() });
  },
});

export const answer = mutation({
  args: { authToken: v.string(), callId: v.id("calls"), answerSdp: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");
    if (call.calleeUuid !== authedUuid) throw new Error("Unauthorized");

    await ctx.db.patch(args.callId, {
      answerSdp: args.answerSdp,
      status: "accepted",
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { authToken: v.string(), callId: v.id("calls"), status: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");
    if (call.callerUuid !== authedUuid && call.calleeUuid !== authedUuid) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.callId, { status: args.status, updatedAt: Date.now() });
  },
});

export const addIceCandidate = mutation({
  args: { authToken: v.string(), callId: v.string(), fromUuid: v.string(), candidate: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    if (args.fromUuid !== authedUuid) throw new Error("Unauthorized");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");
    if (call.callerUuid !== authedUuid && call.calleeUuid !== authedUuid) {
      throw new Error("Unauthorized");
    }

    const { authToken, ...candidateArgs } = args;
    return ctx.db.insert("callIceCandidates", { ...candidateArgs, createdAt: Date.now() });
  },
});

export const listIceCandidates = query({
  args: { authToken: v.string(), callId: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    const call = await ctx.db.get(args.callId);
    if (!call || (call.callerUuid !== authedUuid && call.calleeUuid !== authedUuid)) {
      throw new Error("Unauthorized");
    }
    return ctx.db
      .query("callIceCandidates")
      .withIndex("by_call_created", (q) => q.eq("callId", args.callId))
      .order("asc")
      .collect();
  },
});

// Live-subscribed by every signed-in user while the app is open: the most
// recent call where they're the callee. The UI treats a fresh "ringing" row
// (newer than when the screen mounted) as an incoming call.
export const incomingFor = query({
  args: { authToken: v.string(), calleeUuid: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    if (authedUuid !== args.calleeUuid) throw new Error("Unauthorized");

    return ctx.db
      .query("calls")
      .withIndex("by_callee_created", (q) => q.eq("calleeUuid", args.calleeUuid))
      .order("desc")
      .first();
  },
});

// Job-scoped "is there a live call happening for this job right now" —
// separate from incomingFor (which is global, and is what makes the OS-level
// ring work no matter what screen you're on). This is what lets the
// Workspace show a "call in progress" banner and lets a participant who
// backgrounded the CallOverlay tap back into it from inside the workspace.
export const activeForJob = query({
  args: { authToken: v.string(), jobId: v.string() },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);

    const call = await ctx.db
      .query("calls")
      .withIndex("by_job_created", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .first();

    if (!call) return null;
    if (call.callerUuid !== authedUuid && call.calleeUuid !== authedUuid) return null;
    if (call.status !== "ringing" && call.status !== "accepted") return null;
    return call;
  },
});

export const get = query({
  args: { authToken: v.string(), callId: v.id("calls") },
  handler: async (ctx, args) => {
    const authedUuid = await requireCallerUuid(args.authToken);
    const call = await ctx.db.get(args.callId);
    if (call && call.callerUuid !== authedUuid && call.calleeUuid !== authedUuid) {
      throw new Error("Unauthorized");
    }
    return call;
  },
});
