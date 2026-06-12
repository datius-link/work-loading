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

export function generateAuthToken(uuid, role = "service_provider") {
  return jwt.sign(
    { uuid, role },
    requiredSecret("AUTH_TOKEN_SECRET"),
    { expiresIn: "7d" }
  );
}

export function generateViewerToken(uuid) {
  return jwt.sign(
    {
      uuid,
      role: "light_user",
    },
    requiredSecret("AUTH_TOKEN_SECRET"),
    {
      expiresIn: "90d",
    }
  );
}
