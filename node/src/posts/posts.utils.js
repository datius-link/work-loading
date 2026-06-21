import { uniqueNormalizedHashtags } from "../search/search.normalization.js";

export function extractMentions(text) {
  const users = [...text.matchAll(/@([a-zA-Z0-9_]+)/g)].map(
    (m) => ({ type: "user", value: m[1] })
  );

  const services = uniqueNormalizedHashtags(
    [...text.matchAll(/#([a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*)/g)].map((m) => m[1])
  ).map((value) => ({ type: "hashtag", value }));

  return [...users, ...services];
}
