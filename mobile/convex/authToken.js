// Verifies the same HS256 JWT that node/src/auth/auth.tokens.js issues
// (AUTH_TOKEN_SECRET), so Convex functions can tell who's actually calling
// them. Convex's default function runtime has no Node `crypto`/`jsonwebtoken`,
// but does expose Web Crypto (`crypto.subtle`), so verification is done by
// hand here rather than pulling in a Node-only JWT library.
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const withPad = pad ? padded + "=".repeat(4 - pad) : padded;
  const binary = atob(withPad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedKeyPromise = null;
function getHmacKey() {
  if (!cachedKeyPromise) {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret) throw new Error("AUTH_TOKEN_SECRET is not configured on this Convex deployment");
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
  return cachedKeyPromise;
}

// Returns the token's payload ({ uuid, email, is_verified, exp, ... }) if the
// signature is valid and it hasn't expired, otherwise null.
export async function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const key = await getHmacKey();
    const signature = base64UrlDecode(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp === "number" && Date.now() >= payload.exp * 1000) return null;
    if (!payload.uuid) return null;
    return payload;
  } catch {
    return null;
  }
}

// Throws if the token is missing/invalid/expired; otherwise returns the
// authenticated user's uuid. Every calls.js handler that reads or mutates a
// specific user's call data must gate on this before touching the db.
export async function requireCallerUuid(authToken) {
  const payload = await verifyAuthToken(authToken);
  if (!payload) throw new Error("Unauthorized");
  return payload.uuid;
}
