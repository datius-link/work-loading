import { supabase } from "../supabase";
import { File } from "expo-file-system";

export async function uploadPostMedia({
  uri,
  bucket,
  path,
  mimeType,
}) {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Public URL not generated");
  }

  return data.publicUrl;
}
