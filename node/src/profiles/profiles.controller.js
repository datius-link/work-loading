import db from "../db/index.js";
import { normalizePhoneList, normalizePhoneNumber } from "../utils/phone.js";

const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
const phoneOtps = new Map();

const DEFAULT_PRIVACY_SETTINGS = {
  show_email_in_jobs: false,
  show_phone_in_jobs: true,
  show_socials_in_jobs: false,
  show_public_insights: true,
  show_profile_in_recommendations: false,
};

function privacySettings(value) {
  return {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
  };
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function publicProfile(profile, owner = false) {
  if (!profile) return null;
  const payload = {
    uuid: profile.uuid,
    username: profile.username || "",
    full_name: profile.full_name || "",
    bio: profile.bio || "",
    profile_pic: profile.profile_pic || "",
    services: Array.isArray(profile.services) ? profile.services : [],
    ratings: profile.ratings,
    ratings_count: Number(profile.ratings_count || 0),
    created_at: profile.created_at,
  };
  if (owner) {
    const phoneNumbers = Array.isArray(profile.phone_numbers) ? profile.phone_numbers : [];
    payload.email = profile.email;
    payload.phone_numbers = phoneNumbers;
    payload.phone_number = profile.phone_number || phoneNumbers[0]?.number || phoneNumbers[0] || null;
    payload.socials = Array.isArray(profile.socials) ? profile.socials : [];
    payload.privacy_settings = privacySettings(profile.privacy_settings);
  }
  return payload;
}

function connectionUser(row, isFollowedByMe = false, isMe = false) {
  return {
    uuid: row.uuid,
    provider_uuid: row.uuid,
    username: row.username || "",
    full_name: row.full_name || "",
    profile_pic: row.profile_pic || "",
    is_followed_by_me: !!isFollowedByMe,
    is_following: !!isFollowedByMe,
    is_me: !!isMe,
  };
}

async function listProfileConnections(profileUuid, type, viewerUuid) {
  const query =
    type === "following"
      ? db("profile_followers as pf")
          .join("profiles as p", "p.uuid", "pf.provider_uuid")
          .where("pf.follower_uuid", profileUuid)
      : db("profile_followers as pf")
          .join("profiles as p", "p.uuid", "pf.follower_uuid")
          .where("pf.provider_uuid", profileUuid);

  const rows = await query
    .select("p.uuid", "p.username", "p.full_name", "p.profile_pic")
    .orderBy("pf.created_at", "desc");

  const followedRows = viewerUuid && rows.length
    ? await db("profile_followers")
        .where({ follower_uuid: viewerUuid })
        .whereIn("provider_uuid", rows.map((row) => row.uuid))
        .pluck("provider_uuid")
    : [];
  const followed = new Set(followedRows);

  return rows.map((row) => connectionUser(row, followed.has(row.uuid), viewerUuid === row.uuid));
}

export async function getProfile(req, res) {
  try {
    const { uuid } = req.params;
    const viewerUuid = req.user?.uuid || req.viewer?.uuid;
    const profile = await db("profiles").where({ uuid }).first();
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const [postedRow, completedRow] = await Promise.all([
      db("jobs").where({ created_by: uuid }).count("* as count").first(),
      db("jobs")
        .where((qb) => {
          qb.where({ created_by: uuid }).orWhere({ assigned_provider_uuid: uuid });
        })
        .whereIn("status", ["filled", "closed"])
        .count("* as count")
        .first(),
    ]);
    const [followersRow, followingRow, mediaRow, attainedRow, directHiresRow, recommendationsRow, completedJobs, followedByViewer] = await Promise.all([
      db("profile_followers").where({ provider_uuid: uuid }).count("* as count").first(),
      db("profile_followers").where({ follower_uuid: uuid }).count("* as count").first(),
      db("posts").where({ profile_uuid: uuid }).count("* as count").first(),
      db("job_applications").where({ profile_uuid: uuid, status: "approved" }).count("* as count").first(),
      db("jobs").where({ target_provider_uuid: uuid, hire_type: "direct" }).count("* as count").first(),
      db("job_recommendations").where({ provider_uuid: uuid }).count("* as count").first(),
      db("jobs")
        .where((qb) => {
          qb.where({ created_by: uuid }).orWhere({ assigned_provider_uuid: uuid });
        })
        .whereIn("status", ["filled", "closed"])
        .select("id", "job_code", "title", "status", "updated_at")
        .orderBy("updated_at", "desc")
        .limit(8),
      viewerUuid && viewerUuid !== uuid
        ? db("profile_followers").where({ provider_uuid: uuid, follower_uuid: viewerUuid }).first()
        : null,
    ]);

    return res.json({
      profile: {
        ...publicProfile(profile, viewerUuid === uuid),
        posted_jobs_count: Number(postedRow?.count || 0),
        completed_jobs_count: Number(completedRow?.count || 0),
        followers_count: Number(followersRow?.count || 0),
        following_count: Number(followingRow?.count || 0),
        media_posts_count: Number(mediaRow?.count || 0),
        jobs_attained_count: Number(attainedRow?.count || 0),
        direct_hires_count: Number(directHiresRow?.count || 0),
        recommendations_count: Number(recommendationsRow?.count || 0),
        completed_jobs: completedJobs,
        is_following: !!followedByViewer,
        is_followed_by_me: !!followedByViewer,
      },
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
}

export async function getMyProfile(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });
    const profile = await db("profiles").where({ uuid }).first();
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    return res.json({ profile: publicProfile(profile, true) });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
}

export async function requestMyPhoneOtp(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const phone = normalizePhoneNumber(req.body.phone_number || req.body.phoneNumber || req.body.phone);
    if (!phone) return res.status(400).json({ message: "Valid phone number required" });

    const code = generateOtp();
    phoneOtps.set(uuid, {
      phone,
      code,
      expiresAt: Date.now() + PHONE_OTP_TTL_MS,
    });

    console.log(`[DEV MOCK] phone verification code for ${phone}: ${code}`);
    return res.json({ success: true, message: "Phone verification code sent" });
  } catch (err) {
    console.error("requestMyPhoneOtp error:", err);
    return res.status(500).json({ message: "Failed to request phone verification" });
  }
}

export async function verifyMyPhoneOtp(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const phone = normalizePhoneNumber(req.body.phone_number || req.body.phoneNumber || req.body.phone);
    const code = String(req.body.code || req.body.otp || "").trim();
    if (!phone || !code) return res.status(400).json({ message: "Phone number and code are required" });

    const record = phoneOtps.get(uuid);
    if (!record || record.phone !== phone) return res.status(400).json({ message: "Request a new phone verification code" });
    if (record.expiresAt < Date.now()) {
      phoneOtps.delete(uuid);
      return res.status(400).json({ message: "Phone verification code expired" });
    }
    if (record.code !== code) return res.status(400).json({ message: "Invalid phone verification code" });

    phoneOtps.delete(uuid);
    return res.json({ success: true, phone_number: phone });
  } catch (err) {
    console.error("verifyMyPhoneOtp error:", err);
    return res.status(500).json({ message: "Failed to verify phone" });
  }
}

export async function getMyConnections(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });
    const type = req.query.type === "following" ? "following" : "followers";
    const users = await listProfileConnections(uuid, type, uuid);
    return res.json({ users });
  } catch (err) {
    console.error("getMyConnections error:", err);
    return res.status(500).json({ message: "Failed to load connections" });
  }
}

export async function getProfileConnections(req, res) {
  try {
    const { uuid } = req.params;
    const viewerUuid = req.user?.uuid || req.viewer?.uuid || null;
    const type = req.query.type === "following" ? "following" : "followers";
    const profile = await db("profiles").where({ uuid }).first();
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    const users = await listProfileConnections(uuid, type, viewerUuid);
    return res.json({ users });
  } catch (err) {
    console.error("getProfileConnections error:", err);
    return res.status(500).json({ message: "Failed to load connections" });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const {
      username,
      email,
      full_name,
      fullName,
      profile_pic,
      profilePic,
      bio,
      phone_numbers,
      phoneNumbers,
      phone_number,
      phoneNumber,
      services,
      socials,
      privacy_settings,
      privacySettings: privacySettingsBody,
    } = req.body;

    const payload = {
      updated_at: db.fn.now(),
    };

    if (typeof username === "string") payload.username = username.trim();
    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
        return res.status(400).json({ message: "Valid email required" });
      }
      payload.email = normalizedEmail;
    }
    if (typeof full_name === "string" || typeof fullName === "string") {
      payload.full_name = String(full_name || fullName).trim();
    }
    if (typeof bio === "string") payload.bio = bio.trim();
    if (typeof profile_pic === "string" || typeof profilePic === "string") {
      payload.profile_pic = String(profile_pic || profilePic).trim();
    }
    if (Array.isArray(phone_numbers) || Array.isArray(phoneNumbers)) {
      const phones = normalizePhoneList(phone_numbers || phoneNumbers || []);
      payload.phone_numbers = db.raw("?::jsonb", [JSON.stringify(phones)]);
      payload.phone_number = phones[0] || null;
    } else if (typeof phone_number === "string" || typeof phoneNumber === "string") {
      const rawPhone = String(phone_number ?? phoneNumber ?? "").trim();
      if (!rawPhone) {
        payload.phone_numbers = db.raw("?::jsonb", [JSON.stringify([])]);
        payload.phone_number = null;
      } else {
        const phone = normalizePhoneNumber(rawPhone);
        if (!phone) return res.status(400).json({ message: "Valid phone number required" });
        payload.phone_numbers = db.raw("?::jsonb", [JSON.stringify([phone])]);
        payload.phone_number = phone;
      }
    }
    if (Array.isArray(services)) payload.services = db.raw("?::jsonb", [JSON.stringify(services)]);
    if (Array.isArray(socials)) payload.socials = db.raw("?::jsonb", [JSON.stringify(socials)]);
    if (privacy_settings && typeof privacy_settings === "object" && !Array.isArray(privacy_settings)) {
      payload.privacy_settings = db.raw("?::jsonb", [JSON.stringify(privacySettings(privacy_settings))]);
    } else if (privacySettingsBody && typeof privacySettingsBody === "object" && !Array.isArray(privacySettingsBody)) {
      payload.privacy_settings = db.raw("?::jsonb", [JSON.stringify(privacySettings(privacySettingsBody))]);
    }

    const updated = await db("profiles").where({ uuid }).update(payload);
    if (!updated) return res.status(404).json({ message: "Profile not found" });

    const profile = await db("profiles").where({ uuid }).first();
    return res.json({ success: true, profile: publicProfile(profile, true) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Username, email, or phone number already taken" });
    console.error("updateMyProfile error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}
