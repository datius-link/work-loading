export function extractMentions(text) {
  const users = [...text.matchAll(/@([a-zA-Z0-9_]+)/g)].map(
    (m) => ({ type: "user", value: m[1] })
  );

  const services = [...text.matchAll(/#([a-zA-Z0-9_]+)/g)].map(
    (m) => ({ type: "service", value: m[1] })
  );

  return [...users, ...services];
}
