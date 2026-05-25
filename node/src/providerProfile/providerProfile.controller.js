import db from "../db/index.js";

export async function getMyProviderProfile(req, res) {
  try {
    const providerUuid = req.user.uuid;

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
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        profilePic: profile.profile_pic || "",
        contacts: Array.isArray(profile.contacts)
          ? profile.contacts
          : [],
        services: Array.isArray(profile.services)
          ? profile.services
          : [],
        socials: Array.isArray(profile.socials)
          ? profile.socials
          : [],
      },
    });

  } catch (err) {

    console.error("getMyProviderProfile error:");
    console.error(err);

    return res.status(500).json({
      message: "Failed to load profile",
      error: err.message,
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

    if (
      !fullName ||
      typeof fullName !== "string" ||
      !fullName.trim()
    ) {
      return res.status(400).json({
        message: "Full name is required",
      });
    }

    if (
      !username ||
      typeof username !== "string" ||
      !username.trim()
    ) {
      return res.status(400).json({
        message: "Username is required",
      });
    }

    const safeContacts = Array.isArray(contacts)
      ? contacts
      : [];

    const safeServices = Array.isArray(services)
      ? services
      : [];

    const safeSocials = Array.isArray(socials)
      ? socials
      : [];

    const cleanedContacts = safeContacts
      .filter(contact => contact?.number)
      .map(contact => ({
        number: String(contact.number).trim(),
        call: !!contact.call,
        sms: !!contact.sms,
      }));

    const cleanedServices = safeServices
      .map(service => String(service).trim())
      .filter(Boolean);

    const cleanedSocials = safeSocials
      .filter(social => social?.platform)
      .map(social => ({
        platform: String(social.platform).trim(),
        handle: String(social.handle || "")
          .trim()
          .replace(/^@/, ""),
      }));

    const updatePayload = {
      full_name: fullName.trim(),

      username: username.trim(),

      bio:
        typeof bio === "string"
          ? bio.trim()
          : "",

      contacts: db.raw('?::jsonb', [
        JSON.stringify(cleanedContacts)
      ]),

      services: db.raw('?::jsonb', [
        JSON.stringify(cleanedServices)
      ]),

      socials: db.raw('?::jsonb', [
        JSON.stringify(cleanedSocials)
      ]),

      profile_completed: true,

      updated_at: db.fn.now(),
    };

    if (
      typeof profilePic === "string" &&
      profilePic.trim()
    ) {
      updatePayload.profile_pic =
        profilePic.trim();
    }

    console.log(updatePayload);

    const updated = await db("provider_profiles")
      .where({
        provider_uuid: providerUuid,
      })
      .update(updatePayload);

    if (!updated) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
    });

  } catch (err) {

    console.error(err);

    console.error("message:", err.message);
    console.error("detail:", err.detail);
    console.error("code:", err.code);

    if (err.code === "23505") {
      return res.status(400).json({
        message: "Username already taken",
      });
    }

    return res.status(500).json({
      message: "Failed to save profile",
      error: err.message,
      detail: err.detail || null,
      code: err.code || null,
    });
  }
}