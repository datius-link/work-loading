import db from "../../../models/index.js";
import { io } from "../../server.js";

/* ===============================
   GET MY PROFILE
================================ */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const provider = await db.ServiceProvider.findOne({
      where: { user_id: userId },
    });

    if (!provider) {
      return res.json({ success: false, message: "Profile not found" });
    }

    return res.json({
      success: true,
      provider: {
        fullName: provider.full_name || "",
        username: provider.username || "",
        bio: provider.bio || "",
        profilePic: provider.profile_pic || "",
        services: provider.services || [],
        socials: provider.socials || [],
        contacts: provider.contacts || [],
      },
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===============================
   UPDATE PROFILE
================================ */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      fullName = "",
      username = "",
      bio = "",
      services = [],
      socials = [],
      contacts = [],
      profilePic = "",
    } = req.body;

    /* ---- username uniqueness ---- */
    if (username) {
      const taken = await db.ServiceProvider.findOne({ where: { username } });
      if (taken && taken.user_id !== userId) {
        return res.json({ success: false, message: "Username already taken" });
      }
    }

    /* ---- normalize phones (NO +255) ---- */
    const phones = contacts.map(c => c.number);
    const unique = new Set(phones);

    if (unique.size !== phones.length) {
      return res.json({ success: false, message: "Duplicate phone numbers" });
    }

    /* ---- stringify contacts ---- */
    const storedContacts = contacts.map(c => {
      const access = [];
      if (c.allowCall) access.push("call");
      if (c.allowSMS) access.push("sms");
      return `phone:${c.number}:${access.join(",")}`;
    });

    await db.ServiceProvider.update(
      {
        full_name: fullName,
        username: username || null,
        bio,
        services,
        socials,
        contacts: storedContacts,
        profile_pic: profilePic,
      },
      { where: { user_id: userId } }
    );

    io.to(userId).emit("providerUpdated");

    return res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};
