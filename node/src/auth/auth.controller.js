import crypto from "crypto";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { registerUser, loginUser } from "./auth.service.js";
import {
  validateRegister,
  validateLogin,
  validateEmail,
  validateResetPassword,
} from "./auth.validators.js";
import {
  generateAuthToken,
  generatePasswordResetToken,
  generateViewerToken,
} from "./auth.tokens.js";
import { comparePassword, hashPassword } from "../utils/hash.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function fallbackUsername(email, prefix = "user") {
  return String(email || "").split("@")[0] || prefix;
}

async function uniqueUsername(base) {
  const cleaned = String(base || "user")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 24) || "user";

  let candidate = cleaned;
  let suffix = 0;
  while (await db("profiles").where({ username: candidate }).first()) {
    suffix += 1;
    candidate = `${cleaned}_${suffix}`;
  }
  return candidate;
}

async function issueOtp(profileUuid, purpose, reason) {
  const profile = await db("profiles").where({ uuid: profileUuid }).first();
  if (!profile) throw new Error("USER_NOT_FOUND");

  const otp = generateOtp();
  await db("auth_otps").insert({
    profile_uuid: profile.uuid,
    email: profile.email,
    purpose,
    otp_hash: hashOtp(otp),
    expires_at: db.raw(`NOW() + INTERVAL '${OTP_TTL_MINUTES} minutes'`),
  });

  console.log(`[DEV MOCK] ${reason} code for ${profile.email}: ${otp}`);
  return otp;
}

async function consumeOtp({ email, code, purpose, profileUuid = null }) {
  const query = db("auth_otps")
    .where({
      email: String(email || "").trim().toLowerCase(),
      purpose,
    })
    .whereNull("used_at")
    .orderBy("created_at", "desc");

  if (profileUuid) query.where({ profile_uuid: profileUuid });

  const otpRow = await query.first();
  if (!otpRow) return null;

  if (new Date(otpRow.expires_at) < new Date()) {
    throw new Error("OTP_EXPIRED");
  }

  if (otpRow.otp_hash !== hashOtp(code)) {
    await db("auth_otps")
      .where({ id: otpRow.id })
      .update({ attempts: db.raw("attempts + 1") });
    return null;
  }

  await db("auth_otps").where({ id: otpRow.id }).update({ used_at: db.fn.now() });
  return db("profiles").where({ uuid: otpRow.profile_uuid }).first();
}

function providerPayload(profile) {
  return {
    uuid: profile.uuid,
    username: profile.username || "",
    full_name: profile.full_name || "",
    bio: profile.bio || "",
    profilePic: profile.profile_pic || "",
    profile_pic: profile.profile_pic || "",
    contacts: Array.isArray(profile.phone_numbers) ? profile.phone_numbers : [],
    services: Array.isArray(profile.services) ? profile.services : [],
    socials: Array.isArray(profile.socials) ? profile.socials : [],
  };
}

function viewerPayload(profile) {
  return {
    uuid: profile.uuid,
    email: profile.email,
    username: profile.username,
    full_name: profile.full_name,
    profile_pic: profile.profile_pic,
    phone_number: profile.phone_number,
  };
}

export async function register(req, res) {
  const error = validateRegister(req.body);
  if (error) return res.status(400).json({ message: error });

  const { email, password } = req.body;

  try {
    const result = await registerUser(email.trim().toLowerCase(), password);
    await issueOtp(result.uuid, "verify_email", "email verification");
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") return res.status(409).json({ message: "Email already exists" });
    console.error("register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  const error = validateLogin(req.body);
  if (error) return res.status(400).json({ message: error });

  const identifier = String(req.body.identifier || req.body.email || "").trim();
  const { password } = req.body;

  try {
    const result = await loginUser(identifier, password);
    if (result.requireVerification) {
      await issueOtp(result.uuid, "verify_email", "email verification");
    }
    return res.json(result);
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") return res.status(401).json({ message: "Invalid credentials" });
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function verificationInfo(req, res) {
  try {
    if (req.tokenType !== "verify") return res.status(403).json({ message: "Verify token required" });
    const profile = await db("profiles").where({ uuid: req.verify.uuid }).first();
    if (!profile) return res.status(404).json({ message: "User not found" });
    return res.json({ email: profile.email });
  } catch (err) {
    console.error("verificationInfo error:", err);
    return res.status(500).json({ message: "Failed to load info" });
  }
}

export async function requestVerificationCode(req, res) {
  const { verifyToken } = req.body;
  if (!verifyToken) return res.status(400).json({ message: "Verify token required" });

  try {
    const payload = jwt.verify(verifyToken, process.env.VERIFY_TOKEN_SECRET);
    if (!payload || payload.type !== "verify") return res.status(400).json({ message: "Invalid token type" });
    await issueOtp(payload.uuid, "verify_email", "email verification");
    return res.json({ success: true, message: "Verification code sent" });
  } catch (err) {
    console.error("requestVerificationCode error:", err);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
}

export async function verifyProvider(req, res) {
  const { verifyToken, code } = req.body;
  if (!verifyToken || !code) return res.status(400).json({ message: "Token and code required" });

  try {
    const payload = jwt.verify(verifyToken, process.env.VERIFY_TOKEN_SECRET);
    if (!payload || payload.type !== "verify") return res.status(400).json({ message: "Invalid token type" });

    const profile = await db("profiles").where({ uuid: payload.uuid }).first();
    if (!profile) return res.status(404).json({ message: "User not found" });

    if (!profile.is_verified) {
      const verified = await consumeOtp({
        email: profile.email,
        code,
        purpose: "verify_email",
        profileUuid: profile.uuid,
      });
      if (!verified) return res.status(400).json({ message: "Invalid verification code" });

      const username = profile.username || (await uniqueUsername(`e_kaziUser_${Math.floor(100000 + Math.random() * 900000)}`));
      await db("profiles").where({ uuid: profile.uuid }).update({
        is_verified: true,
        username,
        updated_at: db.fn.now(),
      });
      profile.is_verified = true;
      profile.username = username;
    }

    return res.json({
      token: generateAuthToken(profile.uuid, profile.email, true),
      username: profile.username || null,
      needsProfileSetup: !profile.full_name,
    });
  } catch (err) {
    if (err.message === "OTP_EXPIRED") return res.status(400).json({ message: "Verification code expired" });
    console.error("verifyProvider error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
}

export async function updateEmail(req, res) {
  if (req.tokenType !== "verify") return res.status(403).json({ message: "Verify token required" });

  const error = validateEmail(req.body);
  if (error) return res.status(400).json({ message: error });

  const uuid = req.verify.uuid;
  const email = req.body.email.trim().toLowerCase();

  try {
    await db("profiles").where({ uuid }).update({ email, updated_at: db.fn.now() });
    await issueOtp(uuid, "change_email", "email change verification");
    return res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Email already exists" });
    console.error("updateEmail error:", err);
    return res.status(500).json({ message: "Failed to update email" });
  }
}

export async function forgotPassword(req, res) {
  const error = validateEmail(req.body);
  if (error) return res.status(400).json({ message: error });

  const email = req.body.email.trim().toLowerCase();

  try {
    const profile = await db("profiles").where({ email }).first();
    if (profile) await issueOtp(profile.uuid, "reset_password", "password reset verification");
    else console.log(`[DEV MOCK] Password reset requested for unknown email: ${email}`);

    return res.json({ success: true, message: "If this account exists, a reset code was sent" });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Failed to request reset code" });
  }
}

export async function verifyPasswordResetCode(req, res) {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

  try {
    const profile = await consumeOtp({ email, code, purpose: "reset_password" });
    if (!profile) return res.status(400).json({ message: "Invalid verification code" });
    return res.json({ success: true, resetToken: generatePasswordResetToken(profile.uuid) });
  } catch (err) {
    if (err.message === "OTP_EXPIRED") return res.status(400).json({ message: "Verification code expired" });
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
    if (!payload || payload.type !== "password-reset") return res.status(400).json({ message: "Invalid reset token" });

    const hashed = await hashPassword(password);
    const updated = await db("profiles").where({ uuid: payload.uuid }).update({ password: hashed, updated_at: db.fn.now() });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(400).json({ message: "Reset session expired" });
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
}

export async function requestViewerCode(req, res) {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const loginIdentifier = identifier.toLowerCase();
    const email = String(req.body.email || (identifier.includes("@") ? identifier : "")).trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || "");
    const mode = String(req.body.mode || "login").trim().toLowerCase();
    if (password.length < 4) return res.status(400).json({ message: "Password must be at least 4 characters" });
    if (!["login", "register"].includes(mode)) return res.status(400).json({ message: "Invalid user auth mode" });
    if (mode === "register" && !email.includes("@")) return res.status(400).json({ message: "Valid email required" });
    if (mode === "login" && loginIdentifier.length < 3) return res.status(400).json({ message: "Phone number, email, or username required" });

    let profile = null;
    if (mode === "login") {
      const phoneCandidate = !loginIdentifier.includes("@") ? normalizePhoneNumber(identifier) : null;
      if (phoneCandidate) {
        profile = await db("profiles").where({ phone_number: phoneCandidate }).first();
      }
      if (!profile && !loginIdentifier.includes("@")) {
        profile = await db("profiles")
          .whereRaw("LOWER(username) = ?", [loginIdentifier.replace(/^@/, "")])
          .first();
      }
      if (!profile && loginIdentifier.includes("@")) {
        profile = await db("profiles").where({ email }).first();
      }
    } else {
      profile = await db("profiles").where({ email }).first();
    }
    if (!profile) {
      if (mode !== "register") return res.status(404).json({ message: "User not found. Please register first." });
      if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
      const uuid = crypto.randomUUID();
      await db("profiles").insert({
        uuid,
        email,
        password: await hashPassword(password),
        is_verified: false,
        username: await uniqueUsername(fallbackUsername(email, "user")),
        full_name: fallbackUsername(email, "user"),
      });
      profile = await db("profiles").where({ uuid }).first();
    } else if (profile.is_verified) {
      if (!profile.password) {
        if (mode !== "register") return res.status(403).json({ message: "Password setup required. Please register this user again." });
        if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
        await db("profiles").where({ uuid: profile.uuid }).update({ password: await hashPassword(password), updated_at: db.fn.now() });
      } else {
        if (mode === "register") return res.status(409).json({ message: "User already exists. Please login." });
        const ok = await comparePassword(password, profile.password);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`[USER LOGIN] success uuid=${profile.uuid} email=${profile.email}`);
      return res.json({
        success: true,
        verified: true,
        token: generateViewerToken(profile.uuid, profile.email, true),
        viewer: viewerPayload(profile),
      });
    } else if (!profile.password) {
      if (mode !== "register") return res.status(403).json({ message: "User is not verified yet. Please register and verify OTP." });
      if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
      await db("profiles").where({ uuid: profile.uuid }).update({ password: await hashPassword(password), updated_at: db.fn.now() });
    } else {
      if (mode === "login") return res.status(403).json({ message: "User is not verified yet. Please verify OTP." });
      const ok = await comparePassword(password, profile.password);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    }

    await issueOtp(profile.uuid, "verify_email", "user email verification");
    return res.json({ success: true, verified: false, requiresOtp: true, message: "OTP sent" });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Email or username already exists" });
    console.error("requestViewerCode error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
}

export async function verifyViewerCode(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    if (!email || !code) return res.status(400).json({ message: "Email and code required" });

    const profile = await consumeOtp({ email, code, purpose: "verify_email" });
    if (!profile) return res.status(400).json({ message: "Invalid OTP" });
    if (!profile.password) return res.status(403).json({ message: "Password setup required" });

    await db("profiles").where({ uuid: profile.uuid }).update({ is_verified: true, updated_at: db.fn.now() });
    const updated = await db("profiles").where({ uuid: profile.uuid }).first();

    console.log(`[USER LOGIN] success uuid=${updated.uuid} email=${updated.email} verified_by_otp=true`);
    return res.json({
      success: true,
      token: generateViewerToken(updated.uuid, updated.email, true),
      viewer: viewerPayload(updated),
    });
  } catch (err) {
    if (err.message === "OTP_EXPIRED") return res.status(400).json({ message: "OTP expired" });
    console.error("verifyViewerCode error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
}

export async function completeViewerSignup(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || "");
    const username = String(req.body.username || "").trim();
    const fullName = String(req.body.full_name || req.body.fullName || "").trim();
    const phone = normalizePhoneNumber(req.body.phone_number || req.body.phoneNumber || req.body.phone);

    if (!email || !code) return res.status(400).json({ message: "Email and OTP are required" });
    if (password.length < 4) return res.status(400).json({ message: "Password must be at least 4 characters" });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

    const profile = await consumeOtp({ email, code, purpose: "verify_email" });
    if (!profile) return res.status(400).json({ message: "Invalid OTP" });
    const hashed = await hashPassword(password);
    await db("profiles").where({ uuid: profile.uuid }).update({
      password: hashed,
      is_verified: true,
      ...(username ? { username: await uniqueUsername(username) } : {}),
      ...(fullName ? { full_name: fullName } : {}),
      ...(phone ? { phone_number: phone, phone_numbers: db.raw("?::jsonb", [JSON.stringify([phone])]) } : {}),
      updated_at: db.fn.now(),
    });

    const updated = await db("profiles").where({ uuid: profile.uuid }).first();
    console.log(`[USER LOGIN] success uuid=${updated.uuid} email=${updated.email} completed_signup=true`);
    return res.json({
      success: true,
      token: generateViewerToken(updated.uuid, updated.email, true),
      viewer: viewerPayload(updated),
    });
  } catch (err) {
    if (err.message === "OTP_EXPIRED") return res.status(400).json({ message: "OTP expired" });
    if (err.code === "23505") return res.status(409).json({ message: "Phone number already exists" });
    console.error("completeViewerSignup error:", err);
    return res.status(500).json({ message: "Failed to complete signup" });
  }
}

export { providerPayload };
