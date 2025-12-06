import bcrypt from "bcrypt";
import db from "../../models/index.js";

const { User } = db;

export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // basic validation
    if (!name || !email || !phone || !password) {
      return res.json({
        success: false,
        message: "All fields are required.",
      });
    }

    // check duplicates
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.json({
        success: false,
        message: "Email already registered.",
      });
    }

    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      return res.json({
        success: false,
        message: "Phone number already registered.",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    isVerified: false,
    accountType: req.body.accountType || "SERVICE_PROVIDER",
    });

    return res.json({
    success: true,
    message: "Account created successfully.",
    data: {
        accountType: req.body.accountType || "SERVICE_PROVIDER",
    }
    });
  } catch (err) {
    console.log("Register Error:", err);
    return res.json({
      success: false,
      message: "Server Error. Try again.",
    });
  }
};
