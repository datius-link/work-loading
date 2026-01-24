import { registerUser, loginUser } from "./auth.service.js";
import { validateRegister, validateLogin } from "./auth.validators.js";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { generateAuthToken } from "./auth.tokens.js";

// MOCK OTP GENERATOR
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// USERNAME GENERATOR
function generateProviderUsername() {
  const prefix = "e-kaziProvider";
  const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}_${random}`;
}


/* =====================================================
   REGISTER
===================================================== */
export async function register(req, res) {
  const error = validateRegister(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const { email, password } = req.body;

  try {
    const result = await registerUser(email, password);
    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Registration failed" });
  }
}

/* =====================================================
   LOGIN
===================================================== */
export async function login(req, res) {
  const error = validateLogin(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const { email, password } = req.body;

  try {
    const result = await loginUser(email, password);
    return res.json(result);
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(500).json({ message: "Login failed" });
  }
}

/* =====================================================
   LOAD EMAIL FOR VERIFY SCREEN
===================================================== */
export async function verificationInfo(req, res) {
  try {
    if (req.tokenType !== "verify") {
      return res.status(403).json({ message: "Verify token required" });
    }

    const user = await db("provider_users")
      .where({ uuid: req.verify.uuid })
      .first();

    return res.json({ email: user.email });
  } catch {
    return res.status(500).json({ message: "Failed to load info" });
  }
}


/* =====================================================
   REQUEST / RESEND OTP  (MOCKED)
===================================================== */
export async function requestVerificationCode(req, res) {
  const { verifyToken } = req.body;

  if (!verifyToken) {
    return res.status(400).json({ message: "Verify token required" });
  }

  try {
    const payload = jwt.verify(
      verifyToken,
      process.env.VERIFY_TOKEN_SECRET
    );

    if (!payload || payload.type !== "verify") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    const user = await db("provider_users")
      .where({ uuid: payload.uuid })
      .first();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();

    await db("provider_users")
      .where({ uuid: user.uuid })
      .update({
        otp_code: otp,
        otp_expires_at: db.raw("NOW() + INTERVAL '10 minutes'"),
      });

    // MOCK SENDING (BACKEND ONLY)
    console.log("📩 MOCK OTP for", user.email, "=>", otp);

    return res.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
}

/* =====================================================
   VERIFY PROVIDER (OTP → VERIFIED)
===================================================== */
export async function verifyProvider(req, res) {
  const { verifyToken, code } = req.body;

  if (!verifyToken || !code) {
    return res.status(400).json({ message: "Token and code required" });
  }

  try {
    const payload = jwt.verify(
      verifyToken,
      process.env.VERIFY_TOKEN_SECRET
    );

    if (!payload || payload.type !== "verify") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    const user = await db("provider_users")
      .where({ uuid: payload.uuid })
      .first();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔁 If already verified, just issue token
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

    // OTP check
    const storedOtp = String(user.otp_code || "").trim();
    const inputOtp = String(code || "").trim();

    if (!storedOtp || storedOtp !== inputOtp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    // Generate unique username
    let username;
    let exists = true;

    while (exists) {
      username = generateProviderUsername();
      const found = await db("provider_profiles")
        .where({ username })
        .first();
      exists = !!found;
    }

    // 🔐 TRANSACTION (IMPORTANT)
    await db.transaction(async (trx) => {
      await trx("provider_users")
        .where({ uuid: user.uuid })
        .update({
          is_verified: true,
          otp_code: null,
          otp_expires_at: null,
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
    console.error(err);
    return res.status(500).json({ message: "Verification failed" });
  }
}



export async function updateEmail(req, res) {
  if (req.tokenType !== "verify") {
    return res.status(403).json({ message: "Verify token required" });
  }

  const { email } = req.body;
  const uuid = req.verify.uuid;

  const otp = generateOtp();

  await db("provider_users")
    .where({ uuid })
    .update({
      email,
      otp_code: otp,
      otp_expires_at: db.raw("NOW() + INTERVAL '10 minutes'"),
    });

  console.log("📩 OTP =>", otp);

  return res.json({ success: true });
}
