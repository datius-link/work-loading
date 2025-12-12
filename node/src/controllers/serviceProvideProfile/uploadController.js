import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

export const uploadImage = async (req, res) => {
  try {
    const file = req.body.image;

    if (!file) {
      return res.json({ success: false, message: "No image provided" });
    }

    const result = await cloudinary.v2.uploader.upload(file, {
      folder: "service_providers",
    });

    return res.json({
      success: true,
      url: result.secure_url,
    });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    return res.json({ success: false, message: "Upload failed" });
  }
};
