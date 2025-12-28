import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../../models/index.js";
import { Op } from "sequelize";

const { User, ServiceProvider, Otp } = db;

export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, accountType } = req.body;

    if (!name || !email || !phone || !password) {
      return res.json({ success: false, message: "All fields are required." });
    }

    // Check duplicates
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.json({ success: false, message: "Email already registered." });
    }

    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      return res.json({ success: false, message: "Phone number already registered." });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER (IMPORTANT: user defined HERE)
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      isVerified: false,
      accountType: accountType || "SERVICE_PROVIDER",
    });

    // CREATE SERVICE PROVIDER PROFILE (AFTER user is created)
    await ServiceProvider.create({
      user_id: user.id,
      full_name: name,
      contacts: [`phone:${phone}:call,sms`],
      services: [],
      socials: [],
      teammates: [],
      bio: "",
      profile_pic: null,
    });

    const token = jwt.sign(
      { id: user.id, role: user.accountType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        email: user.email,
        phone: user.phone,
      },
    });


  } catch (err) {
    console.log("Register Error:", err);
    return res.json({ success: false, message: "Server Error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Email and password required." });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials." });
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.json({ success: false, message: "Incorrect password." });
    }

    // 🔐 BLOCK UNVERIFIED USERS COMPLETELY
    const token = jwt.sign(
      { id: user.id, role: user.accountType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    if (!user.isVerified) {
      return res.json({
        success: true,
        requireVerification: true,
        token,
        user: {
          email: user.email,
          phone: user.phone,
        },
      });
    }


    // ✅ VERIFIED USERS ONLY
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
      },
    });



      } catch (err) {
        console.log("Login Error:", err);
        return res.json({ success: false, message: "Server error." });
      }
    };

/* -----------------------------
 * RESET PASSWORD
 * ----------------------------- */
export const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const otpRecord = await Otp.findOne({
      where: {
        contact: identifier,
        type: "password_reset",
        code: otp,
        verified: true, // 🔥 FIX
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!otpRecord) {
      return res.json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const user = await User.findByPk(otpRecord.user_id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await otpRecord.destroy(); // 🔐 consume OTP

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.log("RESET PASSWORD ERROR:", err);
    return res.json({ success: false, message: "Password reset failed" });
  }
};



  export const updateServiceProviderDetails = async (req, res) => {
    try {
      const userId = req.user.id;
      const { email, phone } = req.body;

      const emailTaken = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
      });
      if (emailTaken) {
        return res.json({ success: false, message: "Email already in use" });
      }

      const phoneTaken = await User.findOne({
        where: { phone, id: { [Op.ne]: userId } },
      });
      if (phoneTaken) {
        return res.json({ success: false, message: "Phone already in use" });
      }

      await User.update(
        { email, phone },
        { where: { id: userId } }
      );

      return res.json({
        success: true,
        message: "Details updated successfully",
      });
    } catch (err) {
      console.error("UPDATE DETAILS ERROR:", err);
      return res.json({ success: false, message: "Failed to update details" });
    }
  };

  export const getMe = async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ["email", "phone", "name", "isVerified"],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(user);
    } catch (err) {
      console.error("GET ME ERROR:", err);
      return res.status(500).json({ message: "Server error" });
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

      // 1. Find user
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

      // 2. Clear old reset OTPs
      await Otp.destroy({
        where: {
          user_id: user.id,
          type: "password_reset",
        },
      });

      // 3. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // 4. Save OTP
      await Otp.create({
        user_id: user.id,
        contact: identifier,
        type: "password_reset",
        code: otp,
        expiresAt,
      });

      // 5. MOCK SEND (for now)
      console.log("🔐 PASSWORD RESET OTP:", otp);

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

/* -----------------------------
 * VERIFY RESET OTP
 * ----------------------------- */
export const verifyResetOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.json({
        success: false,
        message: "Identifier and OTP are required",
      });
    }

    const otpRecord = await Otp.findOne({
      where: {
        contact: identifier,
        type: "password_reset",
        code: otp,
        verified: false,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!otpRecord) {
      return res.json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    return res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (err) {
    console.log("VERIFY RESET OTP ERROR:", err);
    return res.json({
      success: false,
      message: "OTP verification failed",
    });
  }
};
