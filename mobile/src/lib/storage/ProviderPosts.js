import { uploadPostMedia } from "./uploadPostMedia";
import { STORAGE_BUCKET } from "../supabase";

export class UploadManager {
  static uploadInProgress = false;
  static uploadedMedia = [];
  static callbacks = {
    onProgress: null,
    onComplete: null,
    onError: null,
  };

  static async startUpload(mediaList, postType) {
    if (this.uploadInProgress) return this.uploadedMedia;

    this.uploadInProgress = true;
    this.uploadedMedia = [];

    const postSessionId = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      const total = mediaList.length;

      for (let i = 0; i < total; i++) {
        const media = mediaList[i];

        const ext = media.uri.split(".").pop();
        const fileName = `${i + 1}.${ext}`;

        const storagePath = `service-providers/posts/${postSessionId}/${fileName}`;

        const url = await uploadPostMedia({
          uri: media.uri,
          bucket: STORAGE_BUCKET,
          path: storagePath,
          mimeType:
            media.mimeType ||
            (media.type === "video" ? "video/mp4" : "image/jpeg"),
        });

        this.uploadedMedia.push({
          url,
          type: media.type,
          width: media.width,
          height: media.height,
          duration: media.duration || null,
        });

        if (this.callbacks.onProgress) {
          this.callbacks.onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100),
          });
        }
      }

      this.uploadInProgress = false;
      this.callbacks.onComplete?.(this.uploadedMedia);
      return this.uploadedMedia;
    } catch (err) {
      this.uploadInProgress = false;
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  static reset() {
    this.uploadInProgress = false;
    this.uploadedMedia = [];
  }
}
