import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const latest = query({
  args: { channel: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("realtimeEvents")
      .withIndex("by_channel_created", (q) => q.eq("channel", args.channel))
      .order("desc")
      .first(),
});

export const publish = mutation({
  args: {
    channel: v.string(),
    actorUuid: v.optional(v.string()),
    event: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("realtimeEvents", {
      ...args,
      createdAt: Date.now(),
    }),
});
