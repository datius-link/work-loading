import db from "../db/index.js";

async function getProviderSocialCounts(providerUuid) {
  const [followersRow, postsRow] = await Promise.all([
    db("provider_followers")
      .where({ provider_uuid: providerUuid })
      .count("* as count")
      .first(),
    db("posts")
      .where({ provider_uuid: providerUuid })
      .count("* as count")
      .first(),
  ]);

  return {
    followers: Number(followersRow?.count || 0),
    following: 0,
    posts_count: Number(postsRow?.count || 0),
  };
}

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

    const counts = await getProviderSocialCounts(providerUuid);

    return res.json({
      provider: {
        id: profile.id,
        provider_uuid: profile.provider_uuid,
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
        followers: counts.followers,
        following: counts.following,
        posts_count: counts.posts_count,
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

export async function getProviderProfile(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return res.status(400).json({
        message: "Provider UUID required",
      });
    }

    const profile = await db("provider_profiles")
      .where({ provider_uuid: uuid })
      .first();

    if (!profile) {
      return res.status(404).json({
        message: "Provider profile not found",
      });
    }

    const counts = await getProviderSocialCounts(uuid);

    return res.json({
      provider: {
        id: profile.id,
        provider_uuid: profile.provider_uuid,
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        profilePic: profile.profile_pic || "",
        field: profile.field || "",
        location: profile.location || "",
        followers: counts.followers,
        following: counts.following,
        posts_count: counts.posts_count,
        hire_success: profile.hire_success || 0,
        services: Array.isArray(profile.services)
          ? profile.services
          : [],
        socials: Array.isArray(profile.socials)
          ? profile.socials
          : [],
        contacts: Array.isArray(profile.contacts)
          ? profile.contacts
          : [],
      },
    });

  } catch (err) {

    console.error("getProviderProfile error:");
    console.error(err);

    return res.status(500).json({
      message: "Failed to load profile",
      error: err.message,
    });
  }
}

async function listConnections(providerUuid, type) {
  if (type === "following") {
    return [];
  }

  return db("provider_followers as pf")
    .join("viewer_users as vu", "vu.uuid", "pf.viewer_uuid")
    .where("pf.provider_uuid", providerUuid)
    .select(
      "vu.uuid",
      "vu.email",
      db.raw("split_part(vu.email, '@', 1) as username"),
      db.raw("split_part(vu.email, '@', 1) as full_name")
    )
    .orderBy("pf.created_at", "desc");
}

export async function getMyProviderConnections(req, res) {
  try {
    const type = req.query.type === "following" ? "following" : "followers";
    const users = await listConnections(req.user.uuid, type);
    return res.json({ users });
  } catch (err) {
    console.error("getMyProviderConnections error:", err);
    return res.status(500).json({ message: "Failed to load connections" });
  }
}

export async function getProviderConnections(req, res) {
  try {
    const { uuid } = req.params;
    const type = req.query.type === "following" ? "following" : "followers";

    if (!uuid) {
      return res.status(400).json({ message: "Provider UUID required" });
    }

    const users = await listConnections(uuid, type);
    return res.json({ users });
  } catch (err) {
    console.error("getProviderConnections error:", err);
    return res.status(500).json({ message: "Failed to load connections" });
  }
}

export async function searchProviderProfiles(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);

    if (!q) {
      return res.json({ providers: [] });
    }

    const term = q.replace(/^[@#]+/, "");

    const providers = await db("provider_profiles")
      .select(
        "provider_uuid",
        "username",
        "full_name",
        "profile_pic",
        "services",
        "field"
      )
      .where((qb) => {
        qb.whereILike("username", `%${term}%`)
          .orWhereILike("full_name", `%${term}%`)
          .orWhereILike("field", `%${term}%`)
          .orWhereRaw("services::text ILIKE ?", [`%${term}%`]);
      })
      .limit(limit);

    return res.json({ providers });
  } catch (err) {
    console.error("searchProviderProfiles error:", err);
    return res.status(500).json({ message: "Failed to search providers" });
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
