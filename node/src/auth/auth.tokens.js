import jwt from "jsonwebtoken";

const VERIFY_SECRET = process.env.VERIFY_TOKEN_SECRET;
const AUTH_SECRET = process.env.AUTH_TOKEN_SECRET;

export function generateVerifyToken(uuid) {
  return jwt.sign(
    { uuid, type: "verify" },
    VERIFY_SECRET,
    { expiresIn: "15m" }
  );
}

export function generateAuthToken(uuid) {
  return jwt.sign(
    { uuid, role: "provider" },
    AUTH_SECRET,
    { expiresIn: "7d" }
  );
}
