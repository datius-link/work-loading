import jwt from "jsonwebtoken";

function requiredSecret(name) {
  const secret = process.env[name];
  if (!secret) throw new Error(`${name}_MISSING`);
  return secret;
}

export function generateVerifyToken(uuid) {
  return jwt.sign(
    { uuid, type: "verify" },
    requiredSecret("VERIFY_TOKEN_SECRET"),
    { expiresIn: "15m" }
  );
}

export function generatePasswordResetToken(uuid) {
  return jwt.sign(
    { uuid, type: "password-reset" },
    requiredSecret("VERIFY_TOKEN_SECRET"),
    { expiresIn: "15m" }
  );
}

export function generateAuthToken(uuid, email = null, isVerified = true, expiresIn = "7d") {
  return jwt.sign(
    { uuid, email, is_verified: !!isVerified },
    requiredSecret("AUTH_TOKEN_SECRET"),
    { expiresIn }
  );
}

export function generateViewerToken(uuid, email = null, isVerified = true) {
  return generateAuthToken(uuid, email, isVerified, "90d");
}
