import { supabase, STORAGE_BUCKET } from "./supabase";
import { decode } from "base64-arraybuffer";

export async function uploadProviderPhoto(providerId, base64, mimeType) {
  const extension = mimeType.split("/")[1];
  const fileName = `photo_${Date.now()}.${extension}`;
  const path = `service-providers/SeriveProvider/profile/${fileName}`;

  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
