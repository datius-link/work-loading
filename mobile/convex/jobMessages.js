import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function toClientMessage(row) {
  return {
    id: row._id,
    job_id: row.jobId,
    sender_uuid: row.senderUuid,
    message: row.message,
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
  },
  handler: async (ctx, args) => {
    const text = args.message.trim();
    if (!text) throw new Error("Message is required");

    const id = await ctx.db.insert("jobMessages", {
      jobId: args.jobId,
      senderUuid: args.senderUuid,
      senderUsername: args.senderUsername,
      senderFullName: args.senderFullName,
      senderProfilePic: args.senderProfilePic,
      message: text,
      createdAt: Date.now(),
    });

    const row = await ctx.db.get(id);
    return toClientMessage(row);
  },
});
