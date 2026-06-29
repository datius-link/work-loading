import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function toClientMessage(row) {
  return {
    id: row._id,
    job_id: row.jobId,
    sender_uuid: row.senderUuid,
    message: row.message,
    media: Array.isArray(row.media) ? row.media : [],
    message_type: row.messageType || (Array.isArray(row.media) && row.media.length ? "mixed" : "text"),
    delivered_at: row.deliveredAt ? new Date(row.deliveredAt).toISOString() : null,
    read_at: row.readAt ? new Date(row.readAt).toISOString() : null,
    created_at: new Date(row.createdAt).toISOString(),
    sender: {
      uuid: row.senderUuid,
      username: row.senderUsername,
      full_name: row.senderFullName,
      profile_pic: row.senderProfilePic,
    },
  };
}

export const list = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("jobMessages")
      .withIndex("by_job_created", (q) => q.eq("jobId", args.jobId))
      .collect();

    return rows.map(toClientMessage);
  },
});

export const send = mutation({
  args: {
    jobId: v.string(),
    senderUuid: v.string(),
    senderUsername: v.optional(v.string()),
    senderFullName: v.optional(v.string()),
    senderProfilePic: v.optional(v.string()),
    message: v.string(),
    media: v.optional(v.array(v.any())),
    messageType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.message.trim();
    const media = Array.isArray(args.media) ? args.media : [];
    if (!text && !media.length) throw new Error("Message is required");

    const id = await ctx.db.insert("jobMessages", {
      jobId: args.jobId,
      senderUuid: args.senderUuid,
      senderUsername: args.senderUsername,
      senderFullName: args.senderFullName,
      senderProfilePic: args.senderProfilePic,
      message: text,
      media,
      messageType: args.messageType || (media.length ? "mixed" : "text"),
      deliveredAt: Date.now(),
      createdAt: Date.now(),
    });

    const row = await ctx.db.get(id);
    return toClientMessage(row);
  },
});
