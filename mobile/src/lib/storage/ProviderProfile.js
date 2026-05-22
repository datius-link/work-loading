import { supabase, STORAGE_BUCKET } from "../supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system"; // ← add this

export async function uploadProviderPhoto(providerId, uri, mimeType) {
  const extension = mimeType.split("/")[1];
  const fileName = `photo_${Date.now()}.${extension}`;
  const path = `service-providers/${providerId}/profile/${fileName}`;

  // Read the file as base64 from the URI ← this was missing
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Public URL not generated");
  }

  return data.publicUrl;
}