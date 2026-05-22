import * as FileSystem from "expo-file-system";
import { supabase } from "../supabase";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

export async function uploadPostMedia({ uri, bucket, path, mimeType }) {
  if (!uri || !bucket || !path) {
    throw new Error("Missing required parameters: uri, bucket, or path");
  }
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  console.log(`[uploadPostMedia] Starting streaming upload:`);
  console.log(`  URI: ${uri}`);
  console.log(`  Bucket: ${bucket}`);
  console.log(`  Path: ${path}`);
  console.log(`  MIME: ${mimeType || "auto"}`);

  // Build Supabase Storage REST endpoint
  const uploadUrl = `${supabase.supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  const headers = {
    apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    "Content-Type": mimeType || "application/octet-stream",
  };

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  Upload attempt ${attempt}/${MAX_RETRIES}...`);

      // Stream the file directly from disk to Supabase
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        headers,
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
      }

      console.log(`  Upload successful! Path: ${path}`);

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (!publicUrlData?.publicUrl) {
        throw new Error("Public URL not generated");
      }

      console.log(`  Public URL: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    } catch (err) {
      lastError = err;
      console.error(`  Attempt ${attempt} error:`, err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
    }
  }

  throw lastError || new Error(`Upload failed after ${MAX_RETRIES} attempts`);
}