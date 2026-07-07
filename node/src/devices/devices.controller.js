import db from "../db/index.js";

// "Trusting" a device = switching biometric quick-login on for this account
// on this specific device. Enforced server-side, not just client-side: if
// another account already had biometric turned on for this exact device_id,
// that trust is revoked first, so only one account can ever be
// biometric-active on a given device at once.
export async function trustDevice(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const deviceId = String(req.body.device_id || "").trim();
    const deviceName = req.body.device_name ? String(req.body.device_name).trim().slice(0, 191) : null;
    if (!deviceId) return res.status(400).json({ message: "device_id is required" });

    await db.transaction(async (trx) => {
      await trx("trusted_devices")
        .where({ device_id: deviceId, biometric_enabled: true })
        .whereNot({ profile_uuid: uuid })
        .update({ biometric_enabled: false, revoked_at: trx.fn.now(), updated_at: trx.fn.now() });

      const existing = await trx("trusted_devices").where({ profile_uuid: uuid, device_id: deviceId }).first();
      if (existing) {
        await trx("trusted_devices")
          .where({ id: existing.id })
          .update({
            device_name: deviceName,
            biometric_enabled: true,
            revoked_at: null,
            last_used_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
      } else {
        await trx("trusted_devices").insert({
          profile_uuid: uuid,
          device_id: deviceId,
          device_name: deviceName,
          biometric_enabled: true,
          last_used_at: trx.fn.now(),
        });
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("trustDevice error:", err);
    return res.status(500).json({ message: "Failed to trust device" });
  }
}

// Called when biometric is switched off, on a real logout of the
// biometric-bound account, or on "Not you?" — always safe to call even if no
// row exists (no-op).
export async function untrustDevice(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const deviceId = String(req.body.device_id || "").trim();
    if (!deviceId) return res.status(400).json({ message: "device_id is required" });

    await db("trusted_devices")
      .where({ profile_uuid: uuid, device_id: deviceId })
      .update({ biometric_enabled: false, revoked_at: db.fn.now(), updated_at: db.fn.now() });

    return res.json({ success: true });
  } catch (err) {
    console.error("untrustDevice error:", err);
    return res.status(500).json({ message: "Failed to untrust device" });
  }
}

// Not used by the mobile app yet, but a natural "manage trusted devices"
// screen would read from this — kept simple for now.
export async function listMyDevices(req, res) {
  try {
    const uuid = req.user?.uuid || req.viewer?.uuid;
    if (!uuid) return res.status(401).json({ message: "Authorization required" });

    const devices = await db("trusted_devices").where({ profile_uuid: uuid }).orderBy("last_used_at", "desc");
    return res.json({ devices });
  } catch (err) {
    console.error("listMyDevices error:", err);
    return res.status(500).json({ message: "Failed to list devices" });
  }
}
