import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../models/index.js";

const { User, ServiceProvider } = db;

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

    // CREATE TOKEN (AFTER user exists)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("SECRET = ", process.env.JWT_SECRET);

    return res.json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
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

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
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

