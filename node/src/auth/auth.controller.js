import { registerUser, loginUser } from "./auth.service.js";
import {
  validateRegister,
  validateLogin,
  validateEmail,
  validateResetPassword,
} from "./auth.validators.js";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import {
  generateAuthToken,
  generatePasswordResetToken,
} from "./auth.tokens.js";
import { hashPassword } from "../utils/hash.js";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateProviderUsername() {
  const prefix = "e-kaziProvider";
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}_${random}`;
}

async function issueOtp(uuid, reason) {
  const user = await db("provider_users").where({ uuid }).first();
  if (!user) throw new Error("USER_NOT_FOUND");

  const otp = generateOtp();

  await db("provider_users")
    .where({ uuid })
    .update({
      otp_code: otp,
      otp_expires_at: db.raw("NOW() + INTERVAL '10 minutes'"),
      updated_at: db.fn.now(),
    });

  console.log(`[DEV MOCK] ${reason} code for ${user.email}: ${otp}`);
  return otp;
}

async function getUserByValidOtp(email, code) {
  const user = await db("provider_users")
    .where({ email: String(email).trim().toLowerCase() })
    .first();

  if (!user) return null;

  const storedOtp = String(user.otp_code || "").trim();
  const inputOtp = String(code || "").trim();

  if (!storedOtp || storedOtp !== inputOtp) return null;
  if (new Date(user.otp_expires_at) < new Date()) {
    throw new Error("OTP_EXPIRED");
  }

  return user;
}

export async function register(req, res) {
  const error = validateRegister(req.body);
  if (error) return res.status(400).json({ message: error });

  const { email, password } = req.body;

  try {
    const result = await registerUser(email.trim().toLowerCase(), password);
    await issueOtp(result.uuid, "provider email verification");

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  const error = validateLogin(req.body);
  if (error) return res.status(400).json({ message: error });

  const { email, password } = req.body;

  try {
    const result = await loginUser(email.trim().toLowerCase(), password);

    if (result.requireVerification) {
      await issueOtp(result.uuid, "provider email verification");
    }

    return res.json(result);
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function verificationInfo(req, res) {
  try {
    if (req.tokenType !== "verify") {
      return res.status(403).json({ message: "Verify token required" });
    }

    const user = await db("provider_users")
      .where({ uuid: req.verify.uuid })
      .first();

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ email: user.email });
  } catch (err) {
    console.error("verificationInfo error:", err);
    return res.status(500).json({ message: "Failed to load info" });
  }
}

export async function requestVerificationCode(req, res) {
  const { verifyToken } = req.body;

  if (!verifyToken) {
    return res.status(400).json({ message: "Verify token required" });
  }

  try {
    const payload = jwt.verify(verifyToken, process.env.VERIFY_TOKEN_SECRET);

    if (!payload || payload.type !== "verify") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    await issueOtp(payload.uuid, "provider email verification");

    return res.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (err) {
    console.error("requestVerificationCode error:", err);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
}

export async function verifyProvider(req, res) {
  const { verifyToken, code } = req.body;

  if (!verifyToken || !code) {
    return res.status(400).json({ message: "Token and code required" });
  }

  try {
    const payload = jwt.verify(verifyToken, process.env.VERIFY_TOKEN_SECRET);

    if (!payload || payload.type !== "verify") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    const user = await db("provider_users")
      .where({ uuid: payload.uuid })
      .first();

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.is_verified) {
      const profile = await db("provider_profiles")
        .where({ provider_uuid: user.uuid })
        .first();

      return res.json({
        token: generateAuthToken(user.uuid),
        username: profile?.username || null,
        needsProfileSetup: !profile?.profile_completed,
      });
    }

    const storedOtp = String(user.otp_code || "").trim();
    const inputOtp = String(code || "").trim();

    if (!storedOtp || storedOtp !== inputOtp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    let username;
    let exists = true;

    while (exists) {
      username = generateProviderUsername();
      const found = await db("provider_profiles").where({ username }).first();
      exists = !!found;
    }

    await db.transaction(async (trx) => {
      await trx("provider_users")
        .where({ uuid: user.uuid })
        .update({
          is_verified: true,
          otp_code: null,
          otp_expires_at: null,
          updated_at: db.fn.now(),
        });

      await trx("provider_profiles").insert({
        provider_uuid: user.uuid,
        username,
        profile_completed: false,
      });
    });

    return res.json({
      token: generateAuthToken(user.uuid),
      username,
      needsProfileSetup: true,
    });
  } catch (err) {
    console.error("verifyProvider error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
}

export async function updateEmail(req, res) {
  if (req.tokenType !== "verify") {
    return res.status(403).json({ message: "Verify token required" });
  }

  const error = validateEmail(req.body);
  if (error) return res.status(400).json({ message: error });

  const uuid = req.verify.uuid;
  const email = req.body.email.trim().toLowerCase();

  try {
    await db("provider_users")
      .where({ uuid })
      .update({
        email,
        updated_at: db.fn.now(),
      });

    await issueOtp(uuid, "provider email verification");

    return res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("updateEmail error:", err);
    return res.status(500).json({ message: "Failed to update email" });
  }
}

export async function forgotPassword(req, res) {
  const error = validateEmail(req.body);
  if (error) return res.status(400).json({ message: error });

  const email = req.body.email.trim().toLowerCase();

  try {
    const user = await db("provider_users").where({ email }).first();

    if (user) {
      await issueOtp(user.uuid, "password reset verification");
    } else {
      console.log(`[DEV MOCK] Password reset requested for unknown email: ${email}`);
    }

    return res.json({
      success: true,
      message: "If this provider account exists, a reset code was sent",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Failed to request reset code" });
  }
}

export async function verifyPasswordResetCode(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  try {
    const user = await getUserByValidOtp(email, code);

    if (!user) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    return res.json({
      success: true,
      resetToken: generatePasswordResetToken(user.uuid),
    });
  } catch (err) {
    if (err.message === "OTP_EXPIRED") {
      return res.status(400).json({ message: "Verification code expired" });
    }

    console.error("verifyPasswordResetCode error:", err);
    return res.status(500).json({ message: "Failed to verify reset code" });
  }
}

export async function resetPassword(req, res) {
  const error = validateResetPassword(req.body);
  if (error) return res.status(400).json({ message: error });

  const { resetToken, password } = req.body;

  try {
    const payload = jwt.verify(resetToken, process.env.VERIFY_TOKEN_SECRET);

    if (!payload || payload.type !== "password-reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const hashed = await hashPassword(password);

    const updated = await db("provider_users")
      .where({ uuid: payload.uuid })
      .update({
        password: hashed,
        otp_code: null,
        otp_expires_at: null,
        updated_at: db.fn.now(),
      });

    if (!updated) return res.status(404).json({ message: "User not found" });

    console.log(`[DEV MOCK] Password reset completed for provider ${payload.uuid}`);

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset session expired" });
    }

    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
}
