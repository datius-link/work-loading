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
});
