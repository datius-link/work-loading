import db from "../db/index.js";

export async function getMyProviderProfile(req, res) {
  try {
    const providerUuid = req.user.uuid; // from auth middleware

    const profile = await db("provider_profiles")
      .where({ provider_uuid: providerUuid })
      .first();

    if (!profile) {
      return res.status(404).json({
        message: "Provider profile not found",
      });
    }

    return res.json({
      provider: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        profilePic: profile.profile_pic,
        contacts: Array.isArray(profile.contacts) ? profile.contacts : [],
        services: Array.isArray(profile.services) ? profile.services : [],
        socials: Array.isArray(profile.socials) ? profile.socials : [],
      },
    });

  } catch (err) {
    console.error("getMyProviderProfile error:", err);
    return res.status(500).json({
      message: "Failed to load profile",
    });
  }
}

export async function updateMyProviderProfile(req, res) {
  try {
    const providerUuid = req.user.uuid;

    const {
      fullName,
      username,
      bio,
      contacts,
      services,
      socials,
      profilePic,
    } = req.body;

    const safeParse = (v) => {
      if (!v) return [];

      // Kama ni string, jaribu ku-parse
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      // Kama ni object moja, ifanye array
      if (typeof v === "object" && !Array.isArray(v)) {
        return [v];
      }

      // Kama ni array tayari
      if (Array.isArray(v)) return v;

      return [];
    };


    const updatePayload = {
      full_name: fullName ?? "",
      bio: bio ?? "",
      contacts: safeParse(contacts),
      services: safeParse(services),
      socials: safeParse(socials),
      profile_completed: true,
      updated_at: db.fn.now(),
    };


    if (typeof username === "string" && username.trim()) {
      updatePayload.username = username.trim();
    }

    if (typeof profilePic === "string" && profilePic.length > 0) {
      updatePayload.profile_pic = profilePic;
    }

    const updated = await db("provider_profiles")
      .where({ provider_uuid: providerUuid })
      .update(updatePayload);

    if (!updated) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("updateMyProviderProfile error:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        message: "Username already taken. Choose another one.",
      });
    }

    return res.status(500).json({ message: "Failed to save profile" });
  }
}