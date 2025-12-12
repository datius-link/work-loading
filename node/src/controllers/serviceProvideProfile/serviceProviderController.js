import db from "../../../models/index.js";
import { io } from "../../server.js"

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find service provider record using Sequelize
    const provider = await db.ServiceProvider.findOne({
      where: { user_id: userId },
    });

    if (!provider) {
      return res.json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.json({
      success: true,
      provider: {
        id: provider.id,
        username: provider.username,
        fullName: provider.full_name,
        profilePic: provider.profile_pic,
        bio: provider.bio,
        services: provider.services || [],
        contacts: provider.contacts || [],
        socials: provider.socials || [],
        teammates: provider.teammates || [],
      },
    });

  } catch (error) {
    console.log("PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      fullName,
      username,
      bio,
      contacts = [],
      socials = [],
      services = [],
      profilePic,
    } = req.body;

    // -----------------------------------------
    // 1. Username validation (unique except owner)
    // -----------------------------------------
    if (username) {
      const existing = await db.ServiceProvider.findOne({
        where: { username },
      });

      if (existing && existing.user_id !== userId) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken.",
        });
      }
    }

    // -----------------------------------------
    // 2. Extract phone numbers from contacts array
    // -----------------------------------------
    const parsedPhones = contacts
      .map((c) => c.split(":")[1])
      .filter(Boolean);

    // -----------------------------------------
    // 3. Check for duplicates inside user's contacts
    // -----------------------------------------
    const uniquePhones = new Set(parsedPhones);
    if (uniquePhones.size !== parsedPhones.length) {
      return res.json({
        success: false,
        message: "Duplicate phone numbers are not allowed.",
      });
    }

    // -----------------------------------------
    // 4. Check if these phones are used by ANY OTHER USER
    // -----------------------------------------
    for (const phone of parsedPhones) {
      const userWithPhone = await db.User.findOne({
        where: { phone },
      });

      if (userWithPhone && userWithPhone.id !== userId) {
        return res.json({
          success: false,
          message: `Phone number ${phone} is already used by another user.`,
        });
      }
    }

    // -----------------------------------------
    // 5. Check if these phones are used by ANY OTHER PROVIDER
    // -----------------------------------------
    for (const phone of parsedPhones) {
      const providerWithPhone = await db.ServiceProvider.findOne({
        where: db.Sequelize.literal(`'${phone}' = ANY("contacts")`),
      });

      if (providerWithPhone && providerWithPhone.user_id !== userId) {
        return res.json({
          success: false,
          message: `Phone number ${phone} is already used by another provider.`,
        });
      }
    }

    // -----------------------------------------
    // 7. Update SERVICE PROVIDER PROFILE ONLY
    // -----------------------------------------
    await db.ServiceProvider.update(
      {
        full_name: fullName,
        username,
        bio,
        contacts,
        socials,
        services,
        profile_pic: profilePic,
      },
      { where: { user_id: userId } }
    );

    // 🔥 REAL-TIME BROADCAST
    io.to(userId).emit("providerUpdated", {
      updated: true,
      time: Date.now(),
    });

    return res.json({
      success: true,
      message: "Profile updated successfully.",
    });


    return res.json({
      success: true,
      message: "Profile updated successfully.",
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating profile.",
    });
  }
};
