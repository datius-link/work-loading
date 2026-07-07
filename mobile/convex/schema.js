import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jobMessages: defineTable({
    jobId: v.string(),
    senderUuid: v.string(),
    senderUsername: v.optional(v.string()),
    senderFullName: v.optional(v.string()),
    senderProfilePic: v.optional(v.string()),
    message: v.string(),
    media: v.optional(v.array(v.any())),
    messageType: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_job_created", ["jobId", "createdAt"])
    .index("by_job", ["jobId"]),
  realtimeEvents: defineTable({
    channel: v.string(),
    actorUuid: v.optional(v.string()),
    event: v.string(),
    count: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_channel_created", ["channel", "createdAt"]),

  // ── Real in-app audio calling (WebRTC signaling) ──────────────────────────
  // Convex itself is the signaling channel: the caller writes an offer, the
  // callee's live query picks it up (that's the "ring"), the callee writes
  // back an answer, and both sides exchange ICE candidates through
  // callIceCandidates. No separate signaling server needed.
  calls: defineTable({
    callerUuid: v.string(),
    callerName: v.optional(v.string()),
    callerPhoto: v.optional(v.string()),
    calleeUuid: v.string(),
    // Every call is about a specific job now — this is what lets the Job
    // Workspace scope "is there a live call for this job" instead of the
    // app only ever knowing about one global call per user.
    jobId: v.string(),
    jobTitle: v.optional(v.string()),
    status: v.string(), // "ringing" | "accepted" | "declined" | "ended" | "missed" | "busy"
    offerSdp: v.optional(v.string()),
    answerSdp: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_callee_created", ["calleeUuid", "createdAt"])
    .index("by_caller_created", ["callerUuid", "createdAt"])
    .index("by_job_created", ["jobId", "createdAt"]),

  callIceCandidates: defineTable({
    callId: v.string(),
    fromUuid: v.string(),
    candidate: v.string(), // JSON.stringify(RTCIceCandidateInit)
    createdAt: v.number(),
  }).index("by_call_created", ["callId", "createdAt"]),
});
