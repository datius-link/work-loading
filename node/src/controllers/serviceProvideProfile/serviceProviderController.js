import db from "../../../models/index.js";

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

    // Validate username is not taken by someone else
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

    // Update service provider profile
    const updated = await db.ServiceProvider.update(
      {
        full_name: fullName,
        username: username,
        bio: bio,
        contacts: contacts,
        socials: socials,
        services: services,
        profile_pic: profilePic,
      },
      { where: { user_id: userId } }
    );

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

