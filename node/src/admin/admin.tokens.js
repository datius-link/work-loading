import jwt from "jsonwebtoken";

function requiredSecret() {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) throw new Error("ADMIN_TOKEN_SECRET_MISSING");
  return secret;
}

// Deliberately isolated from the mobile viewer/provider auth tokens (see
// auth/auth.tokens.js): a leaked admin token should never be usable as a
// user token and vice versa, so this signs with its own secret and its own
// payload shape (type: "admin").
export function generateAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, type: "admin" },
    requiredSecret(),
    { expiresIn: "12h" }
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, requiredSecret());
}
