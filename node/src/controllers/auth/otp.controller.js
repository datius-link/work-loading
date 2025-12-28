import db from "../../../models/index.js";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

const { Otp, User } = db;

/* -----------------------------
 * Helpers
 * ----------------------------- */
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* -----------------------------
 * SEND MOCK OTP
 * ----------------------------- */
export const mockSendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.json({
        success: false,
        message: "Email and phone are required",
      });
    }

    // clear old OTPs
    await Otp.destroy({
      where: {
        contact: [email, phone],
      },
    });

    const phoneOtp = generateOtp();
    const emailOtp = generateOtp();

    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await Otp.bulkCreate([
      {
        contact: phone,
        type: "phone",
        code: phoneOtp,
        expiresAt: expires,
      },
      {
        contact: email,
        type: "email",
        code: emailOtp,
        expiresAt: expires,
      },
    ]);

    console.log("📲 MOCK PHONE OTP:", phoneOtp);
    console.log("📧 MOCK EMAIL OTP:", emailOtp);

  } catch (err) {
    console.log("SEND OTP ERROR:", err);
    return res.json({
      success: false,
      message: "Failed to send OTPs",
    });
  }
};

/* -----------------------------
 * VERIFY MOCK OTP
 * ----------------------------- */
export const mockVerifyOtp = async (req, res) => {
  try {
    const { email, phone, otpPhone, otpEmail } = req.body;

    if (!otpPhone || !otpEmail) {
      return res.json({
        success: false,
        message: "Both OTPs are required",
      });
    }

    const phoneRecord = await Otp.findOne({
      where: {
        contact: phone,
        type: "phone",
        code: otpPhone,
        verified: false,
        expiresAt: {
            [Op.gt]: new Date(),
        },
      },
    });

    const emailRecord = await Otp.findOne({
      where: {
        contact: email,
        type: "email",
        code: otpEmail,
        verified: false,
        expiresAt: {
            [Op.gt]: new Date(),
        },
      },
    });

    if (!phoneRecord || !emailRecord) {
      return res.json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // mark OTPs verified
    phoneRecord.verified = true;
    emailRecord.verified = true;
    await phoneRecord.save();
    await emailRecord.save();

    // mark user verified
    const user = await User.findOne({ where: { email } });
    if (user) {
      user.isVerified = true;
      await user.save();
    }

    // issue token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Verification successful",
      token,
    });
  } catch (err) {
    console.log("VERIFY OTP ERROR:", err);
    return res.json({
      success: false,
      message: "Verification failed",
    });
  }
};

/* -----------------------------
 * FORGOT PASSWORD – SEND OTP
 * ----------------------------- */
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // clear old OTPs for this contact
    await Otp.destroy({
      where: { contact: identifier },
    });


    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await Otp.create({
      contact: identifier,
      type: "password_reset",
      code: otp,
      expiresAt: expires,
    });

    // MOCK DELIVERY
    console.log("🔐 PASSWORD RESET OTP:", otp);

    console.log("📲 MOCK PHONE OTP:", phoneOtp);
    console.log("📧 MOCK EMAIL OTP:", emailOtp);

    return res.json({
      success: true,
      message: "Password reset code sent",
    });
  } catch (err) {
    console.log("FORGOT PASSWORD ERROR:", err);
    return res.json({
      success: false,
      message: "Failed to send reset code",
    });
  }
};

// SEND VERIFICATION OTP
export const sendVerificationOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const userId = req.user.id; // Add this – from JWT

    if (!email || !phone) {
      return res.json({ success: false, message: "Email and phone required" });
    }

    // clear old OTPs
    await Otp.destroy({
      where: {
        contact: { [Op.in]: [email, phone] },
        type: { [Op.in]: ["email", "phone"] },
      },
    });

    const phoneOtp = generateOtp();
    const emailOtp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.bulkCreate([
      { user_id: userId, contact: phone, type: "phone", code: phoneOtp, expiresAt }, // Add user_id
      { user_id: userId, contact: email, type: "email", code: emailOtp, expiresAt }, // Add user_id
    ]);

    // 🔥 MOCK DISPLAY (THIS IS WHY YOU "DON'T SEE OTP")
    console.log("📲 PHONE OTP:", phoneOtp);
    console.log("📧 EMAIL OTP:", emailOtp);

    return res.json({
      success: true,
      message: "OTP sent",
      mock: {
        phoneOtp,
        emailOtp,
      },
    });
  } catch (err) {
    console.log("SEND OTP ERROR:", err);
    return res.json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const userId = req.user.id; // 🔐 from JWT
    const { otpPhone, otpEmail } = req.body;

    if (!otpPhone || !otpEmail) {
      return res.json({
        success: false,
        message: "Both OTPs are required",
      });
    }

    // find phone OTP
    const phoneRecord = await Otp.findOne({
      where: {
        user_id: userId,
        type: "phone",
        code: otpPhone,
        verified: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    // find email OTP
    const emailRecord = await Otp.findOne({
      where: {
        user_id: userId,
        type: "email",
        code: otpEmail,
        verified: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!phoneRecord || !emailRecord) {
      return res.json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // mark OTPs as verified
    phoneRecord.verified = true;
    emailRecord.verified = true;
    await phoneRecord.save();
    await emailRecord.save();

    // mark user verified
    await User.update(
      { isVerified: true },
      { where: { id: userId } }
    );

    // issue fresh token
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Verification successful",
      token,
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.json({
      success: false,
      message: "Verification failed",
    });
  }
};
