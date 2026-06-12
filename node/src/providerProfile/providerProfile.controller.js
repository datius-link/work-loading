import db from "../db/index.js";

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function providerResponse(profile, counts = {}, { includePrivate = false } = {}) {
  const payload = {
    uuid: profile.uuid,
    username: profile.username || "",
    full_name: profile.full_name || "",
    bio: profile.bio || "",
    profilePic: profile.profile_pic || "",
    profile_pic: profile.profile_pic || "",
    services: jsonArray(profile.services),
    ratings: profile.ratings,
    ratings_count: Number(profile.ratings_count || 0),
    followers: counts.followers || 0,
    following: counts.following || 0,
    posts_count: counts.posts_count || 0,
  };

  if (includePrivate) {
    payload.contacts = jsonArray(profile.phone_numbers);
    payload.socials = jsonArray(profile.socials);
  }

  return payload;
}

async function getProviderSocialCounts(profileUuid) {
  const [followersRow, postsRow] = await Promise.all([
    db("profile_followers").where({ provider_uuid: profileUuid }).count("* as count").first(),
    db("posts").where({ profile_uuid: profileUuid }).count("* as count").first(),
  ]);

  return {
    followers: Number(followersRow?.count || 0),
    following: 0,
    posts_count: Number(postsRow?.count || 0),
  };
}

async function getProviderOr404(uuid) {
  return db("profiles").where({ uuid, role: "service_provider" }).first();
}

export async function getMyProviderProfile(req, res) {
  try {
    const profile = await getProviderOr404(req.user.uuid);
    if (!profile) return res.status(404).json({ message: "Provider profile not found" });

    const counts = await getProviderSocialCounts(profile.uuid);
    return res.json({ provider: providerResponse(profile, counts, { includePrivate: true }) });
  } catch (err) {
    console.error("getMyProviderProfile error:", err);
    return res.status(500).json({ message: "Failed to load profile", error: err.message });
  }
}

export async function getProviderProfile(req, res) {
  try {
    const { uuid } = req.params;
    if (!uuid) return res.status(400).json({ message: "Provider UUID required" });

    const profile = await getProviderOr404(uuid);
    if (!profile) return res.status(404).json({ message: "Provider profile not found" });

    const counts = await getProviderSocialCounts(uuid);
    return res.json({ provider: providerResponse(profile, counts) });
  } catch (err) {
    console.error("getProviderProfile error:", err);
    return res.status(500).json({ message: "Failed to load profile", error: err.message });
  }
}

async function listConnections(profileUuid, type) {
  if (type === "following") return [];

  return db("profile_followers as pf")
    .join("profiles as p", "p.uuid", "pf.follower_uuid")
    .where("pf.provider_uuid", profileUuid)
    .select("p.uuid", "p.email", "p.username", "p.full_name", "p.profile_pic")
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
    if (!uuid) return res.status(400).json({ message: "Provider UUID required" });

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
    if (!q) return res.json({ providers: [] });

    const term = q.replace(/^[@#]+/, "");
    const providers = await db("profiles")
      .select("uuid", "username", "full_name", "profile_pic", "services")
      .where({ role: "service_provider" })
      .where((qb) => {
        qb.whereILike("username", `%${term}%`)
          .orWhereILike("full_name", `%${term}%`)
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
    const profileUuid = req.user.uuid;
    const { fullName, username, field, location, bio, contacts, services, socials, profilePic } = req.body;

    if (!fullName?.trim()) return res.status(400).json({ message: "Full name is required" });
    if (!username?.trim()) return res.status(400).json({ message: "Username is required" });

    const cleanedContacts = jsonArray(contacts)
      .filter((contact) => contact?.number)
      .map((contact) => ({
        number: String(contact.number).trim(),
        call: !!contact.call,
        sms: !!contact.sms,
      }));

    const cleanedServices = jsonArray(services).map((service) => String(service).trim()).filter(Boolean);
    const cleanedSocials = jsonArray(socials)
      .filter((social) => social?.platform)
      .map((social) => ({
        platform: String(social.platform).trim(),
        handle: String(social.handle || "").trim().replace(/^@/, ""),
      }));

    const updatePayload = {
      username: username.trim(),
      full_name: fullName.trim(),
      field: typeof field === "string" ? field.trim() : "",
      location: typeof location === "string" ? location.trim() : "",
      bio: typeof bio === "string" ? bio.trim() : "",
      phone_numbers: db.raw("?::jsonb", [JSON.stringify(cleanedContacts)]),
      services: db.raw("?::jsonb", [JSON.stringify(cleanedServices)]),
      socials: db.raw("?::jsonb", [JSON.stringify(cleanedSocials)]),
      updated_at: db.fn.now(),
    };

    if (typeof profilePic === "string" && profilePic.trim()) {
      updatePayload.profile_pic = profilePic.trim();
    }

    const updated = await db("profiles")
      .where({ uuid: profileUuid, role: "service_provider" })
      .update(updatePayload);

    if (!updated) return res.status(404).json({ message: "Profile not found" });
    return res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ message: "Username already taken" });
    console.error("updateMyProviderProfile error:", err);
    return res.status(500).json({
      message: "Failed to save profile",
      error: err.message,
      detail: err.detail || null,
      code: err.code || null,
    });
  }
}
