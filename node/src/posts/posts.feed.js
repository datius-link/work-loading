import db from "../db/index.js";

export async function enrichPostsWithViewerState(posts, viewerUuid) {
  if (!posts?.length) return [];

  if (!viewerUuid) {
    return posts.map((post) => ({
      ...post,
      is_liked: false,
      is_following: false,
    }));
  }

  const postIds = posts.map((post) => post.id);
  const providerUuids = [...new Set(posts.map((post) => post.profile_uuid).filter(Boolean))];

  const [likes, follows] = await Promise.all([
    db("post_likes").where({ profile_uuid: viewerUuid }).whereIn("post_id", postIds).select("post_id"),
    providerUuids.length
      ? db("profile_followers")
          .where({ follower_uuid: viewerUuid })
          .whereIn("provider_uuid", providerUuids)
          .select("provider_uuid")
      : [],
  ]);

  const likedSet = new Set(likes.map((row) => row.post_id));
  const followingSet = new Set(follows.map((row) => row.provider_uuid));

  return posts.map((post) => ({
    ...post,
    is_liked: likedSet.has(post.id),
    is_following: followingSet.has(post.profile_uuid),
  }));
}

export function countCommentTree(comments) {
  let total = 0;
  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      total += 1;
      if (node.replies?.length) walk(node.replies);
    });
  };
  walk(comments);
  return total;
}
