import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../../convex/_generated/api";
import { isNetworkError } from "./network";

const convex = new ConvexHttpClient(
  process.env.EXPO_PUBLIC_CONVEX_URL
);

export const UploadManager = {
  callbacks: {
    onProgress: null,
    onComplete: null,
    onError: null,
  },

  async startUpload(mediaList = [], folder = "posts") {
    try {
      const uploadedMedia = [];

      for (let i = 0; i < mediaList.length; i++) {
        const media = mediaList[i];

        // progress callback
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress({
            percentage: ((i + 1) / mediaList.length) * 100,
          });
        }

        // get upload url from convex
        const uploadUrl = await convex.mutation(
          convexApi.storage.generateUploadUrl,
          {}
        );

        // local file -> blob
        const fileResponse = await fetch(media.uri);
        const blob = await fileResponse.blob();

        // upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type":
              media.mimeType ||
              (media.type === "video"
                ? "video/mp4"
                : "image/jpeg"),
          },
          body: blob,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();

        // get public url
        const fileUrl = await convex.query(
          convexApi.storage.getFileUrl,
          { storageId }
        );

        uploadedMedia.push({
          url: fileUrl,
          storageId,
          type: media.type,
          fit: media.fit || "cover",
          folder: media.folder || folder,
          name: media.fileName || media.name || null,
          mimeType:
            media.mimeType ||
            (media.type === "video" ? "video/mp4" : "image/jpeg"),
        });
      }

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(uploadedMedia);
      }

      return uploadedMedia;
    } catch (error) {
      console.log("UPLOAD ERROR:", error);
      if (isNetworkError(error) || /fetch|network|upload failed/i.test(String(error?.message || ""))) {
        error.code = "MEDIA_NETWORK_ERROR";
        error.isNetworkError = true;
      }

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      throw error;
    }
  },

  reset() {
    this.callbacks.onProgress = null;
    this.callbacks.onComplete = null;
    this.callbacks.onError = null;
  },
};
